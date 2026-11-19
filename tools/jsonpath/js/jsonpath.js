(function () {
  var exprEl = document.getElementById('jpExpr');
  var jsonEl = document.getElementById('jpJson');
  var valOut = document.getElementById('jpValOut');
  var pathOut = document.getElementById('jpPathOut');
  var countEl = document.getElementById('jpCount');
  var statusEl = document.getElementById('jpStatus');
  var activeTab = 'val';

  function tokenizePath(expr) {
    var s = expr.trim();
    if (s.charAt(0) !== '$') throw new Error('JSONPath 必须以 $ 开头');
    var tokens = [];
    var i = 1;
    while (i < s.length) {
      if (s[i] === '.' && s[i + 1] === '.') {
        tokens.push({ type: 'recurse' });
        i += 2;
        if (s[i] && s[i] !== '[') {
          var m = s.slice(i).match(/^(\*|[a-zA-Z0-9_$-]+)/);
          if (m) {
            tokens.push({ type: 'prop', value: m[1] });
            i += m[1].length;
          }
        }
      } else if (s[i] === '.') {
        i++;
        var m2 = s.slice(i).match(/^(\*|[a-zA-Z0-9_$-]+)/);
        if (!m2) throw new Error('无效的属性名，位置: ' + i);
        tokens.push({ type: 'prop', value: m2[1] });
        i += m2[1].length;
      } else if (s[i] === '[') {
        var depth = 1, j = i + 1, inStr = false, quote = '';
        while (j < s.length && depth > 0) {
          if (inStr) {
            if (s[j] === '\\') j++;
            else if (s[j] === quote) inStr = false;
          } else {
            if (s[j] === "'" || s[j] === '"') { inStr = true; quote = s[j]; }
            else if (s[j] === '[') depth++;
            else if (s[j] === ']') depth--;
          }
          j++;
        }
        if (depth !== 0) throw new Error('未闭合的 [');
        var inner = s.slice(i + 1, j - 1).trim();
        tokens.push({ type: 'bracket', value: inner });
        i = j;
      } else {
        throw new Error('无法解析的字符: ' + s[i]);
      }
    }
    return tokens;
  }

  function evalFilter(item, cond) {
    if (!item || typeof item !== 'object') return false;
    var expr = cond.trim();
    var m = expr.match(/^@\.([a-zA-Z0-9_$-]+)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (m) {
      var left = item[m[1]];
      var op = m[2];
      var rightRaw = m[3].trim();
      var right;
      if ((rightRaw[0] === "'" && rightRaw[rightRaw.length - 1] === "'") ||
          (rightRaw[0] === '"' && rightRaw[rightRaw.length - 1] === '"')) {
        right = rightRaw.slice(1, -1);
      } else if (rightRaw === 'true') right = true;
      else if (rightRaw === 'false') right = false;
      else if (rightRaw === 'null') right = null;
      else right = Number(rightRaw);

      if (op === '==') return left == right;
      if (op === '!=') return left != right;
      if (op === '<') return left < right;
      if (op === '<=') return left <= right;
      if (op === '>') return left > right;
      if (op === '>=') return left >= right;
    }
    var existsMatch = expr.match(/^@\.([a-zA-Z0-9_$-]+)$/);
    if (existsMatch) return Object.prototype.hasOwnProperty.call(item, existsMatch[1]);
    return false;
  }

  function collectDescend(node, path, acc) {
    acc.push({ val: node, path: path });
    if (Array.isArray(node)) {
      node.forEach(function (v, idx) { collectDescend(v, path + '[' + idx + ']', acc); });
    } else if (node && typeof node === 'object') {
      Object.keys(node).forEach(function (k) {
        collectDescend(node[k], path + "['" + k + "']", acc);
      });
    }
  }

  function stepNode(node, path, tok) {
    var out = [];
    if (tok.type === 'prop') {
      if (tok.value === '*') {
        if (Array.isArray(node)) {
          node.forEach(function (v, idx) { out.push({ val: v, path: path + '[' + idx + ']' }); });
        } else if (node && typeof node === 'object') {
          Object.keys(node).forEach(function (k) { out.push({ val: node[k], path: path + "['" + k + "']" }); });
        }
      } else if (node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, tok.value)) {
        out.push({ val: node[tok.value], path: path + "['" + tok.value + "']" });
      }
      return out;
    }

    var v = tok.value;
    if (v === '*') {
      return stepNode(node, path, { type: 'prop', value: '*' });
    }
    if (v.indexOf('?(') === 0 && v.slice(-1) === ')') {
      var cond = v.slice(2, -1);
      var list = Array.isArray(node) ? node.map(function (x, i) { return { val: x, path: path + '[' + i + ']' }; }) : [];
      return list.filter(function (entry) { return evalFilter(entry.val, cond); });
    }
    if (v.indexOf(':') !== -1 && Array.isArray(node)) {
      var parts = v.split(':');
      var len = node.length;
      var start = parts[0] === '' ? 0 : Number(parts[0]);
      var end = parts[1] === '' ? len : Number(parts[1]);
      if (start < 0) start = Math.max(0, len + start);
      if (end < 0) end = Math.max(0, len + end);
      for (var i = Math.max(0, start); i < Math.min(len, end); i++) {
        out.push({ val: node[i], path: path + '[' + i + ']' });
      }
      return out;
    }
    if (v.indexOf(',') !== -1) {
      v.split(',').forEach(function (part) {
        out = out.concat(stepNode(node, path, { type: 'bracket', value: part.trim() }));
      });
      return out;
    }
    if ((v[0] === "'" && v[v.length - 1] === "'") || (v[0] === '"' && v[v.length - 1] === '"')) {
      return stepNode(node, path, { type: 'prop', value: v.slice(1, -1) });
    }
    if (/^-?\d+$/.test(v) && Array.isArray(node)) {
      var idx = Number(v);
      if (idx < 0) idx = node.length + idx;
      if (idx >= 0 && idx < node.length) {
        out.push({ val: node[idx], path: path + '[' + idx + ']' });
      }
    }
    return out;
  }

  function queryJsonPath(root, expr) {
    var tokens = tokenizePath(expr);
    var current = [{ val: root, path: '$' }];
    tokens.forEach(function (tok) {
      var next = [];
      if (tok.type === 'recurse') {
        current.forEach(function (item) { collectDescend(item.val, item.path, next); });
      } else {
        current.forEach(function (item) { next = next.concat(stepNode(item.val, item.path, tok)); });
      }
      current = next;
    });
    return current;
  }

  window.runJsonPath = function () {
    var raw = jsonEl.value.trim();
    if (!raw) return ToolsCommon.setStatus(statusEl, 'error', '请输入 JSON 数据');
    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return ToolsCommon.setStatus(statusEl, 'error', 'JSON 语法错误: ' + e.message);
    }

    try {
      var hits = queryJsonPath(data, exprEl.value);
      countEl.textContent = hits.length + ' 条命中';
      valOut.value = JSON.stringify(hits.map(function (h) { return h.val; }), null, 2);
      pathOut.value = hits.map(function (h) { return h.path; }).join('\n');
      ToolsCommon.setStatus(statusEl, 'success', '查询完成，命中 ' + hits.length + ' 条结果');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'JSONPath 错误: ' + e.message);
    }
  };

  window.setExpr = function (expr) {
    exprEl.value = expr;
    runJsonPath();
  };

  window.switchOut = function (tab) {
    activeTab = tab;
    var vBtn = document.getElementById('tabValBtn');
    var pBtn = document.getElementById('tabPathBtn');
    if (tab === 'path') {
      valOut.style.display = 'none';
      pathOut.style.display = 'block';
      pBtn.classList.add('mdui-color-theme');
      vBtn.classList.remove('mdui-color-theme');
    } else {
      pathOut.style.display = 'none';
      valOut.style.display = 'block';
      vBtn.classList.add('mdui-color-theme');
      pBtn.classList.remove('mdui-color-theme');
    }
  };

  window.copyResult = function () {
    ToolsCommon.copyText(activeTab === 'path' ? pathOut.value : valOut.value, '结果');
  };

  window.loadSample = function () {
    jsonEl.value = JSON.stringify({
      store: {
        book: [
          { category: 'reference', author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
          { category: 'fiction', author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
          { category: 'fiction', author: 'Herman Melville', title: 'Moby Dick', isbn: '0-553-21311-3', price: 8.99 },
          { category: 'fiction', author: 'J. R. R. Tolkien', title: 'The Lord of the Rings', isbn: '0-395-19395-8', price: 22.99 }
        ],
        bicycle: { color: 'red', price: 19.95 }
      }
    }, null, 2);
    runJsonPath();
  };

  exprEl.addEventListener('input', runJsonPath);
  jsonEl.addEventListener('input', runJsonPath);
  loadSample();
})();
