/**
 * 工具箱公共脚本
 * - 统一渲染站点外壳（appbar / drawer / footer / gotop），页面只保留内容区
 * - 工具快捷导航条、侧栏工具列表
 * - Ctrl+K 快捷跳转面板（含焦点管理与 ARIA）
 * - 常用工具函数：复制、下载、状态条、体积统计
 */
(function (window, document) {
  'use strict';

  /* 工具清单：icon 统一使用等宽字形/短标签，避免 emoji 在各端渲染不一致 */
  var TOOL_MENU = [
    { slug: 'json', icon: '{ }', name: 'JSON 转换', fullName: 'JSON 格式化与转换', keywords: 'json 格式化 压缩 转义 typescript go struct url' },
    { slug: 'jsonpath', icon: '⌖', name: 'JSONPath 定位', fullName: 'JSONPath 定位', keywords: 'jsonpath 定位 查询 过滤 路径' },
    { slug: 'json-java', icon: 'POJO', name: 'JSON ↔ Java', fullName: 'JSON ↔ Java 实体类', keywords: 'json java 实体类 pojo dto 转换' },
    { slug: 'excel', icon: '⊞', name: 'Excel 转 JSON', fullName: 'Excel / CSV 转 JSON', keywords: 'excel csv tsv xlsx xls json 表格' },
    { slug: 'excel-sql', icon: 'X/DB', name: 'Excel 转 SQL', fullName: 'Excel 转 SQL 生成器', keywords: 'excel sql insert create table xlsx xls 数据库' },
    { slug: 'sql', icon: 'SQL', name: 'SQL / MyBatis', fullName: 'SQL 格式化 & MyBatis 还原', keywords: 'sql 格式化 压缩 mybatis preparing parameters 日志还原' },
    { slug: 'mermaid', icon: '❖', name: 'Mermaid 渲染', fullName: 'Mermaid 图表渲染', keywords: 'mermaid 流程图 时序图 甘特图 思维导图 架构图 svg png' },
    { slug: 'svg', icon: '◈', name: 'SVG 转 PNG/JPG', fullName: 'SVG 转 PNG / JPG', keywords: 'svg png jpg 矢量图 转换 导出' },
    { slug: 'image', icon: '▣', name: '图片压缩', fullName: '图片压缩与转换', keywords: 'image 图片 压缩 webp jpeg png 裁剪' },
    { slug: 'color', icon: '◐', name: '颜色转换', fullName: '颜色转换与对比度', keywords: 'color hex rgb hsl wcag 对比度 调色板' },
    { slug: 'uuid', icon: '⚿', name: 'UUID 生成', fullName: 'UUID / 随机 ID 生成', keywords: 'uuid nanoid 密码 随机字符串 生成器' },
    { slug: 'snowflake', icon: '❄', name: 'Snowflake ID', fullName: 'Snowflake ID 生成器', keywords: 'snowflake 雪花算法 分布式 id 解析' },
    { slug: 'jwt', icon: 'JWT', name: 'JWT 解析', fullName: 'JWT Token 解析器', keywords: 'jwt token header payload base64 过期时间' },
    { slug: 'codec', icon: '#', name: '编解码/哈希', fullName: '编解码与加密哈希', keywords: 'base64 url unicode sha256 sha512 md5 编码 解码 哈希' },
    { slug: 'timestamp', icon: '◴', name: '时间戳/进制', fullName: '时间戳与进制转换', keywords: 'timestamp 时间戳 日期 进制 二进制 十六进制' },
    { slug: 'cron', icon: '◷', name: 'Cron 表达式', fullName: 'Cron 表达式解析与生成', keywords: 'cron 定时任务 quartz spring 执行时间' },
    { slug: 'calc', icon: '∑', name: '科学计算器', fullName: '科学计算器', keywords: 'calc calculator 计算器 科学计算 三角函数 对数 阶乘' },
    { slug: 'regex', icon: '.*', name: '正则测试', fullName: '正则表达式测试', keywords: 'regex 正则 匹配 替换 提取' },
    { slug: 'diff', icon: '±', name: '文本对比', fullName: '文本 / JSON 对比', keywords: 'diff 对比 差异 文本 json' }
  ];

  /* 站点页面 */
  var SITE_PAGES = [
    { url: '/', icon: '⌂', name: '博客主页', keywords: 'home 首页 博客' },
    { url: '/tools/', icon: '☷', name: '开发者工具箱总览', keywords: 'tools 工具箱 全部' },
    { url: '/archives/', icon: '▤', name: '文章归档', keywords: 'archives 归档 文章' },
    { url: '/tags/', icon: '⌗', name: '文章标签', keywords: 'tags 标签' },
    { url: '/categories/', icon: '▥', name: '文章分类', keywords: 'categories 分类' },
    { url: '/about/', icon: '◍', name: '关于我', keywords: 'about 关于 个人简介 联系' }
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

  function getCurrentTool() {
    var slug = getCurrentSlug();
    for (var i = 0; i < TOOL_MENU.length; i++) {
      if (TOOL_MENU[i].slug === slug) return TOOL_MENU[i];
    }
    return null;
  }

  function recordRecentTool() {
    var slug = getCurrentSlug();
    if (!slug) return;
    var list = getJsonStore(RECENT_KEY, []);
    if (!Array.isArray(list)) list = [];
    list = [slug].concat(list.filter(function (s) { return s !== slug; })).slice(0, 8);
    setJsonStore(RECENT_KEY, list);
  }

  /* -------------------- 站点外壳 -------------------- */

  function isBlogPage() {
    return !getCurrentSlug() && document.getElementById('toolbar') &&
      !document.querySelector('main[data-shell="tools"]');
  }

  function currentSubtitle() {
    var tool = getCurrentTool();
    if (tool) return tool.fullName;
    var path = window.location.pathname;
    if (path === '/tools/' || path === '/tools/index.html') return 'DEVTOOLS';
    var map = {
      '/': '主页',
      '/archives/': '归档',
      '/tags/': '标签',
      '/categories/': '分类',
      '/about/': '关于'
    };
    return map[path] || '站点';
  }

  function siteNavItems() {
    var path = window.location.pathname;
    var items = [
      { url: '/', icon: 'icon-home', label: '主页' },
      { url: '/tags/', icon: 'icon-bookmark', label: '标签' },
      { url: '/categories/', icon: 'icon-folder', label: '分类' },
      { url: '/archives/', icon: 'icon-archive', label: '归档' },
      { url: '/tools/', icon: 'icon-tools', label: '工具箱' },
      { url: '/about/', icon: 'icon-user', label: '关于' }
    ];
    return items.map(function (item) {
      var isActive = item.url === path ||
        (item.url !== '/' && path.indexOf(item.url) === 0);
      return '<a href="' + item.url + '" class="mdui-list-item mdui-ripple' +
        (isActive ? ' mdui-list-item-active' : '') + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' +
        '<div class="mdui-list-item-icon"><i class="iconfont ' + item.icon + '" aria-hidden="true"></i></div>' +
        '<div class="mdui-list-item-content">' + item.label + '</div></a>';
    }).join('');
  }

  function shellMarkup() {
    var subtitle = currentSubtitle();
    return {
      appbar:
        '<header class="mdui-appbar mdui-appbar-fixed">' +
          '<div id="toolbar" class="mdui-toolbar mdui-color-theme">' +
            '<button class="mdui-btn mdui-btn-icon" type="button" aria-label="打开导航菜单"' +
              ' mdui-drawer="{target: \'#sidebar\', swipe: true}">' +
              '<i class="iconfont icon-menu" aria-hidden="true"></i></button>' +
            '<a href="/" class="mdui-typo-headline">xsgaaaa 的工作台</a>' +
            '<a href="/tools/" class="header-subtitle mdui-typo-headline" title="返回工具箱">' +
              escapeHtml(subtitle) + '</a>' +
            '<div class="mdui-toolbar-spacer"></div>' +
            '<button class="mdui-btn mdui-btn-icon" type="button" aria-label="搜索站内文章"' +
              ' mdui-dialog="{target: \'#search\'}" mdui-tooltip="{content: \'搜索\'}">' +
              '<i class="iconfont icon-search" aria-hidden="true"></i></button>' +
          '</div>' +
        '</header>' +
        '<div class="mdui-dialog" id="search" role="dialog" aria-label="站内搜索">' +
          '<div class="search-form">' +
            '<input type="search" class="search-form-input" placeholder="请输入关键字"' +
              ' aria-label="搜索站内文章" onfocus="listenSearchFunc()">' +
          '</div>' +
          '<div class="search-result" data-resource="/search.xml"></div>' +
        '</div>',

      sidebar:
        '<aside id="sidebar" class="mdui-drawer" aria-label="站点导航">' +
          '<div class="mdui-tab" mdui-tab>' +
            '<a href="#sidebar-tab1" class="mdui-ripple mdui-tab-active">站点概览</a>' +
            '<a href="#sidebar-tab2" class="mdui-ripple">全部工具</a>' +
          '</div>' +
          '<div id="sidebar-tab1" class="mdui-p-a-2">' +
            '<div class="mdui-list">' +
              siteNavItems() +
              '<div class="mdui-list-item mdui-ripple">' +
                '<div class="mdui-list-item-icon"><i class="iconfont icon-moon" aria-hidden="true"></i></div>' +
                '<div class="mdui-list-item-content"><label for="nightmode_switch">夜间模式</label></div>' +
                '<label class="mdui-switch" id="darkmode">' +
                  '<input type="checkbox" id="nightmode_switch"/>' +
                  '<i class="mdui-switch-icon"></i>' +
                '</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="sidebar-tab2" class="mdui-p-a-2"><div class="mdui-list"></div></div>' +
          '<div class="mdui-divider"></div>' +
        '</aside>',

      footer:
        '<footer id="footer" class="mdui-text-center mdui-m-t-5 mdui-p-b-2 mdui-p-t-4 mdui-color-theme">' +
          '<div class="mdui-container"><div class="mdui-row">' +
            '<span>&copy; 2015 - 2026 <span class="iconfont icon-heart" style="color:#a8431a" aria-hidden="true"></span> xsgaaaa</span>' +
          '</div></div>' +
        '</footer>' +
        '<button id="gotop" class="mdui-fab mdui-fab-fixed mdui-fab-hide mdui-ripple"' +
          ' style="z-index:100" type="button" aria-label="回到顶部">' +
          '<i class="iconfont icon-arrowup" aria-hidden="true"></i></button>'
    };
  }

  /** 只在 `.tools-*` 内容页注入外壳；博客页保留 Hexo 生成的静态外壳 */
  function renderShell() {
    var main = document.getElementById('main-contain');
    if (!main || main.getAttribute('data-shell') !== 'tools') return;
    if (document.getElementById('toolbar')) return;

    var markup = shellMarkup();

    main.insertAdjacentHTML('beforebegin', markup.appbar + markup.sidebar);
    main.insertAdjacentHTML('afterend', markup.footer);

    /* 夜间模式：外壳后注入，需自行绑定（博客页由 meadow.js 绑定静态开关） */
    var switchEl = document.getElementById('nightmode_switch');
    if (switchEl) {
      switchEl.addEventListener('click', function () {
        var isDark = document.body.classList.contains('mdui-theme-layout-dark');
        if (isDark) {
          document.body.classList.remove('mdui-theme-layout-dark');
          localStorage.removeItem('mdui-theme-layout-dark');
        } else {
          document.body.classList.add('mdui-theme-layout-dark');
          localStorage.setItem('mdui-theme-layout-dark', 'true');
        }
      });
    }

    /* 回到顶部：同上 */
    var gotop = document.getElementById('gotop');
    if (gotop) {
      var syncGotop = function () {
        var top = document.documentElement.scrollTop || document.body.scrollTop;
        gotop.classList.toggle('mdui-fab-hide', top === 0);
      };
      window.addEventListener('scroll', syncGotop, { passive: true });
      gotop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      syncGotop();
    }
  }

  /* -------------------- 工具导航 -------------------- */

  function renderNavStrip() {
    var main = document.getElementById('main-contain');
    if (!main) return;

    /* 快捷切换条只属于工具箱：仅在具体工具页注入，
       首页 / 标签 / 分类 / 关于等站点页面不显示 */
    var curSlug = getCurrentSlug();
    if (!curSlug) return;

    var homePill = '<a href="/tools/" class="tools-nav-pill">' +
      '<span class="pill-icon" aria-hidden="true">☷</span><span>全部工具 (' + TOOL_MENU.length + ')</span></a>';
    var pills = TOOL_MENU.map(function (t) {
      var isActive = curSlug === t.slug;
      return '<a href="/tools/' + t.slug + '/" class="tools-nav-pill' + (isActive ? ' is-active' : '') + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' +
        '<span class="pill-icon" aria-hidden="true">' + escapeHtml(t.icon) + '</span>' +
        '<span>' + escapeHtml(t.name) + '</span></a>';
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
      return '<a href="/tools/' + t.slug + '/" class="mdui-list-item mdui-ripple' +
        (isActive ? ' mdui-list-item-active' : '') + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' +
        '<div class="mdui-list-item-content">' + escapeHtml(t.fullName) + '</div></a>';
    }).join('');
  }

  function fixLegacyLinks() {
    var qqLinks = document.querySelectorAll('a[href="/2310765926"]');
    Array.prototype.forEach.call(qqLinks, function (el) {
      /* 去掉不可抓取的 javascript: 伪链接，改为可聚焦的按钮语义 */
      el.removeAttribute('href');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', '复制 QQ 号 2310765926');
      el.setAttribute('title', '点击复制 QQ: 2310765926');
      el.classList.add('qq-copy-link');
      el.addEventListener('click', function (e) {
        e.preventDefault();
        copyText('2310765926', 'QQ 号 (2310765926) ');
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyText('2310765926', 'QQ 号 (2310765926) ');
        }
      });
    });
  }

  /* -------------------- 快捷跳转面板 -------------------- */

  function initCommandPalette() {
    var toolbar = document.getElementById('toolbar');
    if (toolbar && !document.getElementById('cmdTriggerBtn')) {
      var btn = document.createElement('button');
      btn.id = 'cmdTriggerBtn';
      btn.type = 'button';
      btn.className = 'cmd-trigger-btn';
      btn.setAttribute('aria-keyshortcuts', 'Control+K Meta+K');
      btn.title = '快捷跳转工具与页面 (Ctrl+K)';
      btn.innerHTML = '<span>快速跳转</span><span class="cmd-kbd" aria-hidden="true">Ctrl K</span>';
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
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="cmd-modal" role="dialog" aria-modal="true" aria-label="快速跳转">' +
        '<div class="cmd-input-wrap">' +
          '<span aria-hidden="true">⌕</span>' +
          '<input id="cmdInput" class="cmd-input" type="text" role="combobox"' +
            ' aria-label="搜索工具或页面" aria-expanded="false" aria-controls="cmdList"' +
            ' aria-autocomplete="list" placeholder="输入工具名、关键词或页面（如 jwt / cron / sql / json）..."' +
            ' autocomplete="off">' +
          '<span class="cmd-kbd" aria-hidden="true">ESC</span>' +
        '</div>' +
        '<div id="cmdList" class="cmd-list" role="listbox" aria-label="跳转结果"></div>' +
        '<div class="cmd-footer">' +
          '<span>↑↓ 选择 · Enter 跳转 · ESC 关闭</span>' +
          '<span>共 ' + TOOL_MENU.length + ' 款本地工具</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var inputEl = document.getElementById('cmdInput');
    var listEl = document.getElementById('cmdList');
    var modalEl = overlay.querySelector('.cmd-modal');
    var activeIdx = 0;
    var filtered = allItems.slice();
    var lastFocused = null;

    function renderList() {
      if (!filtered.length) {
        listEl.innerHTML = '<div class="cmd-empty" role="status">没有匹配的工具或页面</div>';
        inputEl.removeAttribute('aria-activedescendant');
        return;
      }
      if (activeIdx >= filtered.length) activeIdx = 0;
      if (activeIdx < 0) activeIdx = filtered.length - 1;
      listEl.innerHTML = filtered.map(function (item, idx) {
        var selected = idx === activeIdx;
        return '<a href="' + item.url + '" class="cmd-item' + (selected ? ' is-active' : '') + '"' +
          ' id="cmd-opt-' + idx + '" role="option" tabindex="-1" aria-selected="' + (selected ? 'true' : 'false') + '">' +
          '<div class="cmd-item-left">' +
            '<span class="cmd-item-icon" aria-hidden="true">' + escapeHtml(item.icon) + '</span>' +
          '<div><div class="cmd-item-title">' + escapeHtml(item.name) + '</div>' +
            '<div class="cmd-item-sub">' + escapeHtml(item.sub) + '</div></div>' +
          '</div>' +
          '<span class="cmd-kbd" aria-hidden="true">↵</span>' +
        '</a>';
      }).join('');
      inputEl.setAttribute('aria-activedescendant', 'cmd-opt-' + activeIdx);
      var activeEl = document.getElementById('cmd-opt-' + activeIdx);
      if (activeEl && activeEl.scrollIntoView) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }

    function openPalette() {
      lastFocused = document.activeElement;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      inputEl.setAttribute('aria-expanded', 'true');
      inputEl.value = '';
      filtered = allItems.slice();
      activeIdx = 0;
      renderList();
      window.setTimeout(function () { inputEl.focus(); }, 10);
    }

    function closePalette() {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      inputEl.setAttribute('aria-expanded', 'false');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
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
        e.preventDefault();
        closePalette();
      } else if (e.key === 'Tab') {
        /* 焦点保持在输入框，避免 Tab 跳出模态 */
        e.preventDefault();
      }
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePalette();
    });

    listEl.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('.cmd-item') : null;
      if (item && !e.metaKey && !e.ctrlKey) closePalette();
    });

    document.addEventListener('keydown', function (e) {
      var isOpen = overlay.classList.contains('is-open');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) closePalette();
        else openPalette();
      } else if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    });
  }

  /* -------------------- 可访问性增强（渐进式，不改页面结构） -------------------- */

  function enhanceA11y() {
    var main = document.getElementById('main-contain');
    if (!main) return;

    /* 1. 为无标签表单控件补齐可访问名称（占位符 / title / 同区标题） */
    var controls = main.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(controls, function (el) {
      var type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'hidden' || type === 'file') return;
      if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
      if (el.closest('label')) return;
      if (el.id && document.querySelector('label[for="' + el.id + '"]')) return;

      var label = el.getAttribute('placeholder') || el.getAttribute('title');

      /* 优先使用同一字段容器里的可见标签（.tool-kv-label 等） */
      if (!label) {
        var fieldWrap = el.closest('.tool-kv-item, .sql-col-row, .field, td');
        var fieldLabel = fieldWrap &&
          fieldWrap.querySelector('.tool-kv-label, label, .sql-col-header');
        if (fieldLabel) label = fieldLabel.textContent.trim();
      }

      if (!label) {
        var pane = el.closest('.tool-pane, .tool-panel');
        var head = pane && pane.querySelector('.tool-pane-header span, .tool-pane-header');
        if (head) label = head.textContent.trim();
      }

      if (!label) {
        var field = el.parentElement;
        var parentLabel = field && field.querySelector('label, span');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (label) el.setAttribute('aria-label', label.replace(/\s+/g, ' ').slice(0, 80));
    });

    /* 2. 状态条改为 live region，读屏可获知执行结果 */
    Array.prototype.forEach.call(document.querySelectorAll('.tool-status'), function (el) {
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
    });

    /* 3. 兼容 Hexo 生成的静态外壳：补齐按钮与开关的可访问名称 */
    var drawerBtn = document.querySelector('#toolbar button[mdui-drawer]');
    if (drawerBtn && !drawerBtn.getAttribute('aria-label')) {
      drawerBtn.setAttribute('aria-label', '打开导航菜单');
    }

    var searchBtn = document.querySelector('#toolbar button[mdui-dialog]');
    if (searchBtn && !searchBtn.getAttribute('aria-label')) {
      searchBtn.setAttribute('aria-label', '搜索站内文章');
    }

    var gotopBtn = document.getElementById('gotop');
    if (gotopBtn && !gotopBtn.getAttribute('aria-label')) {
      gotopBtn.setAttribute('aria-label', '回到顶部');
    }

    var nightSwitch = document.getElementById('nightmode_switch');
    if (nightSwitch && !nightSwitch.getAttribute('aria-label')) {
      nightSwitch.setAttribute('aria-label', '夜间模式');
    }

    var searchInput = document.querySelector('.search-form-input');
    if (searchInput && !searchInput.getAttribute('aria-label')) {
      searchInput.setAttribute('aria-label', '搜索站内文章');
    }
  }

  /* -------------------- 访客统计（不蒜子，全站统一页脚） -------------------- */

  var STATS_SCRIPT = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';

  /* 指标定义：容器 id 与不蒜子约定保持一致；value id 用于取值 */
  var STATS_ITEMS = [
    { label: '总访问', container: 'busuanzi_container_site_pv', value: 'busuanzi_value_site_pv' },
    { label: '访客', container: 'busuanzi_container_site_uv', value: 'busuanzi_value_site_uv' },
    { label: '本页', container: 'busuanzi_container_page_pv', value: 'busuanzi_value_page_pv' }
  ];

  function formatCount(text) {
    var digits = String(text == null ? '' : text).replace(/[^\d]/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function ensureStatsBlock() {
    var footer = document.getElementById('footer');
    if (!footer) return null;

    var existing = footer.querySelector('.site-stats');
    if (existing) return existing;

    /* 某些 Hexo 文章内已内联了「阅读次数」，避免重复 id */
    var items = STATS_ITEMS.filter(function (item) {
      return !document.getElementById(item.value);
    });
    if (!items.length) return null;

    var el = document.createElement('div');
    el.className = 'site-stats';
    el.setAttribute('aria-label', '站点访问统计');
    el.setAttribute('title', '统计数据来自不蒜子（busuanzi）');
    el.hidden = true;
    el.innerHTML = items.map(function (item) {
      return '<span class="stat-item" id="' + item.container + '">' +
        '<span class="stat-label">' + item.label + '</span>' +
        '<span class="stat-value" id="' + item.value + '"></span>' +
      '</span>';
    }).join('');

    var host = footer.querySelector('.mdui-container') || footer;
    host.insertBefore(el, host.firstChild);
    return el;
  }

  function loadStatsScript() {
    if (document.querySelector('script[src*="busuanzi"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = STATS_SCRIPT;
    /* 统计服务不可用时保持隐藏，不影响页面 */
    s.onerror = function () { /* noop */ };
    document.body.appendChild(s);
  }

  function mountVisitorStats() {
    var block = ensureStatsBlock();
    if (!block) return;

    var values = STATS_ITEMS
      .map(function (item) { return document.getElementById(item.value); })
      .filter(Boolean);
    if (!values.length) return;

    /* 数字到达后加千分位并显示整块 */
    var apply = function () {
      var hasValue = false;
      values.forEach(function (node) {
        var text = formatCount(node.textContent);
        var inBlock = block.contains(node);
        var item = inBlock ? node.parentElement : null;

        if (text) {
          if (node.textContent !== text) node.textContent = text;
          if (item) item.hidden = false;
          if (inBlock) hasValue = true;
        } else if (item) {
          /* 单项缺失时隐藏该项，避免只剩标签 */
          item.hidden = true;
        }
      });
      if (hasValue) block.hidden = false;
    };

    if (window.MutationObserver) {
      var observer = new MutationObserver(apply);
      values.forEach(function (node) {
        observer.observe(node, { childList: true, characterData: true, subtree: true });
      });
    }

    loadStatsScript();
    apply();
    /* 兜底：脚本晚到时再检查一次 */
    window.setTimeout(apply, 3500);
  }

  /* -------------------- PWA -------------------- */

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

  /* -------------------- 工具函数 -------------------- */

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
  renderShell();
  renderNavStrip();
  renderSidebarTools();
  fixLegacyLinks();
  initCommandPalette();
  enhanceA11y();
  mountVisitorStats();
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
})(window, document);
