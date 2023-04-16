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

class MagentaPlayer extends core.SoundFontPlayer {
  constructor(ns, runCallback, stopCallback) {
    const soundFontUrl =
      "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
    const callback = {
      run: (note) => runCallback(note),
      stop: () => stopCallback(),
    };
    super(soundFontUrl, undefined, undefined, undefined, callback);
    this.ns = ns;
    this.output.volume.value = 20 * Math.log(0.5) / Math.log(10);
  }

  async loadSamples(ns) {
    await super.loadSamples(ns);
    this.synth = true;
    this.ns = ns;
  }

  start(ns) {
    return super.start(ns);
  }

  restart(seconds) {
    if (seconds) {
      return super.start(this.ns, undefined, seconds / ns.ticksPerQuarter);
    } else {
      return this.start(this.ns);
    }
  }

  resume(seconds) {
    super.resume();
    this.seekTo(seconds);
  }

  changeVolume(volume) {
    // 0 <= volume <= 100 --> 1e-5 <= dB <= 1 --> -100 <= slider <= 0
    if (volume == 0) {
      volume = -100;
    } else {
      volume = 20 * Math.log(volume / 100) / Math.log(10);
    }
    this.output.volume.value = volume;
  }

  changeMute(status) {
    this.output.mute = status;
  }
}

class SoundFontPlayer {
  constructor(stopCallback) {
    this.context = new AudioContext();
    this.state = "stopped";
    this.callStop = false;
    this.stopCallback = stopCallback;
    this.prevGain = 0.5;
    this.cacheUrls = new Array(128);
    this.totalTicks = 0;
  }

  async loadSoundFontDir(programs, dir) {
    const promises = programs.map((program) => {
      const programId = program.toString().padStart(3, "0");
      const url = `${dir}/${programId}.sf3`;
      if (this.cacheUrls[program] == url) return true;
      this.cacheUrls[program] = url;
      return this.fetchBuffer(url);
    });
    const buffers = await Promise.all(promises);
    for (const buffer of buffers) {
      if (buffer instanceof ArrayBuffer) {
        await this.loadSoundFontBuffer(buffer);
      }
    }
  }

  async fetchBuffer(url) {
    const response = await fetch(url);
    if (response.status == 200) {
      return await response.arrayBuffer();
    } else {
      return undefined;
    }
  }

  async loadSoundFontUrl(url) {
    const buffer = await this.fetchBuffer(url);
    const soundFontId = await this.loadSoundFontBuffer(buffer);
    return soundFontId;
  }

  async loadSoundFontBuffer(soundFontBuffer) {
    if (!this.synth) {
      await this.context.audioWorklet.addModule(
        "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js",
      );
      await this.context.audioWorklet.addModule(
        "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.worklet.min.js",
      );
      this.synth = new JSSynth.AudioWorkletNodeSynthesizer();
      this.synth.init(this.context.sampleRate);
      const node = this.synth.createAudioNode(this.context);
      node.connect(this.context.destination);
    }
    const soundFontId = await this.synth.loadSFont(soundFontBuffer);
    return soundFontId;
  }

  async loadNoteSequence(ns) {
    await this.synth.resetPlayer();
    this.ns = ns;
    const midiBuffer = core.sequenceProtoToMidi(ns);
    // TODO: value is rarely different
    // this.totalTicks = this.calcTick(ns.totalTime);
    this.totalTicks = await this.synth.retrievePlayerTotalTicks();
    return player.synth.addSMFDataToPlayer(midiBuffer);
  }

  resumeContext() {
    this.context.resume();
  }

  async restart(seconds) {
    this.state = "started";
    await this.synth.playPlayer();
    this.seekTo(seconds);
    await this.synth.waitForPlayerStopped();
    await this.synth.waitForVoicesStopped();
    this.state = "paused";
    const currentTick = await this.synth.retrievePlayerCurrentTick();
    if (this.totalTicks <= currentTick) {
      player.seekTo(0);
      this.stopCallback();
    }
  }

  async start(ns, _qpm, seconds) {
    if (ns) await this.loadNoteSequence(ns);
    if (seconds) this.seekTo(seconds);
    this.restart();
  }

  stop() {
    if (this.isPlaying()) {
      this.synth.stopPlayer();
    }
  }

  pause() {
    this.state = "paused";
    this.synth.stopPlayer();
  }

  resume(seconds) {
    this.restart(seconds);
  }

  changeVolume(volume) {
    // 0 <= volume <= 1
    volume = volume / 100;
    this.synth.setGain(volume);
  }

  changeMute(status) {
    if (status) {
      this.prevGain = this.synth.getGain();
      this.synth.setGain(0);
    } else {
      this.synth.setGain(this.prevGain);
    }
  }

  calcTick(seconds) {
    let tick = 0;
    let prevTime = 0;
    let prevQpm = 120;
    for (const tempo of this.ns.tempos) {
      const currTime = tempo.time;
      const currQpm = tempo.qpm;
      if (currTime < seconds) {
        const t = currTime - prevTime;
        tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
      } else {
        const t = seconds - prevTime;
        tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
        return Math.round(tick);
      }
      prevTime = currTime;
      prevQpm = currQpm;
    }
    const t = seconds - prevTime;
    tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
    return Math.round(tick);
  }

  seekTo(seconds) {
    const tick = this.calcTick(seconds);
    this.synth.seekPlayer(tick);
  }

  isPlaying() {
    if (!this.synth) return false;
    return this.synth.isPlaying();
  }

  getPlayState() {
    if (!this.synth) return "stopped";
    if (this.synth.isPlaying()) return "started";
    return this.state;
  }
}

function stopCallback() {
  clearInterval(timer);
  currentTime = 0;
  initSeekbar(ns, 0);
  playNext();
}

function initPlayer() {
  // // Magenta.js
  // const runCallback = () => {};
  // player = new MagentaPlayer(ns, runCallback, stopCallback);

  // js-synthesizer
  player = new SoundFontPlayer(stopCallback);
}

function getPrograms(ns) {
  const programs = new Set();
  ns.notes.forEach((note) => programs.add(note.program));
  if (ns.notes.some((note) => note.isDrum)) programs.add(128);
  return [...programs];
}

async function loadSoundFont(player, name) {
  if (!name) {
    const soundfonts = document.getElementById("soundfonts");
    const index = soundfonts.selectedIndex;
    if (index == 0) return; // use local file or url
    name = soundfonts.options[index].value;
  }
  const soundFontDir = `https://soundfonts.pages.dev/${name}`;
  const programs = getPrograms(ns);
  await player.loadSoundFontDir(programs, soundFontDir);
  await player.loadNoteSequence(ns);
}

function setTimer(seconds) {
  const delay = 100;
  const startTime = Date.now() - seconds * 1000;
  const totalTime = ns.totalTime;
  clearInterval(timer);
  timer = setInterval(() => {
    const nextTime = (Date.now() - startTime) / 1000;
    if (Math.floor(currentTime) != Math.floor(nextTime)) {
      updateSeekbar(nextTime);
    }
    currentTime = nextTime;
    if (currentTime >= totalTime) {
      clearInterval(timer);
    }
  }, delay);
}

// fix delay caused by player.start(ns) by seeking after playing
function setLoadingTimer(time) {
  const loadingTimer = setInterval(() => {
    if (player.isPlaying()) {
      clearInterval(loadingTimer);
      player.seekTo(time);
      setTimer(time);
      enableController();
    }
  }, 10);
}

function disableController() {
  controllerDisabled = true;
  const target = document.getElementById("controller")
    .querySelectorAll("button, input");
  [...target].forEach((node) => {
    node.disabled = true;
  });
}

function enableController() {
  controllerDisabled = false;
  const target = document.getElementById("controller")
    .querySelectorAll("button, input");
  [...target].forEach((node) => {
    node.disabled = false;
  });
}

function speedDown() {
  if (player.isPlaying()) disableController();
  const input = document.getElementById("speed");
  const value = parseInt(input.value) - 10;
  const speed = (value < 0) ? 1 : value;
  input.value = speed;
  changeSpeed(speed);
}

function speedUp() {
  if (player.isPlaying()) disableController();
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) + 10;
  input.value = speed;
  changeSpeed(speed);
}

async function changeSpeed(speed) {
  if (!ns) return;
  const playState = player.getPlayState();
  player.stop();
  clearInterval(timer);
  const prevRate = nsCache.totalTime / ns.totalTime;
  const rate = prevRate / (speed / 100);
  const newSeconds = currentTime * rate;
  setSpeed(ns, speed);
  initSeekbar(ns, newSeconds);
  if (playState == "started") {
    setLoadingTimer(newSeconds);
    player.start(ns);
  } else if (player instanceof SoundFontPlayer) {
    await player.loadNoteSequence(ns);
    player.seekTo(newSeconds);
  }
}

function changeSpeedEvent(event) {
  if (player.isPlaying()) disableController();
  const speed = parseInt(event.target.value);
  changeSpeed(speed);
}

function setSpeed(ns, speed) {
  if (speed <= 0) speed = 1;
  speed /= 100;
  const controlChanges = nsCache.controlChanges;
  ns.controlChanges.forEach((n, i) => {
    n.time = controlChanges[i].time / speed;
  });
  const tempos = nsCache.tempos;
  ns.tempos.forEach((n, i) => {
    n.time = tempos[i].time / speed;
    n.qpm = tempos[i].qpm * speed;
  });
  const timeSignatures = nsCache.timeSignatures;
  ns.timeSignatures.forEach((n, i) => {
    n.time = timeSignatures[i].time / speed;
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
    volumebar.value = 0;
    player.changeMute(true);
  } else {
    i.className = "bi bi-volume-up-fill";
    volumebar.value = volumebar.dataset.value;
    player.changeMute(false);
  }
}

function changeVolumebar() {
  const volumebar = document.getElementById("volumebar");
  const volume = volumebar.value;
  volumebar.dataset.value = volume;
  player.changeVolume(volume);
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
  clearInterval(timer);
  currentTime = parseInt(event.target.value);
  document.getElementById("currentTime").textContent = formatTime(currentTime);
  if (player.getPlayState() == "started") {
    player.seekTo(currentTime);
    setTimer(currentTime);
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
  document.getElementById("currentTime").textContent = formatTime(seconds);
}

async function loadMIDI(url) {
  const waitTime = 0.2;
  ns = await core.urlToNoteSequence(url);
  ns.totalTime += waitTime;
  ns.notes.forEach((note) => {
    note.startTime += waitTime;
    note.endTime += waitTime;
  });
  ns.controlChanges.forEach((cc) => {
    cc.time += waitTime;
  });
  ns.tempos.slice(1).forEach((tempo) => {
    tempo.time += waitTime;
  });
  ns.timeSignatures.slice(1).forEach((ts) => {
    ts.time += waitTime;
  });
  nsCache = core.sequences.clone(ns);
  ns.controlChanges.forEach((n) => n.p = n.program);
  ns.notes.map((note) => {
    note.p = note.program;
  });
}

async function loadSoundFontFileEvent(event) {
  if (player) {
    document.getElementById("soundfonts").options[0].selected = true;
    const file = event.target.files[0];
    const soundFontBuffer = await file.arrayBuffer();
    await player.loadSoundFontBuffer(soundFontBuffer);
  }
}

async function loadSoundFontUrlEvent(event) {
  if (player) {
    document.getElementById("soundfonts").options[0].selected = true;
    const response = await fetch(event.target.value);
    const soundFontBuffer = await response.arrayBuffer();
    await player.loadSoundFontBuffer(soundFontBuffer);
  }
}

function unlockAudio() {
  if (!player) return;
  if (!player.synth) return;
  player.resumeContext();
  document.removeEventListener("click", unlockAudio);
}

async function playMIDI(seconds) {
  disableController();
  clearInterval(timer);
  setNoteInstruments(ns);
  if (player instanceof SoundFontPlayer) {
    await loadSoundFont(player);
  }
  const speed = parseInt(document.getElementById("speed").value);
  setSpeed(ns, speed);
  const volume = parseInt(document.getElementById("volumebar").value);
  player.changeVolume(volume);
  setLoadingTimer(seconds);
  player.start(ns);
  initSeekbar(ns, seconds);
  enableController();
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

function loadSoundFontList() {
  return fetch("https://soundfonts.pages.dev/list.json")
    .then((response) => response.json())
    .then((data) => {
      const soundfonts = document.getElementById("soundfonts");
      data.forEach((info) => {
        const option = document.createElement("option");
        option.textContent = info.name;
        if (info.name == "GeneralUser_GS_v1.471") {
          option.selected = true;
        }
        soundfonts.appendChild(option);
      });
    });
}

function loadInstrumentList() {
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

async function changeConfig() {
  switch (player.getPlayState()) {
    case "started": {
      player.stop();
      setNoteInstruments(ns);
      if (player instanceof SoundFontPlayer) {
        await loadSoundFont(player);
      }
      const speed = parseInt(document.getElementById("speed").value);
      setSpeed(ns, speed);
      const seconds = parseInt(document.getElementById("seekbar").value);
      initSeekbar(ns, seconds);
      setLoadingTimer(seconds);
      player.start(ns);
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
    input.type = "search";
    input.className = "form-control";
    const placeholder = getFilterPlaceholder(name);
    if (placeholder) input.placeholder = placeholder;
    input.onchange = () => {
      filterTable(name, input.value);
    };
    fht.replaceChildren(input);
  });
}

function getFilterPlaceholder(name) {
  switch (name) {
    case "born":
      return ">1850";
    case "died":
      return "<1920";
    case "difficulty":
      return "<50";
    case "bpm":
      return "<120";
    case "time":
      return ">30(sec)";
  }
}

function getFilterFunction(name) {
  switch (name) {
    case "born":
    case "died":
    case "difficulty":
    case "bpm":
      return filterByRange;
    case "time":
      return filterByTime;
    default:
      return filterByPartialMatch;
  }
}

function filterTable(name, text) {
  filterTexts.set(name, text);
  $table.bootstrapTable("filterBy", {}, {
    "filterAlgorithm": (row) => {
      let state = true;
      for (const [columnName, columnText] of filterTexts.entries()) {
        if (columnText == "") continue;
        const func = getFilterFunction(columnName);
        const columnState = func(columnText, row[columnName]);
        if (!columnState) {
          state = false;
          break;
        }
      }
      return state;
    },
  });
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
  return `<a href="${url}">${text}</a>`;
}

function toWeb(filePath) {
  const id = filePath.split("/")[0];
  const collection = collections.get(id);
  const url = collection.web;
  const name = collection.name;
  return `<a href="${url}">${name}</a>`;
}

function toLicense(text, filePath) {
  if (!text) {
    const id = filePath.split("/")[0];
    const collection = collections.get(id);
    text = collection.license;
  }
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
      case "ja":
        return "HP からダウンロードしてください。";
      case "en":
        return "Please download from the homepage.";
    }
  } else {
    return toLink(url, "MIDI");
  }
}

function toURLSearchParams(row) {
  const midiURL = `${midiDB}/${row.file}`;
  const params = new URLSearchParams();
  params.set("url", midiURL);
  if (row.title) params.set("title", row.title);
  if (row.composer) params.set("composer", row.composer);
  if (row.maintainer) params.set("maintainer", row.maintainer);
  if (row.web) params.set("web", row.web);
  try {
    new URL(row.license);
  } catch {
    params.set("license", row.license);
  }
  return params;
}

function _detailFormatterEn(_index, row) {
  const midiURL = `${midiDB}/${row.file}`;
  const params = toURLSearchParams(row);
  const query = params.toString();
  const license = toLicense(row.license, row.file);
  const web = toWeb(row.file);
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
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${query}">
          <img alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${query}">
          <img alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${query}">
          <img alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${query}">
          <img alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${query}">
          <img alt="Doremi Piano" src="https://marmooo.github.io/doremi-piano/favicon/favicon.svg" width="16" height="16">
          Doremi Piano
        </a></td>
      </tr>
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
  const params = toURLSearchParams(row);
  const query = params.toString();
  const license = toLicense(row.license, row.file);
  const web = toWeb(row.file);
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
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${query}">
          <img alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${query}">
          <img alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${query}">
          <img alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${query}">
          <img alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${query}">
          <img alt="Doremi Piano" src="https://marmooo.github.io/doremi-piano/favicon/favicon.svg" width="16" height="16">
          Doremi Piano
        </a></td>
      </tr>
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
    player.resume(currentTime);
    setTimer(currentTime);
  }
}

function pause(node) {
  if (!node) {
    const selector = "#midiList td:nth-child(2) i[class='bi bi-pause-fill']";
    node = document.querySelector(selector);
  }
  node.className = "bi bi-play";
  player.pause();
  clearInterval(timer);
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
  if (!player) return;
  if (controllerDisabled) return;
  player.resumeContext();
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

function initFilterTexts() {
  const texts = new Map();
  const ths = document.querySelectorAll("#midiList > thead > tr > th");
  [...ths].slice(1).forEach((th) => {
    const name = th.dataset.field;
    texts.set(name, "");
  });
  return texts;
}

async function fetchCollections() {
  const response = await fetch(`${midiDB}/collections.json`);
  return await response.json();
}

function shuffle(array) {
  for (let i = array.length; 1 < i; i--) {
    const k = Math.floor(Math.random() * i);
    [array[k], array[i - 1]] = [array[i - 1], array[k]];
  }
  return array;
}

async function fetchPlayList(collections) {
  const ids = collections.map((collection) => collection.id);
  shuffle(ids);
  const lang = document.documentElement.lang;
  const firstResponse = await fetch(`${midiDB}/json/${ids[0]}/${lang}.json`);
  const firstData = await firstResponse.json();
  $table.bootstrapTable("load", firstData);
  addFilterControl();
  instrumentListPromise.then((list) => {
    firstData.forEach((info) => {
      info.instruments = getInstrumentsString(list, info);
    });
  });

  const promises = ids.slice(1).map(async (dir) => {
    const response = await fetch(`${midiDB}/json/${dir}/${lang}.json`);
    return response.json();
  });
  Promise.all(promises).then((dataset) => {
    dataset.forEach((data) => {
      $table.bootstrapTable("append", data);
      addFilterControl();
      // TODO: column-switch.bs.table does not work
      const toolbar = document.querySelector(".buttons-toolbar");
      [...toolbar.querySelectorAll("input")].forEach((input) => {
        input.addEventListener("change", addFilterControl);
      });
      // TODO: data-show-search-clear-button doew not work
      const searchClearButton = toolbar.children[1].querySelector("button");
      searchClearButton.addEventListener("click", () => {
        $table.bootstrapTable("filterBy", {}, {
          "filterAlgorithm": () => true,
        });
      });
      instrumentListPromise.then((list) => {
        data.forEach((info) => {
          info.instruments = getInstrumentsString(list, info);
        });
      });
    });
  });
}

function addCollectionSelector() {
  const root = document.getElementById("collections");
  collections.forEach((collection) => {
    const button = document.createElement("button");
    if (collection.status == "CLOSED") {
      button.className = "btn btn-sm btn-outline-secondary m-1";
    } else {
      button.className = "btn btn-sm btn-outline-primary m-1";
    }
    button.textContent = collection.name;
    button.onclick = () => {
      const input = document.getElementById("midiList")
        .querySelector("thead > tr > th[data-field='id'] input");
      if (input) input.value = collection.id;
      filterTable("id", collection.id);
    };
    root.appendChild(button);
  });
}

loadConfig();
const midiDB = "https://midi-db.pages.dev";
const $table = $("#midiList");
const filterTexts = initFilterTexts();
const collections = new Map();
let controllerDisabled;
let currentTime = 0;
let ns;
let nsCache;
let configChanged = false;
let timer;
let player;

const instrumentListPromise = loadInstrumentList();
loadSoundFontList();
initPlayer();
fetchCollections().then((data) => {
  data.forEach((datum) => {
    collections.set(datum.id, datum);
  });
  addCollectionSelector();
  fetchPlayList(data);
});

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("lang").onchange = changeLang;
document.getElementById("speed").onchange = changeSpeedEvent;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = changeVolumebar;
document.getElementById("seekbar").onchange = changeSeekbar;
document.getElementById("instruments").onchange = changeConfig;
document.getElementById("soundfonts").onchange = changeConfig;
document.getElementById("inputSoundFontFile").onchange = loadSoundFontFileEvent;
document.getElementById("inputSoundFontUrl").onchange = loadSoundFontUrlEvent;
document.addEventListener("keydown", typeEvent);
document.addEventListener("click", unlockAudio);
