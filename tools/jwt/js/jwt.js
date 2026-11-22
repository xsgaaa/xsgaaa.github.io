(function () {
  var inputEl = document.getElementById('jwtInput');
  var headerEl = document.getElementById('jwtHeader');
  var payloadEl = document.getElementById('jwtPayload');
  var badgeEl = document.getElementById('jwtBadge');
  var claimsEl = document.getElementById('jwtClaimsInfo');
  var statusEl = document.getElementById('jwtStatus');
  var metaEl = document.getElementById('jwtInputMeta');

  function base64UrlDecode(str) {
    var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  function formatTs(sec) {
    if (typeof sec !== 'number' || isNaN(sec)) return '';
    return new Date(sec * 1000).toLocaleString('zh-CN', { hour12: false });
  }

  window.decodeJwt = function () {
    var raw = (inputEl.value || '').trim().replace(/^Bearer\s+/i, '');
    metaEl.textContent = raw.length + ' 字符';
    badgeEl.style.display = 'none';
    claimsEl.innerHTML = '';

    if (!raw) {
      headerEl.value = '';
      payloadEl.value = '';
      ToolsCommon.setStatus(statusEl, '', '');
      return;
    }

    var parts = raw.split('.');
    if (parts.length !== 3) {
      headerEl.value = '';
      payloadEl.value = '';
      ToolsCommon.setStatus(statusEl, 'error', 'JWT 格式错误：标准 JWT 应包含 3 段（Header.Payload.Signature）');
      return;
    }

    try {
      var headerObj = JSON.parse(base64UrlDecode(parts[0]));
      var payloadObj = JSON.parse(base64UrlDecode(parts[1]));
      headerEl.value = JSON.stringify(headerObj, null, 2);
      payloadEl.value = JSON.stringify(payloadObj, null, 2);

      var nowSec = Math.floor(Date.now() / 1000);
      var badges = [];
      if (typeof payloadObj.exp === 'number') {
        var expired = payloadObj.exp < nowSec;
        badgeEl.className = 'tool-badge ' + (expired ? 'is-err' : 'is-ok');
        badgeEl.textContent = expired ? '已过期 (exp)' : '有效期内';
        badgeEl.style.display = 'inline-flex';
        badges.push('过期时间 (exp): ' + formatTs(payloadObj.exp));
      } else {
        badgeEl.className = 'tool-badge is-warn';
        badgeEl.textContent = '无 exp 字段';
        badgeEl.style.display = 'inline-flex';
      }
      if (typeof payloadObj.iat === 'number') badges.push('签发时间 (iat): ' + formatTs(payloadObj.iat));
      if (typeof payloadObj.nbf === 'number') badges.push('生效时间 (nbf): ' + formatTs(payloadObj.nbf));
      if (headerObj.alg) badges.push('算法 (alg): ' + headerObj.alg);

      claimsEl.innerHTML = badges.map(function (b) {
        return '<span class="tool-tag">' + ToolsCommon.escapeHtml(b) + '</span>';
      }).join(' ');
      ToolsCommon.setStatus(statusEl, 'success', 'JWT 解码成功（仅本地解析，未验证签名密钥）');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', '解码失败：' + e.message);
    }
  };

  window.copyPart = function (type) {
    if (type === 'header') ToolsCommon.copyText(headerEl.value, 'Header ');
    else ToolsCommon.copyText(payloadEl.value, 'Payload ');
  };

  window.loadSample = function () {
    var exp = Math.floor(Date.now() / 1000) + 3600;
    var iat = Math.floor(Date.now() / 1000);
    function b64u(obj) {
      var json = JSON.stringify(obj);
      var bytes = new TextEncoder().encode(json);
      var bin = '';
      bytes.forEach(function (b) { bin += String.fromCharCode(b); });
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    inputEl.value = b64u({ alg: 'HS256', typ: 'JWT' }) + '.' +
      b64u({ sub: '10086', name: 'xsgaaaa', role: 'admin', iat: iat, exp: exp }) +
      '.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    decodeJwt();
  };

  window.clearAll = function () {
    inputEl.value = '';
    decodeJwt();
  };

  inputEl.addEventListener('input', decodeJwt);
})();
