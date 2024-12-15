function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    document.documentElement.setAttribute("data-bs-theme", "light");
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.setAttribute("data-bs-theme", "dark");
  }
}

function changeLang() {
  const langObj = document.getElementById("lang");
  const lang = langObj.options[langObj.selectedIndex].value;
  location.href = `/free-midi/${lang}/`;
}

class SoundFontPlayer {
  midi;

  constructor(stopCallback) {
    this.context = new globalThis.AudioContext();
    this.state = "stopped";
    this.noCallback = false;
    this.stopCallback = stopCallback;
    this.prevGain = 0.5;
    this.cacheUrls = new Array(128);
    this.totalTicks = 0;
  }

  async loadLibraries() {
    await loadLibraries([
      "https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/build/Midi.min.js",
      "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.min.js",
      "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js",
    ]);
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

  async loadSoundFontDir(instruments, dir) {
    const promises = instruments.map((instrument) => {
      const instrumentId = instrument.toString().padStart(3, "0");
      const url = `${dir}/${instrumentId}.sf3`;
      if (this.cacheUrls[instrument] == url) return true;
      this.cacheUrls[instrument] = url;
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
    const soundFontId = await this.synth.loadSFont(soundFontBuffer);
    return soundFontId;
  }

  async loadNoteSequence(midi) {
    await this.synth.resetPlayer();
    this.midi = midi;
    this.totalTicks = this.calcTick(midi.duration);
    return this.synth.addSMFDataToPlayer(midi.toArray());
  }

  resumeContext() {
    this.context.resume();
  }

  async restart(seconds) {
    this.state = "started";
    await this.synth.playPlayer();
    if (seconds) this.seekTo(seconds);
    await this.synth.waitForPlayerStopped();
    await this.synth.waitForVoicesStopped();
    this.state = "paused";
    this.finished = true;
    if (!this.noCallback) {
      player.seekTo(0);
      this.stopCallback();
    }
    this.noCallback = false;
  }

  async start(midi, seconds) {
    if (midi) await this.loadNoteSequence(midi);
    if (seconds) this.seekTo(seconds);
    this.restart();
  }

  stop() {
    this.noCallback = true;
    if (this.synth) this.synth.stopPlayer();
  }

  pause() {
    this.state = "paused";
    this.noCallback = true;
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
    const time = this.midi.duration;
    const ticks = this.midi.durationTicks;
    return Math.floor(ticks * seconds / time);
  }

  seekTo(seconds) {
    const ticks = this.calcTick(seconds);
    this.synth.seekPlayer(ticks);
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
  initSeekbar(midi, 0);
  playNext();
}

function initPlayer() {
  return new SoundFontPlayer(stopCallback);
}

function getInstruments(midi) {
  const instruments = new Set();
  midi.tracks.forEach((track) => {
    if (track.channel === 10) {
      instruments.add(128); // percussion
    } else {
      instruments.add(track.instrument.number);
    }
  });
  return Array.from(instruments);
}

async function loadSoundFont(player, name) {
  if (!name) {
    const soundfonts = document.getElementById("soundfonts");
    const index = soundfonts.selectedIndex;
    if (index == 0) return; // use local file or url
    name = soundfonts.options[index].value;
  }
  const soundFontDir = `https://soundfonts.pages.dev/${name}`;
  const instruments = getInstruments(midi);
  await player.loadSoundFontDir(instruments, soundFontDir);
  await player.loadNoteSequence(midi);
  const buttons = document.querySelectorAll("#midiList .play");
  buttons.forEach((button) => button.disabled = false);
}

function setTimer(seconds) {
  const delay = 100;
  const startTime = Date.now() - seconds * 1000;
  const totalTime = midi.duration;
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
  if (!midi) return;
  const playState = player.getPlayState();
  player.stop();
  clearInterval(timer);
  const prevRate = midiCache.duration / midi.duration;
  const rate = prevRate / (speed / 100);
  const newSeconds = currentTime * rate;
  setSpeed(midi, speed);
  initSeekbar(midi, newSeconds);
  if (playState == "started") {
    setLoadingTimer(newSeconds);
    player.start(midi);
  } else if (player instanceof SoundFontPlayer) {
    await player.loadNoteSequence(midi);
    player.seekTo(newSeconds);
  }
}

function changeSpeedEvent(event) {
  if (player.isPlaying()) disableController();
  const speed = parseInt(event.target.value);
  changeSpeed(speed);
}

function setSpeed(midi, speed) {
  if (speed <= 0) speed = 1;
  speed /= 100;
  const tempos = midi.header.tempos;
  midiCache.header.tempos.forEach((tempo, i) => {
    tempos[i].bpm = tempo.bpm * speed;
  });
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

function initSeekbar(midi, seconds) {
  const totalTime = midi.duration;
  document.getElementById("seekbar").max = totalTime;
  document.getElementById("seekbar").value = seconds;
  document.getElementById("totalTime").textContent = formatTime(totalTime);
  document.getElementById("currentTime").textContent = formatTime(seconds);
}

function setControlChanges(midi) {
  midi.tracks.forEach((track) => {
    // convert to GM
    const cc = track.controlChanges;
    delete cc[0];
    delete cc[32];
    // Reset All Controllers
    track.addCC({ number: 121, ticks: 0, value: 0 });
  });
}

function addWaitTicks(midi) {
  const waitTicks = 1;
  midi.header.tempos.forEach((tempo) => {
    tempo.ticks += waitTicks;
  });
  midi.tracks.forEach((track) => {
    track.notes.forEach((note) => {
      note.ticks += waitTicks;
    });
  });
}

async function loadMIDI(url) {
  midi = await Midi.fromUrl(url);
  setControlChanges(midi);
  addWaitTicks(midi);
  midiCache = midi.clone();
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
  document.removeEventListener("pointerdown", unlockAudio);
  document.removeEventListener("keydown", unlockAudio);
}

async function playMIDI(seconds) {
  disableController();
  clearInterval(timer);
  setNoteInstruments(midi);
  if (player instanceof SoundFontPlayer) {
    await loadSoundFont(player);
  }
  const speed = parseInt(document.getElementById("speed").value);
  setSpeed(midi, speed);
  const volume = parseInt(document.getElementById("volumebar").value);
  player.changeVolume(volume);
  setLoadingTimer(seconds);
  player.start(midi);
  initSeekbar(midi, seconds);
  enableController();
}

function playNext() {
  const tbody = $table[0].querySelector("tbody");
  const pauseNode = tbody.querySelector(".bi-pause-fill");
  const tr = pauseNode.parentNode.parentNode.parentNode;
  const index = [...tbody.children].indexOf(tr);
  pauseNode.className = "bi bi-play-fill";
  const currPageData = $table.bootstrapTable("getData", {
    useCurrentPage: true,
  });
  if (index + 1 == currPageData.length) {
    const data = $table.bootstrapTable("getData");
    if (data.at(-1) == currPageData.at(-1)) {
      const repeatObj = document.getElementById("repeat");
      const repeat = repeatObj.classList.contains("active");
      if (repeat) {
        $table.bootstrapTable("selectPage", 1);
        const pageData = $table.bootstrapTable("getData", {
          useCurrentPage: true,
        });
        const tbody = $table[0].querySelector("tbody");
        const nextNode = tbody.querySelector(".bi-play-fill");
        if (nextNode) play(nextNode, pageData[0]);
      }
    } else {
      $table.bootstrapTable("nextPage");
      const pageData = $table.bootstrapTable("getData", {
        useCurrentPage: true,
      });
      const tbody = $table[0].querySelector("tbody");
      const nextNode = tbody.querySelector(".bi-play-fill");
      if (nextNode) play(nextNode, pageData[0]);
    }
  } else {
    const nextNode = tr.nextElementSibling.querySelector(".bi-play-fill");
    if (nextNode) play(nextNode, currPageData[index + 1]);
  }
}

function setNoteInstruments(midi) {
  const index = document.getElementById("instruments").selectedIndex - 1;
  if (index >= 0) {
    midi.tracks.forEach((track) => track.instrument.number = index);
  } else {
    midi.tracks.forEach((track, i) => {
      track.instrument.number = midiCache.tracks[i].instrument.number;
    });
  }
}

async function loadSoundFontList() {
  const response = await fetch("https://soundfonts.pages.dev/list.json");
  const data = await response.json();
  const soundfonts = document.getElementById("soundfonts");
  data.forEach((info) => {
    const option = document.createElement("option");
    option.textContent = info.name;
    if (info.name == "GeneralUser_GS_v1.471") {
      option.selected = true;
    }
    soundfonts.appendChild(option);
  });
}

async function loadInstrumentList() {
  const langObj = document.getElementById("lang");
  const lang = langObj.options[langObj.selectedIndex].value;
  const instruments = document.getElementById("instruments");
  const response = await fetch(`/free-midi/${lang}/instruments.lst`);
  const text = await response.text();
  const list = [];
  text.trimEnd().split("\n").forEach((line) => {
    const option = document.createElement("option");
    option.textContent = line;
    instruments.appendChild(option);
    list.push(line);
  });
  return list;
}

async function changeConfig() {
  switch (player.getPlayState()) {
    case "started": {
      player.stop();
      setNoteInstruments(midi);
      if (player instanceof SoundFontPlayer) {
        await loadSoundFont(player);
      }
      const speed = parseInt(document.getElementById("speed").value);
      setSpeed(midi, speed);
      const seconds = parseInt(document.getElementById("seekbar").value);
      initSeekbar(midi, seconds);
      setLoadingTimer(seconds);
      player.start(midi);
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
    input.title = `search ${name}`;
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

function toDownload(url, lang, redistribution) {
  if (redistribution != undefined) {
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

function _detailFormatter(_index, row) {
  const template = document.getElementById("detail-box")
    .content.cloneNode(true);
  const div = template.firstElementChild;
  const midiURL = `${midiDB}/${row.file}`;
  const params = toURLSearchParams(row);
  const query = params.toString();
  for (const a of div.querySelectorAll(".basicInfo a")) {
    a.href += `?${query}`;
  }

  const musicInfoTds = div.querySelectorAll(".musicInfo td");
  musicInfoTds[0].textContent = toString(row.title);
  musicInfoTds[1].textContent = toString(row.composer);
  musicInfoTds[2].textContent = toString(row.opus);
  musicInfoTds[3].textContent = toString(row.lyricist);
  musicInfoTds[4].textContent = toString(row.date);
  musicInfoTds[5].textContent = toString(row.style);
  musicInfoTds[6].textContent = toString(row.arranger);
  musicInfoTds[7].textContent = toString(row.source);

  const license = toLicense(row.license, row.file);
  const web = toWeb(row.file);
  const id = row.file.split("/")[0];
  const redistribution = collections.get(id).redistribution;
  const download = toDownload(midiURL, "en", redistribution);
  const fileInfoTds = div.querySelectorAll(".fileInfo td");
  fileInfoTds[0].innerHTML = license;
  fileInfoTds[1].innerHTML = download;
  fileInfoTds[2].textContent = toString(row.maintainer);
  fileInfoTds[3].textContent = toString(row.email);
  fileInfoTds[4].innerHTML = web;

  let instruments = "";
  row.instruments.split(", ").forEach((instrument) => {
    instruments += `<li>${instrument}</li>`;
  });
  const annotationInfoTds = div.querySelectorAll(".annotationInfo td");
  annotationInfoTds[0].textContent = row.time;
  annotationInfoTds[1].textContent = row.difficulty;
  annotationInfoTds[2].textContent = row.bpm;
  annotationInfoTds[3].innerHTML = `<ul>${instruments}</ul>`;
  return div;
}

globalThis.toolEvents = {
  "click .bi-play-fill": (event, _value, row, _index) => {
    switch (event.target.className) {
      case "bi bi-play-fill": {
        const buttons = document.querySelectorAll("#midiList .play");
        buttons.forEach((button) => button.disabled = true);
        return play(event.target, row);
      }
      case "bi bi-play":
        return replay(event.target);
      case "bi bi-pause-fill":
        return pause(event.target);
    }
  },
};

function _toolFormatter(_value, _row, _index) {
  const button = document.getElementById("play-button")
    .content.firstElementChild;
  return button.outerHTML;
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
  if (!player) return;
  if (player.synth) player.stop();
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

function complementTable(info, data) {
  const country = info.country;
  const composer = info.composer;
  const maintainer = info.maintainer;
  const web = info.web;
  const license = info.license;
  data.forEach((datum) => {
    if (!datum.country && country) datum.country = country;
    if (!datum.composer && composer) datum.composer = composer;
    if (!datum.maintainer && maintainer) datum.maintainer = maintainer;
    if (!datum.web) datum.web = web;
    if (!datum.license) datum.license = license;
  });
}

async function fetchPlayList(collections) {
  const infos = Array.from(collections.values());
  shuffle(infos);
  const lang = document.documentElement.lang;
  const instrumentList = await loadInstrumentList();
  const firstResponse = await fetch(
    `${midiDB}/json/${infos[0].id}/${lang}.json`,
  );
  const firstData = await firstResponse.json();
  complementTable(infos[0], firstData);
  $table.bootstrapTable("load", firstData);
  addFilterControl();
  firstData.forEach((info) => {
    info.instruments = getInstrumentsString(instrumentList, info);
  });
  document.getElementById("midiList").style.height = "auto";

  const promises = infos.slice(1).map(async (info) => {
    const response = await fetch(`${midiDB}/json/${info.id}/${lang}.json`);
    return response.json();
  });
  Promise.all(promises).then((dataset) => {
    dataset.forEach((data, i) => {
      complementTable(infos[i + 1], data);
      $table.bootstrapTable("append", data);
      addFilterControl();
      data.forEach((info) => {
        info.instruments = getInstrumentsString(instrumentList, info);
      });
    });
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
      filteredInstrumentNode.classList.remove("checked");
      filteredCollectionNode.classList.remove("checked");
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
    button.type = "button";
    button.textContent = collection.name;
    button.onclick = () => {
      let collectionId = collection.id;
      if (filteredCollectionNode == button) {
        button.classList.remove("checked");
        collectionId = "";
      } else {
        button.classList.add("checked");
        if (filteredCollectionNode) {
          filteredCollectionNode.classList.remove("checked");
        }
      }
      const input = document.getElementById("midiList")
        .querySelector("thead > tr > th[data-field='file'] input");
      if (input) input.value = collectionId;
      filterTable("file", collectionId);
      filteredCollectionNode = button;
    };
    root.appendChild(button);
  });
}

function loadLibraries(urls) {
  const promises = urls.map((url) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  });
  return Promise.all(promises);
}

function setFilterInstrumentsButtons() {
  const lang = document.documentElement.lang;
  const instruments = (lang == "en")
    ? ["Piano", "Accordion", "Violin", "Guitar", "Trumpet", "Sax"]
    : [
      "ピアノ",
      "アコーディオン",
      "ヴァイオリン",
      "ギター",
      "トランペット",
      "サックス",
    ];
  const input = document.getElementById("midiList")
    .querySelector("thead > tr > th[data-field='instruments'] input");
  const buttons = document.getElementById("filterInstruments")
    .getElementsByTagName("button");
  [...buttons].forEach((button, i) => {
    button.onclick = () => {
      let instrument = instruments[i];
      if (filteredInstrumentNode == button) {
        button.classList.remove("checked");
        instrument = "";
      } else {
        button.classList.add("checked");
        if (filteredInstrumentNode) {
          filteredInstrumentNode.classList.remove("checked");
        }
      }
      if (input) input.value = instrument;
      filterTable("instruments", instrument);
      filteredInstrumentNode = button;
    };
  });
}

async function loadPlayerLibraries() {
  await player.loadLibraries();
  document.querySelectorAll("#midiList .play").forEach((button) => {
    button.disabled = false;
  });
}

loadConfig();
Module = {};
const midiDB = "https://midi-db.pages.dev";
const $table = $("#midiList");
const filterTexts = initFilterTexts();
const collections = new Map();
const player = initPlayer();

let controllerDisabled;
let currentTime = 0;
let midi;
let midiCache;
let configChanged = false;
let timer;
let filteredInstrumentNode;
let filteredCollectionNode;

setFilterInstrumentsButtons();
fetchCollections().then((data) => {
  data.forEach((datum) => {
    collections.set(datum.id, datum);
  });
  addCollectionSelector();
  fetchPlayList(data);
});
loadSoundFontList();

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
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
document.addEventListener("pointerdown", loadPlayerLibraries, { once: true });
document.addEventListener("keydown", loadPlayerLibraries, { once: true });
