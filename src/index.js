import { Midy } from "https://cdn.jsdelivr.net/gh/marmooo/midy@0.5.8/dist/midy.min.js";
import { MIDIPlayer } from "https://cdn.jsdelivr.net/npm/@marmooo/midi-player@0.0.7/+esm";
import { Modal } from "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/+esm";
import { MidiLibrary } from "/free-midi/midi-library.js";

function toggleDarkMode() {
  const html = document.documentElement;
  const newTheme = html.getAttribute("data-bs-theme") === "dark"
    ? "light"
    : "dark";
  html.setAttribute("data-bs-theme", newTheme);
  localStorage.setItem("darkMode", newTheme);
}

function changeLang() {
  const langObj = document.getElementById("lang");
  const lang = langObj.options[langObj.selectedIndex].value;
  location.href = `/free-midi/${lang}/`;
}

function getGlobalCSS() {
  const sheet = new CSSStyleSheet();
  let css = "";
  for (const s of document.styleSheets) {
    try {
      for (const r of s.cssRules) css += r.cssText;
    } catch { /* skip cross-origin sheets */ }
  }
  sheet.replaceSync(css);
  return sheet;
}

function setConfigurationEvents() {
  document.getElementById("configuration").addEventListener(
    "change",
    (event) => {
      const target = event.target;
      switch (target.name) {
        case "reverbType":
        case "chorusType":
          configuration[target.name] = Number(target.value);
          break;
        case "reverbAlgorithm":
          configuration[target.name] = target.value;
          break;
      }
    },
  );
}

function setSoundFontLibraryEvents() {
  document.getElementById("sampleSoundFont").addEventListener(
    "change",
    (event) => {
      midiPlayer.soundFontURL = "https://soundfonts.pages.dev/" +
        event.target.value;
    },
  );
}

class FreeMidiLibrary extends MidiLibrary {
  buildColumns() {
    const columns = super.buildColumns();
    const licenseIndex = columns.findIndex((column) => column.id === "license");
    columns.splice(licenseIndex + 1, 0, {
      id: "download",
      name: "Download",
      visible: true,
      searchPlaceholder: "Search download...",
      render: (row, td) => {
        const lang = document.documentElement.lang;
        const midiURL = `${this.midiDB}/${row.file}`;
        const id = row.file.split("/")[0];
        const redistribution = this.collections.get(id)?.redistribution;
        td.innerHTML = toDownload(midiURL, lang, redistribution);
      },
    });
    return columns;
  }
}

function toLink(url, text) {
  if (!url) return text;
  return `<a href="${url}">${text}</a>`;
}

function toDownload(url, lang, redistribution) {
  if (redistribution != undefined) {
    switch (lang) {
      case "ja":
        return "HP からダウンロードしてください。";
      case "en":
      default:
        return "Download from the homepage.";
    }
  } else {
    return toLink(url, "MIDI");
  }
}

class PlaybackController {
  constructor(midy, midiPlayer, midiDB, library) {
    this.midy = midy;
    this.midiPlayer = midiPlayer;
    this.midiDB = midiDB;
    this.library = library;
    this.currentRow = null;
    this.generation = 0;

    midy.addEventListener(
      "started",
      () => this.library.setPlayState("playing"),
    );
    midy.addEventListener(
      "resumed",
      () => this.library.setPlayState("playing"),
    );
    midy.addEventListener("paused", () => this.library.setPlayState("paused"));
    midy.addEventListener("stopped", () => this.handleStopped(this.generation));
    midy.addEventListener("ended", () => this.handleEnded(this.generation));
  }

  handleStopped(generation) {
    if (generation !== this.generation) return;
    this.library.setPlayState(null);
    this.currentRow = null;
    this.library.setActiveRow(null);
  }

  async handleEnded(generation) {
    if (generation !== this.generation) return;
    this.library.setPlayState(null);
    const nextRow = this.getNextRow();
    if (!nextRow) {
      this.currentRow = null;
      this.library.setActiveRow(null);
      return;
    }
    await this.play(nextRow);
  }

  getNextRow() {
    if (!this.currentRow) return null;
    const data = this.library.getDisplayData();
    const index = data.indexOf(this.currentRow);
    if (index === -1 || index + 1 >= data.length) return null;
    return data[index + 1];
  }

  async forceStop() {
    if (this.midy.isPaused) {
      const resuming = this.midiPlayer.handleResume();
      await this.midiPlayer.handleStop();
      await resuming;
    } else if (this.midy.isPlaying) {
      await this.midiPlayer.handleStop();
    }
  }

  async play(row) {
    const generation = ++this.generation;

    await this.forceStop();
    if (generation !== this.generation) return;

    this.currentRow = row;
    this.library.setActiveRow(row);

    const url = `${this.midiDB}/${row.file}`;
    let uint8Array;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      uint8Array = new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      console.error(`Failed to load ${url}:`, error);
      if (generation === this.generation) {
        this.currentRow = null;
        this.library.setActiveRow(null);
      }
      return;
    }

    if (generation !== this.generation) return;
    await this.midiPlayer.loadMIDI(uint8Array);
    if (generation !== this.generation) return;

    this.library.setPlayState("playing");
    await this.midiPlayer.handlePlay();
  }
}

async function getSampleSoundFontList() {
  const root = document.getElementById("sampleSoundFont");
  const response = await fetch("https://soundfonts.pages.dev/list.json");
  const list = await response.json();
  let html = "";
  for (let i = 0; i < list.length; i++) {
    const soundFont = list[i];
    const checked = (soundFont.name === "GeneralUser_GS_v1.471")
      ? "checked"
      : "";
    const license = (soundFont.license.startsWith("http"))
      ? `<a href="${soundFont.license}">custom</a>`
      : soundFont.license;
    html += `
<div class="form-check">
  <label class="form-check-label">
    <input class="form-check-input" type="radio" name="sampleSoundFont" value="${soundFont.name}" ${checked}>
    ${soundFont.name} (${license})
  </label>
</div>
    `;
  }
  root.innerHTML = html;
}

function setFilterInstrumentsEvents(library) {
  const radios = document.getElementById("filterInstruments")
    .querySelectorAll("input[type='radio']");
  let checkedRadio = null;
  radios.forEach((radio, i) => {
    radio.addEventListener("click", () => {
      if (radio === checkedRadio) {
        radio.checked = false;
        checkedRadio = null;
        library.filterByInstrumentNumbers([]);
      } else {
        checkedRadio = radio;
        library.filterByInstrumentNumbers(library.instrumentGroups[i].numbers);
      }
    });
  });
}

const configuration = {
  reverbAlgorithm: "Schroeder",
  reverbType: 4,
  chorusType: 1,
};
const midiDB = "https://midi-db.pages.dev";

const library = new FreeMidiLibrary({
  table: "table",
  pagination: "pagination",
  columns: "columns",
  collections: "collections",
  midiDB,
});

await getSampleSoundFontList();

const audioContext = new AudioContext();
if (audioContext.state === "running") await audioContext.suspend();
const midy = new Midy(audioContext);
midy.cacheMode = "chunk";
midy.startDelay = 0.5;

const midiPlayer = new MIDIPlayer(midy);
midiPlayer.defaultLayout();
midiPlayer.applyTheme(getGlobalCSS(), {
  "midi-player-btn": "btn bg-light-subtle p-1",
  "midi-player-text": "p-1",
  "midi-player-range": "form-range",
});
document.getElementById("midi-player").appendChild(midiPlayer.root);
await midy.loadSoundFont(`${midiPlayer.soundFontURL}/000.sf3`);

const playbackController = new PlaybackController(
  midy,
  midiPlayer,
  midiDB,
  library,
);
library.onSelect = (row) => playbackController.play(row);

await library.load();

setFilterInstrumentsEvents(library);
setConfigurationEvents();
setSoundFontLibraryEvents();

new Modal(document.getElementById("soundfontModal"));

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("lang").onchange = changeLang;
