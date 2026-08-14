const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const { DEFAULT_URL } = require('./config');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'A股看板',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // —— 安全底线：渲染进程绝不拿到 Node 能力 ——
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: false,
      // webviewTag 默认启用，<webview> 用独立沙箱子进程加载远程页，不继承 Node
    },
  });

  // 壳 UI（地址栏）由本地文件加载；远程看板由其中的 <webview> 加载
  win.loadFile(path.join(__dirname, 'src', 'shell.html'));

  // 纵深防御：任何 window.open / 新窗口请求都走系统浏览器，绝不在应用内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // 统一拒绝敏感权限（摄像头 / 麦克风 / 地理等），仅放行剪贴板
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['clipboard-read', 'clipboard-sanitized-write'];
    callback(allowed.includes(permission));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // macOS 上保留菜单栏，其他平台退出
  if (process.platform !== 'darwin') app.quit();
});
