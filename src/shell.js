// 壳 UI 逻辑：地址栏 + 导航 + 安全拦截 + 错误提示。
// 注意：因 contextIsolation，本文件无法 require config.js，默认地址 / 白名单在此重复定义，
// 与 config.js 保持一致。

const DEFAULT_URL = 'http://100.64.217.92:8688';

const view = document.getElementById('view');
const urlInput = document.getElementById('url');
const statusEl = document.getElementById('status');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const overlayTitle = document.getElementById('overlay-title');

let userNavigating = false; // 用户地址栏主动输入 -> 临时放行，避免被白名单拦截

// —— 白名单：页面自身发起的跳转仅允许这些 host ——
// Tailscale CGNAT 段 100.64.0.0/10 自动放行；其余按需追加
const WHITELIST_HOSTS = ['100.64.217.92'];
function hostAllowed(host) {
  if (WHITELIST_HOSTS.includes(host)) return true;
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
  }
  return false;
}

function normalizeUrl(u) {
  u = (u || '').trim();
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u;
}

function navigate(u) {
  u = normalizeUrl(u);
  userNavigating = true;
  view.loadURL(u);
}

function showOverlay(title, msg) {
  overlayTitle.textContent = title || '无法加载';
  overlayMsg.textContent = msg || '';
  overlay.classList.remove('hidden');
}
function hideOverlay() {
  overlay.classList.add('hidden');
}

// —— 事件绑定 ——
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate(urlInput.value);
});
document.getElementById('go').addEventListener('click', () => navigate(urlInput.value));
document.getElementById('back').addEventListener('click', () => view.goBack && view.goBack());
document.getElementById('forward').addEventListener('click', () => view.goForward && view.goForward());
document.getElementById('reload').addEventListener('click', () => view.reload && view.reload());
document.getElementById('overlay-retry').addEventListener('click', () => navigate(view.getURL() || DEFAULT_URL));

// 地址栏回显当前地址
view.addEventListener('did-navigate', () => { urlInput.value = view.getURL(); });
view.addEventListener('did-navigate-in-page', () => { urlInput.value = view.getURL(); });

// 加载状态
view.addEventListener('did-start-loading', () => {
  userNavigating = false; // 导航已开始，复位标记，后续页面自身跳转将受白名单约束
  statusEl.textContent = '加载中…';
  hideOverlay();
});
view.addEventListener('did-stop-loading', () => { statusEl.textContent = ''; });

// 安全拦截：页面自身发起的跳转若不在白名单，直接阻止（防远程页逃逸到钓鱼站）
view.addEventListener('will-navigate', (e) => {
  if (userNavigating) return; // 用户主动输入，放行
  try {
    const u = new URL(e.url);
    if (!hostAllowed(u.hostname)) e.preventDefault();
  } catch (_) {
    e.preventDefault();
  }
});

// 加载失败：连接被拒 / 域名解析失败 -> 友好提示（多为 Tailscale 未连或 NAS 离线）
view.addEventListener('did-fail-load', (e) => {
  if (e.errorCode === -3) return; // ERR_ABORTED：用户主动停止，忽略
  let title = '无法加载';
  let msg = (e.errorDescription || ('错误码 ' + e.errorCode)) +
    '\n\n请确认：1) Tailscale 已连接；2) NAS（' + DEFAULT_URL + '）在线。';
  if (/refused|resolve|network/i.test(e.errorDescription || '')) {
    title = '连接失败';
  }
  showOverlay(title, msg);
});

// 崩溃保护
view.addEventListener('crashed', () => {
  showOverlay('页面崩溃', '远程页面已崩溃，点击重试重新加载。');
});
