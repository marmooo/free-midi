function loadConfig(){localStorage.getItem("darkMode")==1&&document.documentElement.setAttribute("data-bs-theme","dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),document.documentElement.setAttribute("data-bs-theme","light")):(localStorage.setItem("darkMode",1),document.documentElement.setAttribute("data-bs-theme","dark"))}function changeLang(){const e=document.getElementById("lang"),t=e.options[e.selectedIndex].value;location.href=`/free-midi/${t}/`}class SoundFontPlayer{constructor(e){this.context=new globalThis.AudioContext,this.state="stopped",this.noCallback=!1,this.stopCallback=e,this.prevGain=.5,this.cacheUrls=new Array(128),this.totalTicks=0}async loadSoundFontDir(e,t){const n=e.map(e=>{const s=e.toString().padStart(3,"0"),n=`${t}/${s}.sf3`;return this.cacheUrls[e]==n||(this.cacheUrls[e]=n,this.fetchBuffer(n))}),s=await Promise.all(n);for(const e of s)e instanceof ArrayBuffer&&await this.loadSoundFontBuffer(e)}async fetchBuffer(e){const t=await fetch(e);return t.status==200?await t.arrayBuffer():void 0}async loadSoundFontUrl(e){const t=await this.fetchBuffer(e),n=await this.loadSoundFontBuffer(t);return n}async loadSoundFontBuffer(e){if(!this.synth){await JSSynthPromise,await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js"),await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.worklet.min.js"),this.synth=new JSSynth.AudioWorkletNodeSynthesizer,this.synth.init(this.context.sampleRate);const e=this.synth.createAudioNode(this.context);e.connect(this.context.destination)}const t=await this.synth.loadSFont(e);return t}async loadNoteSequence(e){await this.synth.resetPlayer(),this.ns=e;const t=core.sequenceProtoToMidi(e);return this.totalTicks=this.calcTick(e.totalTime),this.synth.addSMFDataToPlayer(t)}resumeContext(){this.context.resume()}async restart(e){this.state="started",await this.synth.playPlayer(),e&&this.seekTo(e),await this.synth.waitForPlayerStopped(),await this.synth.waitForVoicesStopped(),this.state="paused",this.noCallback||(player.seekTo(0),this.stopCallback()),this.noCallback=!1}async start(e,t,n){e&&await this.loadNoteSequence(e),n&&this.seekTo(n),this.restart()}stop(e){e&&(this.noCallback=!0),this.synth&&this.synth.stopPlayer()}pause(){this.state="paused",this.noCallback=!0,this.synth.stopPlayer()}resume(e){this.restart(e)}changeVolume(e){e=e/100,this.synth.setGain(e)}changeMute(e){e?(this.prevGain=this.synth.getGain(),this.synth.setGain(0)):this.synth.setGain(this.prevGain)}calcTick(e){let t=0,n=0,s=120;for(const i of this.ns.tempos){const o=i.time,a=i.qpm;if(o<e){const e=o-n;t+=s/60*e*this.ns.ticksPerQuarter}else{const o=e-n;return t+=s/60*o*this.ns.ticksPerQuarter,Math.round(t)}n=o,s=a}const o=e-n;return t+=s/60*o*this.ns.ticksPerQuarter,Math.floor(t)}seekTo(e){const t=this.calcTick(e);this.synth.seekPlayer(t)}isPlaying(){return!!this.synth&&this.synth.isPlaying()}getPlayState(){return this.synth?this.synth.isPlaying()?"started":this.state:"stopped"}}function stopCallback(){clearInterval(timer),currentTime=0,initSeekbar(ns,0),playNext()}function initPlayer(){player=new SoundFontPlayer(stopCallback)}function getPrograms(e){const t=new Set;return e.notes.forEach(e=>t.add(e.program)),e.notes.some(e=>e.isDrum)&&t.add(128),[...t]}async function loadSoundFont(e,t){if(!t){const e=document.getElementById("soundfonts"),n=e.selectedIndex;if(n==0)return;t=e.options[n].value}const n=`https://soundfonts.pages.dev/${t}`,s=getPrograms(ns);await e.loadSoundFontDir(s,n),await e.loadNoteSequence(ns)}function setTimer(e){const t=100,n=Date.now()-e*1e3,s=ns.totalTime;clearInterval(timer),timer=setInterval(()=>{const e=(Date.now()-n)/1e3;Math.floor(currentTime)!=Math.floor(e)&&updateSeekbar(e),currentTime=e,currentTime>=s&&clearInterval(timer)},t)}function setLoadingTimer(e){const t=setInterval(()=>{player.isPlaying()&&(clearInterval(t),player.seekTo(e),setTimer(e),enableController())},10)}function disableController(){controllerDisabled=!0;const e=document.getElementById("controller").querySelectorAll("button, input");[...e].forEach(e=>{e.disabled=!0})}function enableController(){controllerDisabled=!1;const e=document.getElementById("controller").querySelectorAll("button, input");[...e].forEach(e=>{e.disabled=!1})}function speedDown(){player.isPlaying()&&disableController();const e=document.getElementById("speed"),t=parseInt(e.value)-10,n=t<0?1:t;e.value=n,changeSpeed(n)}function speedUp(){player.isPlaying()&&disableController();const e=document.getElementById("speed"),t=parseInt(e.value)+10;e.value=t,changeSpeed(t)}async function changeSpeed(e){if(!ns)return;const n=player.getPlayState();player.stop(!0),clearInterval(timer);const s=nsCache.totalTime/ns.totalTime,o=s/(e/100),t=currentTime*o;setSpeed(ns,e),initSeekbar(ns,t),n=="started"?(setLoadingTimer(t),player.start(ns)):player instanceof SoundFontPlayer&&(await player.loadNoteSequence(ns),player.seekTo(t))}function changeSpeedEvent(e){player.isPlaying()&&disableController();const t=parseInt(e.target.value);changeSpeed(t)}function setSpeed(e,t){t<=0&&(t=1),t/=100;const o=nsCache.controlChanges;e.controlChanges.forEach((e,n)=>{e.time=o[n].time/t});const n=nsCache.tempos;e.tempos.forEach((e,s)=>{e.time=n[s].time/t,e.qpm=n[s].qpm*t});const i=nsCache.timeSignatures;e.timeSignatures.forEach((e,n)=>{e.time=i[n].time/t});const s=nsCache.notes;e.notes.forEach((e,n)=>{e.startTime=s[n].startTime/t,e.endTime=s[n].endTime/t}),e.totalTime=nsCache.totalTime/t}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const t=document.getElementById("volumeOnOff").firstElementChild,e=document.getElementById("volumebar");t.classList.contains("bi-volume-up-fill")?(t.className="bi bi-volume-mute-fill",e.dataset.value=e.value,e.value=0,player.changeMute(!0)):(t.className="bi bi-volume-up-fill",e.value=e.dataset.value,player.changeMute(!1))}function changeVolumebar(){const e=document.getElementById("volumebar"),t=e.value;e.dataset.value=t,player.changeVolume(t)}function formatTime(e){e=Math.floor(e);const n=e%60,t=(e-n)/60,s=(e-n-60*t)/3600,o=String(n).padStart(2,"0"),i=t>9||!s?`${t}:`:`0${t}:`,a=s?`${s}:`:"";return`${a}${i}${o}`}function changeSeekbar(e){clearInterval(timer),currentTime=parseInt(e.target.value),document.getElementById("currentTime").textContent=formatTime(currentTime),player.getPlayState()=="started"&&(player.seekTo(currentTime),setTimer(currentTime))}function updateSeekbar(e){const t=document.getElementById("seekbar");t.value=e;const n=formatTime(e);document.getElementById("currentTime").textContent=n}function initSeekbar(e,t){document.getElementById("seekbar").max=e.totalTime,document.getElementById("seekbar").value=t,document.getElementById("totalTime").textContent=formatTime(e.totalTime),document.getElementById("currentTime").textContent=formatTime(t)}function convertGM(e){e.controlChanges=e.controlChanges.filter(e=>e.controlNumber==0||e.controlNumber==32)}async function loadMIDI(e){ns=await core.urlToNoteSequence(e),convertGM(ns);const t=.2;ns.totalTime+=t,ns.notes.forEach(e=>{e.startTime+=t,e.endTime+=t}),ns.controlChanges.forEach(e=>{e.time+=t}),ns.tempos.slice(1).forEach(e=>{e.time+=t}),ns.timeSignatures.slice(1).forEach(e=>{e.time+=t}),nsCache=core.sequences.clone(ns),ns.controlChanges.forEach(e=>e.p=e.program),ns.notes.map(e=>{e.p=e.program})}async function loadSoundFontFileEvent(e){if(player){document.getElementById("soundfonts").options[0].selected=!0;const t=e.target.files[0],n=await t.arrayBuffer();await player.loadSoundFontBuffer(n)}}async function loadSoundFontUrlEvent(e){if(player){document.getElementById("soundfonts").options[0].selected=!0;const t=await fetch(e.target.value),n=await t.arrayBuffer();await player.loadSoundFontBuffer(n)}}function unlockAudio(){if(!player)return;if(!player.synth)return;player.resumeContext(),document.removeEventListener("click",unlockAudio)}async function playMIDI(e){disableController(),clearInterval(timer),setNoteInstruments(ns),player instanceof SoundFontPlayer&&await loadSoundFont(player);const t=parseInt(document.getElementById("speed").value);setSpeed(ns,t);const n=parseInt(document.getElementById("volumebar").value);player.changeVolume(n),setLoadingTimer(e),player.start(ns),initSeekbar(ns,e),enableController()}function playNext(){const t=$table[0].querySelector("tbody"),n=t.querySelector(".bi-pause-fill"),s=n.parentNode.parentNode.parentNode,o=[...t.children].indexOf(s);n.className="bi bi-play-fill";const e=$table.bootstrapTable("getData",{useCurrentPage:!0});if(o+1==e.length){const t=$table.bootstrapTable("getData");if(t.at(-1)==e.at(-1)){{const e=document.getElementById("repeat"),t=e.classList.contains("active");if(t){$table.bootstrapTable("selectPage",1);const t=$table.bootstrapTable("getData",{useCurrentPage:!0}),n=$table[0].querySelector("tbody"),e=n.querySelector(".bi-play-fill");e&&play(e,t[0])}}}else{$table.bootstrapTable("nextPage");const t=$table.bootstrapTable("getData",{useCurrentPage:!0}),n=$table[0].querySelector("tbody"),e=n.querySelector(".bi-play-fill");e&&play(e,t[0])}}else{const t=s.nextElementSibling.querySelector(".bi-play-fill");t&&play(t,e[o+1])}}function setNoteInstruments(e){const t=document.getElementById("instruments").selectedIndex-1;t>0?(e.controlChanges.forEach(e=>e.program=t),e.notes.forEach(e=>e.program=t)):(e.controlChanges.forEach(e=>e.program=e.p),e.notes.forEach(e=>e.program=e.p))}function loadSoundFontList(){return fetch("https://soundfonts.pages.dev/list.json").then(e=>e.json()).then(e=>{const t=document.getElementById("soundfonts");e.forEach(e=>{const n=document.createElement("option");n.textContent=e.name,e.name=="GeneralUser_GS_v1.471"&&(n.selected=!0),t.appendChild(n)})})}function loadInstrumentList(){const e=document.getElementById("lang"),t=e.options[e.selectedIndex].value,n=document.getElementById("instruments");return fetch(`/free-midi/${t}/instruments.lst`).then(e=>e.text()).then(e=>{const t=[];return e.trimEnd().split(`
`).forEach(e=>{const s=document.createElement("option");s.textContent=e,n.appendChild(s),t.push(e)}),t})}async function changeConfig(){switch(player.getPlayState()){case"started":{player.stop(!0),setNoteInstruments(ns),player instanceof SoundFontPlayer&&await loadSoundFont(player);const t=parseInt(document.getElementById("speed").value);setSpeed(ns,t);const e=parseInt(document.getElementById("seekbar").value);initSeekbar(ns,e),setLoadingTimer(e),player.start(ns);break}case"paused":configChanged=!0;break}}function addFilterControl(){const e=document.querySelectorAll("#midiList > thead > tr > th");[...e].slice(2).forEach(e=>{const n=e.dataset.field,o=e.querySelector("div.fht-cell"),t=document.createElement("input");t.type="search",t.className="form-control";const s=getFilterPlaceholder(n);s&&(t.placeholder=s),t.onchange=()=>{filterTable(n,t.value)},o.replaceChildren(t)})}function getFilterPlaceholder(e){switch(e){case"born":return">1850";case"died":return"<1920";case"difficulty":return"<50";case"bpm":return"<120";case"time":return">30(sec)"}}function getFilterFunction(e){switch(e){case"born":case"died":case"difficulty":case"bpm":return filterByRange;case"time":return filterByTime;default:return filterByPartialMatch}}function filterTable(e,t){filterTexts.set(e,t),$table.bootstrapTable("filterBy",{},{filterAlgorithm:e=>{let t=!0;for(const[n,s]of filterTexts.entries()){if(s=="")continue;const o=getFilterFunction(n),i=o(s,e[n]);if(!i){t=!1;break}}return t}})}function filterByPartialMatch(e,t){return!!t&&t.toLowerCase().includes(e.toLowerCase())}function filterByRange(e,t){switch(e[0]){case">":return e.length==1||parseInt(t)>parseInt(e.slice(1));case"<":return e.length==1||parseInt(t)<parseInt(e.slice(1));default:return t==e}}function filterByTime(e,t){const[s,o]=t.split(":"),n=parseInt(s)*60+parseInt(o);switch(e[0]){case">":return e.length==1||n>parseInt(e.slice(1));case"<":return e.length==1||n<parseInt(e.slice(1));default:return t==e}}function toString(e){return e||""}function toLink(e,t){return e?`<a href="${e}">${t}</a>`:t}function toWeb(e){const n=e.split("/")[0],t=collections.get(n),s=t.web,o=t.name;return`<a href="${s}">${o}</a>`}function toLicense(e,t){if(!e){const n=t.split("/")[0],s=collections.get(n);e=s.license}try{return new URL(e),toLink(e,"Custom")}catch{return e}}function toDownload(e,t,n){if(n!=null)switch(t){case"ja":return"HP からダウンロードしてください。";case"en":return"Please download from the homepage."}else return toLink(e,"MIDI")}function toURLSearchParams(e){const n=`${midiDB}/${e.file}`,t=new URLSearchParams;t.set("url",n),e.title&&t.set("title",e.title),e.composer&&t.set("composer",e.composer),e.maintainer&&t.set("maintainer",e.maintainer),e.web&&t.set("web",e.web);try{new URL(e.license)}catch{t.set("license",e.license)}return t}function _detailFormatterEn(e,t){const o=`${midiDB}/${t.file}`,i=toURLSearchParams(t),n=i.toString(),a=toLicense(t.license,t.file),r=toWeb(t.file),c=t.file.split("/")[0],l=collections.get(c).redistribution,d=toDownload(o,"en",l);let s="";return t.instruments.split(", ").forEach(e=>{s+=`<li>${e}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>Score</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${n}">
          <img class="favicon" alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${n}">
          <img class="favicon" alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${n}">
          <img class="favicon" alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${n}">
          <img class="favicon" alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${n}">
          <img class="favicon" alt="Doremi Piano" src="https://marmooo.github.io/doremi-piano/favicon/favicon.svg" width="16" height="16">
          Doremi Piano
        </a></td>
      </tr>
      <tr><th>TODO</th><td>Coming soon.</td></tr>
    </table>
  </div>
  <div>
    <h5>Music Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Title</th><td>${toString(t.title)}</td></tr>
      <tr><th>Composer</th><td>${toString(t.composer)}</td></tr>
      <tr><th>Opus</th><td>${toString(t.opus)}</td></tr>
      <tr><th>Lyricist</th><td>${toString(t.lyricist)}</td></tr>
      <tr><th>Date</th><td>${toString(t.date)}</td></tr>
      <tr><th>Style</th><td>${toString(t.style)}</td></tr>
      <tr><th>Arranger</th><td>${toString(t.arranger)}</td></tr>
      <tr><th>Source</th><td>${toString(t.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>File Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>License</th><td>${toString(a)}</td></tr>
      <tr><th>Download</th><td>${d}</td></tr>
      <tr><th>Maintainer</th><td>${toString(t.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(t.email)}</td></tr>
      <tr><th>Web</th><td>${toString(r)}</td></tr>
    </table>
  </div>
  <div>
    <h5>Annotation Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Time</th><td>${t.time}</td></tr>
      <tr><th>Difficulty</th><td>${t.difficulty}</td></tr>
      <tr><th>BPM</th><td>${t.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${s}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _detailFormatterJa(e,t){const o=`${midiDB}/${t.file}`,i=toURLSearchParams(t),n=i.toString(),a=toLicense(t.license,t.file),r=toWeb(t.file),c=t.file.split("/")[0],l=collections.get(c).redistribution,d=toDownload(o,"ja",l);let s="";return t.instruments.split(", ").forEach(e=>{s+=`<li>${e}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>楽譜</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${n}">
          <img class="favicon" alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${n}">
          <img class="favicon" alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${n}">
          <img class="favicon" alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${n}">
          <img class="favicon" alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${n}">
          <img class="favicon" alt="Doremi Piano" src="https://marmooo.github.io/doremi-piano/favicon/favicon.svg" width="16" height="16">
          Doremi Piano
        </a></td>
      </tr>
      <tr><th>TODO</th><td>Coming soon.</td></tr>
    </table>
  </div>
  <div>
    <h5>音楽情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>タイトル</th><td>${toString(t.title)}</td></tr>
      <tr><th>作曲者</th><td>${toString(t.composer)}</td></tr>
      <tr><th>作品</th><td>${toString(t.opus)}</td></tr>
      <tr><th>作詞者</th><td>${toString(t.lyricist)}</td></tr>
      <tr><th>日付</th><td>${toString(t.date)}</td></tr>
      <tr><th>スタイル</th><td>${toString(t.style)}</td></tr>
      <tr><th>編曲者</th><td>${toString(t.arranger)}</td></tr>
      <tr><th>ソース</th><td>${toString(t.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>ファイル情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>ライセンス</th><td>${toString(a)}</td></tr>
      <tr><th>ダウンロード</th><td>${d}</td></tr>
      <tr><th>保守者</th><td>${toString(t.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(t.email)}</td></tr>
      <tr><th>Web</th><td>${toString(r)}</td></tr>
    </table>
  </div>
  <div>
    <h5>注釈情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>時間</th><td>${t.time}</td></tr>
      <tr><th>難易度</th><td>${t.difficulty}</td></tr>
      <tr><th>BPM</th><td>${t.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${s}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _toolFormatterEn(){return`
<button title="play" class="btn p-0" type="button"><i class="bi bi-play-fill"></i></button>
  `}function _toolFormatterJa(){return`
<button title="再生" class="btn p-0" type="button"><i class="bi bi-play-fill"></i></button>
  `}function play(e,t){if(!e){const n=$table.bootstrapTable("getData",{useCurrentPage:!0});e=document.querySelector("#midiList td:nth-child(2) i"),t=n[0]}const n=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");if([...n].forEach(e=>{e.className="bi bi-play-fill"}),!player)return;player.synth&&player.stop(!0),e.className="bi bi-pause-fill";const s=`${midiDB}/${t.file}`;loadMIDI(s).then(()=>{playMIDI(0)})}function replay(e){if(!e){const t="#midiList td:nth-child(2) i[class='bi bi-play']";e=document.querySelector(t)}if(e.className="bi bi-pause-fill",configChanged){player.stop(!0);const e=parseInt(document.getElementById("seekbar").value),t=document.getElementById("speed"),n=t.value/100;playMIDI(e/n),configChanged=!1}else player.resume(currentTime),setTimer(currentTime)}function pause(e){if(!e){const t="#midiList td:nth-child(2) i[class='bi bi-pause-fill']";e=document.querySelector(t)}e.className="bi bi-play",player.pause(),clearInterval(timer)}globalThis.toolEvents={"click .bi-play-fill":function(e,t,n){switch(e.target.className){case"bi bi-play-fill":return play(e.target,n);case"bi bi-play":return replay(e.target);case"bi bi-pause-fill":return pause(e.target)}}};function getInstrumentsString(e,t){const n=t.instruments.split(",").map(e=>parseInt(e));return n.map(t=>e[t]).join(", ")}function typeEvent(e){if(!player)return;if(controllerDisabled)return;switch(player.resumeContext(),e.code){case"Space":switch(e.preventDefault(),player.getPlayState()){case"paused":return replay();case"started":return pause();case"stopped":return play()}break}}function initFilterTexts(){const e=new Map,t=document.querySelectorAll("#midiList > thead > tr > th");return[...t].slice(1).forEach(t=>{const n=t.dataset.field;e.set(n,"")}),e}async function fetchCollections(){const e=await fetch(`${midiDB}/collections.json`);return await e.json()}function shuffle(e){for(let t=e.length;1<t;t--){const n=Math.floor(Math.random()*t);[e[n],e[t-1]]=[e[t-1],e[n]]}return e}function complementTable(e,t){const n=e.country,s=e.composer,o=e.maintainer,i=e.web,a=e.license;t.forEach(e=>{!e.country&&n&&(e.country=n),!e.composer&&s&&(e.composer=s),!e.maintainer&&o&&(e.maintainer=o),e.web||(e.web=i),e.license||(e.license=a)})}async function fetchPlayList(e){const t=Array.from(e.values());shuffle(t);const s=document.documentElement.lang,o=await fetch(`${midiDB}/json/${t[0].id}/${s}.json`),n=await o.json();complementTable(t[0],n),$table.bootstrapTable("load",n),addFilterControl(),instrumentListPromise.then(e=>{n.forEach(t=>{t.instruments=getInstrumentsString(e,t)})}),document.getElementById("midiList").style.height="auto";const i=t.slice(1).map(async e=>{const t=await fetch(`${midiDB}/json/${e.id}/${s}.json`);return t.json()});Promise.all(i).then(e=>{e.forEach((e,n)=>{complementTable(t[n+1],e),$table.bootstrapTable("append",e),addFilterControl(),instrumentListPromise.then(t=>{e.forEach(e=>{e.instruments=getInstrumentsString(t,e)})})});const n=document.querySelector(".buttons-toolbar");[...n.querySelectorAll("input")].forEach(e=>{e.addEventListener("change",addFilterControl)});const s=n.children[1].querySelector("button");s.addEventListener("click",()=>{$table.bootstrapTable("filterBy",{},{filterAlgorithm:()=>!0}),filteredInstrumentNode.classList.remove("checked"),filteredCollectionNode.classList.remove("checked")})})}function addCollectionSelector(){const e=document.getElementById("collections");collections.forEach(t=>{const n=document.createElement("button");t.status=="CLOSED"?n.className="btn btn-sm btn-outline-secondary m-1":n.className="btn btn-sm btn-outline-primary m-1",n.type="button",n.textContent=t.name,n.onclick=()=>{let e=t.id;filteredCollectionNode==n?(n.classList.remove("checked"),e=""):(n.classList.add("checked"),filteredCollectionNode&&filteredCollectionNode.classList.remove("checked"));const s=document.getElementById("midiList").querySelector("thead > tr > th[data-field='file'] input");s&&(s.value=e),filterTable("file",e),filteredCollectionNode=n},e.appendChild(n)})}function loadLibraries(e){const t=e.map(e=>new Promise((t,n)=>{const s=document.createElement("script");s.src=e,s.async=!0,s.onload=t,s.onerror=n,document.body.appendChild(s)}));return Promise.all(t)}function setFilterInstrumentsButtons(){const t=document.documentElement.lang,n=t=="en"?["Piano","Accordion","Violin","Guitar","Trumpet","Sax"]:["ピアノ","アコーディオン","ヴァイオリン","ギター","トランペット","サックス"],e=document.getElementById("midiList").querySelector("thead > tr > th[data-field='instruments'] input"),s=document.getElementById("filterInstruments").getElementsByTagName("button");[...s].forEach((t,s)=>{t.onclick=()=>{let o=n[s];filteredInstrumentNode==t?(t.classList.remove("checked"),o=""):(t.classList.add("checked"),filteredInstrumentNode&&filteredInstrumentNode.classList.remove("checked")),e&&(e.value=o),filterTable("instruments",o),filteredInstrumentNode=t}})}loadConfig();const midiDB="https://midi-db.pages.dev",$table=$("#midiList"),filterTexts=initFilterTexts(),collections=new Map;let controllerDisabled,currentTime=0,ns,nsCache,configChanged=!1,timer,player,filteredInstrumentNode,filteredCollectionNode;setFilterInstrumentsButtons();const instrumentListPromise=loadInstrumentList();fetchCollections().then(e=>{e.forEach(e=>{collections.set(e.id,e)}),addCollectionSelector(),fetchPlayList(e)}),loadSoundFontList(),Module={},loadLibraries(["https://cdn.jsdelivr.net/combine/npm/tone@14.7.77,npm/@magenta/music@1.23.1/es6/core.js"]).then(()=>{initPlayer()});const JSSynthPromise=loadLibraries(["https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.min.js","https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js"]);document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("lang").onchange=changeLang,document.getElementById("speed").onchange=changeSpeedEvent,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("instruments").onchange=changeConfig,document.getElementById("soundfonts").onchange=changeConfig,document.getElementById("inputSoundFontFile").onchange=loadSoundFontFileEvent,document.getElementById("inputSoundFontUrl").onchange=loadSoundFontUrlEvent,document.addEventListener("keydown",typeEvent),document.addEventListener("click",unlockAudio)