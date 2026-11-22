(function () {
  var inEl = document.getElementById('sqlInput');
  var outEl = document.getElementById('sqlOutput');
  var metaEl = document.getElementById('sqlInMeta');
  var statusEl = document.getElementById('sqlStatus');

  var KEYWORDS_NEWLINE = [
    'SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN',
    'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION ALL', 'UNION',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'AND', 'OR'
  ];

  function beautifySql(sql) {
    var s = sql.replace(/\s+/g, ' ').trim();
    if (!s) return '';

    // Preserve string literals while formatting keywords outside quotes
    var strings = [];
    s = s.replace(/'(?:''|[^'])*'/g, function (m) {
      strings.push(m);
      return '__STR_' + (strings.length - 1) + '__';
    });

    KEYWORDS_NEWLINE.forEach(function (kw) {
      var re = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
      s = s.replace(re, function () {
        if (kw === 'AND' || kw === 'OR') return '\n  ' + kw;
        return '\n' + kw;
      });
    });

    s = s.replace(/,\s*/g, ',\n  ');
    s = s.replace(/^\n+/, '').replace(/\n{2,}/g, '\n');

    s = s.replace(/__STR_(\d+)__/g, function (_, idx) {
      return strings[parseInt(idx, 10)];
    });
    return s;
  }

  function parseParamToken(token) {
    var t = token.trim();
    if (t === 'null') return 'NULL';
    var m = t.match(/^([\s\S]*)\(([^()]+)\)$/);
    if (!m) return "'" + t.replace(/'/g, "''") + "'";
    var val = m[1].trim();
    var type = m[2].trim().toLowerCase();
    if (type === 'integer' || type === 'long' || type === 'double' || type === 'float' ||
        type === 'bigdecimal' || type === 'short' || type === 'byte' || type === 'boolean') {
      return val;
    }
    return "'" + val.replace(/'/g, "''") + "'";
  }

  window.restoreMyBatis = function () {
    var raw = inEl.value || '';
    var prepMatch = raw.match(/Preparing:\s*([^\r\n]+)/i);
    var paramMatch = raw.match(/Parameters:\s*([^\r\n]*)/i);

    if (!prepMatch) {
      ToolsCommon.setStatus(statusEl, 'error', '未检测到 "Preparing:" 行，请确认粘贴了完整的 MyBatis 日志');
      return;
    }

    var sql = prepMatch[1].trim();
    var paramsRaw = paramMatch ? paramMatch[1].trim() : '';
    var params = paramsRaw ? paramsRaw.split(/,(?![^(]*\))/) : [];
    var idx = 0;

    var restored = sql.replace(/\?/g, function () {
      if (idx < params.length) return parseParamToken(params[idx++]);
      return '?';
    });

    outEl.value = beautifySql(restored);
    ToolsCommon.setStatus(statusEl, 'success', 'MyBatis 日志还原成功，共替换 ' + idx + ' 个参数占位符');
  };

  window.formatSql = function () {
    var raw = (inEl.value || '').trim();
    if (!raw) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入 SQL 语句');
      return;
    }
    outEl.value = beautifySql(raw);
    ToolsCommon.setStatus(statusEl, 'success', 'SQL 格式化完成');
  };

  window.minifySql = function () {
    var raw = (inEl.value || '').trim();
    if (!raw) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入 SQL 语句');
      return;
    }
    outEl.value = raw.replace(/\s+/g, ' ').trim();
    ToolsCommon.setStatus(statusEl, 'success', 'SQL 已压缩为单行');
  };

  window.loadSampleMyBatis = function () {
    inEl.value =
      '==>  Preparing: SELECT id, username, status, created_at FROM sys_user WHERE dept_id = ? AND status = ? AND username LIKE ? ORDER BY id DESC\n' +
      '==> Parameters: 1024(Long), 1(Integer), %admin%(String)';
    metaEl.textContent = ToolsCommon.formatMeta(inEl.value);
    restoreMyBatis();
  };

  window.clearAll = function () {
    inEl.value = '';
    outEl.value = '';
    metaEl.textContent = '0 字符';
    ToolsCommon.setStatus(statusEl, '', '');
  };

  window.copyOut = function () {
    ToolsCommon.copyText(outEl.value, 'SQL ');
  };

  window.downloadOut = function () {
    ToolsCommon.downloadText('formatted.sql', outEl.value);
  };

  inEl.addEventListener('input', function () {
    metaEl.textContent = ToolsCommon.formatMeta(inEl.value);
  });
})();
