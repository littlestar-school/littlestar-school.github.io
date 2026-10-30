// 星星小學堂：離線使用。第一次打開會把整個程式存進裝置；之後打開都用裝置裡的版本（沒網路也能開），
// 有網路時在背景下載新版，下次打開就是新版。
const CACHE = 'xxt-5e3e8b4074';
const SIZE = 1337114;
const XF = ["x/536499771fd0.bin", "x/d49b75e411a9.bin", "x/18244b61a5b8.bin", "x/e2ae832cd858.bin", "x/3f0d0b4bf6d1.bin", "x/7110c0273a16.bin", "x/0d6d815f5db4.bin", "x/0e17d20d97a5.bin", "x/cbdf9fd7e347.bin", "x/b6677bebaec7.bin"];
const CORE = ['index.html', 'kai.woff2', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open('xmedia').then(c => Promise.all(XF.map(u => c.match(u).then(hit => hit || fetch(u).then(r => { if (r.ok) return c.put(u, r); }))))).catch(() => {}).then(() => caches.open(CACHE)).then(c => Promise.all(CORE.map(u => c.match(u).then(hit => hit || fetch(new Request(u === 'index.html' ? 'index.html?t=' + Date.now() : u, {cache: 'reload'})).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('xxt-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function offlinePage(){
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>星星小學堂</title><body style="font-family:sans-serif;padding:32px;line-height:1.7"><h2>還沒下載完成</h2><p>第一次使用需要連上網路，等畫面右下角出現「✓ 已可離線使用」之後，就可以不用網路打開了。</p></body>', {headers: {'Content-Type': 'text/html; charset=utf-8'}});
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin === location.origin && /\/sw\.js$/.test(url.pathname)) return;   // 版本檢查一律走網路
  if (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname) && url.search && r.mode !== 'navigate') return;   // 下載新版（index.html?v=…）一定走網路，不能拿裝置裡的舊檔充數
  if (r.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match('index.html');
      const net = fetch(new Request('index.html?t=' + Date.now(), {cache: 'no-store'})).then(res => { if (res.ok) c.put('index.html', res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => offlinePage());
    }));
    return;
  }
  if (url.origin === location.origin && /\/v\/map\.json$/.test(url.pathname)) {   // 曉臻錄音對照表：網路優先，離線用存過的
    e.respondWith(caches.open('xmedia').then(c => fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => c.match(r, {ignoreSearch: true}).then(h => h || new Response('{}', {headers: {'Content-Type': 'application/json'}})))));
    return;
  }
  if (url.origin === location.origin && /\/(m|x|v|strokes|fonts\/xr)\/[^/]+\.(mp3|wav|ogg|m4a|weba|webp|png|jpg|gif|svg|bin|json|woff2)$/.test(url.pathname) && !/\/m\/index\.json$/.test(url.pathname)) {   // 語音、圖片、資料檔、筆順：不常變，存進不會隨版本清掉的 xmedia   // 語音、圖片：檔名就是內容雜湊，存過就永遠用裝置裡的
    e.respondWith(caches.open('xmedia').then(async c => {
      const hit = await c.match(r, {ignoreSearch: true});
      if (hit) return hit;
      return fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => new Response('', {status: 504}));
    }));
    return;
  }
  if (url.origin === location.origin && /\/books\/[^/]+$/.test(url.pathname)) {   // 繪本內頁：圖不常變，優先用裝置裡的；json 每次背景更新
    e.respondWith(caches.open('xmedia').then(async c => {
      const isJ = /\.json$/.test(url.pathname), hit = await c.match(r), net = fetch(isJ ? new Request(r, {cache: 'no-cache'}) : r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; });
      if (hit && isJ) return net.catch(() => hit);   // json（文字框位置）網路優先，離線才用舊的
      if (hit) return hit;
      return net.catch(() => new Response('', {status: 504}));
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, {ignoreSearch: url.origin === location.origin});
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => new Response('', {status: 504}));
  }));
});
