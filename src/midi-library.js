import {
  defaultColumnSelector,
  defaultPagination,
  Resizable,
  Sortable,
  Table,
} from "https://cdn.jsdelivr.net/npm/@marmooo/table@0.0.1/+esm";

const DEFAULT_MIDI_DB = "https://midi-db.pages.dev";
const DEFAULT_INSTRUMENT_GROUPS = [
  { label: "Piano", numbers: [0, 1, 2, 3, 4, 5] },
  { label: "Accordion", numbers: [21, 23] },
  { label: "Violin", numbers: [40] },
  { label: "Guitar", numbers: [24, 25, 26, 27, 28, 29, 30, 31] },
  { label: "Trumpet", numbers: [56, 59] },
  { label: "Sax", numbers: [64, 65, 66, 67] },
];
const ICON_SELECT =
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_PLAYING =
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`;
const ICON_PAUSED =
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`;

function resolveElement(target) {
  if (!target) return null;
  return typeof target === "string" ? document.getElementById(target) : target;
}

function shuffle(array) {
  for (let i = array.length; 1 < i; i--) {
    const k = Math.floor(Math.random() * i);
    [array[k], array[i - 1]] = [array[i - 1], array[k]];
  }
  return array;
}

function toLink(url, text) {
  if (!url) return text;
  return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
}

function parseInstrumentNumbers(raw) {
  if (raw == null || raw === "") return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(/[,\s]+/);
  return parts.map((part) => Number(part)).filter((n) => Number.isInteger(n));
}

export class MidiLibrary {
  /**
   * @param {object} options
   * @param {string|HTMLElement} options.table - Container to render the table itself (required)
   * @param {string|HTMLElement} [options.pagination] - Container to render pagination
   * @param {string|HTMLElement} [options.columns] - Container to render the column selection UI
   * @param {string|HTMLElement} [options.collections] - Container for collection filter buttons
   * @param {string|HTMLElement} [options.instruments] - Container for instrument filter buttons
   * @param {string} [options.midiDB] - Base URL for the MIDI list database
   * @param {string} [options.lang] - Language for song titles, etc. (e.g., "ja", "en")
   * @param {number} [options.pageSize]
   * @param {Array}  [options.instrumentGroups] - Override definitions for instrument filter buttons
   * @param {(row: object) => (void|Promise<void>)} options.onSelect
   *        Called when the row selection button is clicked. `row` contains
   *        column data such as file, title, and composer.
   */
  constructor(options = {}) {
    if (!options.table) {
      throw new Error("MidiLibrary: options.table is required");
    }

    this.midiDB = options.midiDB ?? DEFAULT_MIDI_DB;
    this.lang = options.lang ?? document.documentElement.lang ?? "en";
    this.pageSize = options.pageSize ?? 10;
    this.instrumentGroups = options.instrumentGroups ??
      DEFAULT_INSTRUMENT_GROUPS;
    this.onSelect = options.onSelect ?? (() => {});

    this.tableContainer = resolveElement(options.table);
    this.paginationContainer = resolveElement(options.pagination);
    this.columnsContainer = resolveElement(options.columns);
    this.collectionsContainer = resolveElement(options.collections);
    this.instrumentsContainer = resolveElement(options.instruments);

    this.collections = new Map();
    this.fullData = null;
    this.table = null;
    this.activeRow = null;
    this.activeButton = null;
  }

  async load() {
    const data = await this.fetchCollections();
    data.forEach((datum) => this.collections.set(datum.id, datum));
    if (this.collectionsContainer) this.renderCollectionSelector();
    if (this.instrumentsContainer) this.renderInstrumentButtons();
    await this.fetchPlayList();
  }

  async fetchCollections() {
    const response = await fetch(`${this.midiDB}/collections.json`);
    return response.json();
  }

  complementTable(info, data) {
    const { country, composer, maintainer, web, license } = info;
    data.forEach((datum) => {
      if (!datum.country && country) datum.country = country;
      if (!datum.composer && composer) datum.composer = composer;
      if (!datum.maintainer && maintainer) datum.maintainer = maintainer;
      if (!datum.web) datum.web = web;
      if (!datum.license) datum.license = license;
    });
  }

  async fetchPlayList() {
    const infos = shuffle(Array.from(this.collections.values()));
    const first = await (await fetch(
      `${this.midiDB}/json/${infos[0].id}/${this.lang}.json`,
    )).json();
    this.complementTable(infos[0], first);
    this.setTable(first);

    const midiList = first;
    const rest = infos.slice(1).map(async (info) => {
      const data = await (await fetch(
        `${this.midiDB}/json/${info.id}/${this.lang}.json`,
      )).json();
      this.complementTable(info, data);
      return data;
    });
    Promise.all(rest).then((dataset) => {
      for (const data of dataset) midiList.push(...data);
      this.setTable(midiList);
    });
  }

  filterTable(columnId, keyword) {
    this.table?.setFilter(columnId, keyword);
  }

  filterByInstrumentNumbers(numbers) {
    if (!this.table || !this.fullData) return;
    if (numbers.length === 0) {
      this.table.setData(this.fullData);
      return;
    }
    const targetNumbers = new Set(numbers);
    const filtered = this.fullData.filter((row) => {
      const rowNumbers = parseInstrumentNumbers(row.instruments);
      return rowNumbers.some((n) => targetNumbers.has(n));
    });
    this.table.setData(filtered);
  }

  renderCollectionSelector() {
    const root = this.collectionsContainer;
    root.innerHTML = "";
    let checkedRadio = null;
    this.collections.forEach((collection) => {
      const id = `midiLibraryCollection-${collection.id}`;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "btn-check";
      radio.name = "midi-library-collection-filter";
      radio.id = id;
      radio.autocomplete = "off";

      const label = document.createElement("label");
      label.className = collection.status === "CLOSED"
        ? "btn btn-sm btn-outline-secondary m-1"
        : "btn btn-sm btn-outline-primary m-1";
      label.htmlFor = id;
      label.textContent = collection.name;

      radio.addEventListener("click", () => {
        if (radio === checkedRadio) {
          radio.checked = false;
          checkedRadio = null;
          this.filterTable("file", "");
        } else {
          checkedRadio = radio;
          this.filterTable("file", collection.id);
        }
      });

      root.appendChild(radio);
      root.appendChild(label);
    });
  }

  renderInstrumentButtons() {
    const root = this.instrumentsContainer;
    root.innerHTML = "";
    let checkedRadio = null;
    this.instrumentGroups.forEach((group, i) => {
      const id = `midiLibraryInstrument-${i}`;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "btn-check";
      radio.name = "midi-library-instrument-filter";
      radio.id = id;
      radio.autocomplete = "off";

      const label = document.createElement("label");
      label.className = "btn btn-sm btn-outline-info m-1";
      label.htmlFor = id;
      label.textContent = group.label;

      radio.addEventListener("click", () => {
        if (radio === checkedRadio) {
          radio.checked = false;
          checkedRadio = null;
          this.filterByInstrumentNumbers([]);
        } else {
          checkedRadio = radio;
          this.filterByInstrumentNumbers(group.numbers);
        }
      });

      root.appendChild(radio);
      root.appendChild(label);
    });
  }

  renderToolbar(row, td) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm p-0 midi-library-select-button";
    button.innerHTML = ICON_SELECT;
    button.addEventListener("click", () => this.handleSelect(row, button));
    td.appendChild(button);
  }

  async handleSelect(row) {
    this.setActiveRow(row);
    await this.onSelect(row);
  }

  setActiveRow(row) {
    if (this.activeButton) {
      this.activeButton.innerHTML = ICON_SELECT;
      this.activeButton.closest("tr")?.classList.remove(
        "midi-library-row-active",
      );
    }
    this.activeRow = row;
    this.activeButton = row ? this.findButton(row) : null;
    this.activeButton?.closest("tr")?.classList.add("midi-library-row-active");
  }

  setPlayState(state) {
    const use = this.activeButton;
    if (!use) return;
    use.innerHTML = state === "playing"
      ? ICON_PLAYING
      : state === "paused"
      ? ICON_PAUSED
      : ICON_SELECT;
  }

  findButton(row) {
    if (!this.table) return null;
    const data = this.table.getDisplayData();
    const index = data.indexOf(row);
    if (index === -1) return null;
    const page = this.table.getPageForIndex(index);
    if (this.table.pagination && this.table.pagination.currentPage !== page) {
      this.table.pagination.goToPage(page);
    }
    const tr = this.table.getRowElement(index);
    return tr?.querySelector(".midi-library-select-button") ?? null;
  }

  getDisplayData() {
    return this.table?.getDisplayData() ?? [];
  }

  toLicense(text, filePath) {
    if (!text) {
      const id = filePath.split("/")[0];
      text = this.collections.get(id)?.license;
    }
    if (!text) return "";
    try {
      new URL(text);
      return toLink(text, "Custom");
    } catch {
      return text;
    }
  }

  toWeb(filePath) {
    const id = filePath.split("/")[0];
    const collection = this.collections.get(id);
    return toLink(collection?.web, collection?.name ?? filePath);
  }

  buildColumns() {
    return [
      {
        id: "_toolbar",
        name: "",
        visible: true,
        searchPlaceholder: false,
        renderHeader(th) {
          th.style.width = "32px";
        },
        render: (row, td) => this.renderToolbar(row, td),
      },
      {
        id: "composer",
        name: "Composer",
        visible: true,
        searchPlaceholder: "Search composer...",
      },
      { id: "born", name: "Born", visible: false, searchPlaceholder: "1950" },
      { id: "died", name: "Died", visible: false, searchPlaceholder: "1990" },
      { id: "date", name: "Date", visible: false, searchPlaceholder: "2020" },
      {
        id: "country",
        name: "Country",
        visible: false,
        searchPlaceholder: "Search country...",
      },
      {
        id: "title",
        name: "Title",
        visible: true,
        searchPlaceholder: "Search title...",
      },
      {
        id: "opus",
        name: "Opus",
        visible: false,
        searchPlaceholder: "Search opus...",
      },
      {
        id: "lyricist",
        name: "Lyricist",
        visible: false,
        searchPlaceholder: "Search lyricist...",
      },
      {
        id: "instruments",
        name: "Instruments",
        visible: false,
        searchPlaceholder: "Search instruments...",
      },
      {
        id: "style",
        name: "Style",
        visible: false,
        searchPlaceholder: "Search style...",
      },
      {
        id: "arranger",
        name: "Arranger",
        visible: false,
        searchPlaceholder: "Search arranger...",
      },
      {
        id: "source",
        name: "Source",
        visible: false,
        searchPlaceholder: "Search source...",
      },
      {
        id: "maintainer",
        name: "Maintainer",
        visible: false,
        searchPlaceholder: "Search maintainer...",
      },
      {
        id: "file",
        name: "ID",
        visible: false,
        searchPlaceholder: "Search ID...",
      },
      { id: "time", name: "Time", visible: true, searchPlaceholder: "00:00" },
      {
        id: "difficulty",
        name: "Difficulty",
        visible: false,
        searchPlaceholder: "50",
      },
      { id: "bpm", name: "BPM", visible: false, searchPlaceholder: "120" },
      {
        id: "license",
        name: "License",
        visible: true,
        searchPlaceholder: "Search license...",
        render: (row, td) => {
          td.innerHTML = this.toLicense(row.license, row.file);
        },
      },
      {
        id: "email",
        name: "Email",
        visible: false,
        searchPlaceholder: "Search e-mail...",
      },
      {
        id: "web",
        name: "Web",
        visible: true,
        searchPlaceholder: "Search web...",
        render: (row, td) => {
          td.innerHTML = this.toWeb(row.file);
        },
      },
    ];
  }

  setTable(data) {
    this.fullData = data;
    const columns = this.buildColumns();
    const table = new Table({
      data,
      columns,
      components: {
        columnSearch: { placeholder: "Search..." },
        columnSelector: this.columnsContainer
          ? { container: this.columnsContainer, render: defaultColumnSelector }
          : undefined,
        pagination: {
          pageSize: this.pageSize,
          maxPageButtons: 5,
          container: this.paginationContainer,
          render: defaultPagination,
        },
      },
    });
    const resizable = new Resizable(table);
    table.options.plugins = [
      resizable,
      new Sortable(table, { resizable }),
    ];
    table.render(this.tableContainer);
    this.table = table;
    if (this.activeRow) this.setActiveRow(this.activeRow);
  }

  destroy() {
    this.tableContainer.innerHTML = "";
    if (this.paginationContainer) this.paginationContainer.innerHTML = "";
    if (this.columnsContainer) this.columnsContainer.innerHTML = "";
    if (this.collectionsContainer) this.collectionsContainer.innerHTML = "";
    if (this.instrumentsContainer) this.instrumentsContainer.innerHTML = "";
    this.table = null;
    this.activeRow = null;
    this.activeButton = null;
  }
}
