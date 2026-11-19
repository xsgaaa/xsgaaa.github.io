(function () {
  var fileEl = document.getElementById('imgFile');
  var dropZone = document.getElementById('dropZone');
  var origPreview = document.getElementById('origPreview');
  var compPreview = document.getElementById('compPreview');
  var origMeta = document.getElementById('origMeta');
  var compMeta = document.getElementById('compMeta');
  var statusEl = document.getElementById('imgStatus');
  var downloadBtn = document.getElementById('downloadBtn');

  var currentImg = null;
  var origFile = null;
  var compressedBlob = null;
  var compObjectUrl = null;

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  window.updateQualityLabel = function () {
    document.getElementById('qualityVal').textContent = Math.round(Number(document.getElementById('qualityRange').value) * 100) + '%';
  };

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      ToolsCommon.setStatus(statusEl, 'error', '请选择有效的图片文件');
      return;
    }
    origFile = file;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        currentImg = img;
        origPreview.src = ev.target.result;
        origPreview.style.display = 'block';
        origMeta.textContent = img.naturalWidth + '×' + img.naturalHeight + ' · ' + fmtSize(file.size);
        compressImage();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  window.compressImage = function () {
    if (!currentImg || !origFile) return;
    var maxDim = Math.max(0, Number(document.getElementById('maxDim').value) || 0);
    var quality = Number(document.getElementById('qualityRange').value);
    var format = document.getElementById('outFormat').value;

    var w = currentImg.naturalWidth;
    var h = currentImg.naturalHeight;
    if (maxDim > 0 && (w > maxDim || h > maxDim)) {
      var ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(currentImg, 0, 0, w, h);

    canvas.toBlob(function (blob) {
      if (!blob) {
        ToolsCommon.setStatus(statusEl, 'error', '图片压缩失败');
        return;
      }
      compressedBlob = blob;
      if (compObjectUrl) URL.revokeObjectURL(compObjectUrl);
      compObjectUrl = URL.createObjectURL(blob);
      compPreview.src = compObjectUrl;
      compPreview.style.display = 'block';
      downloadBtn.disabled = false;

      var diffPct = ((origFile.size - blob.size) / origFile.size * 100).toFixed(1);
      var signText = blob.size <= origFile.size ? '节省 ' + diffPct + '%' : '增大 ' + Math.abs(Number(diffPct)) + '%';
      compMeta.textContent = w + '×' + h + ' · ' + fmtSize(blob.size) + ' (' + signText + ')';
      ToolsCommon.setStatus(statusEl, 'success', '压缩完成: ' + fmtSize(origFile.size) + ' → ' + fmtSize(blob.size) + ' (' + signText + ')');
    }, format, quality);
  };

  window.downloadCompressed = function () {
    if (!compressedBlob || !origFile) return;
    var format = document.getElementById('outFormat').value;
    var ext = format === 'image/webp' ? 'webp' : format === 'image/png' ? 'png' : 'jpg';
    var baseName = origFile.name.replace(/\.[^.]+$/, '');
    var url = URL.createObjectURL(compressedBlob);
    var a = document.createElement('a');
    a.href = url;
    a.download = baseName + '-compressed.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  fileEl.addEventListener('change', function (e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.style.borderColor = '#009688';
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.style.borderColor = 'rgba(0,150,136,0.4)';
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(0,150,136,0.4)';
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
})();
