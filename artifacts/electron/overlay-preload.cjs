const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("overlayApi", {
  onData: callback => ipcRenderer.on("overlay:data", (_event, data) => callback(data)),
  act: action => ipcRenderer.send("overlay:action", action),
});
