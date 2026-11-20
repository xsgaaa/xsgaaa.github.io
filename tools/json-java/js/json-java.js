(function () {
  var jsonInput = document.getElementById('jsonInput');
  var javaInput = document.getElementById('javaInput');
  var rootClassInput = document.getElementById('rootClassName');
  var statusEl = document.getElementById('jsonJavaStatus');

  var SAMPLE_JSON = {
    name: 'Tom',
    age: 18,
    score: 99.5,
    active: true,
    tags: ['java', 'json'],
    profile: {
      email: 'tom@example.com',
      city: 'Beijing'
    }
  };

  function capitalize(str) {
    if (!str) return 'SubClass';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function jsTypeToJavaType(val) {
    if (val === null || val === undefined) return 'Object';
    switch (typeof val) {
      case 'string': return 'String';
      case 'number':
        if (Number.isInteger(val)) {
          return (val > 2147483647 || val < -2147483648) ? 'Long' : 'Integer';
        }
        return 'Double';
      case 'boolean': return 'Boolean';
      default: return 'Object';
    }
  }

  function jsonToJava(json, rootClass) {
    var rootName = (rootClass || 'Root').trim() || 'Root';

    function parse(obj, className) {
      var fields = [];
      var innerClasses = [];
      Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        var type = 'String';
        if (value === null || value === undefined) {
          type = 'Object';
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            type = 'List<Object>';
          } else if (typeof value[0] === 'object' && value[0] !== null) {
            var subName = capitalize(key.slice(-1) === 's' && key.length > 1 ? key.slice(0, -1) : key);
            innerClasses.push(parse(value[0], subName));
            type = 'List<' + subName + '>';
          } else {
            type = 'List<' + jsTypeToJavaType(value[0]) + '>';
          }
        } else if (typeof value === 'object') {
          var subClassName = capitalize(key);
          innerClasses.push(parse(value, subClassName));
          type = subClassName;
        } else {
          type = jsTypeToJavaType(value);
        }
        fields.push({ type: type, key: key });
      });

      var classDef = 'public class ' + className + ' {\n' +
        fields.map(function (f) { return '    private ' + f.type + ' ' + f.key + ';'; }).join('\n') +
        '\n}';
      return [classDef].concat(innerClasses).join('\n\n');
    }

    if (Array.isArray(json)) {
      if (json.length > 0 && typeof json[0] === 'object' && json[0] !== null) {
        return parse(json[0], rootName);
      }
      throw new Error('顶层数组元素必须为 JSON 对象');
    }
    if (typeof json !== 'object' || json === null) {
      throw new Error('请输入有效的 JSON 对象');
    }
    return parse(json, rootName);
  }

  function javaTypeSample(t) {
    switch (t) {
      case 'String': return 'string';
      case 'Integer':
      case 'int': return 123;
      case 'Long':
      case 'long': return 1234567890123;
      case 'Double':
      case 'double':
      case 'Float':
      case 'float':
      case 'BigDecimal': return 123.45;
      case 'Boolean':
      case 'boolean': return true;
      case 'Date':
      case 'LocalDateTime': return '2026-01-01 00:00:00';
      default: return null;
    }
  }

  function javaToJson(javaCode) {
    var classMap = {};
    var classOrder = [];
    var classRegex = /public\s+class\s+(\w+)\s*\{([\s\S]*?)\}/g;
    var fieldRegex = /private\s+([\w<>]+)\s+(\w+)\s*;/g;
    var m;

    while ((m = classRegex.exec(javaCode)) !== null) {
      var className = m[1];
      var body = m[2];
      var fields = [];
      var f;
      fieldRegex.lastIndex = 0;
      while ((f = fieldRegex.exec(body)) !== null) {
        fields.push({ type: f[1], name: f[2] });
      }
      classMap[className] = fields;
      classOrder.push(className);
    }

    if (classOrder.length === 0) {
      throw new Error('未识别到 public class ... { private ...; } 定义');
    }

    var scalarTypes = ['String', 'Integer', 'int', 'Long', 'long', 'Double', 'double', 'Float', 'float', 'BigDecimal', 'Boolean', 'boolean', 'Date', 'LocalDateTime', 'Object'];

    function genObj(name, visited) {
      if (visited[name]) return {};
      visited[name] = true;
      var obj = {};
      var fields = classMap[name];
      if (!fields) return {};
      fields.forEach(function (field) {
        var t = field.type;
        if (t.indexOf('List<') === 0) {
          var innerMatch = t.match(/^List<(.+)>$/);
          var innerType = innerMatch ? innerMatch[1] : 'Object';
          if (scalarTypes.indexOf(innerType) !== -1) {
            obj[field.name] = [javaTypeSample(innerType)];
          } else {
            obj[field.name] = [genObj(innerType, Object.assign({}, visited))];
          }
        } else if (scalarTypes.indexOf(t) !== -1) {
          obj[field.name] = javaTypeSample(t);
        } else {
          obj[field.name] = genObj(t, Object.assign({}, visited));
        }
      });
      return obj;
    }

    return genObj(classOrder[0], {});
  }

  document.getElementById('jsonToJavaBtn').addEventListener('click', function () {
    var raw = jsonInput.value.trim();
    if (!raw) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入 JSON 字符串');
      return;
    }
    try {
      var parsed = JSON.parse(raw);
      javaInput.value = jsonToJava(parsed, rootClassInput.value);
      ToolsCommon.setStatus(statusEl, 'success', '已转换为 Java 实体类');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'JSON 解析失败: ' + e.message);
    }
  });

  document.getElementById('javaToJsonBtn').addEventListener('click', function () {
    var raw = javaInput.value.trim();
    if (!raw) {
      ToolsCommon.setStatus(statusEl, 'error', '请输入 Java 实体类代码');
      return;
    }
    try {
      var obj = javaToJson(raw);
      jsonInput.value = JSON.stringify(obj, null, 2);
      ToolsCommon.setStatus(statusEl, 'success', '已转换为 JSON 示例数据');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', 'Java 解析失败: ' + e.message);
    }
  });

  document.getElementById('copyJsonBtn').addEventListener('click', function () {
    ToolsCommon.copyText(jsonInput.value, 'JSON');
  });
  document.getElementById('copyJavaBtn').addEventListener('click', function () {
    ToolsCommon.copyText(javaInput.value, 'Java 代码');
  });
  document.getElementById('loadSampleBtn').addEventListener('click', function () {
    jsonInput.value = JSON.stringify(SAMPLE_JSON, null, 2);
    javaInput.value = jsonToJava(SAMPLE_JSON, rootClassInput.value);
    ToolsCommon.setStatus(statusEl, 'success', '已加载示例并完成转换');
  });
  document.getElementById('clearAllBtn').addEventListener('click', function () {
    jsonInput.value = '';
    javaInput.value = '';
    ToolsCommon.setStatus(statusEl, '', '');
  });
})();
