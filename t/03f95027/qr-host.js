/*
  qr-host.js
  OpsBagV2 — QR & LINKS (web build)

  Author: Peter Lee
  Email: peterlee@evaair.com
  Date: 2026-09-24

  宿主整合層：外觀、文字級數、版面寬度、參考文件位置與存取管控，全部在此解析，
  其餘程式（qr-app.js）只讀取本檔整理好的設定。本頁不依賴宿主提供 JavaScript
  bridge —— 宿主什麼都不做，頁面仍可完整運作。

  Host integration layer. Appearance, text scale, layout width, the location of
  the reference documents and the access check are all resolved here; the rest of
  the page (qr-app.js) only reads the settled configuration. Nothing in this file
  requires the host to provide a JavaScript bridge — with a host that does
  nothing at all, the page still works end to end.

  設定來源優先序 / Configuration is read in this order:
    1. window.OPSBAG_TOOLS_CONFIG — object injected by the host before the
       document loads (WKUserScript at .atDocumentStart).
    2. The query string or fragment: ?theme=dark&scale=1.3&chrome=0&docs=<base>
    3. Built-in defaults, with the appearance following prefers-color-scheme.
*/

var QRHost = (function () {
  'use strict';

  /* 版本號同時寫在 version.json；部署腳本會檢查兩者一致。
     The version is also recorded in version.json; the deploy script checks that
     the two agree, so an EFB administrator can identify the running content. */
  var VERSION = '1.0.0';
  var BUILT = '2026-09-24';

  /* 對外託管版本的存取金鑰（FNV-1a 雜湊）。這是「避免被隨手翻到」的遮蔽措施，
     不是存取控制 —— 頁面內容仍可被取得。真正的權限請放在具伺服器端驗證的主機。
     Access key for the hosted copy, stored as an FNV-1a hash. This is obscurity,
     not access control: anyone holding the URL can still read the content. Real
     restriction needs a host that can authenticate server-side. */
  var ACCESS_HASH = 3728181692;   // 0 = gate disabled

  var cfg = {};
  var params = {};

  function readParams() {
    var out = {};
    function absorb(text) {
      if (!text) { return; }
      text.replace(/^[?#]/, '').split('&').forEach(function (pair) {
        if (!pair) { return; }
        var i = pair.indexOf('=');
        var k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
        var v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        out[k] = v;
      });
    }
    absorb(window.location.search);
    absorb(window.location.hash);
    return out;
  }

  /* file: 與自訂 scheme 代表頁面由 App 內嵌載入；http(s) 代表對外託管。
     A file: or custom-scheme origin means the page is running inside the app;
     http(s) means it is the hosted copy. */
  function isEmbedded() {
    var p = window.location.protocol;
    return p !== 'http:' && p !== 'https:';
  }

  function pick(key, fallback) {
    if (cfg[key] !== undefined && cfg[key] !== null && cfg[key] !== '') { return cfg[key]; }
    if (params[key] !== undefined && params[key] !== '') { return params[key]; }
    return fallback;
  }

  function fnv1a(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function store(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function load(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  /* 只有在宿主真的裝了 message handler 時才送訊息；沒有就靜默略過。
     Posts to the host only when it has actually installed a message handler;
     otherwise this is a silent no-op. The page never depends on the result. */
  function post(type, payload) {
    try {
      var bridge = window.webkit && window.webkit.messageHandlers &&
                   window.webkit.messageHandlers.opsbag;
      if (!bridge) { return false; }
      var msg = { type: type, version: VERSION };
      if (payload) {
        Object.keys(payload).forEach(function (k) { msg[k] = payload[k]; });
      }
      bridge.postMessage(msg);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---- Appearance ----
     未指定時交給 prefers-color-scheme：WKWebView 會跟隨宿主的 trait collection，
     所以 App 切換淺／深色時本頁自動跟著變，宿主不必做任何事。
     With nothing specified the appearance follows prefers-color-scheme. A
     WKWebView inherits its host's trait collection, so the page follows the app's
     LIGHT / DARK setting on its own, with no work on the host side. */
  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    settings.theme = theme || 'auto';
  }

  function applyScale(scale) {
    var value = parseFloat(scale);
    if (!isFinite(value)) { value = 1; }
    value = Math.min(1.6, Math.max(0.8, value));
    document.documentElement.style.setProperty('--s', String(value));
    settings.scale = value;
  }

  /* 低於 Theme.compactBreakpoint（700pt）時套用精簡版面，與原生一致。
     Below Theme.compactBreakpoint (700pt) the compact layout applies, exactly as
     the native screen does in split view / slide over. */
  function applyWidth() {
    var compact = window.innerWidth < 700;
    document.body.classList.toggle('compact', compact);
    settings.compact = compact;
  }

  var settings = {
    version: VERSION,
    built: BUILT,
    theme: 'auto',
    scale: 1,
    compact: false,
    chrome: true,
    embedded: false,
    openTool: null,
    openDoc: false,
    altSource: null,
    docBase: null,
    showInternal: false,
    host: 'standalone'
  };

  function init() {
    cfg = window.OPSBAG_TOOLS_CONFIG || {};
    params = readParams();

    settings.embedded = isEmbedded() || cfg.embedded === true;
    settings.host = pick('host', settings.embedded ? 'app' : 'standalone');

    /* 頁面自帶標題列；宿主若自行繪製標題列，傳 chrome=0 關掉本頁的，避免兩條。
       The page draws its own title bar. A host that draws its own passes
       chrome=0 so the two do not stack. */
    settings.chrome = String(pick('chrome', '1')) !== '0';

    /* 參考文件基底路徑。App 內由宿主提供（指向 bundle 裡的 ReferenceDocs）；
       對外託管版本沒有文件，相關列會停用並標示 IN APP ONLY。
       Base path for the reference documents. Inside the app the host supplies it
       (pointing at ReferenceDocs in the bundle). The hosted copy ships no
       documents, so those rows are disabled and marked IN APP ONLY. */
    var docBase = pick('docs', null);
    settings.docBase = docBase ? String(docBase).replace(/\/*$/, '/') : null;

    /* 公司內網連結只在 App 內顯示。 Intranet links only inside the app. */
    settings.showInternal = settings.embedded;

    /* ?tool=<id> 直接開啟指定工具。 Opens one tool straight away. */
    var wanted = pick('tool', null);
    settings.openTool = wanted ? String(wanted) : null;
    /* ?doc=1 隨即開啟該工具的參考文件（示範與截圖用）。
       ?doc=1 then opens that tool's reference document, for demos and screenshots. */
    settings.openDoc = String(pick('doc', '0')) === '1';

    /* 宿主若允許切換來源，會傳 alt=bundle|network（另一個來源）。沒有傳就不顯示
       切換鈕——例如在一般瀏覽器裡，本來就沒有 App 內建的那一份可切。
       A host that allows the source to be switched passes alt=bundle|network, naming
       the other one. Without it no switch is shown — in an ordinary browser, for
       instance, there is no copy inside an app to switch to. */
    var alt = pick('alt', null);
    settings.altSource = (alt === 'bundle' || alt === 'network') ? alt : null;

    applyTheme(pick('theme', null));
    applyScale(pick('scale', 1));
    applyWidth();
    window.addEventListener('resize', applyWidth);
    window.addEventListener('orientationchange', applyWidth);
  }

  /* 存取檢查：僅對外託管版本生效，App 內一律放行。
     Access check. Applies to the hosted copy only — inside the app it always
     passes, so a loss of connectivity can never lock the crew out of the tools. */
  function checkAccess() {
    if (ACCESS_HASH === 0 || settings.embedded) { return true; }
    var supplied = params.k || load('opsbag.qr.k');
    if (supplied && fnv1a(String(supplied)) === ACCESS_HASH) {
      store('opsbag.qr.k', String(supplied));
      return true;
    }
    return false;
  }

  return {
    init: init,
    settings: settings,
    checkAccess: checkAccess,
    setTheme: applyTheme,
    setScale: applyScale,
    post: post,
    version: VERSION,
    built: BUILT
  };
})();

/* 宿主可主動呼叫的介面（選用）。宿主完全不呼叫也沒有影響。
   The optional interface a host may call into. A host that never calls any of
   these is fully supported. */
var OpsTools = {
  setTheme: function (theme) { QRHost.setTheme(theme); },
  setScale: function (scale) { QRHost.setScale(scale); },
  openTool: function (id) { if (window.QRApp) { window.QRApp.openTool(id); } },
  closeTool: function () { if (window.QRApp) { window.QRApp.closeOverlay(); } },
  version: function () { return QRHost.version; }
};
