const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, screen } = require("electron");
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
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true },
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
    webPreferences: { preload: path.join(__dirname, "overlay-preload.cjs"), nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  overlayWindow.loadFile(path.join(__dirname, "overlay.html"));
  overlayWindow.on("close", event => { if (!quitting) { event.preventDefault(); overlayWindow.hide(); } });
}

function showOverlay() {
  if (!currentReminder) return;
  const area = screen.getPrimaryDisplay().workArea;
  overlayWindow.setPosition(area.x + area.width - 450, area.y + area.height - 210);
  overlayWindow.webContents.send("overlay:data", currentReminder);
  overlayWindow.show();
  overlayWindow.moveTop();
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

function handleAction(action) {
  overlayWindow.hide(); clearTimeout(overlayTimer);
  mainWindow.webContents.send("reminder:action", action);
  if (action === "free") { mainWindow.show(); mainWindow.focus(); }
  else scheduleReminder(currentReminder, 5 * 60_000);
}

app.whenReady().then(() => {
  app.setAppUserModelId("br.gov.rj.paraibadosul.guiche");
  app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  createMainWindow(); createOverlay();
  const icon = path.join(__dirname, "icon.svg");
  tray = new Tray(icon);
  tray.setToolTip("Gerenciador de Guichê");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Abrir sistema", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: "separator" },
    { label: "Sair", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("double-click", () => { mainWindow.show(); mainWindow.focus(); });
  ipcMain.on("reminder:set", (_event, data) => scheduleReminder(data));
  ipcMain.on("overlay:action", (_event, action) => handleAction(action));
  if (config.updateUrl) {
    autoUpdater.setFeedURL({ provider: "generic", url: config.updateUrl });
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", event => event.preventDefault());
app.on("activate", () => mainWindow?.show());
