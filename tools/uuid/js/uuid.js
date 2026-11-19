(function () {
  var outputEl = document.getElementById('uuidOutput');

  function randBytes(n) {
    var arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return arr;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function genUuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = randBytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = bytesToHex(b);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function genUuidV7() {
    var b = randBytes(16);
    var ms = Date.now();
    b[0] = (ms / 0x10000000000) & 0xff;
    b[1] = (ms / 0x100000000) & 0xff;
    b[2] = (ms / 0x1000000) & 0xff;
    b[3] = (ms / 0x10000) & 0xff;
    b[4] = (ms / 0x100) & 0xff;
    b[5] = ms & 0xff;
    b[6] = (b[6] & 0x0f) | 0x70;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = bytesToHex(b);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function genUlid() {
    var crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    var ms = Date.now();
    var timeChars = '';
    for (var i = 9; i >= 0; i--) {
      timeChars = crockford[ms % 32] + timeChars;
      ms = Math.floor(ms / 32);
    }
    var r = randBytes(16);
    var randChars = '';
    for (var j = 0; j < 16; j++) {
      randChars += crockford[r[j] & 31];
    }
    return timeChars + randChars;
  }

  function genNanoId(len) {
    var alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
    var b = randBytes(len || 21);
    return Array.from(b, function (x) { return alphabet[x & 63]; }).join('');
  }

  window.generateIds = function () {
    var type = document.getElementById('idType').value;
    var count = Math.min(500, Math.max(1, Number(document.getElementById('idCount').value) || 10));
    var upper = document.getElementById('optUpper').checked;
    var noDash = document.getElementById('optNoDash').checked;
    var quotes = document.getElementById('optQuotes').checked;

    var list = [];
    for (var i = 0; i < count; i++) {
      var val;
      if (type === 'uuidv4') val = genUuidV4();
      else if (type === 'uuidv7') val = genUuidV7();
      else if (type === 'ulid') val = genUlid();
      else if (type === 'nanoid') val = genNanoId(21);
      else val = bytesToHex(randBytes(16));

      if (noDash) val = val.replace(/-/g, '');
      if (upper) val = val.toUpperCase();
      if (quotes) val = '"' + val + '"';
      list.push(val);
    }
    outputEl.value = list.join('\n');
  };

  window.copyIds = function () { ToolsCommon.copyText(outputEl.value, 'ID 列表'); };
  window.downloadIds = function () { ToolsCommon.downloadText('uuids.txt', outputEl.value); };

  generateIds();
})();
