(function (window) {
  'use strict';

  var TOOL_MENU = [
    { slug: 'json', icon: '{ }', name: 'JSON 转换', fullName: 'JSON 格式化与转换', keywords: 'json 格式化 压缩 转义 typescript go struct url' },
    { slug: 'jsonpath', icon: '⌖', name: 'JSONPath 定位', fullName: 'JSONPath 定位', keywords: 'jsonpath 定位 查询 过滤 路径' },
    { slug: 'json-java', icon: '☕', name: 'JSON ↔ Java', fullName: 'JSON ↔ Java 实体类', keywords: 'json java 实体类 pojo dto 转换' },
    { slug: 'excel', icon: '⊞', name: 'Excel 转 JSON', fullName: 'Excel / CSV 转 JSON', keywords: 'excel csv tsv xlsx xls json 表格' },
    { slug: 'excel-sql', icon: '⛁', name: 'Excel 转 SQL', fullName: 'Excel 转 SQL 生成器', keywords: 'excel sql insert create table xlsx xls 数据库' },
    { slug: 'sql', icon: '⌘', name: 'SQL / MyBatis', fullName: 'SQL 格式化 & MyBatis 还原', keywords: 'sql 格式化 压缩 mybatis preparing parameters 日志还原' },
    { slug: 'mermaid', icon: '❖', name: 'Mermaid 渲染', fullName: 'Mermaid 图表渲染', keywords: 'mermaid 流程图 时序图 甘特图 思维导图 架构图 svg png' },
    { slug: 'svg', icon: '◈', name: 'SVG 转 PNG/JPG', fullName: 'SVG 转 PNG / JPG', keywords: 'svg png jpg 矢量图 转换 导出' },
    { slug: 'image', icon: '▣', name: '图片压缩', fullName: '图片压缩与转换', keywords: 'image 图片 压缩 webp jpeg png 裁剪' },
    { slug: 'color', icon: '◐', name: '颜色转换', fullName: '颜色转换与对比度', keywords: 'color hex rgb hsl wcag 对比度 调色板' },
    { slug: 'uuid', icon: '⚿', name: 'UUID 生成', fullName: 'UUID / 随机 ID 生成', keywords: 'uuid nanoid 密码 随机字符串 生成器' },
    { slug: 'snowflake', icon: '❄', name: 'Snowflake ID', fullName: 'Snowflake ID 生成器', keywords: 'snowflake 雪花算法 分布式 id 解析' },
    { slug: 'jwt', icon: '🔑', name: 'JWT 解析', fullName: 'JWT Token 解析器', keywords: 'jwt token header payload base64 过期时间' },
    { slug: 'codec', icon: '#', name: '编解码/哈希', fullName: '编解码与加密哈希', keywords: 'base64 url unicode sha256 sha512 md5 编码 解码 哈希' },
    { slug: 'timestamp', icon: '⏱', name: '时间戳/进制', fullName: '时间戳与进制转换', keywords: 'timestamp 时间戳 日期 进制 二进制 十六进制' },
    { slug: 'cron', icon: '⏰', name: 'Cron 表达式', fullName: 'Cron 表达式解析与生成', keywords: 'cron 定时任务 quartz spring 执行时间' },
    { slug: 'regex', icon: '.*', name: '正则测试', fullName: '正则表达式测试', keywords: 'regex 正则 匹配 替换 提取' },
    { slug: 'diff', icon: '±', name: '文本对比', fullName: '文本 / JSON 对比', keywords: 'diff 对比 差异 文本 json' }
  ];

  var SITE_PAGES = [
    { url: '/', icon: '🏠', name: '博客主页', keywords: 'home 首页 博客' },
    { url: '/tools/', icon: '☷', name: '开发者工具箱总览', keywords: 'tools 工具箱 全部' },
    { url: '/archives/', icon: '📦', name: '文章归档', keywords: 'archives 归档 文章' },
    { url: '/tags/', icon: '🏷️', name: '文章标签', keywords: 'tags 标签' },
    { url: '/categories/', icon: '📁', name: '文章分类', keywords: 'categories 分类' },
    { url: '/about/', icon: '👤', name: '关于我', keywords: 'about 关于 个人简介 联系' }
  ];

  var RECENT_KEY = 'tools_recent_v1';
  var FAV_KEY = 'tools_fav_v1';

  function getJsonStore(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setJsonStore(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* ignore quota errors */ }
  }

  function getCurrentSlug() {
    var curPath = window.location.pathname;
    for (var i = 0; i < TOOL_MENU.length; i++) {
      var prefix = '/tools/' + TOOL_MENU[i].slug;
      if (curPath === prefix || curPath.indexOf(prefix + '/') === 0) {
        return TOOL_MENU[i].slug;
      }
    }
    return '';
  }

  function recordRecentTool() {
    var slug = getCurrentSlug();
    if (!slug) return;
    var list = getJsonStore(RECENT_KEY, []);
    if (!Array.isArray(list)) list = [];
    list = [slug].concat(list.filter(function (s) { return s !== slug; })).slice(0, 8);
    setJsonStore(RECENT_KEY, list);
  }

  function renderNavStrip() {
    var main = document.getElementById('main-contain');
    if (!main) return;

    var curPath = window.location.pathname;
    var isHub = curPath === '/tools/' || curPath === '/tools/index.html';
    if (isHub || document.querySelector('.tools-hub-controls')) return;

    var curSlug = getCurrentSlug();
    var homePill = '<a href="/tools/" class="tools-nav-pill">☷ 全部工具 (' + TOOL_MENU.length + ')</a>';
    var pills = TOOL_MENU.map(function (t) {
      var isActive = curSlug === t.slug;
      return '<a href="/tools/' + t.slug + '/" class="tools-nav-pill' + (isActive ? ' is-active' : '') + '">' +
        '<span>' + t.icon + '</span><span>' + t.name + '</span></a>';
    }).join('');

    var existingNav = main.querySelector('.tools-nav-strip');
    if (existingNav) {
      existingNav.innerHTML = homePill + pills;
      return;
    }

    var headerCard = document.querySelector('.tools-header-card');
    if (!headerCard) return;
    var nav = document.createElement('nav');
    nav.className = 'tools-nav-strip';
    nav.setAttribute('aria-label', '工具快捷菜单');
    nav.innerHTML = homePill + pills;
    main.insertBefore(nav, headerCard);
  }

  function renderSidebarTools() {
    var tab2 = document.getElementById('sidebar-tab2');
    if (!tab2 || tab2.querySelector('.sidebar-overview')) return;
    var listEl = tab2.querySelector('.mdui-list');
    if (!listEl) return;

    var curSlug = getCurrentSlug();
    listEl.innerHTML = TOOL_MENU.map(function (t) {
      var isActive = curSlug === t.slug;
      return '<a href="/tools/' + t.slug + '/" class="mdui-list-item mdui-ripple' + (isActive ? ' mdui-list-item-active' : '') + '">' +
        '<div class="mdui-list-item-content">' + escapeHtml(t.fullName) + '</div></a>';
    }).join('');
  }

  function fixLegacyLinks() {
    var qqLinks = document.querySelectorAll('a[href="/2310765926"]');
    qqLinks.forEach(function (el) {
      el.setAttribute('href', 'javascript:void(0)');
      el.setAttribute('title', '点击复制 QQ: 2310765926');
      el.addEventListener('click', function (e) {
        e.preventDefault();
        copyText('2310765926', 'QQ 号 (2310765926) ');
      });
    });
  }

  function initCommandPalette() {
    var toolbar = document.getElementById('toolbar');
    if (toolbar && !document.getElementById('cmdTriggerBtn')) {
      var btn = document.createElement('button');
      btn.id = 'cmdTriggerBtn';
      btn.type = 'button';
      btn.className = 'cmd-trigger-btn';
      btn.title = '快捷跳转工具与页面 (Ctrl+K)';
      btn.innerHTML = '<span>⌘ 快速跳转</span><span class="cmd-kbd">Ctrl K</span>';
      btn.addEventListener('click', openPalette);
      var spacer = toolbar.querySelector('.mdui-toolbar-spacer');
      if (spacer && spacer.nextSibling) {
        toolbar.insertBefore(btn, spacer.nextSibling);
      } else {
        toolbar.appendChild(btn);
      }
    }

    var allItems = TOOL_MENU.map(function (t) {
      return {
        url: '/tools/' + t.slug + '/',
        icon: t.icon,
        name: t.fullName,
        sub: '/tools/' + t.slug + '/',
        keywords: (t.name + ' ' + t.fullName + ' ' + t.keywords).toLowerCase()
      };
    }).concat(SITE_PAGES.map(function (p) {
      return {
        url: p.url,
        icon: p.icon,
        name: p.name,
        sub: p.url,
        keywords: (p.name + ' ' + p.keywords).toLowerCase()
      };
    }));

    var overlay = document.createElement('div');
    overlay.id = 'cmdOverlay';
    overlay.className = 'cmd-overlay';
    overlay.innerHTML =
      '<div class="cmd-modal" role="dialog" aria-modal="true" aria-label="快速跳转">' +
        '<div class="cmd-input-wrap">' +
          '<span>🔍</span>' +
          '<input id="cmdInput" class="cmd-input" type="text" placeholder="输入工具名、关键词或页面（如 jwt / cron / sql / json）...">' +
          '<span class="cmd-kbd">ESC</span>' +
        '</div>' +
        '<div id="cmdList" class="cmd-list"></div>' +
        '<div class="cmd-footer">' +
          '<span>↑↓ 选择 · Enter 跳转</span>' +
          '<span>共 ' + TOOL_MENU.length + ' 款本地工具</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var inputEl = document.getElementById('cmdInput');
    var listEl = document.getElementById('cmdList');
    var activeIdx = 0;
    var filtered = allItems.slice();

    function renderList() {
      if (!filtered.length) {
        listEl.innerHTML = '<div class="cmd-empty">没有匹配的工具或页面</div>';
        return;
      }
      if (activeIdx >= filtered.length) activeIdx = 0;
      if (activeIdx < 0) activeIdx = filtered.length - 1;
      listEl.innerHTML = filtered.map(function (item, idx) {
        return '<a href="' + item.url + '" class="cmd-item' + (idx === activeIdx ? ' is-active' : '') + '" data-idx="' + idx + '">' +
          '<div class="cmd-item-left">' +
            '<span class="cmd-item-icon">' + escapeHtml(item.icon) + '</span>' +
            '<div><div class="cmd-item-title">' + escapeHtml(item.name) + '</div>' +
            '<div class="cmd-item-sub">' + escapeHtml(item.sub) + '</div></div>' +
          '</div>' +
          '<span class="cmd-kbd">↵</span>' +
        '</a>';
      }).join('');
    }

    function openPalette() {
      overlay.classList.add('is-open');
      inputEl.value = '';
      filtered = allItems.slice();
      activeIdx = 0;
      renderList();
      setTimeout(function () { inputEl.focus(); }, 10);
    }

    function closePalette() {
      overlay.classList.remove('is-open');
    }

    inputEl.addEventListener('input', function () {
      var kw = (inputEl.value || '').trim().toLowerCase();
      filtered = !kw ? allItems.slice() : allItems.filter(function (item) {
        return item.keywords.indexOf(kw) !== -1 || item.sub.indexOf(kw) !== -1;
      });
      activeIdx = 0;
      renderList();
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx++;
        renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx--;
        renderList();
      } else if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault();
        window.location.href = filtered[activeIdx].url;
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePalette();
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (overlay.classList.contains('is-open')) closePalette();
        else openPalette();
      } else if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closePalette();
      }
    });
  }

  function registerPWA() {
    if (!document.querySelector('link[rel="manifest"]')) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
    if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* ignore */ });
    }
  }

  function notify(msg) {
    if (window.mdui && typeof mdui.snackbar === 'function') {
      mdui.snackbar({ message: msg, timeout: 2000, position: 'bottom' });
    }
  }

  function copyText(text, label) {
    if (!text) {
      notify('没有可复制的内容');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        notify((label || '内容') + '已复制到剪贴板');
      }).catch(function () {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify((label || '内容') + '已复制到剪贴板');
    } catch (e) {
      notify('复制失败，请手动复制');
    }
    document.body.removeChild(ta);
  }

  function downloadText(filename, text) {
    if (!text) {
      notify('没有可下载的内容');
      return;
    }
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMeta(text) {
    if (!text) return '0 字符 · 0 行';
    var lines = text.split(/\r\n|\r|\n/).length;
    var bytes = new Blob([text]).size;
    var sizeStr = bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
    return text.length + ' 字符 · ' + lines + ' 行 · ' + sizeStr;
  }

  function setStatus(el, type, message) {
    if (!el) return;
    el.className = 'tool-status';
    if (!message) return;
    el.textContent = message;
    el.classList.add('is-visible', type === 'error' ? 'is-error' : 'is-success');
  }

  recordRecentTool();
  renderNavStrip();
  renderSidebarTools();
  fixLegacyLinks();
  initCommandPalette();
  registerPWA();

  window.ToolsCommon = {
    TOOL_MENU: TOOL_MENU,
    RECENT_KEY: RECENT_KEY,
    FAV_KEY: FAV_KEY,
    getJsonStore: getJsonStore,
    setJsonStore: setJsonStore,
    notify: notify,
    copyText: copyText,
    downloadText: downloadText,
    escapeHtml: escapeHtml,
    formatMeta: formatMeta,
    setStatus: setStatus
  };
})(window);
