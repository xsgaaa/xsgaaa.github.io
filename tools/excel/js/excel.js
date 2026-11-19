(function () {
  var fileEl = document.getElementById('excelFile');
  var sheetSel = document.getElementById('sheetSelect');
  var rawInput = document.getElementById('rawInput');
  var jsonOut = document.getElementById('jsonOutput');
  var tableWrap = document.getElementById('tablePreview');
  var statusEl = document.getElementById('excelStatus');
  var fileMetaEl = document.getElementById('fileMeta');
  var rowMetaEl = document.getElementById('rowMeta');
  var workbook = null;
  var lastRows = null;

  function parseDelimitedText(text) {
    var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return [];
    var delimiter = lines[0].indexOf('\t') !== -1 ? '\t' : ',';
    return lines.map(function (line) {
      if (delimiter === '\t') return line.split('\t');
      var cells = [], cur = '', inQuote = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === delimiter && !inQuote) {
          cells.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur);
      return cells;
    });
  }

  function buildOutputFromRows(rows) {
    lastRows = rows;
    if (!rows || !rows.length) {
      jsonOut.value = '[]';
      tableWrap.innerHTML = '';
      rowMetaEl.textContent = '0 条记录';
      return;
    }
    var useHeader = document.getElementById('hasHeader').checked;
    var doTrim = document.getElementById('trimCells').checked;
    var minify = document.getElementById('minifyJson').checked;

    var normRows = rows.map(function (r) {
      return r.map(function (c) {
        var v = c === undefined || c === null ? '' : c;
        return doTrim && typeof v === 'string' ? v.trim() : v;
      });
    });

    var result;
    if (useHeader && normRows.length > 0) {
      var headers = normRows[0].map(function (h, idx) { return String(h || ('col_' + (idx + 1))); });
      result = normRows.slice(1).map(function (r) {
        var obj = {};
        headers.forEach(function (h, i) { obj[h] = r[i] !== undefined ? r[i] : ''; });
        return obj;
      });
    } else {
      result = normRows;
    }

    jsonOut.value = minify ? JSON.stringify(result) : JSON.stringify(result, null, 2);
    rowMetaEl.textContent = result.length + ' 条记录';
    renderTable(normRows, useHeader);
  }

  function renderTable(rows, useHeader) {
    if (!rows.length) { tableWrap.innerHTML = ''; return; }
    var maxRows = Math.min(rows.length, 200);
    var html = '<table class="tool-table">';
    var startIdx = 0;
    if (useHeader) {
      html += '<thead><tr>' + rows[0].map(function (c) { return '<th>' + ToolsCommon.escapeHtml(c) + '</th>'; }).join('') + '</tr></thead>';
      startIdx = 1;
    }
    html += '<tbody>';
    for (var i = startIdx; i < maxRows; i++) {
      html += '<tr>' + rows[i].map(function (c) { return '<td>' + ToolsCommon.escapeHtml(c) + '</td>'; }).join('') + '</tr>';
    }
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  window.renderCurrentSheet = function () {
    if (!workbook) return;
    var name = sheetSel.value;
    var sheet = workbook.Sheets[name];
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    buildOutputFromRows(rows);
    ToolsCommon.setStatus(statusEl, 'success', '已解析工作表 "' + name + '"，共 ' + rows.length + ' 行');
  };

  fileEl.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    fileMetaEl.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';

    if (typeof XLSX === 'undefined') {
      if (/\.csv$|\.tsv$/i.test(file.name)) {
        var rFallback = new FileReader();
        rFallback.onload = function (ev) {
          rawInput.value = ev.target.result;
          parsePastedText();
        };
        rFallback.readAsText(file, 'UTF-8');
      } else {
        ToolsCommon.setStatus(statusEl, 'error', 'SheetJS 库未能加载，请检查网络或粘贴 CSV/TSV 文本');
      }
      return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var data = new Uint8Array(ev.target.result);
        workbook = XLSX.read(data, { type: 'array' });
        sheetSel.innerHTML = workbook.SheetNames.map(function (n) {
          return '<option value="' + ToolsCommon.escapeHtml(n) + '">' + ToolsCommon.escapeHtml(n) + '</option>';
        }).join('');
        sheetSel.style.display = workbook.SheetNames.length > 1 ? 'inline-block' : 'none';
        renderCurrentSheet();
      } catch (err) {
        ToolsCommon.setStatus(statusEl, 'error', '文件解析失败: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  window.parsePastedText = function () {
    var txt = rawInput.value;
    if (!txt.trim()) return ToolsCommon.setStatus(statusEl, 'error', '请先粘贴表格文本或选择文件');
    workbook = null;
    sheetSel.style.display = 'none';
    var rows = parseDelimitedText(txt);
    buildOutputFromRows(rows);
    ToolsCommon.setStatus(statusEl, 'success', '已解析文本表格，共 ' + rows.length + ' 行');
  };

  window.reprocess = function () {
    if (lastRows) buildOutputFromRows(lastRows);
  };

  window.jsonToExcel = function () {
    var raw = rawInput.value.trim();
    if (!raw) return ToolsCommon.setStatus(statusEl, 'error', '请在左侧粘贴 JSON 数组');
    try {
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr) || !arr.length) {
        return ToolsCommon.setStatus(statusEl, 'error', '请输入非空的 JSON 对象数组');
      }
      if (typeof XLSX !== 'undefined') {
        var ws = XLSX.utils.json_to_sheet(arr);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, 'export.xlsx');
        ToolsCommon.setStatus(statusEl, 'success', '已导出 export.xlsx');
      } else {
        var keys = Object.keys(arr[0]);
        var csv = [keys.join(',')].concat(arr.map(function (row) {
          return keys.map(function (k) { return '"' + String(row[k] ?? '').replace(/"/g, '""') + '"'; }).join(',');
        })).join('\n');
        ToolsCommon.downloadText('export.csv', csv);
        ToolsCommon.setStatus(statusEl, 'success', '已导出 export.csv');
      }
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'JSON 解析失败: ' + e.message);
    }
  };

  window.switchTab = function (tab) {
    var jBtn = document.getElementById('tabJsonBtn');
    var tBtn = document.getElementById('tabTableBtn');
    if (tab === 'table') {
      jsonOut.style.display = 'none';
      tableWrap.style.display = 'block';
      tBtn.classList.add('mdui-color-theme');
      jBtn.classList.remove('mdui-color-theme');
    } else {
      tableWrap.style.display = 'none';
      jsonOut.style.display = 'block';
      jBtn.classList.add('mdui-color-theme');
      tBtn.classList.remove('mdui-color-theme');
    }
  };

  window.loadSample = function () {
    rawInput.value = 'id\tname\trole\tactive\n1\t张三\t前端开发\ttrue\n2\t李四\t后端开发\ttrue\n3\t王五\t测试工程师\tfalse';
    fileMetaEl.textContent = '示例表格 (TSV)';
    parsePastedText();
  };

  window.clearAll = function () {
    rawInput.value = '';
    jsonOut.value = '';
    tableWrap.innerHTML = '';
    fileEl.value = '';
    sheetSel.style.display = 'none';
    fileMetaEl.textContent = '未选择文件';
    rowMetaEl.textContent = '0 条记录';
    workbook = null;
    lastRows = null;
    ToolsCommon.setStatus(statusEl, '', '');
  };

  window.copyJson = function () { ToolsCommon.copyText(jsonOut.value, 'JSON'); };
  window.downloadJson = function () { ToolsCommon.downloadText('data.json', jsonOut.value); };
})();
