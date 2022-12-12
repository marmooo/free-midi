function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.dataset.theme = "dark";
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.dataset.theme = "dark";
  }
}

function changeLang() {
  const langObj = document.getElementById("lang");
  const lang = langObj.options[langObj.selectedIndex].value;
  location.href = `/free-midi/${lang}/`;
}

function speedDown() {
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) - 10;
  if (speed < 0) {
    input.value = 0;
  } else {
    input.value = speed;
  }
}

function speedUp() {
  const input = document.getElementById("speed");
  input.value = parseInt(input.value) + 10;
}

function repeat() {
  document.getElementById("repeat").classList.toggle("active");
}

function volumeOnOff() {
  const i = document.getElementById("volumeOnOff").firstElementChild;
  const volumebar = document.getElementById("volumebar");
  if (i.classList.contains("bi-volume-up-fill")) {
    i.className = "bi bi-volume-mute-fill";
    volumebar.dataset.value = volumebar.value;
    volumebar.value = -50;
    player.output.mute = true;
  } else {
    i.className = "bi bi-volume-up-fill";
    volumebar.value = volumebar.dataset.value;
    player.output.mute = false;
  }
}

function changeVolumebar() {
  const volumebar = document.getElementById("volumebar");
  const volume = volumebar.value;
  volumebar.dataset.value = volume;
  player.output.volume.value = volume;
}

function setNoteInstruments(ns) {
  const index = document.getElementById("instruments").selectedIndex - 1;
  if (index > 0) {
    ns.controlChanges.forEach((n) => n.program = index);
    ns.notes.forEach((n) => n.program = index);
  } else {
    ns.controlChanges.forEach((n) => n.program = n.p);
    ns.notes.forEach((n) => n.program = n.p);
  }
}

function setSpeed(ns) {
  const node = document.getElementById("speed");
  const speed = parseInt(node.value) / 100;
  if (speed != 1) {
    ns.controlChanges.forEach((n) => {
      n.time /= speed;
    });
    ns.notes.forEach((n) => {
      n.startTime /= speed;
      n.endTime /= speed;
    });
    ns.totalTime /= speed;
  }
}

function changeInstruments() {
  if (player.isPlaying()) {
    const tbody = $table[0].querySelector("tbody");
    const currNode = tbody.querySelector(".bi-pause-fill");
    const index = [...tbody.children].indexOf(currNode);
    player.stop();
    setNoteInstruments(ns);
    setSpeed(ns);
    const seconds = parseInt(document.getElementById("seekbar").value);
    player.loadSamples(ns).then(() => {
      player.start(ns, undefined, seconds).then(() => playNext(currNode, index));
      initSeekbar(ns, seconds);
    });
  }
}

function playNext(node, index) {
  node.className = "bi bi-play-fill";
  const pageData = $table.bootstrapTable("getData", { useCurrentPage: true });
  if ((index + 1) % pageData.length == 0) {
    const data = $table.bootstrapTable("getData");
    if (data.at(-1) == pageData.at(-1)) {
      const repeatObj = document.getElementById("repeat");
      const repeat = repeatObj.classList.contains("active");
      if (repeat) {
        $table.bootstrapTable("selectPage", 1);
        const tbody = $table[0].querySelector("tbody");
        const nextNode = tbody.querySelector(".bi-play-fill");
        if (nextNode) nextNode.click();
      }
    } else {
      $table.bootstrapTable("nextPage");
      const tbody = $table[0].querySelector("tbody");
      const nextNode = tbody.querySelector(".bi-play-fill");
      if (nextNode) nextNode.click();
    }
  } else {
    const tr = node.parentNode.parentNode.parentNode;
    const nextNode = tr.nextElementSibling.querySelector(".bi-play-fill");
    if (nextNode) nextNode.click();
  }
}

function initSeekbar(ns, seconds) {
  document.getElementById("seekbar").max = ns.totalTime;
  document.getElementById("seekbar").value = seconds;
  document.getElementById("totalTime").textContent = formatTime(ns.totalTime);
  clearInterval(seekbarInterval);
  setSeekbarInterval(seconds);
}

function setSeekbarInterval(seconds) {
  const totalTime = ns.totalTime;
  seekbarInterval = setInterval(() => {
    updateSeekbar(seconds);
    seconds += 1;
  }, 1000);
}

async function playMIDI(event, index, midiUrl) {
  ns = await core.urlToNoteSequence(midiUrl);
  ns.controlChanges.forEach((n) => n.p = n.program);
  ns.notes.map((note) => {
    note.p = note.program;
  });
  setNoteInstruments(ns);
  setSpeed(ns);
  player.loadSamples(ns).then(() => {
    const volume = document.getElementById("volumebar").value;
    player.output.volume.value = volume;
    player.start(ns).then(() => playNext(event.target, index));
    initSeekbar(ns, 0);
  });
}

function loadInstruments() {
  const langObj = document.getElementById("lang");
  const lang = langObj.options[langObj.selectedIndex].value;
  const instruments = document.getElementById("instruments");
  return fetch(`/free-midi/${lang}/instruments.lst`)
    .then((response) => response.text())
    .then((text) => {
      const list = [];
      text.trimEnd().split("\n").forEach((line) => {
        const option = document.createElement("option");
        option.textContent = line;
        instruments.appendChild(option);
        list.push(line);
      });
      return list;
    });
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);
  const s = seconds % 60;
  const m = (seconds - s) / 60;
  const h = (seconds - s - 60 * m) / 3600;
  const ss = String(s).padStart(2, "0");
  const mm = (m > 9 || !h) ? `${m}:` : `0${m}:`;
  const hh = h ? `${h}:` : "";
  return `${hh}${mm}${ss}`;
}

function changeSeekbar(event) {
  clearInterval(seekbarInterval);
  const seconds = parseInt(event.target.value);
  document.getElementById("currentTime").textContent = formatTime(seconds);
  if (player.isPlaying()) {
    player.seekTo(seconds);
    setSeekbarInterval(seconds);
    if (player.getPlayState() == "paused") player.resume();
  }
}

function updateSeekbar(seconds) {
  const seekbar = document.getElementById("seekbar");
  seekbar.value = seconds;
  const time = formatTime(seconds);
  document.getElementById("currentTime").textContent = time;
}

loadConfig();
const midiDB = "/midi-db";
const $table = $("#midiList");
const soundFont =
  "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
const player = new core.SoundFontPlayer(
  soundFont,
  undefined,
  undefined,
  undefined,
  undefined,
);
let ns;
let seekbarInterval;

function toString(data) {
  if (data) {
    return data;
  } else {
    return "";
  }
}

function _detailFormatterEn(_index, row) {
  const url = encodeURI(`${midiDB}/${row.file}`);
  const title = encodeURIComponent(toString(row.title));
  const composer = encodeURIComponent(toString(row.composer));
  return `
<div class="d-flex p-2">
  <div>
    <h5>Play</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Score</th><td><a href="https://marmooo.github.io/midi2abc/?url=${url}&title=${title}&composer=${composer}">midi2abc</a></td></tr>
      <tr><th>Game</th><td>TODO</td></tr>
    </table>
  </div>
  <div>
    <h5>Music Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Title</th><td>${toString(row.title)}</td></tr>
      <tr><th>Composer</th><td>${toString(row.composer)}</td></tr>
      <tr><th>Opus</th><td>${toString(row.opus)}</td></tr>
      <tr><th>Lyricist</th><td>${toString(row.lyricist)}</td></tr>
      <tr><th>Instruments</th><td>${toString(row.instruments)}</td></tr>
      <tr><th>Date</th><td>${toString(row.date)}</td></tr>
      <tr><th>Style</th><td>${toString(row.style)}</td></tr>
      <tr><th>Arranger</th><td>${toString(row.arranger)}</td></tr>
      <tr><th>Source</th><td>${toString(row.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>File Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>License</th><td>${toString(row.license)}</td></tr>
      <tr><th>Download</th><td><a href="${toString(url)}">MIDI</a></td></tr>
      <tr><th>ID</th><td>${toString(row.id)}</td></tr>
      <tr><th>Maintainer</th><td>${toString(row.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(row.email)}</td></tr>
      <tr><th>Web</th><td>${toString(row.web)}</td></tr>
    </table>
  </div>
</div>
  `;
}

function _detailFormatterJa(_index, row) {
  const url = encodeURI(`${midiDB}/${row.file}`);
  const title = encodeURIComponent(toString(row.title));
  const composer = encodeURIComponent(toString(row.composer));
  return `
<div class="d-flex p-2">
  <div>
    <h5>プレイ</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>楽譜</th><td><a href="https://marmooo.github.io/midi2abc/?url=${url}&title=${title}&composer=${composer}">midi2abc</a></td></tr>
      <tr><th>ゲーム</th><td>TODO</td></tr>
    </table>
  </div>
  <div>
    <h5>音楽情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>タイトル</th><td>${toString(row.title)}</td></tr>
      <tr><th>作曲者</th><td>${toString(row.composer)}</td></tr>
      <tr><th>作品</th><td>${toString(row.opus)}</td></tr>
      <tr><th>作詞者</th><td>${toString(row.lyricist)}</td></tr>
      <tr><th>楽器</th><td>${toString(row.instruments)}</td></tr>
      <tr><th>日付</th><td>${toString(row.date)}</td></tr>
      <tr><th>スタイル</th><td>${toString(row.style)}</td></tr>
      <tr><th>編曲者</th><td>${toString(row.arranger)}</td></tr>
      <tr><th>ソース</th><td>${toString(row.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>ファイル情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>ライセンス</th><td>${toString(row.license)}</td></tr>
      <tr><th>ダウンロード</th><td><a href="${toString(url)}">MIDI</a></td></tr>
      <tr><th>id</th><td>${toString(row.id)}</td></tr>
      <tr><th>保守者</th><td>${toString(row.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(row.email)}</td></tr>
      <tr><th>Web</th><td>${toString(row.web)}</td></tr>
    </table>
  </div>
</div>
  `;
}

function _toolFormatterEn(_value, _row, _index) {
  return `
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `;
}

function _toolFormatterJa(_value, _row, _index) {
  return `
<button title="再生" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `;
}

window.toolEvents = {
  "click .bi-play-fill": function (e, _value, row, index) {
    switch (e.target.className) {
      case "bi bi-play-fill": {
        const prevNodes = $table[0]
          .querySelectorAll("tbody .bi-pause-fill, .bi-play");
        [...prevNodes].forEach((prevNode) => {
          prevNode.className = "bi bi-play-fill";
        });
        if (player.isPlaying()) player.stop();
        e.target.className = "bi bi-pause-fill";
        const url = `${midiDB}/${row.file}`;
        playMIDI(e, index, url)
        break;
      }
      case "bi bi-play": {
        e.target.className = "bi bi-pause-fill";
        player.resume();
        const seconds = parseInt(document.getElementById("seekbar").value);
        setSeekbarInterval(seconds);
        break;
      }
      case "bi bi-pause-fill":
        e.target.className = "bi bi-play";
        player.pause();
        clearInterval(seekbarInterval);
        break;
    }
  },
};

function getInstrumentsString(list, info) {
  const ids = info.instruments
    .split(",").map((id) => parseInt(id));
  return ids.map((id) => list[id]).join(", ");
}

const insturmentsPromise = loadInstruments();
$("#midiList").bootstrapTable({
  onLoadSuccess: function (data) {
    insturmentsPromise.then((list) => {
      data.forEach((info) => {
        info.instruments = getInstrumentsString(list, info);
      });
    });
  },
});

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("lang").onchange = changeLang;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = changeVolumebar;
document.getElementById("seekbar").onchange = changeSeekbar;
document.getElementById("instruments").onchange = changeInstruments;
