(function () {
  var inputEl = document.getElementById('mermaidInput');
  var previewEl = document.getElementById('mermaidPreview');
  var statusEl = document.getElementById('mermaidStatus');
  var themeSel = document.getElementById('themeSelect');
  var renderMetaEl = document.getElementById('renderMeta');
  var zoom = 1;
  var renderSeq = 0;
  var debounceTimer = null;

  var templates = {
    flowchart: 'flowchart TD\n  A[用户输入请求] --> B{参数校验?}\n  B -- 通过 --> C[处理业务逻辑]\n  B -- 失败 --> D[返回 400 错误]\n  C --> E[(写入数据库)]\n  E --> F[返回 200 成功]',
    sequence: 'sequenceDiagram\n  autonumber\n  participant C as 客户端\n  participant S as 服务端\n  participant DB as 数据库\n  C->>S: POST /api/login\n  S->>DB: 查询用户信息\n  DB-->>S: 返回用户记录\n  S-->>C: 返回 JWT Token',
    class: 'classDiagram\n  class User {\n    +int id\n    +string name\n    +login()\n  }\n  class Order {\n    +string orderNo\n    +decimal amount\n    +pay()\n  }\n  User "1" --> "*" Order : places',
    state: 'stateDiagram-v2\n  [*] --> 待支付\n  待支付 --> 已支付 : 支付成功\n  待支付 --> 已取消 : 超时关闭\n  已支付 --> 已发货 : 仓库出库\n  已发货 --> 已完成 : 确认收货\n  已完成 --> [*]',
    er: 'erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ORDER_ITEM : contains\n  PRODUCT ||--o{ ORDER_ITEM : includes',
    gantt: 'gantt\n  title 项目迭代计划\n  dateFormat YYYY-MM-DD\n  section 需求与设计\n  需求评审 :done, a1, 2026-11-01, 3d\n  架构设计 :active, a2, after a1, 4d\n  section 开发与测试\n  核心开发 :a3, after a2, 7d\n  联调测试 :a4, after a3, 4d',
    pie: 'pie showData\n  title 技术栈分布\n  "TypeScript" : 45\n  "Go" : 30\n  "Python" : 15\n  "Rust" : 10'
  };

  if (document.body.classList.contains('mdui-theme-layout-dark')) {
    themeSel.value = 'dark';
  }

  function applyZoom() {
    document.getElementById('zoomLabel').textContent = Math.round(zoom * 100) + '%';
    var svg = previewEl.querySelector('svg');
    if (svg) svg.style.transform = 'scale(' + zoom + ')';
  }

  window.zoomBy = function (delta) {
    zoom = Math.min(2.5, Math.max(0.4, zoom + delta));
    applyZoom();
  };

  window.resetZoom = function () {
    zoom = 1;
    applyZoom();
  };

  window.renderMermaid = async function () {
    var code = inputEl.value.trim();
    if (!code) {
      previewEl.innerHTML = '';
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
        securityLevel: 'loose'
      });
      var id = 'mermaid-svg-' + (++renderSeq);
      var res = await mermaid.render(id, code);
      previewEl.innerHTML = res.svg;
      applyZoom();
      renderMetaEl.textContent = '渲染成功';
      ToolsCommon.setStatus(statusEl, '', '');
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

  window.exportSvg = function () {
    var svg = previewEl.querySelector('svg');
    if (!svg) return ToolsCommon.notify('请先渲染图表');
    var xml = new XMLSerializer().serializeToString(svg);
    ToolsCommon.downloadText('diagram.svg', xml);
  };

  window.exportPng = function () {
    var svg = previewEl.querySelector('svg');
    if (!svg) return ToolsCommon.notify('请先渲染图表');
    var xml = new XMLSerializer().serializeToString(svg);
    var img = new Image();
    var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    img.onload = function () {
      var scale = 2;
      var w = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) || svg.getBoundingClientRect().width || 800;
      var h = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height) || svg.getBoundingClientRect().height || 600;
      var canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = themeSel.value === 'dark' ? '#1e1e1e' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = svgUrl;
  };

  inputEl.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderMermaid, 300);
  });

  inputEl.value = templates.flowchart;
  renderMermaid();
})();
