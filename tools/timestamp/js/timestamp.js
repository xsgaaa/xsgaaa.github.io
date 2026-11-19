(function () {
  var paused = false;
  var tsStatus = document.getElementById('tsStatus');

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtLocal(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function tick() {
    if (paused) return;
    var now = new Date();
    document.getElementById('nowSec').textContent = Math.floor(now.getTime() / 1000);
    document.getElementById('nowMs').textContent = now.getTime();
    document.getElementById('nowLocal').textContent = fmtLocal(now);
  }
  setInterval(tick, 500);
  tick();

  window.togglePause = function () {
    paused = !paused;
    document.getElementById('pauseBtn').textContent = paused ? '继续' : '暂停';
  };

  function kvHtml(items) {
    return items.map(function (it) {
      return '<div class="tool-kv-item"><div class="tool-kv-label">' + it[0] + '</div><div class="tool-kv-value">' + ToolsCommon.escapeHtml(it[1]) + '</div></div>';
    }).join('');
  }

  window.convertTsToDate = function () {
    var raw = document.getElementById('tsInput').value.trim();
    if (!raw || isNaN(Number(raw))) {
      return ToolsCommon.setStatus(tsStatus, 'error', '请输入有效的数字时间戳');
    }
    var num = Number(raw);
    var unit = document.getElementById('tsUnit').value;
    var ms = unit === 's' ? num * 1000 : unit === 'ms' ? num : (Math.abs(num) < 1e11 ? num * 1000 : num);
    var d = new Date(ms);
    if (isNaN(d.getTime())) return ToolsCommon.setStatus(tsStatus, 'error', '时间戳超出有效范围');
    ToolsCommon.setStatus(tsStatus, '', '');
    document.getElementById('tsResult').innerHTML = kvHtml([
      ['本地时间', fmtLocal(d)],
      ['ISO 8601 (UTC)', d.toISOString()],
      ['UTC 字符串', d.toUTCString()]
    ]);
  };

  window.fillNowTs = function () {
    document.getElementById('tsInput').value = Math.floor(Date.now() / 1000);
    convertTsToDate();
  };

  window.offsetTs = function (deltaSec) {
    var inp = document.getElementById('tsInput');
    var cur = Number(inp.value.trim());
    if (isNaN(cur) || !inp.value.trim()) cur = Math.floor(Date.now() / 1000);
    var isMs = Math.abs(cur) >= 1e11;
    inp.value = isMs ? cur + deltaSec * 1000 : cur + deltaSec;
    convertTsToDate();
  };

  window.fillNowDate = function () {
    document.getElementById('dateInput').value = fmtLocal(new Date());
    convertDateToTs();
  };

  window.convertDateToTs = function () {
    var raw = document.getElementById('dateInput').value.trim();
    if (!raw) return ToolsCommon.setStatus(tsStatus, 'error', '请输入日期时间');
    var normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) ? raw.replace(/\s+/, 'T') : raw;
    var d = new Date(normalized);
    if (isNaN(d.getTime())) return ToolsCommon.setStatus(tsStatus, 'error', '无法解析该日期格式');
    ToolsCommon.setStatus(tsStatus, '', '');
    document.getElementById('dateResult').innerHTML = kvHtml([
      ['秒级时间戳 (s)', String(Math.floor(d.getTime() / 1000))],
      ['毫秒级时间戳 (ms)', String(d.getTime())],
      ['ISO 8601', d.toISOString()]
    ]);
  };

  function parseBigIntRadix(str, radix) {
    var clean = str.trim().toLowerCase();
    var neg = clean.startsWith('-');
    if (neg) clean = clean.slice(1);
    if (radix === 16 && clean.startsWith('0x')) clean = clean.slice(2);
    if (radix === 2 && clean.startsWith('0b')) clean = clean.slice(2);
    if (radix === 8 && clean.startsWith('0o')) clean = clean.slice(2);
    if (!clean) throw new Error('empty');
    var digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix);
    var val = 0n;
    var base = BigInt(radix);
    for (var i = 0; i < clean.length; i++) {
      var idx = digits.indexOf(clean[i]);
      if (idx === -1) throw new Error('包含非法字符: ' + clean[i]);
      val = val * base + BigInt(idx);
    }
    return neg ? -val : val;
  }

  window.convertBase = function () {
    var raw = document.getElementById('baseInput').value.trim();
    var baseStatus = document.getElementById('baseStatus');
    var ids = ['base2', 'base8', 'base10', 'base16', 'base36'];
    if (!raw) {
      ids.forEach(function (id) { document.getElementById(id).textContent = '-'; });
      ToolsCommon.setStatus(baseStatus, '', '');
      return;
    }
    try {
      var radix = Number(document.getElementById('baseFrom').value);
      var num = parseBigIntRadix(raw, radix);
      document.getElementById('base2').textContent = num.toString(2);
      document.getElementById('base8').textContent = num.toString(8);
      document.getElementById('base10').textContent = num.toString(10);
      document.getElementById('base16').textContent = num.toString(16).toUpperCase();
      document.getElementById('base36').textContent = num.toString(36).toUpperCase();
      ToolsCommon.setStatus(baseStatus, '', '');
    } catch (e) {
      ToolsCommon.setStatus(baseStatus, 'error', '进制解析错误: ' + e.message);
    }
  };

  fillNowTs();
  fillNowDate();
})();
