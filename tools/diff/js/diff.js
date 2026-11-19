(function () {
  var aEl = document.getElementById('diffA');
  var bEl = document.getElementById('diffB');
  var outEl = document.getElementById('diffOutput');
  var statsEl = document.getElementById('diffStats');
  var statusEl = document.getElementById('diffStatus');

  function computeLcsDiff(aLines, bLines, trim) {
    var n = aLines.length, m = bLines.length;
    var dp = Array.from({ length: n + 1 }, function () { return new Int32Array(m + 1); });
    for (var i = n - 1; i >= 0; i--) {
      var ai = trim ? aLines[i].trim() : aLines[i];
      for (var j = m - 1; j >= 0; j--) {
        var bj = trim ? bLines[j].trim() : bLines[j];
        dp[i][j] = ai === bj ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = [];
    var x = 0, y = 0;
    while (x < n && y < m) {
      var ax = trim ? aLines[x].trim() : aLines[x];
      var by = trim ? bLines[y].trim() : bLines[y];
      if (ax === by) {
        ops.push({ type: 'eq', line: bLines[y], aNo: x + 1, bNo: y + 1 });
        x++; y++;
      } else if (dp[x + 1][y] >= dp[x][y + 1]) {
        ops.push({ type: 'del', line: aLines[x], aNo: x + 1, bNo: '' });
        x++;
      } else {
        ops.push({ type: 'add', line: bLines[y], aNo: '', bNo: y + 1 });
        y++;
      }
    }
    while (x < n) { ops.push({ type: 'del', line: aLines[x], aNo: x + 1, bNo: '' }); x++; }
    while (y < m) { ops.push({ type: 'add', line: bLines[y], aNo: '', bNo: y + 1 }); y++; }
    return ops;
  }

  window.runDiff = function () {
    var aLines = aEl.value.split(/\r\n|\r|\n/);
    var bLines = bEl.value.split(/\r\n|\r|\n/);
    var trim = document.getElementById('ignoreTrim').checked;
    var ops = computeLcsDiff(aLines, bLines, trim);
    var added = 0, removed = 0;
    outEl.innerHTML = ops.map(function (op) {
      if (op.type === 'add') added++;
      if (op.type === 'del') removed++;
      var cls = op.type === 'add' ? 'diff-add' : op.type === 'del' ? 'diff-del' : '';
      var sign = op.type === 'add' ? '+' : op.type === 'del' ? '-' : ' ';
      return '<div class="diff-line ' + cls + '">' +
        '<span class="diff-line-num">' + op.aNo + '</span>' +
        '<span class="diff-line-num">' + op.bNo + '</span>' +
        '<span class="diff-line-sign">' + sign + '</span>' +
        '<span>' + ToolsCommon.escapeHtml(op.line) + '</span></div>';
    }).join('');
    statsEl.textContent = '+' + added + ' 新增 · -' + removed + ' 删除';
  };

  function sortObj(val) {
    if (Array.isArray(val)) return val.map(sortObj);
    if (val && typeof val === 'object') {
      var s = {};
      Object.keys(val).sort().forEach(function (k) { s[k] = sortObj(val[k]); });
      return s;
    }
    return val;
  }

  window.formatBothJson = function () {
    try {
      if (aEl.value.trim()) aEl.value = JSON.stringify(sortObj(JSON.parse(aEl.value)), null, 2);
      if (bEl.value.trim()) bEl.value = JSON.stringify(sortObj(JSON.parse(bEl.value)), null, 2);
      ToolsCommon.setStatus(statusEl, 'success', '已完成 JSON 排序并格式化');
      runDiff();
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'JSON 解析失败: ' + e.message);
    }
  };

  window.loadSample = function () {
    aEl.value = '{\n  "name": "xsgaaaa",\n  "version": 1,\n  "features": ["blog", "archives"]\n}';
    bEl.value = '{\n  "name": "xsgaaaa",\n  "version": 2,\n  "features": ["blog", "archives", "devtools"]\n}';
    ToolsCommon.setStatus(statusEl, '', '');
    runDiff();
  };

  window.clearAll = function () {
    aEl.value = '';
    bEl.value = '';
    outEl.innerHTML = '';
    statsEl.textContent = '';
    ToolsCommon.setStatus(statusEl, '', '');
  };

  loadSample();
})();
