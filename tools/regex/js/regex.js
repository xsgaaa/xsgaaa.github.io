(function () {
  var patEl = document.getElementById('regexPattern');
  var textEl = document.getElementById('regexText');
  var repEl = document.getElementById('replacePattern');
  var hlEl = document.getElementById('regexHighlight');
  var repOutEl = document.getElementById('replaceOutput');
  var detailsEl = document.getElementById('matchDetails');
  var countEl = document.getElementById('matchCount');
  var statusEl = document.getElementById('regexStatus');

  function getFlags() {
    return Array.from(document.querySelectorAll('.regex-flag:checked')).map(function (c) { return c.value; }).join('');
  }

  function runRegex() {
    var pat = patEl.value;
    var text = textEl.value;
    var flags = getFlags();
    if (!pat) {
      hlEl.textContent = text;
      repOutEl.textContent = text;
      detailsEl.innerHTML = '';
      countEl.textContent = '0 个匹配';
      ToolsCommon.setStatus(statusEl, '', '');
      return;
    }
    var re;
    try {
      re = new RegExp(pat, flags);
      ToolsCommon.setStatus(statusEl, '', '');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', '正则表达式语法错误: ' + e.message);
      return;
    }

    var matches = [];
    if (flags.indexOf('g') !== -1) {
      var m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ index: m.index, text: m[0], groups: m.slice(1) });
        if (m[0] === '') re.lastIndex++;
        if (matches.length >= 500) break;
      }
    } else {
      var single = re.exec(text);
      if (single) matches.push({ index: single.index, text: single[0], groups: single.slice(1) });
    }

    countEl.textContent = matches.length + ' 个匹配';

    var html = '';
    var cursor = 0;
    matches.forEach(function (item) {
      html += ToolsCommon.escapeHtml(text.slice(cursor, item.index));
      html += '<span class="regex-match">' + ToolsCommon.escapeHtml(item.text || ' ') + '</span>';
      cursor = item.index + item.text.length;
    });
    html += ToolsCommon.escapeHtml(text.slice(cursor));
    hlEl.innerHTML = html;

    repOutEl.textContent = repEl.value !== '' ? text.replace(re, repEl.value) : '';

    detailsEl.innerHTML = matches.slice(0, 50).map(function (item, idx) {
      var grpText = item.groups.length
        ? item.groups.map(function (g, gi) { return '$' + (gi + 1) + ': ' + (g === undefined ? 'undefined' : g); }).join(' | ')
        : '无捕获分组';
      return '<div class="tool-kv-item"><div class="tool-kv-label">#' + (idx + 1) + ' (索引 ' + item.index + ')</div>' +
        '<div class="tool-kv-value"><strong>' + ToolsCommon.escapeHtml(item.text) + '</strong><br><span style="opacity:.75;font-size:12px;">' + ToolsCommon.escapeHtml(grpText) + '</span></div></div>';
    }).join('');
  }

  window.applyPreset = function (pattern, sample) {
    patEl.value = pattern;
    textEl.value = sample;
    runRegex();
  };

  patEl.addEventListener('input', runRegex);
  textEl.addEventListener('input', runRegex);
  repEl.addEventListener('input', runRegex);
  document.querySelectorAll('.regex-flag').forEach(function (el) { el.addEventListener('change', runRegex); });
  runRegex();
})();
