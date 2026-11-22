(function () {
  var picker = document.getElementById('colorPicker');
  var hexEl = document.getElementById('hexInput');
  var rgbEl = document.getElementById('rgbInput');
  var hslEl = document.getElementById('hslInput');
  var fgPicker = document.getElementById('fgPicker');
  var bgPicker = document.getElementById('bgPicker');
  var previewEl = document.getElementById('contrastPreview');
  var ratioBadge = document.getElementById('contrastRatioBadge');
  var wcagBadges = document.getElementById('wcagBadges');

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = clamp(Math.round(v), 0, 255).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    if (s === 0) {
      var v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    };
  }

  function setFromRgb(rgb, source) {
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    if (source !== 'picker') picker.value = hex;
    if (source !== 'hex') hexEl.value = hex;
    if (source !== 'rgb') rgbEl.value = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    if (source !== 'hsl') hslEl.value = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
  }

  function luminance(rgb) {
    var a = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function updateContrast() {
    var fg = hexToRgb(fgPicker.value);
    var bg = hexToRgb(bgPicker.value);
    if (!fg || !bg) return;
    previewEl.style.color = fgPicker.value;
    previewEl.style.backgroundColor = bgPicker.value;

    var l1 = luminance(fg);
    var l2 = luminance(bg);
    var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    var ratioStr = ratio.toFixed(2) + ':1';

    ratioBadge.textContent = '对比度 ' + ratioStr;
    ratioBadge.className = 'tool-badge ' + (ratio >= 4.5 ? 'is-ok' : (ratio >= 3 ? 'is-warn' : 'is-err'));

    var checks = [
      { label: 'AA 普通文本 (>=4.5)', ok: ratio >= 4.5 },
      { label: 'AAA 普通文本 (>=7.0)', ok: ratio >= 7.0 },
      { label: 'AA 大号文本 (>=3.0)', ok: ratio >= 3.0 }
    ];
    wcagBadges.innerHTML = checks.map(function (c) {
      return '<span class="tool-badge ' + (c.ok ? 'is-ok' : 'is-err') + '">' +
        (c.ok ? '✓ ' : '✗ ') + c.label + '</span>';
    }).join(' ');
  }

  picker.addEventListener('input', function () {
    var rgb = hexToRgb(picker.value);
    if (rgb) setFromRgb(rgb, 'picker');
  });

  hexEl.addEventListener('input', function () {
    var rgb = hexToRgb(hexEl.value);
    if (rgb) setFromRgb(rgb, 'hex');
  });

  rgbEl.addEventListener('input', function () {
    var m = rgbEl.value.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      setFromRgb({
        r: clamp(parseInt(m[1], 10), 0, 255),
        g: clamp(parseInt(m[2], 10), 0, 255),
        b: clamp(parseInt(m[3], 10), 0, 255)
      }, 'rgb');
    }
  });

  hslEl.addEventListener('input', function () {
    var m = hslEl.value.match(/(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
    if (m) {
      setFromRgb(hslToRgb(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)), 'hsl');
    }
  });

  fgPicker.addEventListener('input', updateContrast);
  bgPicker.addEventListener('input', updateContrast);

  window.syncFgToMain = function () {
    bgPicker.value = picker.value;
    updateContrast();
  };

  window.copyVal = function (id) {
    var el = document.getElementById(id);
    if (el) ToolsCommon.copyText(el.value, '色值 ');
  };

  updateContrast();
})();
