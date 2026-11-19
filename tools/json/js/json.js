(function () {
  var inputEl = document.getElementById('jsonInput');
  var outputEl = document.getElementById('jsonOutput');
  var treeEl = document.getElementById('jsonTree');
  var statusEl = document.getElementById('jsonStatus');
  var inputMetaEl = document.getElementById('inputMeta');
  var outputMetaEl = document.getElementById('outputMeta');
  var currentExt = 'json';

  function getIndent() {
    var v = document.getElementById('indentSelect').value;
    return v === 'tab' ? '\t' : Number(v);
  }

  function updateMeta() {
    inputMetaEl.textContent = ToolsCommon.formatMeta(inputEl.value);
    outputMetaEl.textContent = ToolsCommon.formatMeta(outputEl.value);
  }

  function setOutput(text, ext, treeData) {
    currentExt = ext || 'json';
    outputEl.value = text;
    updateMeta();
    if (treeData !== undefined) {
      renderTree(treeData);
    }
  }

  function parseInput() {
    var raw = inputEl.value.trim();
    if (!raw) {
      ToolsCommon.setStatus(statusEl, 'error', '请先输入 JSON 内容');
      return null;
    }
    try {
      var parsed = JSON.parse(raw);
      ToolsCommon.setStatus(statusEl, 'success', 'JSON 解析成功');
      return parsed;
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'JSON 语法错误: ' + e.message);
      return null;
    }
  }

  window.jsonFormat = function () {
    var data = parseInput();
    if (data === null) return;
    setOutput(JSON.stringify(data, null, getIndent()), 'json', data);
  };

  window.jsonMinify = function () {
    var data = parseInput();
    if (data === null) return;
    setOutput(JSON.stringify(data), 'json', data);
  };

  function sortObj(val) {
    if (Array.isArray(val)) return val.map(sortObj);
    if (val && typeof val === 'object') {
      var sorted = {};
      Object.keys(val).sort().forEach(function (k) {
        sorted[k] = sortObj(val[k]);
      });
      return sorted;
    }
    return val;
  }

  window.jsonSortKeys = function () {
    var data = parseInput();
    if (data === null) return;
    var sorted = sortObj(data);
    setOutput(JSON.stringify(sorted, null, getIndent()), 'json', sorted);
    ToolsCommon.setStatus(statusEl, 'success', '已完成 Key 字母升序排列');
  };

  window.jsonEscape = function () {
    var raw = inputEl.value;
    if (!raw) return ToolsCommon.setStatus(statusEl, 'error', '输入为空');
    setOutput(JSON.stringify(raw), 'txt');
    ToolsCommon.setStatus(statusEl, 'success', '已转义为 JSON 字符串');
  };

  window.jsonUnescape = function () {
    var raw = inputEl.value.trim();
    if (!raw) return ToolsCommon.setStatus(statusEl, 'error', '输入为空');
    try {
      var unescaped = JSON.parse(raw);
      if (typeof unescaped === 'string') {
        try {
          var inner = JSON.parse(unescaped);
          setOutput(JSON.stringify(inner, null, getIndent()), 'json', inner);
          ToolsCommon.setStatus(statusEl, 'success', '已反转义并格式化 JSON');
          return;
        } catch (_) {
          setOutput(unescaped, 'txt');
          ToolsCommon.setStatus(statusEl, 'success', '已反转义为普通文本');
          return;
        }
      }
      setOutput(JSON.stringify(unescaped, null, getIndent()), 'json', unescaped);
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', '反转义失败: ' + e.message);
    }
  };

  function toPascal(str) {
    return str.replace(/[^a-zA-Z0-9]+(.)/g, function (_, c) { return c.toUpperCase(); })
      .replace(/^[a-z]/, function (c) { return c.toUpperCase(); }) || 'Root';
  }

  window.jsonToTs = function () {
    var data = parseInput();
    if (data === null) return;
    var interfaces = [];
    var seen = {};

    function inferTs(val, name) {
      if (val === null) return 'null';
      if (Array.isArray(val)) {
        if (val.length === 0) return 'any[]';
        var itemType = inferTs(val[0], name + 'Item');
        return itemType + '[]';
      }
      if (typeof val === 'object') {
        var typeName = toPascal(name);
        if (!seen[typeName]) {
          seen[typeName] = true;
          var lines = ['export interface ' + typeName + ' {'];
          Object.keys(val).forEach(function (k) {
            var keySafe = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
            lines.push('  ' + keySafe + ': ' + inferTs(val[k], k) + ';');
          });
          lines.push('}');
          interfaces.push(lines.join('\n'));
        }
        return typeName;
      }
      return typeof val;
    }

    var rootType = inferTs(data, 'Root');
    var res = interfaces.length ? interfaces.reverse().join('\n\n') : 'export type Root = ' + rootType + ';';
    setOutput(res, 'ts');
    switchOutTab('text');
    ToolsCommon.setStatus(statusEl, 'success', '已生成 TypeScript 类型定义');
  };

  window.jsonToGo = function () {
    var data = parseInput();
    if (data === null) return;
    var structs = [];
    var seen = {};

    function inferGo(val, name) {
      if (val === null) return 'interface{}';
      if (Array.isArray(val)) {
        return val.length ? '[]' + inferGo(val[0], name + 'Item') : '[]interface{}';
      }
      if (typeof val === 'object') {
        var structName = toPascal(name);
        if (!seen[structName]) {
          seen[structName] = true;
          var lines = ['type ' + structName + ' struct {'];
          Object.keys(val).forEach(function (k) {
            lines.push('\t' + toPascal(k) + ' ' + inferGo(val[k], k) + ' `json:"' + k + '"`');
          });
          lines.push('}');
          structs.push(lines.join('\n'));
        }
        return structName;
      }
      if (typeof val === 'number') return Number.isInteger(val) ? 'int64' : 'float64';
      if (typeof val === 'boolean') return 'bool';
      return 'string';
    }

    inferGo(data, 'Root');
    setOutput(structs.reverse().join('\n\n') || '// 无法生成 Go Struct', 'go');
    switchOutTab('text');
    ToolsCommon.setStatus(statusEl, 'success', '已生成 Go Struct');
  };

  window.jsonToQuery = function () {
    var data = parseInput();
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入扁平或对象结构的 JSON');
      return;
    }
    var params = new URLSearchParams();
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    setOutput(params.toString(), 'txt');
    switchOutTab('text');
    ToolsCommon.setStatus(statusEl, 'success', '已转换为 URL Query 参数');
  };

  window.queryToJson = function () {
    var raw = inputEl.value.trim().replace(/^\?/, '');
    if (!raw) return ToolsCommon.setStatus(statusEl, 'error', '请输入 URL 参数');
    var params = new URLSearchParams(raw);
    var obj = {};
    params.forEach(function (v, k) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        obj[k] = Array.isArray(obj[k]) ? obj[k].concat(v) : [obj[k], v];
      } else {
        obj[k] = v;
      }
    });
    setOutput(JSON.stringify(obj, null, getIndent()), 'json', obj);
    ToolsCommon.setStatus(statusEl, 'success', '已将 URL 参数转换为 JSON');
  };

  function buildTreeHtml(val, keyHtml) {
    var prefix = keyHtml ? '<span class="json-key">' + keyHtml + '</span>: ' : '';
    if (val === null) return '<div>' + prefix + '<span class="json-null">null</span></div>';
    if (typeof val === 'string') return '<div>' + prefix + '<span class="json-str">' + ToolsCommon.escapeHtml(JSON.stringify(val)) + '</span></div>';
    if (typeof val === 'number') return '<div>' + prefix + '<span class="json-num">' + val + '</span></div>';
    if (typeof val === 'boolean') return '<div>' + prefix + '<span class="json-bool">' + val + '</span></div>';

    var isArr = Array.isArray(val);
    var keys = Object.keys(val);
    var openBr = isArr ? '[' : '{';
    var closeBr = isArr ? ']' : '}';
    if (keys.length === 0) return '<div>' + prefix + openBr + closeBr + '</div>';

    var children = keys.map(function (k) {
      var kHtml = isArr ? '' : ToolsCommon.escapeHtml(JSON.stringify(k));
      return buildTreeHtml(val[k], kHtml);
    }).join('');
    return '<details open><summary class="json-tree-toggle">' + prefix + openBr + ' <span style="opacity:.55;">(' + keys.length + ')</span></summary>' + children + '<div>' + closeBr + '</div></details>';
  }

  function renderTree(data) {
    treeEl.innerHTML = buildTreeHtml(data, '');
  }

  window.switchOutTab = function (tab) {
    var textBtn = document.getElementById('tabTextBtn');
    var treeBtn = document.getElementById('tabTreeBtn');
    if (tab === 'tree') {
      outputEl.style.display = 'none';
      treeEl.style.display = 'block';
      treeBtn.classList.add('mdui-color-theme');
      textBtn.classList.remove('mdui-color-theme');
    } else {
      treeEl.style.display = 'none';
      outputEl.style.display = 'block';
      textBtn.classList.add('mdui-color-theme');
      treeBtn.classList.remove('mdui-color-theme');
    }
  };

  window.loadSample = function () {
    inputEl.value = JSON.stringify({
      site: '秘密花园',
      author: 'xsgaaaa',
      active: true,
      version: 2,
      tags: ['JSON', 'DevTools', 'Web'],
      meta: { theme: 'Meadow', darkMode: true }
    });
    updateMeta();
    jsonFormat();
  };

  window.clearAll = function () {
    inputEl.value = '';
    outputEl.value = '';
    treeEl.innerHTML = '';
    ToolsCommon.setStatus(statusEl, '', '');
    updateMeta();
  };

  window.copyOutput = function () {
    ToolsCommon.copyText(outputEl.value, '结果');
  };

  window.downloadOutput = function () {
    ToolsCommon.downloadText('result.' + currentExt, outputEl.value);
  };

  inputEl.addEventListener('input', updateMeta);
  updateMeta();
})();
