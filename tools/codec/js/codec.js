(function () {
  var inputEl = document.getElementById('codecInput');
  var outputEl = document.getElementById('codecOutput');
  var statusEl = document.getElementById('codecStatus');

  function setOut(val, msg) {
    outputEl.value = val;
    ToolsCommon.setStatus(statusEl, 'success', msg || '转换完成');
  }

  function setErr(msg) {
    ToolsCommon.setStatus(statusEl, 'error', msg);
  }

  window.b64Encode = function () {
    try {
      var bytes = new TextEncoder().encode(inputEl.value);
      var bin = Array.from(bytes, function (b) { return String.fromCharCode(b); }).join('');
      var res = btoa(bin);
      if (document.getElementById('urlSafeB64').checked) {
        res = res.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      setOut(res, 'Base64 编码完成');
    } catch (e) { setErr('编码失败: ' + e.message); }
  };

  window.b64Decode = function () {
    try {
      var s = inputEl.value.trim().replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var bin = atob(s);
      var bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
      setOut(new TextDecoder().decode(bytes), 'Base64 解码完成');
    } catch (e) { setErr('Base64 解码失败: ' + e.message); }
  };

  window.urlEnc = function () {
    setOut(encodeURIComponent(inputEl.value), 'URL 编码完成');
  };

  window.urlDec = function () {
    try { setOut(decodeURIComponent(inputEl.value), 'URL 解码完成'); }
    catch (e) { setErr('URL 解码失败: ' + e.message); }
  };

  window.unicodeEnc = function () {
    var res = Array.from(inputEl.value).map(function (ch) {
      var code = ch.charCodeAt(0);
      return code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : ch;
    }).join('');
    setOut(res, 'Unicode 编码完成');
  };

  window.unicodeDec = function () {
    var res = inputEl.value.replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
    setOut(res, 'Unicode 解码完成');
  };

  window.htmlEnc = function () {
    setOut(ToolsCommon.escapeHtml(inputEl.value), 'HTML 实体转义完成');
  };

  window.htmlDec = function () {
    var ta = document.createElement('textarea');
    ta.innerHTML = inputEl.value;
    setOut(ta.value, 'HTML 实体反转义完成');
  };

  window.decodeJwt = function () {
    var raw = inputEl.value.trim();
    var parts = raw.split('.');
    if (parts.length < 2) return setErr('无效的 JWT 格式（应包含至少两段由 . 分隔的内容）');
    try {
      function b64Json(seg) {
        var s = seg.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        var bytes = Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); });
        return JSON.parse(new TextDecoder().decode(bytes));
      }
      var header = b64Json(parts[0]);
      var payload = b64Json(parts[1]);
      var info = { header: header, payload: payload };
      if (payload.exp) {
        info._expTime = new Date(payload.exp * 1000).toLocaleString();
        info._expired = Date.now() > payload.exp * 1000;
      }
      if (payload.iat) info._iatTime = new Date(payload.iat * 1000).toLocaleString();
      setOut(JSON.stringify(info, null, 2), 'JWT 解析完成（仅解析结构，未校验签名）');
    } catch (e) { setErr('JWT 解析失败: ' + e.message); }
  };

  window.swapIO = function () {
    var tmp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = tmp;
    computeHashes();
  };

  window.clearAll = function () {
    inputEl.value = '';
    outputEl.value = '';
    ToolsCommon.setStatus(statusEl, '', '');
    computeHashes();
  };

  window.copyOutput = function () { ToolsCommon.copyText(outputEl.value, '结果'); };
  window.copyHash = function (id) {
    var txt = document.getElementById(id).textContent;
    if (txt && txt !== '-') ToolsCommon.copyText(txt, '哈希值');
  };

  // Compact pure-JS MD5 for UTF-8 strings
  function md5(str) {
    var utf8 = unescape(encodeURIComponent(str));
    var words = [];
    for (var i = 0; i < utf8.length; i++) {
      words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << ((i % 4) * 8);
    }
    words[utf8.length >> 2] |= 0x80 << ((utf8.length % 4) * 8);
    var bitLen = utf8.length * 8;
    var n = (((utf8.length + 8) >> 6) + 1) * 16;
    while (words.length < n) words.push(0);
    words[n - 2] = bitLen & 0xffffffff;
    words[n - 1] = Math.floor(bitLen / 0x100000000);

    function add(x, y) { return ((x & 0x7fffffff) + (y & 0x7fffffff)) ^ (x & 0x80000000) ^ (y & 0x80000000); }
    function rol(v, s) { return (v << s) | (v >>> (32 - s)); }
    function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (var k = 0; k < words.length; k += 16) {
      var oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, words[k + 0], 7, -680876936); d = ff(d, a, b, c, words[k + 1], 12, -389564586);
      c = ff(c, d, a, b, words[k + 2], 17, 606105819); b = ff(b, c, d, a, words[k + 3], 22, -1044525330);
      a = ff(a, b, c, d, words[k + 4], 7, -176418897); d = ff(d, a, b, c, words[k + 5], 12, 1200080426);
      c = ff(c, d, a, b, words[k + 6], 17, -1473231341); b = ff(b, c, d, a, words[k + 7], 22, -45705983);
      a = ff(a, b, c, d, words[k + 8], 7, 1770035416); d = ff(d, a, b, c, words[k + 9], 12, -1958414417);
      c = ff(c, d, a, b, words[k + 10], 17, -42063); b = ff(b, c, d, a, words[k + 11], 22, -1990404162);
      a = ff(a, b, c, d, words[k + 12], 7, 1804603682); d = ff(d, a, b, c, words[k + 13], 12, -40341101);
      c = ff(c, d, a, b, words[k + 14], 17, -1502002290); b = ff(b, c, d, a, words[k + 15], 22, 1236535329);

      a = gg(a, b, c, d, words[k + 1], 5, -165796510); d = gg(d, a, b, c, words[k + 6], 9, -1069501632);
      c = gg(c, d, a, b, words[k + 11], 14, 643717713); b = gg(b, c, d, a, words[k + 0], 20, -373897302);
      a = gg(a, b, c, d, words[k + 5], 5, -701558691); d = gg(d, a, b, c, words[k + 10], 9, 38016083);
      c = gg(c, d, a, b, words[k + 15], 14, -660478335); b = gg(b, c, d, a, words[k + 4], 20, -405537848);
      a = gg(a, b, c, d, words[k + 9], 5, 568446438); d = gg(d, a, b, c, words[k + 14], 9, -1019803690);
      c = gg(c, d, a, b, words[k + 3], 14, -187363961); b = gg(b, c, d, a, words[k + 8], 20, 1163531501);
      a = gg(a, b, c, d, words[k + 13], 5, -1444681467); d = gg(d, a, b, c, words[k + 2], 9, -51403784);
      c = gg(c, d, a, b, words[k + 7], 14, 1735328473); b = gg(b, c, d, a, words[k + 12], 20, -1926607734);

      a = hh(a, b, c, d, words[k + 5], 4, -378558); d = hh(d, a, b, c, words[k + 8], 11, -2022574463);
      c = hh(c, d, a, b, words[k + 11], 16, 1839030562); b = hh(b, c, d, a, words[k + 14], 23, -35309556);
      a = hh(a, b, c, d, words[k + 1], 4, -1530992060); d = hh(d, a, b, c, words[k + 4], 11, 1272893353);
      c = hh(c, d, a, b, words[k + 7], 16, -155497632); b = hh(b, c, d, a, words[k + 10], 23, -1094730640);
      a = hh(a, b, c, d, words[k + 13], 4, 681279174); d = hh(d, a, b, c, words[k + 0], 11, -358537222);
      c = hh(c, d, a, b, words[k + 3], 16, -722521979); b = hh(b, c, d, a, words[k + 6], 23, 76029189);
      a = hh(a, b, c, d, words[k + 9], 4, -640364487); d = hh(d, a, b, c, words[k + 12], 11, -421815835);
      c = hh(c, d, a, b, words[k + 15], 16, 530742520); b = hh(b, c, d, a, words[k + 2], 23, -995338651);

      a = ii(a, b, c, d, words[k + 0], 6, -198630844); d = ii(d, a, b, c, words[k + 7], 10, 1126891415);
      c = ii(c, d, a, b, words[k + 14], 15, -1416354905); b = ii(b, c, d, a, words[k + 5], 21, -57434055);
      a = ii(a, b, c, d, words[k + 12], 6, 1700485571); d = ii(d, a, b, c, words[k + 3], 10, -1894986606);
      c = ii(c, d, a, b, words[k + 10], 15, -1051523); b = ii(b, c, d, a, words[k + 1], 21, -2054922799);
      a = ii(a, b, c, d, words[k + 8], 6, 1873313359); d = ii(d, a, b, c, words[k + 15], 10, -30611744);
      c = ii(c, d, a, b, words[k + 6], 15, -1560198380); b = ii(b, c, d, a, words[k + 13], 21, 1309151649);
      a = ii(a, b, c, d, words[k + 4], 6, -145523070); d = ii(d, a, b, c, words[k + 11], 10, -1120210379);
      c = ii(c, d, a, b, words[k + 2], 15, 718787259); b = ii(b, c, d, a, words[k + 9], 21, -343485551);

      a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }
    return [a, b, c, d].map(function (num) {
      var s = '';
      for (var j = 0; j < 4; j++) s += ((num >> (j * 8)) & 0xff).toString(16).padStart(2, '0');
      return s;
    }).join('');
  }

  window.computeHashes = async function () {
    var val = inputEl.value;
    var upper = document.getElementById('hashUpper').checked;
    if (!val) {
      ['hashMd5', 'hashSha1', 'hashSha256', 'hashSha512'].forEach(function (id) {
        document.getElementById(id).textContent = '-';
      });
      return;
    }
    var m = md5(val);
    document.getElementById('hashMd5').textContent = upper ? m.toUpperCase() : m;

    if (window.crypto && crypto.subtle) {
      var buf = new TextEncoder().encode(val);
      var algos = [['SHA-1', 'hashSha1'], ['SHA-256', 'hashSha256'], ['SHA-512', 'hashSha512']];
      for (var i = 0; i < algos.length; i++) {
        var digest = await crypto.subtle.digest(algos[i][0], buf);
        var hex = Array.from(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        document.getElementById(algos[i][1]).textContent = upper ? hex.toUpperCase() : hex;
      }
    }
  };

  inputEl.addEventListener('input', computeHashes);
})();
