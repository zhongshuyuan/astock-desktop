// 主进程配置（CommonJS，仅主进程 require 使用）。
// 注意：渲染进程（shell.js）因 contextIsolation 无法 require 本文件，
// 其中的默认地址 / 白名单在 shell.js 中按相同规则重复定义，改动时务必同步。

module.exports = {
  // 默认首页：NAS 上的 A股看板（Tailscale 内网穿透地址）
  DEFAULT_URL: 'http://100.64.217.92:8688',

  // 页面「自身发起」的跳转（链接点击 / JS 重定向 / meta refresh）仅允许这些 host。
  // 用户「地址栏手动输入」的跳转不受此限制（用户明确意图）。
  // Tailscale CGNAT 段 100.64.0.0/10 在 shell.js 中按网段自动放行。
  WHITELIST_HOSTS: ['100.64.217.92'],
};
