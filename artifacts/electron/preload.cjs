const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("guicheDesktop", {
  setReminder: (data) => ipcRenderer.send("reminder:set", data),
  onReminderAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("reminder:action", listener);
    return () => ipcRenderer.removeListener("reminder:action", listener);
  },
});
