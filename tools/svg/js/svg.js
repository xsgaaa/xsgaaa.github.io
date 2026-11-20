(function () {
  var svgFileInput = document.getElementById('svgFile');
  var svgCodeInput = document.getElementById('svgCode');
  var clearBtn = document.getElementById('clearSvgCode');
  var loadSampleBtn = document.getElementById('loadSampleBtn');
  var widthInput = document.getElementById('widthInput');
  var heightInput = document.getElementById('heightInput');
  var maintainAspectRatio = document.getElementById('maintainAspectRatio');
  var qualityRange = document.getElementById('qualityRange');
  var qualityValue = document.getElementById('qualityValue');
  var transparencyRange = document.getElementById('transparencyRange');
  var transparencyValue = document.getElementById('transparencyValue');
  var backgroundInput = document.getElementById('backgroundInput');
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('svgStatus');
  var previewHint = document.getElementById('previewHint');
  var fileMeta = document.getElementById('fileMeta');
  var previewMeta = document.getElementById('previewMeta');
  var generateBtn = document.getElementById('generateBtn');
  var downloadPngBtn = document.getElementById('downloadPng');
  var downloadJpgBtn = document.getElementById('downloadJpg');

  var svgDataUrl = null;
  var currentObjectUrl = null;
  var originalWidth = 800;
  var originalHeight = 600;
  var aspectRatio = 800 / 600;
  var fileName = 'svg-image';

  var SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">\n' +
    '  <defs>\n' +
    '    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">\n' +
    '      <stop offset="0%" stop-color="#06b6d4"/>\n' +
    '      <stop offset="100%" stop-color="#4f46e5"/>\n' +
    '    </linearGradient>\n' +
    '  </defs>\n' +
    '  <rect x="16" y="16" width="368" height="208" rx="20" fill="url(#g)"/>\n' +
    '  <circle cx="100" cy="120" r="46" fill="rgba(255,255,255,0.22)"/>\n' +
    '  <text x="170" y="114" fill="#ffffff" font-size="24" font-family="sans-serif" font-weight="bold">SVG Converter</text>\n' +
    '  <text x="170" y="146" fill="rgba(255,255,255,0.85)" font-size="14" font-family="sans-serif">Pure Local Browser Rendering</text>\n' +
    '</svg>';

  function revokeOldUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function loadSvgSource(dataUrl, name, autoPreview) {
    svgDataUrl = dataUrl;
    fileName = name || 'svg-image';
    var tempImg = new Image();
    tempImg.onload = function () {
      originalWidth = tempImg.naturalWidth || tempImg.width || 800;
      originalHeight = tempImg.naturalHeight || tempImg.height || 600;
      aspectRatio = originalWidth / originalHeight;
      widthInput.value = originalWidth;
      heightInput.value = originalHeight;
      fileMeta.textContent = originalWidth + ' × ' + originalHeight;
      ToolsCommon.setStatus(statusEl, '', '');
      if (autoPreview) renderToCanvas();
    };
    tempImg.onerror = function () {
      ToolsCommon.setStatus(statusEl, 'error', '无法解析 SVG 数据，请检查 SVG 标签与格式');
    };
    tempImg.src = dataUrl;
  }

  function parseCodeToUrl(code) {
    revokeOldUrl();
    var blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
    currentObjectUrl = URL.createObjectURL(blob);
    return currentObjectUrl;
  }

  function renderToCanvas(callback) {
    if (!svgDataUrl) {
      ToolsCommon.setStatus(statusEl, 'error', '请先选择 SVG 文件或输入 SVG 代码');
      return;
    }
    var width = parseInt(widthInput.value, 10) || 800;
    var height = parseInt(heightInput.value, 10) || 600;
    var transparency = parseInt(transparencyRange.value, 10) / 100;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    var img = new Image();
    img.onload = function () {
      ctx.save();
      ctx.globalAlpha = transparency;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
      canvas.style.display = 'block';
      previewHint.style.display = 'none';
      previewMeta.textContent = width + ' × ' + height + ' px';
      downloadPngBtn.disabled = false;
      downloadJpgBtn.disabled = false;
      ToolsCommon.setStatus(statusEl, 'success', '预览已生成，可下载 PNG（透明背景）或 JPG');
      if (callback) callback();
    };
    img.onerror = function () {
      ToolsCommon.setStatus(statusEl, 'error', '渲染 SVG 到 Canvas 失败');
    };
    img.src = svgDataUrl;
  }

  svgFileInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name)) {
      ToolsCommon.setStatus(statusEl, 'error', '请选择有效的 .svg 文件');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var text = ev.target.result;
      svgCodeInput.value = text;
      var url = parseCodeToUrl(text);
      loadSvgSource(url, file.name.replace(/\.svg$/i, ''), true);
    };
    reader.readAsText(file);
  });

  svgCodeInput.addEventListener('input', function () {
    var code = svgCodeInput.value.trim();
    if (!code || code.indexOf('<svg') === -1) return;
    var url = parseCodeToUrl(code);
    loadSvgSource(url, 'svg-input', true);
  });

  widthInput.addEventListener('input', function () {
    if (maintainAspectRatio.checked && aspectRatio) {
      var w = parseInt(widthInput.value, 10);
      if (w > 0) heightInput.value = Math.round(w / aspectRatio);
    }
  });

  heightInput.addEventListener('input', function () {
    if (maintainAspectRatio.checked && aspectRatio) {
      var h = parseInt(heightInput.value, 10);
      if (h > 0) widthInput.value = Math.round(h * aspectRatio);
    }
  });

  qualityRange.addEventListener('input', function () {
    qualityValue.textContent = qualityRange.value + '%';
  });

  transparencyRange.addEventListener('input', function () {
    transparencyValue.textContent = transparencyRange.value + '%';
  });

  generateBtn.addEventListener('click', function () {
    var code = svgCodeInput.value.trim();
    if (code) {
      if (code.indexOf('<svg') === -1) {
        ToolsCommon.setStatus(statusEl, 'error', '请输入包含 <svg> 标签的有效 SVG 代码');
        return;
      }
      var url = parseCodeToUrl(code);
      loadSvgSource(url, fileName || 'svg-input', true);
    } else {
      renderToCanvas();
    }
  });

  downloadPngBtn.addEventListener('click', function () {
    if (!canvas.width || !canvas.height) return;
    var link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName + '.png';
    link.click();
    ToolsCommon.notify('已下载 ' + link.download);
  });

  downloadJpgBtn.addEventListener('click', function () {
    if (!canvas.width || !canvas.height) return;
    var offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    var octx = offscreen.getContext('2d');
    octx.fillStyle = backgroundInput.value || '#ffffff';
    octx.fillRect(0, 0, offscreen.width, offscreen.height);
    octx.drawImage(canvas, 0, 0);

    var quality = parseInt(qualityRange.value, 10) / 100;
    var link = document.createElement('a');
    link.href = offscreen.toDataURL('image/jpeg', quality);
    link.download = fileName + '.jpg';
    link.click();
    ToolsCommon.notify('已下载 ' + link.download);
  });

  clearBtn.addEventListener('click', function () {
    revokeOldUrl();
    svgDataUrl = null;
    svgCodeInput.value = '';
    svgFileInput.value = '';
    canvas.style.display = 'none';
    previewHint.style.display = 'block';
    downloadPngBtn.disabled = true;
    downloadJpgBtn.disabled = true;
    fileMeta.textContent = '等待输入';
    previewMeta.textContent = '-';
    ToolsCommon.setStatus(statusEl, '', '');
  });

  loadSampleBtn.addEventListener('click', function () {
    svgCodeInput.value = SAMPLE_SVG;
    var url = parseCodeToUrl(SAMPLE_SVG);
    loadSvgSource(url, 'sample', true);
  });
})();
