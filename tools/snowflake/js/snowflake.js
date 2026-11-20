(function () {
  var TWEPOCH_MS = 1577836800000n; // 2020-01-01 00:00:00 UTC
  var TWEPOCH_SEC = 1577836800;

  function SnowflakeIdGenerator(workerId, datacenterId) {
    if (workerId < 0 || workerId > 31 || isNaN(workerId)) {
      throw new Error('机器 ID 必须在 0-31 之间');
    }
    if (datacenterId < 0 || datacenterId > 31 || isNaN(datacenterId)) {
      throw new Error('数据中心 ID 必须在 0-31 之间');
    }
    this.workerId = BigInt(workerId);
    this.datacenterId = BigInt(datacenterId);
    this.sequence = 0n;
    this.lastTimestamp = -1n;
    this.maxSequence = 4095n;
  }

  SnowflakeIdGenerator.prototype.nextId = function () {
    var timestamp = BigInt(Date.now());
    if (timestamp < this.lastTimestamp) {
      throw new Error('系统时钟回拨，拒绝生成 ID');
    }
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      if (this.sequence === 0n) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = BigInt(Date.now());
        }
      }
    } else {
      this.sequence = 0n;
    }
    this.lastTimestamp = timestamp;
    var id = ((timestamp - TWEPOCH_MS) << 22n) |
      (this.datacenterId << 17n) |
      (this.workerId << 12n) |
      this.sequence;
    return id.toString();
  };

  SnowflakeIdGenerator.prototype.parseId = function (idStr) {
    var id = BigInt(idStr);
    var binary = id.toString(2).padStart(64, '0');
    var tsOffset = Number((id >> 22n) & ((1n << 41n) - 1n));
    var timestamp = tsOffset + Number(TWEPOCH_MS);
    var datacenterId = Number((id >> 17n) & 31n);
    var workerId = Number((id >> 12n) & 31n);
    var sequence = Number(id & 4095n);
    return {
      id: idStr,
      binary: binary,
      timestamp: timestamp,
      datacenterId: datacenterId,
      workerId: workerId,
      sequence: sequence,
      signBit: binary.substring(0, 1),
      timestampBinary: binary.substring(1, 42),
      datacenterIdBinary: binary.substring(42, 47),
      workerIdBinary: binary.substring(47, 52),
      sequenceBinary: binary.substring(52, 64),
      date: new Date(timestamp)
    };
  };

  function Id32Generator() {
    this.sequence = 0;
    this.lastTimestamp = -1;
    this.maxSequence = 3;
  }

  Id32Generator.prototype.nextId = function () {
    var timestamp = Math.floor(Date.now() / 1000);
    if (timestamp < this.lastTimestamp) {
      throw new Error('系统时钟回拨，拒绝生成 ID');
    }
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & this.maxSequence;
      if (this.sequence === 0) {
        while (timestamp <= this.lastTimestamp) {
          timestamp = Math.floor(Date.now() / 1000);
        }
      }
    } else {
      this.sequence = 0;
    }
    this.lastTimestamp = timestamp;
    var id = (((timestamp - TWEPOCH_SEC) << 2) | this.sequence) >>> 0;
    return String(id);
  };

  Id32Generator.prototype.parseId = function (idStr) {
    var id = Number(idStr) >>> 0;
    var binary = id.toString(2).padStart(32, '0');
    var timestamp = ((id >>> 2) + TWEPOCH_SEC) * 1000;
    var sequence = id & 3;
    return {
      id: idStr,
      binary: binary,
      timestamp: timestamp,
      sequence: sequence,
      timestampBinary: binary.substring(0, 30),
      sequenceBinary: binary.substring(30, 32),
      date: new Date(timestamp)
    };
  };

  var machineIdInput = document.getElementById('machineId');
  var datacenterIdInput = document.getElementById('datacenterId');
  var resultDiv = document.getElementById('result');
  var idTypeBadge = document.getElementById('idTypeBadge');
  var idDetailsDiv = document.getElementById('idDetails');
  var binaryDiv = document.getElementById('binaryRepresentation');
  var timestampDiv = document.getElementById('timestampInfo');
  var machineDiv = document.getElementById('machineInfo');
  var sequenceDiv = document.getElementById('sequenceInfo');
  var historyContainer = document.getElementById('historyContainer');
  var statusEl = document.getElementById('snowflakeStatus');

  var snowflakeGen = new SnowflakeIdGenerator(1, 1);
  var id32Gen = new Id32Generator();
  var historyList = [];
  var lastGeneratedId = '';

  function initGenerator() {
    var w = parseInt(machineIdInput.value, 10);
    var d = parseInt(datacenterIdInput.value, 10);
    try {
      snowflakeGen = new SnowflakeIdGenerator(isNaN(w) ? 1 : w, isNaN(d) ? 1 : d);
      ToolsCommon.setStatus(statusEl, '', '');
      return true;
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', e.message);
      return false;
    }
  }

  function displayId(idStr, type) {
    lastGeneratedId = idStr;
    resultDiv.textContent = idStr;
    idTypeBadge.textContent = type === 'snowflake' ? '64 位 Snowflake ID' : '32 位简化 ID';

    if (type === 'snowflake') {
      var p = snowflakeGen.parseId(idStr);
      binaryDiv.innerHTML =
        '<span class="sf-bit-tag sf-bit-ts">时间戳(41位)</span>' + p.timestampBinary + ' ' +
        '<span class="sf-bit-tag sf-bit-dc">数据中心(5位)</span>' + p.datacenterIdBinary + ' ' +
        '<span class="sf-bit-tag sf-bit-wk">机器(5位)</span>' + p.workerIdBinary + ' ' +
        '<span class="sf-bit-tag sf-bit-seq">序列(12位)</span>' + p.sequenceBinary;
      timestampDiv.textContent = p.timestamp + ' (' + p.date.toLocaleString() + ')';
      machineDiv.textContent = '数据中心 ID=' + p.datacenterId + ', 机器 ID=' + p.workerId;
      sequenceDiv.textContent = String(p.sequence);
    } else {
      var p32 = id32Gen.parseId(idStr);
      binaryDiv.innerHTML =
        '<span class="sf-bit-tag sf-bit-ts">时间戳(30位)</span>' + p32.timestampBinary + ' ' +
        '<span class="sf-bit-tag sf-bit-seq">序列(2位)</span>' + p32.sequenceBinary;
      timestampDiv.textContent = p32.timestamp + ' (' + p32.date.toLocaleString() + ')';
      machineDiv.textContent = '32 位模式（不含节点标识）';
      sequenceDiv.textContent = String(p32.sequence);
    }
    idDetailsDiv.style.display = 'block';
  }

  function addToHistory(idStr, type) {
    historyList.unshift({ id: idStr, type: type, time: new Date().toLocaleTimeString() });
    if (historyList.length > 50) historyList.pop();
    renderHistory();
  }

  function renderHistory() {
    if (historyList.length === 0) {
      historyContainer.innerHTML = '<div style="padding:18px;text-align:center;color:var(--tech-text-muted);font-size:13px;">暂无生成历史</div>';
      return;
    }
    historyContainer.innerHTML = historyList.map(function (item, idx) {
      var tag = item.type === 'snowflake' ? '64位' : '32位';
      return '<div class="sf-history-item" data-idx="' + idx + '">' +
        '<span>' + ToolsCommon.escapeHtml(item.id) + '</span>' +
        '<span class="tool-pane-meta">' + tag + ' · ' + item.time + '</span>' +
        '</div>';
    }).join('');
  }

  function generateSingle(type) {
    if (type === 'snowflake' && !initGenerator()) return;
    try {
      var id = type === 'snowflake' ? snowflakeGen.nextId() : id32Gen.nextId();
      displayId(id, type);
      addToHistory(id, type);
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', e.message);
    }
  }

  function generateBatch(type) {
    if (type === 'snowflake' && !initGenerator()) return;
    try {
      var ids = [];
      for (var i = 0; i < 10; i++) {
        ids.push(type === 'snowflake' ? snowflakeGen.nextId() : id32Gen.nextId());
      }
      displayId(ids[ids.length - 1], type);
      ids.forEach(function (id) { addToHistory(id, type); });
      ToolsCommon.notify('已批量生成 10 个 ID');
    } catch (e) {
      ToolsCommon.setStatus(statusEl, 'error', e.message);
    }
  }

  document.getElementById('generateBtn').addEventListener('click', function () { generateSingle('snowflake'); });
  document.getElementById('generate32Btn').addEventListener('click', function () { generateSingle('id32'); });
  document.getElementById('generateBatchBtn').addEventListener('click', function () { generateBatch('snowflake'); });
  document.getElementById('generateBatch32Btn').addEventListener('click', function () { generateBatch('id32'); });
  document.getElementById('copyBtn').addEventListener('click', function () {
    ToolsCommon.copyText(lastGeneratedId, 'ID');
  });
  document.getElementById('copyBatchBtn').addEventListener('click', function () {
    var all = historyList.map(function (item) { return item.id; }).join('\n');
    ToolsCommon.copyText(all, '历史 ID 列表');
  });
  document.getElementById('clearHistoryBtn').addEventListener('click', function () {
    historyList = [];
    renderHistory();
  });

  historyContainer.addEventListener('click', function (e) {
    var row = e.target.closest('.sf-history-item');
    if (!row) return;
    var item = historyList[parseInt(row.getAttribute('data-idx'), 10)];
    if (item) displayId(item.id, item.type);
  });

  machineIdInput.addEventListener('change', initGenerator);
  datacenterIdInput.addEventListener('change', initGenerator);

  generateSingle('snowflake');
})();
