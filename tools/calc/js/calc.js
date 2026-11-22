(function () {
  var exprEl = document.getElementById('calcExpr');
  var resultEl = document.getElementById('calcResult');
  var extraMetaEl = document.getElementById('calcExtraMeta');
  var historyEl = document.getElementById('calcHistory');
  var angleBtn = document.getElementById('angleModeBtn');
  var statusEl = document.getElementById('calcStatus');

  var HISTORY_KEY = 'tools_calc_history_v1';
  var isDeg = true;
  var lastAns = 0;

  function toRad(x) { return isDeg ? (x * Math.PI) / 180 : x; }
  function fromRad(x) { return isDeg ? (x * 180) / Math.PI : x; }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('阶乘仅支持非负整数');
    if (n > 170) throw new Error('阶乘结果超出数值范围');
    var res = 1;
    for (var i = 2; i <= n; i++) res *= i;
    return res;
  }

  var FUNCS = {
    sin: function (x) { return Math.sin(toRad(x)); },
    cos: function (x) { return Math.cos(toRad(x)); },
    tan: function (x) { return Math.tan(toRad(x)); },
    asin: function (x) { return fromRad(Math.asin(x)); },
    acos: function (x) { return fromRad(Math.acos(x)); },
    atan: function (x) { return fromRad(Math.atan(x)); },
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    ln: Math.log,
    log: Math.log10,
    log10: Math.log10,
    log2: Math.log2,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };

  function tokenize(expr) {
    var tokens = [];
    var i = 0;
    while (i < expr.length) {
      var ch = expr[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        var numStr = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          numStr += expr[i++];
        }
        if ((expr[i] === 'e' || expr[i] === 'E') && /[+\-0-9]/.test(expr[i + 1] || '')) {
          numStr += expr[i++];
          if (expr[i] === '+' || expr[i] === '-') numStr += expr[i++];
          while (i < expr.length && /[0-9]/.test(expr[i])) numStr += expr[i++];
        }
        var val = Number(numStr);
        if (isNaN(val)) throw new Error('无效数字: ' + numStr);
        tokens.push({ type: 'num', value: val });
        continue;
      }
      if (/[a-zA-Z_π]/.test(ch)) {
        var id = '';
        while (i < expr.length && /[a-zA-Z0-9_π]/.test(expr[i])) id += expr[i++];
        tokens.push({ type: 'id', value: id.toLowerCase() });
        continue;
      }
      if ('+-*/%^()!'.indexOf(ch) !== -1) {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }
      throw new Error('不支持的字符: ' + ch);
    }
    return tokens;
  }

  function evaluateTokens(tokens) {
    var pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }

    function parseExpr() {
      var left = parseTerm();
      while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        var op = next().value;
        var right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    }

    function parseTerm() {
      var left = parsePower();
      while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        var op = next().value;
        var right = parsePower();
        if (op === '*') left *= right;
        else if (op === '/') {
          if (right === 0) throw new Error('除数不能为 0');
          left /= right;
        } else {
          left %= right;
        }
      }
      return left;
    }

    function parsePower() {
      var base = parseUnary();
      if (peek() && peek().type === 'op' && peek().value === '^') {
        next();
        var exp = parsePower();
        return Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary() {
      if (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
        var op = next().value;
        var val = parseUnary();
        return op === '-' ? -val : val;
      }
      return parsePostfix();
    }

    function parsePostfix() {
      var val = parsePrimary();
      while (peek() && peek().type === 'op' && peek().value === '!') {
        next();
        val = factorial(val);
      }
      return val;
    }

    function parsePrimary() {
      var tok = peek();
      if (!tok) throw new Error('表达式不完整');
      if (tok.type === 'num') {
        next();
        return tok.value;
      }
      if (tok.type === 'op' && tok.value === '(') {
        next();
        var val = parseExpr();
        if (!peek() || peek().value !== ')') throw new Error('缺少右括号 )');
        next();
        return val;
      }
      if (tok.type === 'id') {
        next();
        if (tok.value === 'pi' || tok.value === 'π') return Math.PI;
        if (tok.value === 'e') return Math.E;
        if (tok.value === 'ans') return lastAns;
        if (FUNCS[tok.value]) {
          if (!peek() || peek().value !== '(') throw new Error('函数 ' + tok.value + ' 后需要括号 ()');
          next();
          var arg = parseExpr();
          if (!peek() || peek().value !== ')') throw new Error('函数 ' + tok.value + ' 缺少右括号 )');
          next();
          return FUNCS[tok.value](arg);
        }
        throw new Error('未知标识: ' + tok.value);
      }
      throw new Error('语法错误: ' + tok.value);
    }

    var res = parseExpr();
    if (pos < tokens.length) throw new Error('多余的符号: ' + tokens[pos].value);
    return res;
  }

  function formatNumber(n) {
    if (!isFinite(n)) throw new Error('结果无穷大或非数值');
    var rounded = Number(n.toPrecision(12));
    return String(rounded);
  }

  function updateExtraMeta(num) {
    if (!isFinite(num)) {
      extraMetaEl.innerHTML = '';
      return;
    }
    var tags = ['科学计数: ' + num.toExponential(4)];
    if (Number.isInteger(num) && Math.abs(num) <= 9007199254740991) {
      tags.push('HEX: 0x' + num.toString(16).toUpperCase());
      if (Math.abs(num) <= 65535) tags.push('BIN: ' + num.toString(2));
    }
    extraMetaEl.innerHTML = tags.map(function (t) {
      return '<span class="tool-tag">' + ToolsCommon.escapeHtml(t) + '</span>';
    }).join(' ');
  }

  function previewEval() {
    var raw = (exprEl.value || '').trim();
    if (!raw) {
      resultEl.textContent = '0';
      extraMetaEl.innerHTML = '';
      ToolsCommon.setStatus(statusEl, '', '');
      return null;
    }
    try {
      var val = evaluateTokens(tokenize(raw));
      var str = formatNumber(val);
      resultEl.textContent = str;
      updateExtraMeta(val);
      ToolsCommon.setStatus(statusEl, '', '');
      return { expr: raw, val: val, str: str };
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', e.message);
      return null;
    }
  }

  function renderHistory() {
    var list = ToolsCommon.getJsonStore(HISTORY_KEY, []);
    if (!list.length) {
      historyEl.innerHTML = '<li style="color:var(--tech-text-muted); font-size:13px; padding:12px;">暂无计算历史</li>';
      return;
    }
    historyEl.innerHTML = list.map(function (item, idx) {
      return '<li class="calc-history-item" data-idx="' + idx + '">' +
        '<div style="font-size:12px; color:var(--tech-text-muted); font-family:monospace;">' + ToolsCommon.escapeHtml(item.expr) + '</div>' +
        '<div style="font-size:16px; font-weight:700; color:var(--tech-accent); font-family:monospace;">= ' + ToolsCommon.escapeHtml(item.res) + '</div>' +
      '</li>';
    }).join('');
    historyEl.querySelectorAll('.calc-history-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.getAttribute('data-idx'), 10);
        var item = list[idx];
        if (item) {
          exprEl.value = item.expr;
          previewEval();
        }
      });
    });
  }

  window.evaluateAndSave = function () {
    var out = previewEval();
    if (!out) return;
    lastAns = out.val;
    var list = ToolsCommon.getJsonStore(HISTORY_KEY, []);
    list = [{ expr: out.expr, res: out.str }].concat(list).slice(0, 20);
    ToolsCommon.setJsonStore(HISTORY_KEY, list);
    renderHistory();
    ToolsCommon.setStatus(statusEl, 'success', '计算完成，已保存至历史记录（ANS = ' + out.str + '）');
  };

  window.insertToken = function (tok) {
    var start = exprEl.selectionStart || exprEl.value.length;
    var end = exprEl.selectionEnd || exprEl.value.length;
    var val = exprEl.value;
    exprEl.value = val.slice(0, start) + tok + val.slice(end);
    exprEl.focus();
    exprEl.selectionStart = exprEl.selectionEnd = start + tok.length;
    previewEval();
  };

  window.backspaceCalc = function () {
    var start = exprEl.selectionStart || exprEl.value.length;
    var end = exprEl.selectionEnd || exprEl.value.length;
    var val = exprEl.value;
    if (start !== end) {
      exprEl.value = val.slice(0, start) + val.slice(end);
      exprEl.selectionStart = exprEl.selectionEnd = start;
    } else if (start > 0) {
      exprEl.value = val.slice(0, start - 1) + val.slice(start);
      exprEl.selectionStart = exprEl.selectionEnd = start - 1;
    }
    exprEl.focus();
    previewEval();
  };

  window.clearCalc = function () {
    exprEl.value = '';
    previewEval();
    exprEl.focus();
  };

  window.toggleAngleMode = function () {
    isDeg = !isDeg;
    angleBtn.textContent = isDeg ? '角度制: DEG' : '弧度制: RAD';
    previewEval();
  };

  window.copyResult = function () {
    ToolsCommon.copyText(resultEl.textContent, '计算结果 ');
  };

  window.clearHistory = function () {
    ToolsCommon.setJsonStore(HISTORY_KEY, []);
    renderHistory();
  };

  exprEl.addEventListener('input', previewEval);
  exprEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      evaluateAndSave();
    } else if (e.key === 'Escape') {
      clearCalc();
    }
  });

  renderHistory();
})();
