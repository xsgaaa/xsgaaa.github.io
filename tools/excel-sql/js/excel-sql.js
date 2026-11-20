(function () {
  var workbook = null;
  var excelData = null;
  var columnConfigs = [];
  var currentSql = '';
  var isPreviewMode = false;
  var updateTimer = null;

  var uploadArea = document.getElementById('uploadArea');
  var fileInput = document.getElementById('fileInput');
  var sheetBox = document.getElementById('sheetBox');
  var sheetSelect = document.getElementById('sheetSelect');
  var statusEl = document.getElementById('excelSqlStatus');
  var tableNameEl = document.getElementById('tableName');
  var pkStrategyEl = document.getElementById('primaryKeyStrategy');
  var batchSizeEl = document.getElementById('batchSize');
  var nullHandlingEl = document.getElementById('nullHandling');
  var dateFormatEl = document.getElementById('dateFormat');
  var sqlContentEl = document.getElementById('sqlContent');
  var sqlStatsMetaEl = document.getElementById('sqlStatsMeta');

  function loadSettings() {
    try {
      var saved = localStorage.getItem('excelSqlSettings');
      if (!saved) return;
      var s = JSON.parse(saved);
      tableNameEl.value = s.tableName || 'table_name';
      pkStrategyEl.value = s.primaryKeyStrategy || 'none';
      nullHandlingEl.value = s.nullHandling || 'null';
      dateFormatEl.value = s.dateFormat || 'string';
      batchSizeEl.value = s.batchSize || '1000';
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem('excelSqlSettings', JSON.stringify({
        tableName: tableNameEl.value,
        primaryKeyStrategy: pkStrategyEl.value,
        nullHandling: nullHandlingEl.value,
        dateFormat: dateFormatEl.value,
        batchSize: batchSizeEl.value
      }));
    } catch (e) {}
  }

  function processFile(file) {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      ToolsCommon.setStatus(statusEl, 'error', '请选择 .xlsx 或 .xls 格式的 Excel 文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      ToolsCommon.setStatus(statusEl, 'error', '文件大小不能超过 10MB');
      return;
    }
    if (typeof XLSX === 'undefined') {
      ToolsCommon.setStatus(statusEl, 'error', 'XLSX 解析库尚未加载完成，请检查网络');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = new Uint8Array(e.target.result);
        workbook = XLSX.read(data, { type: 'array' });
        sheetSelect.innerHTML = workbook.SheetNames.map(function (name) {
          return '<option value="' + ToolsCommon.escapeHtml(name) + '">' + ToolsCommon.escapeHtml(name) + '</option>';
        }).join('');
        sheetBox.style.display = workbook.SheetNames.length > 1 ? 'block' : 'none';
        loadSheet(workbook.SheetNames[0]);
        ToolsCommon.setStatus(statusEl, 'success', '已加载文件: ' + file.name);
      } catch (err) {
        ToolsCommon.setStatus(statusEl, 'error', 'Excel 解析失败: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function loadSheet(sheetName) {
    if (!workbook || !workbook.Sheets[sheetName]) return;
    var jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    if (!jsonData || jsonData.length === 0) {
      ToolsCommon.setStatus(statusEl, 'error', '当前工作表为空');
      return;
    }
    excelData = jsonData;
    var headers = jsonData[0] || [];
    var rows = jsonData.slice(1);

    columnConfigs = headers.map(function (h, idx) {
      var colName = (h !== undefined && h !== null && String(h).trim() !== '') ? String(h).trim() : ('column_' + (idx + 1));
      return {
        name: colName,
        index: idx,
        dataType: 'string',
        isPrimaryKey: false,
        includeInInsert: true,
        defaultValue: '',
        nullable: true,
        autoIncrement: false
      };
    });

    renderDataPreview(headers, rows);
    autoDetectDataTypes(true);
    renderColumnConfig();
    document.getElementById('generateSection').style.display = 'flex';
    generateSql();
  }

  function renderDataPreview(headers, rows) {
    document.getElementById('dataPreview').style.display = 'block';
    var headEl = document.getElementById('tableHead');
    var bodyEl = document.getElementById('tableBody');

    headEl.innerHTML = '<tr>' + headers.map(function (h, i) {
      return '<th>' + ToolsCommon.escapeHtml(h || ('列' + (i + 1))) + '</th>';
    }).join('') + '</tr>';

    bodyEl.innerHTML = rows.slice(0, 20).map(function (row) {
      return '<tr>' + headers.map(function (_, colIdx) {
        var v = row[colIdx];
        return '<td>' + ToolsCommon.escapeHtml(v !== undefined && v !== null ? v : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function renderColumnConfig() {
    document.getElementById('columnConfig').style.display = 'block';
    var listEl = document.getElementById('columnConfigList');
    listEl.innerHTML = columnConfigs.map(function (cfg, idx) {
      return '<div class="sql-col-row" data-idx="' + idx + '">' +
        '<input type="text" class="tool-input col-name" value="' + ToolsCommon.escapeHtml(cfg.name) + '">' +
        '<select class="tool-select col-type">' +
          '<option value="string"' + (cfg.dataType === 'string' ? ' selected' : '') + '>字符串</option>' +
          '<option value="number"' + (cfg.dataType === 'number' ? ' selected' : '') + '>数字</option>' +
          '<option value="date"' + (cfg.dataType === 'date' ? ' selected' : '') + '>日期</option>' +
          '<option value="boolean"' + (cfg.dataType === 'boolean' ? ' selected' : '') + '>布尔</option>' +
        '</select>' +
        '<input type="text" class="tool-input col-def" value="' + ToolsCommon.escapeHtml(cfg.defaultValue) + '" placeholder="默认值">' +
        '<input type="checkbox" class="col-pk"' + (cfg.isPrimaryKey ? ' checked' : '') + '>' +
        '<input type="checkbox" class="col-inc"' + (cfg.includeInInsert ? ' checked' : '') + '>' +
        '<input type="checkbox" class="col-null"' + (cfg.nullable ? ' checked' : '') + '>' +
        '<input type="checkbox" class="col-auto"' + (cfg.autoIncrement ? ' checked' : '') + '>' +
        '<button type="button" class="mdui-btn mdui-btn-dense mdui-ripple col-del">删除</button>' +
      '</div>';
    }).join('');
  }

  function isValidDate(val) {
    if (typeof val === 'number') return false;
    var str = String(val).trim();
    if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) return false;
    var d = new Date(str);
    return d instanceof Date && !isNaN(d.getTime());
  }

  function autoDetectDataTypes(silent) {
    if (!excelData || excelData.length < 2) return;
    var rows = excelData.slice(1);
    columnConfigs.forEach(function (cfg) {
      var vals = rows.map(function (r) { return r[cfg.index]; })
        .filter(function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; });
      if (vals.length === 0) {
        cfg.dataType = 'string';
      } else if (vals.every(function (v) { return !isNaN(v) && String(v).trim() !== ''; })) {
        cfg.dataType = 'number';
      } else if (vals.every(isValidDate)) {
        cfg.dataType = 'date';
      } else if (vals.every(function (v) { return v === true || v === false || v === 'true' || v === 'false'; })) {
        cfg.dataType = 'boolean';
      } else {
        cfg.dataType = 'string';
      }
    });
    renderColumnConfig();
    if (!silent) {
      ToolsCommon.notify('数据类型自动检测完成');
      generateSql();
    }
  }

  function escapeSqlValue(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "''");
  }

  function formatDateValue(val) {
    var fmt = dateFormatEl.value;
    var d = new Date(val);
    if (isNaN(d.getTime())) return "'" + escapeSqlValue(val) + "'";
    if (fmt === 'timestamp') return String(d.getTime());
    if (fmt === 'custom') return "'" + d.toISOString() + "'";
    return "'" + d.toISOString().slice(0, 19).replace('T', ' ') + "'";
  }

  function formatValue(val, dataType) {
    var nullMode = nullHandlingEl.value;
    if (val === undefined || val === null || val === '') {
      if (nullMode === 'empty') return "''";
      if (nullMode === 'default') return 'DEFAULT';
      return 'NULL';
    }
    if (dataType === 'number') return isNaN(val) ? '0' : String(val);
    if (dataType === 'date') return formatDateValue(val);
    if (dataType === 'boolean') return (val === true || val === 'true') ? '1' : '0';
    return "'" + escapeSqlValue(val) + "'";
  }

  function generateCreateTableSql(tableName, cols) {
    var lines = ['-- 创建表结构', 'CREATE TABLE `' + tableName + '` ('];
    var defs = cols.map(function (cfg) {
      var sqlType = 'VARCHAR(255)';
      if (cfg.dataType === 'number') sqlType = 'INT';
      else if (cfg.dataType === 'date') sqlType = 'DATETIME';
      else if (cfg.dataType === 'boolean') sqlType = 'BOOLEAN';

      var def = '  `' + cfg.name + '` ' + sqlType;
      if (!cfg.nullable) def += ' NOT NULL';
      if (cfg.defaultValue) def += " DEFAULT '" + escapeSqlValue(cfg.defaultValue) + "'";
      if (cfg.autoIncrement) def += ' AUTO_INCREMENT';
      if (cfg.isPrimaryKey) def += ' PRIMARY KEY';
      return def;
    });
    lines.push(defs.join(',\n'));
    lines.push(');');
    return lines.join('\n');
  }

  function generateSql() {
    if (!excelData || excelData.length < 2) {
      ToolsCommon.setStatus(statusEl, 'error', '没有数据可用于生成 SQL');
      return;
    }
    var tableName = (tableNameEl.value || 'table_name').trim();
    var pkStrategy = pkStrategyEl.value;
    var batchSize = Math.max(1, parseInt(batchSizeEl.value, 10) || 1000);
    var validCols = columnConfigs.filter(function (c) { return c.includeInInsert && !c.autoIncrement; });
    if (validCols.length === 0) {
      ToolsCommon.setStatus(statusEl, 'error', '请至少保留一列用于 INSERT');
      return;
    }

    var rows = excelData.slice(1);
    var parts = [];
    if (pkStrategy !== 'none') {
      parts.push(generateCreateTableSql(tableName, validCols));
      parts.push('');
    }

    var headerStr = validCols.map(function (c) { return '`' + c.name + '`'; }).join(', ');
    var insertCount = 0;
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      var stmt = '-- 插入数据 (第 ' + (i + 1) + '-' + Math.min(i + batchSize, rows.length) + ' 行)\n' +
        'INSERT INTO `' + tableName + '` (' + headerStr + ') VALUES\n' +
        batch.map(function (row) {
          var vals = validCols.map(function (c) { return formatValue(row[c.index], c.dataType); });
          return '  (' + vals.join(', ') + ')';
        }).join(',\n') + ';';
      parts.push(stmt);
      insertCount++;
    }

    currentSql = parts.join('\n');
    document.getElementById('sqlResult').style.display = 'block';
    sqlContentEl.value = isPreviewMode && currentSql.length > 1000 ? currentSql.substring(0, 1000) + '\n... (预览截断)' : currentSql;
    sqlStatsMetaEl.textContent = rows.length + ' 条记录 · ' + validCols.length + ' 个字段 · ' + insertCount + ' 条 INSERT';
    saveSettings();
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(generateSql, 350);
  }

  uploadArea.addEventListener('click', function () { fileInput.click(); });
  uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.classList.add('is-dragover'); });
  uploadArea.addEventListener('dragleave', function () { uploadArea.classList.remove('is-dragover'); });
  uploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadArea.classList.remove('is-dragover');
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function (e) {
    if (e.target.files.length > 0) processFile(e.target.files[0]);
  });
  sheetSelect.addEventListener('change', function () { loadSheet(sheetSelect.value); });

  [tableNameEl, batchSizeEl].forEach(function (el) { el.addEventListener('input', scheduleUpdate); });
  [pkStrategyEl, nullHandlingEl, dateFormatEl].forEach(function (el) { el.addEventListener('change', scheduleUpdate); });

  document.getElementById('columnConfigList').addEventListener('change', function (e) {
    var row = e.target.closest('.sql-col-row');
    if (!row) return;
    var idx = parseInt(row.getAttribute('data-idx'), 10);
    var cfg = columnConfigs[idx];
    if (!cfg) return;
    if (e.target.classList.contains('col-name')) cfg.name = e.target.value;
    if (e.target.classList.contains('col-type')) cfg.dataType = e.target.value;
    if (e.target.classList.contains('col-def')) cfg.defaultValue = e.target.value;
    if (e.target.classList.contains('col-pk')) cfg.isPrimaryKey = e.target.checked;
    if (e.target.classList.contains('col-inc')) cfg.includeInInsert = e.target.checked;
    if (e.target.classList.contains('col-null')) cfg.nullable = e.target.checked;
    if (e.target.classList.contains('col-auto')) cfg.autoIncrement = e.target.checked;
    scheduleUpdate();
  });

  document.getElementById('columnConfigList').addEventListener('click', function (e) {
    if (!e.target.classList.contains('col-del')) return;
    var row = e.target.closest('.sql-col-row');
    var idx = parseInt(row.getAttribute('data-idx'), 10);
    columnConfigs.splice(idx, 1);
    renderColumnConfig();
    generateSql();
  });

  document.getElementById('autoDetectTypes').addEventListener('click', function () { autoDetectDataTypes(false); });
  document.getElementById('refreshColumns').addEventListener('click', function () {
    renderColumnConfig();
    ToolsCommon.notify('列配置已刷新');
  });
  document.getElementById('generateSql').addEventListener('click', generateSql);
  document.getElementById('copySql').addEventListener('click', function () {
    ToolsCommon.copyText(currentSql, 'SQL 语句');
  });
  document.getElementById('downloadSql').addEventListener('click', function () {
    var name = (tableNameEl.value || 'table_name').trim();
    ToolsCommon.downloadText(name + '_' + Date.now() + '.sql', currentSql);
  });
  document.getElementById('previewSql').addEventListener('click', function () {
    isPreviewMode = !isPreviewMode;
    this.textContent = isPreviewMode ? '显示全部' : '预览模式';
    if (currentSql) {
      sqlContentEl.value = isPreviewMode && currentSql.length > 1000 ? currentSql.substring(0, 1000) + '\n... (预览截断)' : currentSql;
    }
  });
  document.getElementById('formatSql').addEventListener('click', function () {
    if (!currentSql) return;
    currentSql = currentSql
      .replace(/;/g, ';\n\n')
      .replace(/INSERT INTO/g, '\nINSERT INTO')
      .replace(/VALUES/g, '\nVALUES')
      .replace(/CREATE TABLE/g, '\nCREATE TABLE');
    sqlContentEl.value = isPreviewMode && currentSql.length > 1000 ? currentSql.substring(0, 1000) + '\n... (预览截断)' : currentSql;
    ToolsCommon.notify('SQL 已格式化');
  });

  loadSettings();
})();
