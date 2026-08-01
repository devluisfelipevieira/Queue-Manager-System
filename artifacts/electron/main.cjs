const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, screen, nativeImage } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");

let mainWindow;
let overlayWindow;
let tray;
let quitting = false;
let reminderTimer;
let overlayTimer;
let currentReminder;
let snoozedUntil = 0;
let currentReminderKey;
let currentToken;
let pollTimer;

function readConfig() {
  const locations = [path.join(process.resourcesPath, "config.json"), path.join(__dirname, "config.json")];
  for (const file of locations) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  }
  return { serverUrl: "http://127.0.0.1:3000", updateUrl: "" };
}
const config = readConfig();
const serverOrigin = new URL(config.serverUrl).origin;

function safeNavigation(url) { return new URL(url).origin === serverOrigin; }

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 760, minWidth: 800, minHeight: 600, show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      // The renderer loads the internal HTTP application. Keeping Node
      // integration disabled and context isolation enabled preserves the
      // security boundary while allowing the preload IPC bridge to run.
      sandbox: false,
    },
  });
  mainWindow.removeMenu();
  mainWindow.loadURL(config.serverUrl);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", event => { if (!quitting) { event.preventDefault(); mainWindow.hide(); } });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => ({ action: safeNavigation(url) ? "allow" : "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => { if (!safeNavigation(url)) event.preventDefault(); });
}

function createOverlay() {
  overlayWindow = new BrowserWindow({
    width: 430, height: 190, show: false, frame: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  overlayWindow.webContents.on("will-navigate", (event, url) => {
    event.preventDefault();
    try {
      const actionUrl = new URL(url);
      if (actionUrl.protocol !== "guiche-action:") return;
      if (actionUrl.hostname === "free" || actionUrl.hostname === "snooze") {
        handleAction(actionUrl.hostname);
      }
    } catch {}
  });
  overlayWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.on("close", event => { if (!quitting) { event.preventDefault(); overlayWindow.hide(); } });
}

function showOverlay() {
  if (!currentReminder) return;
  const area = screen.getPrimaryDisplay().workArea;
  overlayWindow.setPosition(area.x + area.width - 450, area.y + area.height - 210);
  const overlayTitle = `${currentReminder.deskName} ocupada há ${currentReminder.reminderMinutes} min`;
  overlayWindow.webContents.executeJavaScript(
    `document.getElementById("title").textContent = ${JSON.stringify(overlayTitle)}`,
  ).catch(() => {});
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.show();
  overlayWindow.focus();
  overlayWindow.moveTop();
  // Windows can recalculate the z-order immediately after a hidden window is
  // shown. Reassert the topmost level once the native window is visible.
  setTimeout(() => {
    if (!overlayWindow.isVisible()) return;
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.moveTop();
    overlayWindow.flashFrame(true);
  }, 250);
}

function fireReminder() {
  if (!currentReminder) return;
  if (Notification.isSupported()) {
    const notification = new Notification({ title: "Lembrete de atendimento", body: `${currentReminder.deskName} está ocupada. Libere ao finalizar.` });
    notification.on("click", () => { mainWindow.show(); mainWindow.focus(); });
    notification.show();
  }
  overlayTimer = setTimeout(showOverlay, 8000);
}

function scheduleReminder(data, overrideDelay) {
  const sameAttendance = data && currentReminder && data.deskId === currentReminder.deskId && data.occupiedAt === currentReminder.occupiedAt;
  clearTimeout(reminderTimer); clearTimeout(overlayTimer); overlayWindow?.hide(); currentReminder = data;
  if (!data) { snoozedUntil = 0; return; }
  if (!sameAttendance) snoozedUntil = 0;
  if (overrideDelay) snoozedUntil = Date.now() + overrideDelay;
  const dueAt = Math.max(new Date(data.occupiedAt).getTime() + data.reminderMinutes * 60_000, snoozedUntil);
  reminderTimer = setTimeout(fireReminder, overrideDelay ?? Math.max(0, dueAt - Date.now()));
}

async function handleAction(action) {
  overlayWindow.hide(); clearTimeout(overlayTimer);
  if (currentReminder?.test) {
    scheduleReminder(null);
    return;
  }
  if (action === "free" && currentReminder && currentToken) {
    try {
      const response = await fetch(`${config.serverUrl}/api/desks/${currentReminder.deskId}/free`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      currentReminderKey = undefined;
      scheduleReminder(null);
      mainWindow.show();
      mainWindow.focus();
      return;
    } catch {
      new Notification({ title: "Não foi possível liberar a mesa", body: "Abra o sistema e tente novamente." }).show();
      showOverlay();
      return;
    }
  }
  if (action === "snooze") scheduleReminder(currentReminder, 5 * 60_000);
}

async function pollDeskState() {
  try {
    const token = await mainWindow.webContents.executeJavaScript("localStorage.getItem('guiche_token')", true);
    if (!token) {
      currentToken = undefined;
      currentReminderKey = undefined;
      scheduleReminder(null);
      return;
    }
    currentToken = token;
    const headers = { Authorization: `Bearer ${token}` };
    const meResponse = await fetch(`${config.serverUrl}/api/auth/me`, { headers });
    if (!meResponse.ok) return;
    const user = await meResponse.json();
    if (user.role !== "mesa" || !user.deskId) {
      currentReminderKey = undefined;
      scheduleReminder(null);
      return;
    }
    const [desksResponse, settingsResponse] = await Promise.all([
      fetch(`${config.serverUrl}/api/desks`, { headers }),
      fetch(`${config.serverUrl}/api/settings`, { headers }),
    ]);
    if (!desksResponse.ok || !settingsResponse.ok) return;
    const desks = await desksResponse.json();
    const settings = await settingsResponse.json();
    const desk = desks.find(item => item.id === user.deskId);
    if (!desk || desk.status !== "occupied") {
      currentReminderKey = undefined;
      scheduleReminder(null);
      return;
    }
    const key = `${desk.id}:${desk.updatedAt}:${settings.reminderMinutes}`;
    if (key === currentReminderKey) return;
    currentReminderKey = key;
    scheduleReminder({
      deskId: desk.id,
      deskName: desk.name,
      occupiedAt: desk.updatedAt,
      reminderMinutes: settings.reminderMinutes,
    });
  } catch {
    // A temporary network/navigation failure is retried by the next poll.
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("br.gov.rj.paraibadosul.guiche");
  app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  createMainWindow(); createOverlay();
  mainWindow.webContents.on("did-finish-load", pollDeskState);
  pollTimer = setInterval(pollDeskState, 5000);
  // Windows NativeImage does not reliably render SVG files in the system
  // tray. Use an embedded PNG so the icon is always visible.
  const trayPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const trayIcon = nativeImage.createFromBuffer(Buffer.from(trayPng, "base64")).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip("Gerenciador de Guichê");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `Versão ${app.getVersion()}`, enabled: false },
    { type: "separator" },
    { label: "Abrir sistema", click: () => { mainWindow.show(); mainWindow.focus(); } },
    {
      label: "Testar janela sobreposta",
      click: () => {
        currentReminder = { test: true, deskId: 0, deskName: "Teste do lembrete", reminderMinutes: 1 };
        showOverlay();
      },
    },
    { type: "separator" },
    { label: "Sair", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
  // Kept for compatibility/diagnostics; native polling is authoritative.
  ipcMain.on("reminder:set", () => {});
  ipcMain.on("overlay:action", (_event, action) => handleAction(action));
  if (config.updateUrl) {
    autoUpdater.setFeedURL({ provider: "generic", url: config.updateUrl });
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("before-quit", () => { quitting = true; clearInterval(pollTimer); });
app.on("window-all-closed", event => event.preventDefault());
app.on("activate", () => mainWindow?.show());
