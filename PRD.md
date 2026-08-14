# A股看板桌面客户端（Electron）产品需求文档（PRD）

> 版本：v1.0 ｜ 日期：2026-08-14 ｜ 状态：待确认

## 1. 项目背景与目标

现有 A股监控看板：FastAPI 后端 + 前端静态页，运行于 NAS（Docker），已通过 **Tailscale 内网穿透**对外可达，地址 `http://100.64.217.92:8688`。

**目标**：开发一个 Windows / macOS 桌面应用程序，本质是一个「**地址栏 + 浏览器窗口**」的瘦客户端（thin client）——默认加载上述看板，用户也能手动输入其他链接查看。后端仍在 NAS 运行，桌面端只负责渲染与导航。

## 2. 需求边界

### 2.1 范围内（In Scope，首版）
- 桌面窗口，顶部含**地址栏**（可输入 URL、回车跳转、回显当前地址）
- 默认首页固定为 `http://100.64.217.92:8688`
- 基础导航：前进 / 后退 / 刷新 / 停止
- **加载失败 / Tailscale 未连通**时的友好提示页（不白屏）
- Windows（`.exe` 便携版 + `.msi`/NSIS 安装包）与 macOS（`.dmg`）打包
- 安全加固（见 §5）

### 2.2 范围外（Out of Scope，首版不做，预留扩展）
- 不内置后端、不打包 Python 运行时（壳子只渲染远程页）
- 不做多标签页（首版单标签，架构预留）
- 不做自动更新（预留 `electron-updater` 配置位）
- 不做系统托盘常驻 / 行情异动弹窗（二期）

## 3. 功能模块

| 模块 | 职责 |
|------|------|
| 主进程（`main.js`） | 创建/管理 BrowserWindow；配置安全策略；`will-navigate` 导航校验；`setWindowOpenHandler` 外链处理；`setPermissionRequestHandler` 权限控制 |
| 渲染进程（壳 UI） | 地址栏、前进/后退/刷新按钮、加载进度、错误提示页 |
| preload（`preload.js`） | 仅经 `contextBridge` 暴露**极窄** API（导航辅助 / UI 状态），绝不暴露 `ipcRenderer`/`fs`/`shell` 等 Node 能力 |
| 配置（`config.js`） | 默认 URL、可选导航白名单 |

## 4. 技术架构

- **框架**：Electron（最新稳定版，保持安全补丁）
- **进程模型**：主进程管理 BrowserWindow；渲染进程加载本地 `shell.html`（地址栏 UI），再以 `<webview>` 标签加载目标远程页
- **通信**：渲染进程 ↔ 主进程经 IPC；preload 用 `contextBridge` 暴露受限函数
- **参考开源**（已调研）：
  - `pinkcao/electron-shell`——默认首页 + electron-builder 打包，最贴本场景
  - `samuelmaddock/electron-browser-shell`——地址栏 + IPC 范式
  - `Freecode100Year/minimal-browser`——安全范本（isolation/sandbox/CSP/权限最小化）

### 架构示意
```
┌─────────────────────────────────────┐
│  主进程 main.js（安全策略 / 导航校验）  │
│       ▲ IPC ▲                         │
│       │     │                         │
│  渲染进程 shell.html（地址栏 UI）       │
│       │  <webview> loadURL           │
│       ▼                               │
│  远程看板页 http://100.64.217.92:8688  │
└─────────────────────────────────────┘
```

## 5. 安全设计（不可妥协的底线）

渲染进程加载的是**不受信任的远程 URL**，必须做对：

- `nodeIntegration: false` + `contextIsolation: true` + `sandbox: true`
- `webSecurity: true`，`allowRunningInsecureContent: false`
- 注入严格 CSP（禁用 `unsafe-eval` / `inline`）
- **导航白名单**：`will-navigate` 仅放行 `100.64.0.0/10` 与手动白名单域名，否则 `preventDefault`
- **外链新窗口**：`setWindowOpenHandler` 仅可信 `https` 走 `shell.openExternal`，其余 `deny`
- **权限**：`setPermissionRequestHandler` 拒绝摄像头 / 麦克风 / 地理等敏感权限
- 发布前用 `electronegativity` 扫描，保持 Electron 最新补丁

## 6. 打包方案（electron-builder）

| 平台 | 产物 | 签名要求 |
|------|------|----------|
| Windows | NSIS 安装包 + 便携 `.exe` | Authenticode（`CSC_LINK` + `CSC_KEY_PASSWORD`）；未签名将被 SmartScreen 拦截 |
| macOS | `.dmg` | Developer ID 签名 + notarization（`@electron/notarize`，需 `APPLE_ID`/`APPLE_ID_PASS`/`APPLE_TEAM_ID`），`hardenedRuntime` + `entitlements.plist` |

**成本提示**：macOS Apple Developer $99/年；Windows 代码签名证书年费数百~数千元（用户自备，首版可先出未签名包供自用）。

## 7. 目录结构

```
electron-client/
├── package.json
├── main.js
├── preload.js
├── config.js
├── src/
│   ├── shell.html
│   ├── shell.css
│   └── shell.js
├── build/
│   ├── icons/          # 应用图标（icns/ico/png）
│   └── entitlements.plist
└── README.md
```

## 8. 落地排期

1. 调研（GitHub 同类项目 + Skill 检索）—— ✅ 已完成
2. PRD 编写与确认 —— 进行中
3. 开发壳子 + 安全加固 —— 待开始
4. electron-builder 打包验证（Win/Mac 本地出包）—— 待开始
5. README 编写 + GitHub 仓库上传 —— 待开始

## 9. 风险与未决项

- **代码签名证书**：用户需自备；未签名包在他人机器上会触发系统告警（自用可暂免）
- **Tailscale 依赖**：打开时若 Tailscale 未连，显示提示页而非白屏（已在 §2.1 覆盖）
- **macOS http 加载**：顶层 `loadURL('http://...')` 不受混合内容限制，正常可用
- **多标签 / 托盘 / 自动更新**：确认为二期，不在首版
