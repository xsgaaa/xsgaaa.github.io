(function () {
  var inputEl = document.getElementById('cronInput');
  var fieldsEl = document.getElementById('cronFields');
  var nextListEl = document.getElementById('cronNextList');
  var statusEl = document.getElementById('cronStatus');

  function parseField(token, min, max) {
    var set = {};
    var normalized = token.replace(/\?/g, '*');
    var parts = normalized.split(',');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (!p) throw new Error('空字段: ' + token);
      var stepSplit = p.split('/');
      var rangePart = stepSplit[0];
      var step = stepSplit.length > 1 ? parseInt(stepSplit[1], 10) : 1;
      if (isNaN(step) || step <= 0) throw new Error('无效步长: ' + p);

      var start, end;
      if (rangePart === '*') {
        start = min;
        end = max;
      } else if (rangePart.indexOf('-') !== -1) {
        var r = rangePart.split('-');
        start = parseInt(r[0], 10);
        end = parseInt(r[1], 10);
      } else {
        start = parseInt(rangePart, 10);
        end = stepSplit.length > 1 ? max : start;
      }
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error('数值越界或格式错误: ' + p);
      }
      for (var v = start; v <= end; v += step) {
        set[v] = true;
      }
    }
    return set;
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDateTime(d) {
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' (' + days[d.getDay()] + ')';
  }

  window.parseCron = function () {
    var expr = (inputEl.value || '').trim().replace(/\s+/g, ' ');
    nextListEl.innerHTML = '';
    fieldsEl.innerHTML = '';
    if (!expr) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入 Cron 表达式');
      return;
    }

    var parts = expr.split(' ');
    if (parts.length !== 5 && parts.length !== 6) {
      ToolsCommon.setStatus(statusEl, 'error', '仅支持 5 位（Linux）或 6 位（Spring/Quartz）Cron 表达式，当前为 ' + parts.length + ' 位');
      return;
    }

    try {
      var is6 = parts.length === 6;
      var secSet = is6 ? parseField(parts[0], 0, 59) : { 0: true };
      var minSet = parseField(parts[is6 ? 1 : 0], 0, 59);
      var hourSet = parseField(parts[is6 ? 2 : 1], 0, 23);
      var domSet = parseField(parts[is6 ? 3 : 2], 1, 31);
      var monSet = parseField(parts[is6 ? 4 : 3], 1, 12);
      var dowRaw = parseField(parts[is6 ? 5 : 4], 0, 7);
      if (dowRaw[7]) dowRaw[0] = true;

      var labels = is6 ? ['秒', '分', '时', '日', '月', '周'] : ['分', '时', '日', '月', '周'];
      fieldsEl.innerHTML = labels.map(function (lb, idx) {
        return '<span class="tool-tag">' + lb + ': ' + ToolsCommon.escapeHtml(parts[idx]) + '</span>';
      }).join(' ');

      var results = [];
      var cur = new Date();
      cur.setMilliseconds(0);
      cur.setSeconds(cur.getSeconds() + 1);

      var hasSecStep = is6 && Object.keys(secSet).length > 1;
      var maxIter = hasSecStep ? 200000 : 525600;
      if (!hasSecStep) {
        var firstSec = parseInt(Object.keys(secSet)[0], 10);
        if (cur.getSeconds() > firstSec) {
          cur.setMinutes(cur.getMinutes() + 1);
        }
        cur.setSeconds(firstSec);
      }

      for (var i = 0; i < maxIter && results.length < 10; i++) {
        var m = cur.getMonth() + 1;
        var d = cur.getDate();
        var w = cur.getDay();
        var h = cur.getHours();
        var min = cur.getMinutes();
        var s = cur.getSeconds();

        if (monSet[m] && domSet[d] && dowRaw[w] && hourSet[h] && minSet[min] && secSet[s]) {
          results.push(formatDateTime(cur));
        }
        if (hasSecStep) cur.setSeconds(cur.getSeconds() + 1);
        else cur.setMinutes(cur.getMinutes() + 1);
      }

      if (!results.length) {
        ToolsCommon.setStatus(statusEl, 'error', '在未来搜索范围内未找到匹配的触发时间，请检查表达式');
        return;
      }

      nextListEl.innerHTML = results.map(function (t, idx) {
        return '<li>#' + (idx + 1) + ' &nbsp;' + ToolsCommon.escapeHtml(t) + '</li>';
      }).join('');
      ToolsCommon.setStatus(statusEl, 'success', '解析成功（' + (is6 ? '6 位 Spring/Quartz' : '5 位标准 Crontab') + '）');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', '解析失败：' + e.message);
    }
  };

  window.setCron = function (val) {
    inputEl.value = val;
    parseCron();
  };

  window.copyCron = function () {
    ToolsCommon.copyText((inputEl.value || '').trim(), 'Cron 表达式 ');
  };

  inputEl.addEventListener('input', parseCron);
  parseCron();
})();
