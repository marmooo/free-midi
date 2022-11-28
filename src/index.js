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

function setVolumebar() {
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

function setInstruments() {
  if (player.isPlaying()) {
    const tbody = $table[0].querySelector("tbody");
    const currNode = tbody.querySelector(".bi-pause-fill");
    const index = [...tbody.children].indexOf(currNode);
    player.stop();
    setNoteInstruments(ns);
    setSpeed(ns);
    const time = document.getElementById("currentTime").textContent;
    player.loadSamples(ns).then(() => {
      player.start(ns, undefined, time).then(() => playNext(currNode, index));
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

function initSeekbar(ns) {
  document.getElementById("seekbar").max = ns.totalTime;
  document.getElementById("totalTime").textContent = formatTime(ns.totalTime);
}

async function playMIDI(event, index, midiUrl) {
  ns = await core.urlToNoteSequence(midiUrl);
  ns.controlChanges.forEach((n) => n.p = n.program);
  ns.notes.map((note) =>{
    note.p = note.program;
  });
  setNoteInstruments(ns);
  setSpeed(ns);
  initSeekbar(ns);
  player.loadSamples(ns).then(() => {
    const volume = document.getElementById("volumebar").value;
    player.output.volume.value = volume;
    player.start(ns).then(() => playNext(event.target, index));
  });
}

function loadInstruments() {
  const instruments = document.getElementById("instruments");
  fetch("instruments.csv")
    .then((response) => response.text())
    .then((text) => {
      text.trimEnd().split("\n").forEach((line) => {
        const option = document.createElement("option");
        option.textContent = line.split(",")[0];
        instruments.appendChild(option);
      });
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

function setSeekbar(event) {
  seeking = true;
  const time = event.target.value;
  document.getElementById("currentTime").textContent = formatTime(time);
  if (player.isPlaying()) {
    player.seekTo(time);
    if (player.getPlayState() == "paused") player.resume();
  }
  seeking = false;
}

function noteCallback(note) {
  if (player.playing) return;
  if (seeking) return;
  const seekbar = document.getElementById("seekbar");
  seekbar.value = Math.floor(note.startTime);
  document.getElementById("currentTime").textContent = formatTime(
    note.startTime,
  );
}

const playerCallback = {
  run: (note) => noteCallback(note),
  stop: () => {},
};

loadConfig();
loadInstruments();
const midiDB = "/midi-db";
const $table = $("#midiList");
const soundFont =
  "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
const player = new core.SoundFontPlayer(
  soundFont,
  undefined,
  undefined,
  undefined,
  playerCallback,
);
let ns;
let seeking;

function rowInfoHtml(row) {
  let html = '<table class="table table-sm table-striped"><tbody>';
  for (const [k, v] of Object.entries(row)) {
    html += `<tr><th>${k}</th><td>${v}</td></tr>`;
  }
  html += "</tbody></table>";
  return html;
}

function toString(data) {
  if (data) {
    return data;
  } else {
    return "";
  }
}

function _detailFormatter(_index, row) {
  const url = encodeURI(`${midiDB}/${row.file}`);
  const title = encodeURIComponent(toString(row.title));
  const composer = encodeURIComponent(toString(row.composer));
  return `
<div class="row p-2">
  <div class="col-sm">
    <h5>Play</h5>
    <table class="table table-sm table-striped">
      <tr><th>score</th><td><a href="https://marmooo.github.io/midi2abc/?url=${url}&title=${title}&composer=${composer}">midi2abc</a></td></tr>
      <tr><th>game</th><td>TODO</td></tr>
    </table>
  </div>
  <div class="col-sm">
    <h5>Music Info</h5>
    <table class="table table-sm table-striped">
      <tr><th>title</th><td>${toString(row.title)}</td></tr>
      <tr><th>composer</th><td>${toString(row.composer)}</td></tr>
      <tr><th>opus</th><td>${toString(row.opus)}</td></tr>
      <tr><th>lyricist</th><td>${toString(row.lyricist)}</td></tr>
      <tr><th>instruments</th><td>${toString(row.instruments)}</td></tr>
      <tr><th>date</th><td>${toString(row.date)}</td></tr>
      <tr><th>style</th><td>${toString(row.style)}</td></tr>
      <tr><th>arranger</th><td>${toString(row.arranger)}</td></tr>
      <tr><th>source</th><td>${toString(row.source)}</td></tr>
    </table>
  </div>
  <div class="col-sm">
    <h5>File Info</h5>
    <table class="table table-sm table-striped">
      <tr><th>license</th><td>${toString(row.license)}</td></tr>
      <tr><th>download</th><td><a href="${toString(url)}">MIDI</a></td></tr>
      <tr><th>id</th><td>${toString(row.id)}</td></tr>
      <tr><th>maintainer</th><td>${toString(row.maintainer)}</td></tr>
      <tr><th>email</th><td>${toString(row.email)}</td></tr>
      <tr><th>web</th><td>${toString(row.web)}</td></tr>
    </table>
  </div>
</div>
  `;
}

function _toolFormatter(_value, _row, _index) {
  return `
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
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
        playMIDI(e, index, url);
        break;
      }
      case "bi bi-play":
        e.target.className = "bi bi-pause-fill";
        player.resume();
        break;
      case "bi bi-pause-fill":
        e.target.className = "bi bi-play";
        player.pause();
        break;
    }
  },
};

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = setVolumebar;
document.getElementById("seekbar").onchange = setSeekbar;
document.getElementById("instruments").onchange = setInstruments;
