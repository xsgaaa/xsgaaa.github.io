(function () {
  var inputEl = document.getElementById('mermaidInput');
  var previewEl = document.getElementById('mermaidPreview');
  var canvasEl = document.getElementById('mermaidCanvas');
  var stageEl = document.getElementById('mermaidStage');
  var statusEl = document.getElementById('mermaidStatus');
  var themeSel = document.getElementById('themeSelect');
  var exportScaleSel = document.getElementById('exportScaleSelect');
  var renderMetaEl = document.getElementById('renderMeta');
  var zoomLabelEl = document.getElementById('zoomLabel');
  var resizerEl = document.getElementById('mermaidResizer');
  var editorPaneEl = document.getElementById('editorPane');
  var workbenchEl = document.getElementById('mermaidWorkbench');

  var zoom = 1;
  var panX = 0;
  var panY = 0;
  var isDragging = false;
  var isResizing = false;
  var startX = 0;
  var startY = 0;
  var renderSeq = 0;
  var debounceTimer = null;

  var templates = {
    flowchart: 'flowchart TD\n  A[用户输入请求] --> B{参数校验?}\n  B -- 通过 --> C[处理业务逻辑]\n  B -- 失败 --> D[返回 400 错误]\n  C --> E[(写入数据库)]\n  E --> F[返回 200 成功]',
    sequence: 'sequenceDiagram\n  autonumber\n  participant C as 客户端\n  participant S as 服务端\n  participant DB as 数据库\n  C->>S: POST /api/login\n  S->>DB: 查询用户信息\n  DB-->>S: 返回用户记录\n  S-->>C: 返回 JWT Token',
    class: 'classDiagram\n  class User {\n    +int id\n    +string name\n    +login()\n  }\n  class Order {\n    +string orderNo\n    +decimal amount\n    +pay()\n  }\n  User "1" --> "*" Order : places',
    state: 'stateDiagram-v2\n  [*] --> 待支付\n  待支付 --> 已支付 : 支付成功\n  待支付 --> 已取消 : 超时关闭\n  已支付 --> 已发货 : 仓库出库\n  已发货 --> 已完成 : 确认收货\n  已完成 --> [*]',
    er: 'erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ORDER_ITEM : contains\n  PRODUCT ||--o{ ORDER_ITEM : includes',
    gantt: 'gantt\n  title 项目迭代计划\n  dateFormat YYYY-MM-DD\n  section 需求与设计\n  需求评审 :done, a1, 2026-11-01, 3d\n  架构设计 :active, a2, after a1, 4d\n  section 开发与测试\n  核心开发 :a3, after a2, 7d\n  联调测试 :a4, after a3, 4d',
    mindmap: 'mindmap\n  root((软件系统架构))\n    前端\n      HTML / CSS\n      TypeScript\n      Mermaid 渲染引擎\n    后端\n      Spring Boot\n      MySQL 数据库\n      Redis 缓存\n    运维 DevOps\n      Docker 容器化\n      CI/CD 自动化',
    pie: 'pie showData\n  title 技术栈分布\n  "TypeScript" : 45\n  "Go" : 30\n  "Python" : 15\n  "Rust" : 10'
  };

  if (document.body.classList.contains('mdui-theme-layout-dark')) {
    themeSel.value = 'dark';
  }

  function updateTransform() {
    if (isNaN(zoom) || !isFinite(zoom) || zoom <= 0) zoom = 1;
    if (isNaN(panX) || !isFinite(panX)) panX = 0;
    if (isNaN(panY) || !isFinite(panY)) panY = 0;
    stageEl.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
    zoomLabelEl.textContent = Math.round(zoom * 100) + '%';
  }

  function getSvgVisualBounds(svg) {
    var x = 0, y = 0, w = 0, h = 0;
    var vb = svg.getAttribute('viewBox');
    if (vb) {
      var parts = vb.trim().split(/[\s,]+/).map(parseFloat).filter(function (n) { return !isNaN(n); });
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
      }
    }
    try {
      if (typeof svg.getBBox === 'function') {
        var bbox = svg.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          return { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height };
        }
      }
    } catch (e) {}
    try {
      var rect = svg.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        return { x: 0, y: 0, w: rect.width, h: rect.height };
      }
    } catch (e) {}
    var attrW = parseFloat(svg.getAttribute('width'));
    var attrH = parseFloat(svg.getAttribute('height'));
    if (!isNaN(attrW) && attrW > 0) w = attrW;
    if (!isNaN(attrH) && attrH > 0) h = attrH;
    return { x: x, y: y, w: w || 800, h: h || 600 };
  }

  window.fitToScreen = function () {
    var svg = previewEl.querySelector('svg');
    if (!svg) {
      zoom = 1;
      panX = 0;
      panY = 0;
      updateTransform();
      return;
    }
    var containerRect = canvasEl.getBoundingClientRect();
    var padding = 40;
    var availW = Math.max(containerRect.width - padding * 2, 100);
    var availH = Math.max(containerRect.height - padding * 2, 100);
    var bounds = getSvgVisualBounds(svg);
    svg.style.maxWidth = 'none';
    svg.style.width = bounds.w + 'px';
    svg.style.height = bounds.h + 'px';

    var targetScale = Math.min(availW / bounds.w, availH / bounds.h);
    if (isNaN(targetScale) || !isFinite(targetScale) || targetScale <= 0) targetScale = 1;
    zoom = Math.min(targetScale, 2.5);
    panX = 0;
    panY = 0;
    updateTransform();
  };

  window.zoomBy = function (factor) {
    zoom = Math.min(20, Math.max(0.05, zoom * factor));
    updateTransform();
  };

  window.resetZoom = function () {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  };

  window.renderMermaid = async function () {
    var code = inputEl.value.trim();
    if (!code) {
      previewEl.innerHTML = '';
      renderMetaEl.textContent = '暂无输入';
      ToolsCommon.setStatus(statusEl, '', '');
      return;
    }
    if (typeof mermaid === 'undefined') {
      ToolsCommon.setStatus(statusEl, 'error', 'Mermaid 库未能加载，请检查网络连接');
      return;
    }
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: themeSel.value,
        securityLevel: 'loose',
        flowchart: { htmlLabels: false }
      });
      var id = 'mermaid-svg-' + (++renderSeq);
      var res = await mermaid.render(id, code);
      previewEl.innerHTML = res.svg;
      renderMetaEl.textContent = '渲染成功';
      ToolsCommon.setStatus(statusEl, '', '');
      requestAnimationFrame(window.fitToScreen);
    } catch (e) {
      renderMetaEl.textContent = '语法错误';
      ToolsCommon.setStatus(statusEl, 'error', 'Mermaid 语法错误: ' + (e.message || e));
    }
  };

  window.applyTemplate = function (key) {
    if (!key || !templates[key]) return;
    inputEl.value = templates[key];
    renderMermaid();
  };

  window.clearCode = function () {
    inputEl.value = '';
    renderMermaid();
  };

  function getCleanSvgData() {
    var svg = previewEl.querySelector('svg');
    if (!svg) throw new Error('请先渲染图表');
    var clone = svg.cloneNode(true);
    var bounds = getSvgVisualBounds(svg);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('width', bounds.w);
    clone.setAttribute('height', bounds.h);
    clone.setAttribute('viewBox', bounds.x + ' ' + bounds.y + ' ' + bounds.w + ' ' + bounds.h);
    clone.style.maxWidth = 'none';
    clone.style.width = bounds.w + 'px';
    clone.style.height = bounds.h + 'px';

    var svgData = new XMLSerializer().serializeToString(clone);
    svgData = svgData.replace(/url\(['"]?[^)'"]*#([^)'"]+)['"]?\)/g, 'url(#$1)');
    return { svgData: svgData, width: bounds.w, height: bounds.h };
  }

  window.exportSvg = function () {
    try {
      var data = getCleanSvgData();
      ToolsCommon.downloadText('mermaid-diagram.svg', data.svgData);
    } catch (e) {
      ToolsCommon.notify(e.message || '导出失败');
    }
  };

  window.exportBitmap = function (format) {
    try {
      var data = getCleanSvgData();
      var scale = parseFloat(exportScaleSel.value) || 2;
      var canvasW = Math.round(data.width * scale);
      var canvasH = Math.round(data.height * scale);
      var svgBlob = new Blob([data.svgData], { type: 'image/svg+xml;charset=utf-8' });
      var blobUrl = URL.createObjectURL(svgBlob);
      var img = new Image();

      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        var ctx = canvas.getContext('2d');
        if (format === 'jpg' || themeSel.value === 'dark') {
          ctx.fillStyle = themeSel.value === 'dark' ? '#1e1e1e' : '#ffffff';
          ctx.fillRect(0, 0, canvasW, canvasH);
        }
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        URL.revokeObjectURL(blobUrl);

        var mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        canvas.toBlob(function (blob) {
          if (!blob) {
            ToolsCommon.notify('导出失败');
            return;
          }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'mermaid-diagram.' + format;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }, mime, 0.95);
      };
      img.onerror = function () {
        URL.revokeObjectURL(blobUrl);
        ToolsCommon.notify('SVG 图像转换失败');
      };
      img.src = blobUrl;
    } catch (e) {
      ToolsCommon.notify(e.message || '导出失败');
    }
  };

  canvasEl.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.1 : 0.9;
    var newZoom = Math.min(Math.max(zoom * factor, 0.05), 20);
    var rect = canvasEl.getBoundingClientRect();
    var mouseX = e.clientX - rect.left - rect.width / 2;
    var mouseY = e.clientY - rect.top - rect.height / 2;
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
    updateTransform();
  }, { passive: false });

  canvasEl.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    canvasEl.classList.add('is-dragging');
  });

  resizerEl.addEventListener('mousedown', function () {
    isResizing = true;
    resizerEl.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
  });

  window.addEventListener('mousemove', function (e) {
    if (isDragging) {
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    }
    if (isResizing) {
      var rect = workbenchEl.getBoundingClientRect();
      var pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.min(75, Math.max(20, pct));
      editorPaneEl.style.width = pct + '%';
    }
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      canvasEl.classList.remove('is-dragging');
    }
    if (isResizing) {
      isResizing = false;
      resizerEl.classList.remove('is-dragging');
      document.body.style.cursor = '';
      window.fitToScreen();
    }
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var start = inputEl.selectionStart;
      var end = inputEl.selectionEnd;
      inputEl.value = inputEl.value.substring(0, start) + '  ' + inputEl.value.substring(end);
      inputEl.selectionStart = inputEl.selectionEnd = start + 2;
      inputEl.dispatchEvent(new Event('input'));
    }
  });

  inputEl.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderMermaid, 300);
  });

  window.addEventListener('resize', window.fitToScreen);

  inputEl.value = templates.flowchart;
  renderMermaid();
})();
