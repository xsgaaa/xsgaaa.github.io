(function (window) {
  'use strict';

  var TOOL_MENU = [
    { slug: 'json', icon: '{ }', name: 'JSON 转换' },
    { slug: 'jsonpath', icon: '⌖', name: 'JSONPath 定位' },
    { slug: 'json-java', icon: '☕', name: 'JSON ↔ Java' },
    { slug: 'excel', icon: '⊞', name: 'Excel 转 JSON' },
    { slug: 'excel-sql', icon: '⛁', name: 'Excel 转 SQL' },
    { slug: 'mermaid', icon: '❖', name: 'Mermaid 渲染' },
    { slug: 'svg', icon: '◈', name: 'SVG 转 PNG/JPG' },
    { slug: 'image', icon: '▣', name: '图片压缩' },
    { slug: 'uuid', icon: '⚿', name: 'UUID 生成' },
    { slug: 'snowflake', icon: '❄', name: 'Snowflake ID' },
    { slug: 'codec', icon: '#', name: '编解码/哈希' },
    { slug: 'timestamp', icon: '⏱', name: '时间戳/进制' },
    { slug: 'regex', icon: '.*', name: '正则测试' },
    { slug: 'diff', icon: '±', name: '文本对比' }
  ];

  function renderNavStrip() {
    var main = document.getElementById('main-contain');
    var headerCard = document.querySelector('.tools-header-card');
    if (!main || !headerCard || document.querySelector('.tools-hub-controls')) return;

    var curPath = window.location.pathname;
    var nav = document.createElement('nav');
    nav.className = 'tools-nav-strip';
    nav.setAttribute('aria-label', '工具快捷菜单');

    var homePill = '<a href="/tools/" class="tools-nav-pill">☷ 全部工具</a>';
    var pills = TOOL_MENU.map(function (t) {
      var isActive = curPath.indexOf('/tools/' + t.slug) !== -1;
      return '<a href="/tools/' + t.slug + '/" class="tools-nav-pill' + (isActive ? ' is-active' : '') + '">' +
        '<span>' + t.icon + '</span><span>' + t.name + '</span></a>';
    }).join('');

    nav.innerHTML = homePill + pills;
    main.insertBefore(nav, headerCard);
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

  renderNavStrip();

  window.ToolsCommon = {
    notify: notify,
    copyText: copyText,
    downloadText: downloadText,
    escapeHtml: escapeHtml,
    formatMeta: formatMeta,
    setStatus: setStatus
  };
})(window);
