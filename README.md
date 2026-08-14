# A股看板桌面客户端（Electron）

一个 Windows / macOS 桌面应用程序，**本质是「地址栏 + 浏览器窗口」的瘦客户端（thin client）**，默认加载你 NAS 上的 A股看板，也支持手动输入其他链接查看。后端仍在 NAS 运行，桌面端只负责渲染与导航。

> 当前版本为**自用未签名包**：在自己机器上手动放行即可，免去代码签名证书成本。

## 特性

- 桌面窗口 + 顶部地址栏，可输入任意 `http/https` 链接回车跳转
- 默认首页固定为 `http://100.64.217.92:8688`（Tailscale 内网穿透地址）
- 前进 / 后退 / 刷新 / 停止
- **加载失败 / Tailscale 未连通**时显示友好提示，不白屏
- Windows（NSIS 安装包 + 便携 exe）与 macOS（dmg）打包

## 安全设计（不可妥协的底线）

渲染进程加载的是**不受信任的远程 URL**，做了多层防护：

- 主窗口 `nodeIntegration:false` + `contextIsolation:true` + `sandbox:true` + `webSecurity:true`
- 远程看板由 `<webview>` 独立沙箱子进程加载，**不继承任何 Node 能力**
- `will-navigate` 拦截：**页面自身发起的跳转**仅允许 Tailscale 网段 `100.64.0.0/10` 与白名单 host，阻止远程页逃逸到钓鱼站；用户地址栏主动输入不受限
- `setWindowOpenHandler`：任何新窗口一律走系统浏览器，绝不在应用内打开
- `setPermissionRequestHandler`：拒绝摄像头 / 麦克风 / 地理等敏感权限
- 注入严格 CSP，preload 仅经 `contextBridge` 暴露无害元信息

## 目录结构

```
electron-client/
├── package.json          # 依赖与 electron-builder 打包配置
├── main.js               # 主进程：窗口 / 安全策略 / 权限
├── preload.js            # 极窄 preload（contextBridge）
├── config.js             # 主进程配置（默认地址 / 白名单）
├── src/
│   ├── shell.html        # 壳 UI（地址栏 + <webview>）
│   ├── shell.css
│   └── shell.js          # 地址栏逻辑 / 安全拦截 / 错误提示
├── build/
│   └── entitlements.plist  # macOS 签名授权（二期证书就绪后启用）
└── README.md
```

## 本地运行（开发）

```bash
npm install
npm start        # 启动 Electron，加载默认看板
```

## 打包

```bash
npm run build:mac    # 产出 dist/*.dmg（macOS）
npm run build:win    # 产出 dist/*.exe + 安装包（Windows，建议在 Windows 上跑）
```

### 关于未签名包

- **macOS**：双击 dmg 安装后，首次打开若提示「无法验证开发者」，右键 → 打开，或在终端执行
  `sudo xattr -dr com.apple.quarantine /Applications/A股看板.app` 解除隔离。
- **Windows**：SmartScreen 可能警告，选择「仍要运行」即可。

### 二期启用签名（可选）

自备证书后，配置环境变量（`CSC_LINK` / `CSC_KEY_PASSWORD` 或 macOS 的 `APPLE_ID` / `APPLE_ID_PASS` / `APPLE_TEAM_ID`），并在 `package.json` 的 `mac` 中开启 `hardenedRuntime` + `entitlements`，即可自动签名 / notarization。

## Tailscale 说明

默认地址 `100.64.217.92:8688` 是 Tailscale 分配的内网地址，重启 NAS 也不变。只要运行本客户端的设备已加入同一 Tailscale 网络，任意地点都能直达看板；若未连接 Tailscale 或 NAS 离线，客户端会显示连接失败提示而非白屏。

## 待办（二期）

- 多标签页
- 系统托盘常驻 + 行情异动弹窗通知
- 离线缓存快照
- 自动更新（electron-updater）
