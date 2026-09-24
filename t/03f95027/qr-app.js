/*
  qr-app.js
  OpsBagV2 — QR & LINKS (web build)

  Author: Peter Lee
  Email: peterlee@evaair.com
  Date: 2026-09-24

  畫面組建與五個工具的實作，對應原生的 LinksScreen / ToolModal /
  FtMeterTool / TEMCardTool / RunwayChangeTool / HandoverTool / HoldingSpeedTool。
  互動行為刻意與原生版本一致（含關閉工具即重置勾選），方便兩版並排比較。

  Screen assembly and the five tools, mirroring the native LinksScreen /
  ToolModal / FtMeterTool / TEMCardTool / RunwayChangeTool / HandoverTool /
  HoldingSpeedTool. The behaviour is deliberately identical to the native
  version — including resetting a tool's ticks when it is closed — so the two
  can be compared side by side.
*/

(function () {
  'use strict';

  var D = QRData;
  var S = QRHost.settings;

  /* ---- Small helpers ---- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function num(value) { return Number(value).toLocaleString('en-US'); }

  function dot(colorToken, size) {
    var d = el('span', 'dot dot-' + (size || 8));
    d.style.background = 'var(--' + colorToken + ')';
    return d;
  }

  /* 以內嵌 SVG 取代 SF Symbols，避免任何外部字型或圖檔請求（離線可用）。
     Inline SVG stands in for the SF Symbols, so the page makes no request for an
     icon font or image file and works with no network at all. */
  var PATHS = {
    ruler: 'M3 8h18v8H3zM7 8v4M11 8v4M15 8v4M19 8v4',
    checklist: 'M9 6h11M9 12h11M9 18h11M4 5.5l1.5 1.5L8 4.5M4 11.5L5.5 13 8 10.5M4 17.5L5.5 19 8 16.5',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    people: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM2.5 19.5c0-3 2.9-5 6.5-5s6.5 2 6.5 5M16.5 11.2a2.8 2.8 0 1 0 0-5.6M18 14.8c2.1.5 3.5 2.2 3.5 4.7',
    gauge: 'M4 18a9 9 0 1 1 16 0M12 14l4.5-4.5M12 18.2h.01',
    doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
    warning: 'M12 4L2.5 20h19zM12 10v4.5M12 17.4h.01',
    antenna: 'M12 10.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM12 10.5V21M8.2 12.8a5.4 5.4 0 0 1 0-7.6M15.8 5.2a5.4 5.4 0 0 1 0 7.6M5.4 15.6a9.4 9.4 0 0 1 0-13.2M18.6 2.4a9.4 9.4 0 0 1 0 13.2',
    arrival: 'M3 20h18M14.5 4.2l-1.8.5 1.6 4.6-3.6 1-2.2-2.6-1.6.5.9 3.4-1.9 2.1 12.4-3.4a2 2 0 0 0-.5-3.9z',
    phone: 'M7 3.5l2.5 4-1.8 2a12 12 0 0 0 4.8 4.8l2-1.8 4 2.5v3a1.5 1.5 0 0 1-1.7 1.5C9.8 18.6 5.4 14.2 4 6.2A1.5 1.5 0 0 1 5.5 4.5z',
    fuel: 'M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16M4 21h11M6.5 8h6M17 9v7.5a2 2 0 0 0 4 0V9l-2.5-3',
    chevron: 'M9 5l7 7-7 7',
    external: 'M5 5h14v14H5zM10 14l5-5M11 9h4v4',
    close: 'M6 6l12 12M18 6L6 18',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.2 16.2L21 21',
    clear: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    back: 'M15 5l-7 7 7 7',
    up: 'M6 15l6-6 6 6',
    down: 'M6 9l6 6 6-6'
  };

  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var s = size || 17;
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', s);
    svg.setAttribute('height', s);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', PATHS[name] || PATHS.doc);
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.8');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  /* 參考文件網址。無 docBase（對外託管版本未附文件）時回傳 null。
     URL of a reference document, or null when no docBase was supplied — which is
     the case for the hosted copy, which ships no documents. */
  function docURL(resource, page, title) {
    if (!S.docBase) { return null; }
    var url = S.docBase + encodeURIComponent(resource) + '.pdf';
    if (title) { url += '?t=' + encodeURIComponent(title); }
    if (page && page > 1) { url += '#page=' + page; }
    return url;
  }

  var root = document.getElementById('root');
  var overlay = null;

  /* ---- Screen shell ---- */

  function buildShell() {
    root.textContent = '';

    if (S.chrome) {
      var bar = el('div', 'titlebar');
      bar.appendChild(el('div', 'titlebar-title', 'QR & LINKS'));
      bar.appendChild(el('div', 'titlebar-spacer'));
      bar.appendChild(el('div', 'titlebar-tag', 'v' + S.version));
      root.appendChild(bar);
    }

    var list = el('div', 'list');
    list.appendChild(sectionBar('REFERENCES'));
    D.tools.forEach(function (tool) {
      list.appendChild(toolRow(tool));
    });
    D.docs.forEach(function (doc) {
      list.appendChild(docRow(doc));
    });

    list.appendChild(sectionBar('USEFUL LINKS'));
    D.links.forEach(function (link) {
      if (link.internal && !S.showInternal) { return; }
      list.appendChild(linkRow(link));
    });
    root.appendChild(list);

    if (S.chrome) {
      var status = el('div', 'statusbar');
      status.appendChild(el('span', null, 'QR TOOLS ' + S.version + ' · ' + S.built));
      status.appendChild(el('span', 'grow'));
      status.appendChild(el('span', null, S.embedded ? 'IN-APP' : 'WEB'));
      root.appendChild(status);
    }

    root.hidden = false;
  }

  function sectionBar(text) {
    return el('div', 'section-bar', text);
  }

  function rowShell(tag) {
    var row = document.createElement(tag);
    row.className = 'row';
    return row;
  }

  function toolRow(tool) {
    var row = rowShell('button');
    var ic = el('span', 'row-icon');
    ic.appendChild(icon(tool.icon, 17));
    row.appendChild(ic);
    row.appendChild(el('span', 'row-title', tool.title));
    var tr = el('span', 'row-trail');
    tr.appendChild(icon('chevron', 15));
    row.appendChild(tr);
    row.addEventListener('click', function () { openTool(tool.id); });
    return row;
  }

  /* 文件列直接用 <a>：在 App 的 WKWebView 中由宿主接手顯示，在一般瀏覽器中
     直接開啟 PDF。兩種情況都不需要 JavaScript bridge。
     Document rows are plain anchors: inside the app's WKWebView the host takes
     the navigation over and shows the PDF, and in an ordinary browser the PDF
     simply opens. Neither case needs a JavaScript bridge. */
  function docRow(doc) {
    var url = docURL(doc.resource, 1, doc.title);
    var row = rowShell(url ? 'a' : 'div');
    if (url) { row.href = url; } else { row.setAttribute('disabled', ''); }
    var ic = el('span', 'row-icon');
    ic.appendChild(icon(doc.icon, 17));
    row.appendChild(ic);
    row.appendChild(el('span', 'row-title', doc.title));
    if (url) {
      var tr = el('span', 'row-trail');
      tr.appendChild(icon('doc', 15));
      row.appendChild(tr);
    } else {
      row.appendChild(el('span', 'row-note', 'IN APP ONLY'));
    }
    return row;
  }

  function linkRow(link) {
    var row;
    if (link.embeddable) {
      row = rowShell('button');
      row.addEventListener('click', function () { openEmbedded(link); });
    } else {
      row = rowShell('a');
      row.href = link.url;
      row.rel = 'noreferrer';
    }
    row.appendChild(el('span', 'row-title', link.title));
    var tr = el('span', 'row-trail');
    tr.appendChild(icon('external', 15));
    row.appendChild(tr);
    return row;
  }

  /* ---- Overlays ---- */

  function closeOverlay() {
    if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    overlay = null;
  }

  function openTool(id) {
    var tool = null;
    D.tools.forEach(function (t) { if (t.id === id) { tool = t; } });
    if (!tool) { return; }
    closeOverlay();

    var scrim = el('div', 'modal-scrim');
    scrim.addEventListener('click', function (event) {
      if (event.target === scrim && !S.compact) { closeOverlay(); }
    });

    var modal = el('div', 'modal');
    var head = el('div', 'modal-head');
    head.appendChild(el('div', 'modal-title', tool.title.toUpperCase()));
    var close = el('button', 'modal-close');
    close.appendChild(icon('close', 19));
    close.addEventListener('click', closeOverlay);
    head.appendChild(close);
    modal.appendChild(head);

    if (tool.ref) { modal.appendChild(refBar(tool.ref)); }

    var body = el('div', 'modal-body');
    BUILDERS[tool.id](body);
    modal.appendChild(body);

    scrim.appendChild(modal);
    document.body.appendChild(scrim);
    overlay = scrim;
    QRHost.post('toolOpened', { tool: tool.id });
  }

  /* 工具下方的官方參考文件列（原生版的 toolReferenceBar）。
     The official-reference row under the tool header (the native
     toolReferenceBar). Disabled when no documents are available. */
  function refBar(ref) {
    var url = docURL(ref.resource, ref.page, ref.title);
    var bar = el(url ? 'a' : 'div', 'modal-ref');
    if (url) { bar.href = url; } else { bar.setAttribute('disabled', ''); }
    bar.appendChild(icon('doc', 16));
    var label = 'Reference Document';
    if (ref.page && ref.page > 1) { label += '  ·  p.' + ref.page; }
    bar.appendChild(el('span', 'grow', label));
    if (url) {
      bar.appendChild(icon('external', 15));
    } else {
      bar.appendChild(el('span', 'row-note', 'IN APP ONLY'));
    }
    return bar;
  }

  /* 可內嵌的連結（WINDY）在頁內以 iframe 呈現，維持原生版的「不離開畫面」感。
     An embeddable link (WINDY) is shown in an in-page iframe, keeping the native
     version's sense of never leaving the screen. */
  function openEmbedded(link) {
    closeOverlay();
    var view = el('div', 'doc-view');
    var head = el('div', 'doc-head');
    var back = el('button', 'modal-close');
    back.style.position = 'static';
    back.appendChild(icon('back', 19));
    back.addEventListener('click', closeOverlay);
    head.appendChild(back);
    head.appendChild(el('div', 'grow', link.title));
    var open = el('a', 'btn-primary', 'OPEN');
    open.href = link.url;
    open.rel = 'noreferrer';
    head.appendChild(open);
    view.appendChild(head);

    var frame = el('iframe', 'doc-frame');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.src = link.url;
    view.appendChild(frame);

    document.body.appendChild(view);
    overlay = view;
  }

  /* ---- Tool 1: FEET AND METER CONVERSION TABLE ---- */

  function buildFtMeter(body) {
    var rows = D.ftMeterRows;
    var selection = null;             // { row: index, side: 'south' | 'north' }
    var direction = 'south';          // compact only

    var glance = el('div', 'ftm-glance');
    body.appendChild(glance);

    body.appendChild(el('div', 'ftm-subtitle',
      'PR OF CHINA  ·  RVSM AIRSPACE BETWEEN FL291 AND FL411'));

    var dirHost = el('div');
    dirHost.style.flex = '0 0 auto';
    body.appendChild(dirHost);

    var cols = el('div', 'ftm-cols');
    body.appendChild(cols);

    var scroll = el('div', 'scroll');
    body.appendChild(scroll);

    var legend = el('div', 'ftm-legend');
    [['teal', 'RVSM BAND'], ['orange', '180° – 359°T'],
     ['chip-blue', '000° – 179°T']].forEach(function (pair) {
      var item = el('div', 'legend-item');
      item.appendChild(dot(pair[0], 8));
      item.appendChild(el('span', null, pair[1]));
      legend.appendChild(item);
    });
    body.appendChild(legend);

    function renderGlance() {
      glance.textContent = '';
      if (!selection) {
        glance.appendChild(el('div', 'ftm-glance-empty', 'TAP AN ALTITUDE TO ENLARGE'));
        return;
      }
      var row = rows[selection.row];
      var meters = selection.side === 'south' ? row.southM : row.northM;
      var feet = selection.side === 'south' ? row.southFt : row.northFt;
      var main = el('div', 'ftm-glance-main');
      main.appendChild(el('span', 'ftm-glance-ft', num(feet)));
      main.appendChild(el('span', 'ftm-glance-unit', 'FT'));
      glance.appendChild(main);
      glance.appendChild(el('div', 'ftm-glance-m', num(meters) + ' m'));
    }

    function half(index, side, meters, feet) {
      var cell = el('button', 'ftm-half');
      var on = selection && selection.row === index && selection.side === side;
      if (on) { cell.classList.add('on'); }
      cell.appendChild(el('span', 'ftm-m ' + side, num(meters) + ' m'));
      cell.appendChild(el('span', 'ftm-ft', num(feet) + ' Ft'));
      cell.addEventListener('click', function () {
        selection = on ? null : { row: index, side: side };
        render();
      });
      return cell;
    }

    function renderDirections() {
      dirHost.textContent = '';
      cols.textContent = '';
      if (S.compact) {
        var toggle = el('div', 'ftm-toggle');
        [['south', '180° – 359°T', 'orange'],
         ['north', '000° – 179°T', 'chip-blue']].forEach(function (spec) {
          var btn = el('button', 'ftm-toggle-btn' + (direction === spec[0] ? ' on' : ''));
          var top = el('div', 'legend-item');
          top.appendChild(dot(spec[2], 8));
          btn.appendChild(top);
          btn.appendChild(el('div', 'ftm-toggle-range', spec[1]));
          btn.addEventListener('click', function () {
            direction = spec[0];
            selection = null;
            render();
          });
          toggle.appendChild(btn);
        });
        dirHost.appendChild(toggle);
        ['METERS', 'FEET'].forEach(function (h) { cols.appendChild(el('span', null, h)); });
      } else {
        var dirs = el('div', 'ftm-dirs');
        [['orange', '180° – 359°T'],
         ['chip-blue', '000° – 179°T']].forEach(function (spec) {
          var head = el('div', 'ftm-dir');
          head.appendChild(dot(spec[0], 9));
          head.appendChild(el('span', null, spec[1]));
          dirs.appendChild(head);
        });
        dirHost.appendChild(dirs);
        ['METERS', 'FEET', 'METERS', 'FEET'].forEach(function (h) {
          cols.appendChild(el('span', null, h));
        });
      }
    }

    function renderRows() {
      scroll.textContent = '';
      rows.forEach(function (row, index) {
        var line = el('div', 'ftm-row' + (row.rvsm ? ' rvsm' : ''));
        if (S.compact) {
          var meters = direction === 'south' ? row.southM : row.northM;
          var feet = direction === 'south' ? row.southFt : row.northFt;
          line.appendChild(half(index, direction, meters, feet));
        } else {
          line.appendChild(half(index, 'south', row.southM, row.southFt));
          line.appendChild(half(index, 'north', row.northM, row.northFt));
        }
        scroll.appendChild(line);
      });
    }

    function render() {
      renderGlance();
      renderDirections();
      renderRows();
    }
    render();
  }

  /* ---- Tool 2: TEM CARD ---- */

  function buildTEM(body) {
    var flagged = {};
    var count = 0;

    var scroll = el('div', 'scroll tem-scroll');
    body.appendChild(scroll);

    var footer = el('div', 'tool-footer');
    var counter = el('div', 'footer-count', '0 FLAGGED');
    footer.appendChild(counter);
    footer.appendChild(el('div', 'grow'));
    var reset = el('button', 'btn-primary', 'RESET ALL');
    footer.appendChild(reset);
    body.appendChild(footer);

    function refreshCount() {
      count = Object.keys(flagged).length;
      counter.textContent = count + ' FLAGGED';
      counter.classList.toggle('on', count > 0);
    }

    function grid(categories) {
      var wrap = el('div', 'tem-grid');
      categories.forEach(function (cat) {
        var col = el('div', 'tem-cat');
        var name = el('div', 'tem-cat-name');
        name.appendChild(dot(cat.color, 9));
        name.appendChild(el('span', null, cat.name));
        col.appendChild(name);
        cat.items.forEach(function (label) {
          var key = cat.name + '·' + label;
          var item = el('button', 'tem-item');
          var box = el('div', 'tem-box', '!');
          item.appendChild(box);
          item.appendChild(el('span', null, label));
          item.addEventListener('click', function () {
            if (flagged[key]) { delete flagged[key]; } else { flagged[key] = true; }
            item.classList.toggle('on', !!flagged[key]);
            refreshCount();
          });
          col.appendChild(item);
        });
        wrap.appendChild(col);
      });
      return wrap;
    }

    scroll.appendChild(el('div', 'tem-banner', 'THREATS AND MITIGATION'));
    scroll.appendChild(grid(D.temThreats));
    scroll.appendChild(el('div', 'tem-banner', 'ERRORS AND MITIGATION'));
    scroll.appendChild(grid(D.temErrors));
    scroll.appendChild(el('div', 'tem-note',
      'FCOM QR.3.5  ·  Tap items to flag threats & errors for briefing'));

    reset.addEventListener('click', function () {
      flagged = {};
      Array.prototype.forEach.call(scroll.querySelectorAll('.tem-item.on'), function (node) {
        node.classList.remove('on');
      });
      refreshCount();
    });
  }

  /* ---- Tools 3 & 4: interactive checklists ---- */

  function buildChecklist(body, spec) {
    var checked = {};
    var entries = spec.entries;

    var progress = el('div', 'ck-progress');
    var head = el('div', 'ck-progress-head');
    head.appendChild(el('div', 'ck-progress-label', spec.progressLabel));
    var counter = el('div', 'ck-progress-count', '0 / ' + entries.length);
    head.appendChild(counter);
    progress.appendChild(head);
    var track = el('div', 'ck-track');
    var fill = el('div', 'ck-fill');
    fill.style.width = '0%';
    track.appendChild(fill);
    progress.appendChild(track);
    body.appendChild(progress);

    var scroll = el('div', 'scroll');
    scroll.style.background = 'var(--card-bg)';
    body.appendChild(scroll);

    var footer = el('div', 'tool-footer');
    footer.appendChild(el('div', 'grow'));
    var reset = el('button', 'btn-primary', 'RESET ALL');
    footer.appendChild(reset);
    body.appendChild(footer);

    var done = el('div', 'ck-done');
    var tick = el('div');
    tick.style.color = 'var(--selection)';
    tick.appendChild(icon('check', 30));
    done.appendChild(tick);
    done.appendChild(el('div', 'ck-done-title', spec.completionText));
    done.appendChild(el('div', 'ck-done-sub', spec.completionSub));

    function refresh() {
      var n = Object.keys(checked).length;
      counter.textContent = n + ' / ' + entries.length;
      fill.style.width = (100 * n / entries.length) + '%';
      if (n === entries.length) {
        if (!done.parentNode) { scroll.appendChild(done); }
      } else if (done.parentNode) {
        scroll.removeChild(done);
      }
    }

    entries.forEach(function (entry) {
      if (entry.section) {
        var band = el('div', 'ck-section');
        band.appendChild(dot('accent', 8));
        band.appendChild(el('span', null, entry.section.toUpperCase()));
        scroll.appendChild(band);
      }
      var item = el('button', 'ck-item');
      var mark = el('div', 'ck-mark', String(entry.number));
      item.appendChild(mark);
      var text = el('div', 'ck-text');
      text.appendChild(el('div', 'ck-label', entry.text));
      if (entry.detail) { text.appendChild(el('div', 'ck-detail', entry.detail)); }
      item.appendChild(text);
      item.addEventListener('click', function () {
        if (checked[entry.number]) {
          delete checked[entry.number];
          item.classList.remove('on');
          mark.textContent = String(entry.number);
        } else {
          checked[entry.number] = true;
          item.classList.add('on');
          mark.textContent = '';
          mark.appendChild(icon('check', 14));
        }
        refresh();
      });
      scroll.appendChild(item);
    });

    reset.addEventListener('click', function () {
      checked = {};
      Array.prototype.forEach.call(scroll.querySelectorAll('.ck-item'), function (node, i) {
        node.classList.remove('on');
        node.querySelector('.ck-mark').textContent = String(entries[i].number);
      });
      refresh();
    });

    refresh();
  }

  /* ---- Tool 5: HOLDING SPEED ---- */

  function buildHolding(body) {
    var query = '';
    var selected = {};
    var collapsed = {};
    var highlighted = null;

    var search = el('div', 'hs-search');
    search.appendChild(icon('search', 15));
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search country... e.g. Japan, Korea';
    input.autocapitalize = 'none';
    input.autocomplete = 'off';
    input.spellcheck = false;
    search.appendChild(input);
    var clear = el('button');
    clear.style.color = 'var(--gray)';
    clear.appendChild(icon('clear', 16));
    clear.hidden = true;
    search.appendChild(clear);
    body.appendChild(search);

    var scroll = el('div', 'scroll hs-scroll');
    body.appendChild(scroll);

    input.addEventListener('input', function () {
      query = input.value;
      clear.hidden = query.length === 0;
      render();
    });
    clear.addEventListener('click', function () {
      query = '';
      input.value = '';
      clear.hidden = true;
      render();
    });

    /* 篩選邏輯與原生一致：選取國家後只留下含該國家的表，搜尋再過濾一次（以「表」為單位）。
       The same filtering as the native tool: selecting a country leaves only the
       table that contains it, and the search filters whole tables, not rows. */
    function visibleSections() {
      var result = D.holdingSections;
      var picked = Object.keys(selected);
      if (picked.length > 0) {
        result = result.filter(function (section) {
          return section.groups.some(function (group) {
            return group.countries.some(function (c) { return selected[c]; });
          });
        });
      }
      if (query) {
        var q = query.toLowerCase();
        result = result.filter(function (section) {
          return section.groups.some(function (group) {
            return group.countries.some(function (c) { return c.toLowerCase().indexOf(q) >= 0; }) ||
                   group.rows.some(function (r) { return r[0].toLowerCase().indexOf(q) >= 0; });
          });
        });
      }
      return result;
    }

    function render() {
      scroll.textContent = '';
      var sections = visibleSections();
      var wrap = el('div', 'hs-sections');

      sections.forEach(function (section) {
        var isCollapsed = !!collapsed[section.banner];
        var box = el('div', 'hs-section');

        var banner = el('button', 'hs-banner');
        banner.appendChild(el('span', null, section.banner));
        banner.appendChild(el('span', 'grow'));
        if (section.bannerSub) {
          banner.appendChild(el('span', 'hs-banner-sub', section.bannerSub));
        }
        banner.appendChild(icon(isCollapsed ? 'down' : 'up', 13));
        banner.addEventListener('click', function () {
          collapsed[section.banner] = !isCollapsed;
          render();
        });
        box.appendChild(banner);

        if (!isCollapsed) {
          section.groups.forEach(function (group) {
            var special = group.countries.length === 0;
            if (!special) {
              var bar = el('div', 'hs-countries');
              bar.appendChild(el('div', 'hs-countries-label', group.label));
              var tags = el('div', 'hs-tags');
              group.countries.forEach(function (country) {
                var matched = query && country.toLowerCase().indexOf(query.toLowerCase()) >= 0;
                var on = matched || selected[country];
                var tag = el('button', 'hs-tag' + (on ? ' on' : ''), country);
                tag.addEventListener('click', function () {
                  if (selected[country]) { delete selected[country]; }
                  else { selected[country] = true; }
                  render();
                });
                tags.appendChild(tag);
              });
              bar.appendChild(tags);
              box.appendChild(bar);

              var cols = el('div', 'hs-cols');
              cols.appendChild(el('span', null, 'ALTITUDE'));
              cols.appendChild(el('span', null, 'MAX SPEED'));
              box.appendChild(cols);
            }
            group.rows.forEach(function (row, i) {
              var key = section.banner + '/' + group.label + '/' + i;
              var line = el('button', 'hs-row' + (highlighted === key ? ' on' : ''));
              line.appendChild(el('span', 'hs-alt' + (special ? ' special' : ''), row[0]));
              line.appendChild(el('span', 'hs-speed' + (special ? ' special' : ''), row[1]));
              line.addEventListener('click', function () {
                highlighted = highlighted === key ? null : key;
                render();
              });
              box.appendChild(line);
            });
          });
        }
        wrap.appendChild(box);
      });

      if (sections.length === 0) {
        wrap.appendChild(el('div', 'hs-empty', 'No table matches that search.'));
      }
      scroll.appendChild(wrap);
      scroll.appendChild(el('div', 'hs-note', D.holdingNote));
    }

    render();
  }

  var BUILDERS = {
    ftMeter: buildFtMeter,
    temCard: buildTEM,
    runwayChanges: function (body) { buildChecklist(body, D.runwayChange); },
    handover: function (body) { buildChecklist(body, D.handover); },
    holdingSpeed: buildHolding
  };

  /* ---- Boot ---- */

  QRHost.init();

  if (!QRHost.checkAccess()) {
    document.getElementById('gate').hidden = false;
    document.getElementById('gate-note').textContent =
      'Open the link issued by Flight Operations.';
  } else {
    buildShell();
    window.addEventListener('resize', function () {
      // 寬度跨過 700pt 時（分割視窗調整）重建清單與已開啟的工具。
      // Rebuild the list and any open tool when the width crosses 700pt.
      var wasCompact = root.dataset.compact === '1';
      if (wasCompact !== S.compact) {
        root.dataset.compact = S.compact ? '1' : '0';
        var open = overlay && overlay.classList.contains('modal-scrim')
          ? overlay.querySelector('.modal-title')
          : null;
        var title = open ? open.textContent : null;
        buildShell();
        if (title) {
          D.tools.forEach(function (t) {
            if (t.title.toUpperCase() === title) { openTool(t.id); }
          });
        }
      }
    });
    root.dataset.compact = S.compact ? '1' : '0';
    // 宿主可用 ?tool=<id> 直接開啟某個工具（示範與截圖用）。
    // A host may open one tool directly with ?tool=<id> (used for demos and for
    // capturing screenshots without touching the screen).
    if (S.openTool) { openTool(S.openTool); }
    QRHost.post('ready', { tools: D.tools.map(function (t) { return t.id; }) });
  }

  window.QRApp = { openTool: openTool, closeOverlay: closeOverlay };

  window.addEventListener('error', function (event) {
    QRHost.post('error', {
      message: String(event.message),
      source: String(event.filename || ''),
      line: event.lineno || 0
    });
  });
})();
