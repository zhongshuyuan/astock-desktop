// 极窄 preload：仅经 contextBridge 暴露无害元信息，绝不暴露 ipcRenderer / fs / shell / path。
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('shellInfo', {
  name: 'A股看板桌面端',
});
