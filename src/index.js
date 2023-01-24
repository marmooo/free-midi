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

function unlockAudio() {
  player.resumeContext();
}

function speedDown() {
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) - 10;
  if (speed < 0) {
    input.value = 0;
  } else {
    input.value = speed;
  }
  document.getElementById("speedDown").disabled = true;
  changeSpeed();
  document.getElementById("speedDown").disabled = false;
}

function speedUp() {
  const input = document.getElementById("speed");
  input.value = parseInt(input.value) + 10;
  document.getElementById("speedUp").disabled = true;
  changeSpeed();
  document.getElementById("speedUp").disabled = false;
}

function changeSpeed() {
  if (ns) {
    switch (player.getPlayState()) {
      case "started": {
        player.stop();
        setSpeed(ns);
        const seconds = parseInt(document.getElementById("seekbar").value);
        player.start(ns, undefined, seconds);
        break;
      }
      case "paused":
        configChanged = true;
        break;
    }
  }
}

function setSpeed(ns) {
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) / 100;
  const controlChanges = nsCache.controlChanges;
  ns.controlChanges.forEach((n, i) => {
    n.time = controlChanges[i].time / speed;
  });
  const tempos = nsCache.tempos;
  ns.tempos.forEach((n, i) => {
    n.time = tempos[i].time / speed;
    n.qpm = tempos[i].qpm * speed;
  });
  const notes = nsCache.notes;
  ns.notes.forEach((n, i) => {
    n.startTime = notes[i].startTime / speed;
    n.endTime = notes[i].endTime / speed;
  });
  ns.totalTime = nsCache.totalTime / speed;
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

function initSeekbar(ns, seconds) {
  document.getElementById("seekbar").max = ns.totalTime;
  document.getElementById("seekbar").value = seconds;
  document.getElementById("totalTime").textContent = formatTime(ns.totalTime);
  clearInterval(seekbarInterval);
  setSeekbarInterval(seconds);
}

function setSeekbarInterval(seconds) {
  seekbarInterval = setInterval(() => {
    updateSeekbar(seconds);
    seconds += 1;
  }, 1000);
}

async function loadMIDI(url) {
  ns = await core.urlToNoteSequence(url);
  nsCache = core.sequences.clone(ns);
  ns.controlChanges.forEach((n) => n.p = n.program);
  ns.notes.map((note) => {
    note.p = note.program;
  });
}

function playMIDI(seconds) {
  setNoteInstruments(ns);
  setSpeed(ns);
  const volume = document.getElementById("volumebar").value;
  player.output.volume.value = volume;
  player.start(ns, undefined, seconds);
  initSeekbar(ns, seconds);
}

function playNext() {
  const tbody = $table[0].querySelector("tbody");
  const pauseNode = tbody.querySelector(".bi-pause-fill");
  const tr = pauseNode.parentNode.parentNode.parentNode;
  const index = [...tbody.children].indexOf(tr);
  pauseNode.className = "bi bi-play-fill";
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
    const nextNode = tr.nextElementSibling.querySelector(".bi-play-fill");
    if (nextNode) nextNode.click();
  }
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

async function changeInstruments() {
  switch (player.getPlayState()) {
    case "started": {
      player.stop();
      setNoteInstruments(ns);
      setSpeed(ns);
      const seconds = parseInt(document.getElementById("seekbar").value);
      player.start(ns, undefined, seconds);
      initSeekbar(ns, seconds);
      break;
    }
    case "paused":
      configChanged = true;
      break;
  }
}

// replace FilterControl to support IME
function addFilterControl() {
  const ths = document.querySelectorAll("#midiList > thead > tr > th");
  [...ths].slice(2).forEach((th) => {
    const name = th.dataset.field;
    const fht = th.querySelector("div.fht-cell");
    const input = document.createElement("input");
    input.value = filterStates.get(name);
    input.type = "search";
    input.className = "form-control";
    switch (name) {
      case "born":
        input.placeHolder = ">1850";
        input.onchange = () => { filterColumn(name, input.value, filterByRange) };
        break;
      case "died":
        input.placeHolder = "<1920";
        input.onchange = () => { filterColumn(name, input.value, filterByRange) };
        break;
      case "difficulty":
        input.placeHolder = "<50";
        input.onchange = () => { filterColumn(name, input.value, filterByRange) };
        break;
      case "bpm":
        input.placeHolder = "<120";
        input.onchange = () => { filterColumn(name, input.value, filterByRange) };
        break;
      case "time":
        input.placeHolder = ">30(sec)";
        input.onchange = () => { filterColumn(name, input.value, filterByTime) };
        break;
      default:
        input.onchange = () => { filterColumn(name, input.value, filterByPartialMatch) };
        break;
    }
    fht.replaceChildren(input);
  });
}

function filterColumn(name, text, callback) {
  filterStates.set(name, text);
  if (text == "") {
    $table.bootstrapTable("filterBy", {}, {
      "filterAlgorithm": true
    });
  } else {
    $table.bootstrapTable("filterBy", {}, {
      "filterAlgorithm": (row) => {
        return callback(text, row[name]);
      }
    });
  }
}

function filterByPartialMatch(text, value) {
  if (!value) return false;
  return value.toLowerCase().includes(text.toLowerCase());
}

function filterByRange(text, value) {
  switch (text[0]) {
    case ">":
      if (text.length == 1) return true;
      if (parseInt(value) > parseInt(text.slice(1))) return true;
      return false;
    case "<":
      if (text.length == 1) return true;
      if (parseInt(value) < parseInt(text.slice(1))) return true;
      return false;
    default:
      if (value == text) return true;
      return false;
  }
}

function filterByTime(text, value) {
  const [mm, ss] = value.split(":");
  const sec = parseInt(mm) * 60 + parseInt(ss);
  switch (text[0]) {
    case ">":
      if (text.length == 1) return true;
      if (sec > parseInt(text.slice(1))) return true;
      return false;
    case "<":
      if (text.length == 1) return true;
      if (sec < parseInt(text.slice(1))) return true;
      return false;
    default:
      if (value == text) return true;
      return false;
  }
}

function toString(data) {
  if (data) {
    return data;
  } else {
    return "";
  }
}

function toLink(url, text) {
  if (!url) return text;
  return `<a href="${url}">${text}</a>`
}

function toLicense(text) {
  try {
    new URL(text);
    return toLink(text, "Custom");
  } catch {
    return text;
  }
}

function toDownload(id, url, lang) {
  if (id.startsWith("!")) {
    switch (lang) {
      case "ja": return "HP からダウンロードしてください。";
      case "en": return "Please download from the homepage.";
    }
  } else {
    return toLink(url, "MIDI");
  }
}

function _detailFormatterEn(_index, row) {
  const midiURL = `${midiDB}/${row.file}`;
  const url = encodeURI(midiURL);
  const title = encodeURIComponent(toString(row.title));
  const composer = encodeURIComponent(toString(row.composer));
  const license = toLicense(row.license);
  const web = toLink(row.web, row.web);
  const download = toDownload(row.id, midiURL, "en");
  let instruments = "";
  row.instruments.split(", ").forEach((instrument) => {
    instruments += `<li>${instrument}</li>`;
  });
  return `
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>Score</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?url=${url}&title=${title}&composer=${composer}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?url=${url}&title=${title}&composer=${composer}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Classic</th><td><a href="https://marmooo.github.io/tip-tap-notes/?url=${url}&title=${title}&composer=${composer}">Tip Tap Notes</a></td></tr>
      <tr><th>TODO</th><td>Coming soon.</td></tr>
    </table>
  </div>
  <div>
    <h5>Music Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Title</th><td>${toString(row.title)}</td></tr>
      <tr><th>Composer</th><td>${toString(row.composer)}</td></tr>
      <tr><th>Opus</th><td>${toString(row.opus)}</td></tr>
      <tr><th>Lyricist</th><td>${toString(row.lyricist)}</td></tr>
      <tr><th>Date</th><td>${toString(row.date)}</td></tr>
      <tr><th>Style</th><td>${toString(row.style)}</td></tr>
      <tr><th>Arranger</th><td>${toString(row.arranger)}</td></tr>
      <tr><th>Source</th><td>${toString(row.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>File Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>License</th><td>${toString(license)}</td></tr>
      <tr><th>Download</th><td>${download}</td></tr>
      <tr><th>ID</th><td>${toString(row.id)}</td></tr>
      <tr><th>Maintainer</th><td>${toString(row.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(row.email)}</td></tr>
      <tr><th>Web</th><td>${toString(web)}</td></tr>
    </table>
  </div>
  <div>
    <h5>Annotation Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Time</th><td>${row.time}</td></tr>
      <tr><th>Difficulty</th><td>${row.difficulty}</td></tr>
      <tr><th>BPM</th><td>${row.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${instruments}</ul></td></tr>
    </table>
  </div>
</div>
  `;
}

function _detailFormatterJa(_index, row) {
  const midiURL = `${midiDB}/${row.file}`;
  const url = encodeURI(midiURL);
  const title = encodeURIComponent(toString(row.title));
  const composer = encodeURIComponent(toString(row.composer));
  const license = toLicense(row.license);
  const web = toLink(row.web, row.web);
  const download = toDownload(row.id, midiURL, "ja");
  let instruments = "";
  row.instruments.split(", ").forEach((instrument) => {
    instruments += `<li>${instrument}</li>`;
  });
  return `
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>楽譜</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?url=${url}&title=${title}&composer=${composer}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?url=${url}&title=${title}&composer=${composer}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Classic</th><td><a href="https://marmooo.github.io/tip-tap-notes/?url=${url}&title=${title}&composer=${composer}">Tip Tap Notes</a></td></tr>
      <tr><th>TODO</th><td>Coming soon.</td></tr>
    </table>
  </div>
  <div>
    <h5>音楽情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>タイトル</th><td>${toString(row.title)}</td></tr>
      <tr><th>作曲者</th><td>${toString(row.composer)}</td></tr>
      <tr><th>作品</th><td>${toString(row.opus)}</td></tr>
      <tr><th>作詞者</th><td>${toString(row.lyricist)}</td></tr>
      <tr><th>日付</th><td>${toString(row.date)}</td></tr>
      <tr><th>スタイル</th><td>${toString(row.style)}</td></tr>
      <tr><th>編曲者</th><td>${toString(row.arranger)}</td></tr>
      <tr><th>ソース</th><td>${toString(row.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>ファイル情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>ライセンス</th><td>${toString(license)}</td></tr>
      <tr><th>ダウンロード</th><td>${download}</td></tr>
      <tr><th>id</th><td>${toString(row.id)}</td></tr>
      <tr><th>保守者</th><td>${toString(row.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(row.email)}</td></tr>
      <tr><th>Web</th><td>${toString(web)}</td></tr>
    </table>
  </div>
  <div>
    <h5>注釈情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>時間</th><td>${row.time}</td></tr>
      <tr><th>難易度</th><td>${row.difficulty}</td></tr>
      <tr><th>BPM</th><td>${row.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${instruments}</ul></td></tr>
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

function play(node, row) {
  if (!node) {
    const pageData = $table.bootstrapTable("getData", { useCurrentPage: true });
    node = document.querySelector("#midiList td:nth-child(2) i");
    row = pageData[0];
  }
  const prevNodes = $table[0]
    .querySelectorAll("tbody .bi-pause-fill, .bi-play");
  [...prevNodes].forEach((prevNode) => {
    prevNode.className = "bi bi-play-fill";
  });
  if (player.isPlaying()) player.stop();
  node.className = "bi bi-pause-fill";
  const url = `${midiDB}/${row.file}`;
  loadMIDI(url).then(() => {
    playMIDI(0);
  });
}

function replay(node) {
  if (!node) {
    const selector = "#midiList td:nth-child(2) i[class='bi bi-play']";
    node = document.querySelector(selector);
  }
  node.className = "bi bi-pause-fill";
  if (configChanged) {
    player.stop();
    const seconds = parseInt(document.getElementById("seekbar").value);
    const input = document.getElementById("speed");
    const speed = input.value / 100;
    playMIDI(seconds / speed);
    configChanged = false;
  } else {
    player.resume();
    const seconds = parseInt(document.getElementById("seekbar").value);
    setSeekbarInterval(seconds);
  }
}

function pause(node) {
  if (!node) {
    const selector = "#midiList td:nth-child(2) i[class='bi bi-pause-fill']";
    node = document.querySelector(selector);
  }
  node.className = "bi bi-play";
  player.pause();
  clearInterval(seekbarInterval);
}

window.toolEvents = {
  "click .bi-play-fill": function (e, _value, row, _index) {
    switch (e.target.className) {
      case "bi bi-play-fill":
        return play(e.target, row);
      case "bi bi-play":
        return replay(e.target);
      case "bi bi-pause-fill":
        return pause(e.target);
    }
  },
};

function getInstrumentsString(list, info) {
  const ids = info.instruments
    .split(",").map((id) => parseInt(id));
  return ids.map((id) => list[id]).join(", ");
}

function typeEvent(event) {
  switch (event.code) {
    case "Space":
      event.preventDefault();
      switch (player.getPlayState()) {
        case "paused":
          return replay();
        case "started":
          return pause();
        case "stopped":
          return play();
      }
      break;
  }
}

function initFilterStates() {
  const states = new Map();
  const ths = document.querySelectorAll("#midiList > thead > tr > th");
  [...ths].slice(1).forEach((th) => {
    const name = th.dataset.field;
    console.log(name);
    states.set(name, "");
  });
  return states;
}

loadConfig();
const midiDB = "https://midi-db.pages.dev";
const $table = $("#midiList");
const soundFont =
  "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
const playerCallback = {
  run: () => {},
  stop: () => { playNext() },
};
const player = new core.SoundFontPlayer(
  soundFont,
  undefined,
  undefined,
  undefined,
  playerCallback,
);
const filterStates = initFilterStates();
let ns;
let nsCache;
let configChanged = false;
let seekbarInterval;

const insturmentsPromise = loadInstruments();
fetch(`${midiDB}/${document.documentElement.lang}.json`)
  .then((response) => response.json())
  .then((data) => {
    insturmentsPromise.then((list) => {
      data.forEach((info) => {
        info.instruments = getInstrumentsString(list, info);
      });
    });
    $table.bootstrapTable("load", data);
    // TODO: column-switch.bs.table does not work
    const toolbar = document.querySelector(".buttons-toolbar");
    [...toolbar.querySelectorAll("input")].forEach((input) => {
      input.addEventListener("change", addFilterControl);
    });
    // TODO: data-show-search-clear-button doew not work
    const searchClearButton = toolbar.children[1].querySelector("button");
    searchClearButton.addEventListener("click", () => {
      $table.bootstrapTable("filterBy", {}, {
        "filterAlgorithm": true
      });
    });
    addFilterControl();
  });

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("lang").onchange = changeLang;
document.getElementById("speed").onchange = changeSpeed;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = changeVolumebar;
document.getElementById("seekbar").onchange = changeSeekbar;
document.getElementById("instruments").onchange = changeInstruments;
document.addEventListener("keydown", typeEvent);
document.addEventListener("click", unlockAudio, {
  once: true,
  useCapture: true,
});
