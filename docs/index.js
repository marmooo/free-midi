function loadConfig(){localStorage.getItem("darkMode")==1&&document.documentElement.setAttribute("data-bs-theme","dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),document.documentElement.setAttribute("data-bs-theme","light")):(localStorage.setItem("darkMode",1),document.documentElement.setAttribute("data-bs-theme","dark"))}function changeLang(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value;location.href=`/free-midi/${b}/`}class SoundFontPlayer{constructor(a){this.context=new AudioContext,this.state="stopped",this.noCallback=!1,this.stopCallback=a,this.prevGain=.5,this.cacheUrls=new Array(128),this.totalTicks=0}async loadSoundFontDir(a,b){const c=a.map(a=>{const d=a.toString().padStart(3,"0"),c=`${b}/${d}.sf3`;return this.cacheUrls[a]==c||(this.cacheUrls[a]=c,this.fetchBuffer(c))}),d=await Promise.all(c);for(const a of d)a instanceof ArrayBuffer&&await this.loadSoundFontBuffer(a)}async fetchBuffer(b){const a=await fetch(b);return a.status==200?await a.arrayBuffer():void 0}async loadSoundFontUrl(a){const b=await this.fetchBuffer(a),c=await this.loadSoundFontBuffer(b);return c}async loadSoundFontBuffer(a){if(!this.synth){await JSSynthPromise,await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js"),await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.worklet.min.js"),this.synth=new JSSynth.AudioWorkletNodeSynthesizer,this.synth.init(this.context.sampleRate);const a=this.synth.createAudioNode(this.context);a.connect(this.context.destination)}const b=await this.synth.loadSFont(a);return b}async loadNoteSequence(a){await this.synth.resetPlayer(),this.ns=a;const b=core.sequenceProtoToMidi(a);return this.totalTicks=this.calcTick(a.totalTime),this.synth.addSMFDataToPlayer(b)}resumeContext(){this.context.resume()}async restart(a){this.state="started",await this.synth.playPlayer(),a&&this.seekTo(a),await this.synth.waitForPlayerStopped(),await this.synth.waitForVoicesStopped(),this.state="paused",this.noCallback?this.noCallback=!1:(player.seekTo(0),this.stopCallback())}async start(a,c,b){a&&await this.loadNoteSequence(a),b&&this.seekTo(b),this.restart()}stop(a){a&&(this.noCallback=!0),this.isPlaying()&&this.synth.stopPlayer()}pause(){this.state="paused",this.synth.stopPlayer()}resume(a){this.restart(a)}changeVolume(a){a=a/100,this.synth.setGain(a)}changeMute(a){a?(this.prevGain=this.synth.getGain(),this.synth.setGain(0)):this.synth.setGain(this.prevGain)}calcTick(d){let a=0,b=0,c=120;for(const f of this.ns.tempos){const e=f.time,g=f.qpm;if(e<d){const d=e-b;a+=c/60*d*this.ns.ticksPerQuarter}else{const e=d-b;return a+=c/60*e*this.ns.ticksPerQuarter,Math.round(a)}b=e,c=g}const e=d-b;return a+=c/60*e*this.ns.ticksPerQuarter,Math.floor(a)}seekTo(a){const b=this.calcTick(a);this.synth.seekPlayer(b)}isPlaying(){return!!this.synth&&this.synth.isPlaying()}getPlayState(){return this.synth?this.synth.isPlaying()?"started":this.state:"stopped"}}function stopCallback(){clearInterval(timer),currentTime=0,initSeekbar(ns,0),playNext()}function initPlayer(){player=new SoundFontPlayer(stopCallback)}function getPrograms(b){const a=new Set;return b.notes.forEach(b=>a.add(b.program)),b.notes.some(a=>a.isDrum)&&a.add(128),[...a]}async function loadSoundFont(b,a){if(!a){const b=document.getElementById("soundfonts"),c=b.selectedIndex;if(c==0)return;a=b.options[c].value}const c=`https://soundfonts.pages.dev/${a}`,d=getPrograms(ns);await b.loadSoundFontDir(d,c),await b.loadNoteSequence(ns)}function setTimer(a){const b=100,c=Date.now()-a*1e3,d=ns.totalTime;clearInterval(timer),timer=setInterval(()=>{const a=(Date.now()-c)/1e3;Math.floor(currentTime)!=Math.floor(a)&&updateSeekbar(a),currentTime=a,currentTime>=d&&clearInterval(timer)},b)}function setLoadingTimer(a){const b=setInterval(()=>{player.isPlaying()&&(clearInterval(b),player.seekTo(a),setTimer(a),enableController())},10)}function disableController(){controllerDisabled=!0;const a=document.getElementById("controller").querySelectorAll("button, input");[...a].forEach(a=>{a.disabled=!0})}function enableController(){controllerDisabled=!1;const a=document.getElementById("controller").querySelectorAll("button, input");[...a].forEach(a=>{a.disabled=!1})}function speedDown(){player.isPlaying()&&disableController();const a=document.getElementById("speed"),b=parseInt(a.value)-10,c=b<0?1:b;a.value=c,changeSpeed(c)}function speedUp(){player.isPlaying()&&disableController();const a=document.getElementById("speed"),b=parseInt(a.value)+10;a.value=b,changeSpeed(b)}async function changeSpeed(b){if(!ns)return;const c=player.getPlayState();player.stop(!0),clearInterval(timer);const d=nsCache.totalTime/ns.totalTime,e=d/(b/100),a=currentTime*e;setSpeed(ns,b),initSeekbar(ns,a),c=="started"?(setLoadingTimer(a),player.start(ns)):player instanceof SoundFontPlayer&&(await player.loadNoteSequence(ns),player.seekTo(a))}function changeSpeedEvent(a){player.isPlaying()&&disableController();const b=parseInt(a.target.value);changeSpeed(b)}function setSpeed(b,a){a<=0&&(a=1),a/=100;const e=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=e[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const f=nsCache.timeSignatures;b.timeSignatures.forEach((b,c)=>{b.time=f[c].time/a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=0,player.changeMute(!0)):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.changeMute(!1))}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.changeVolume(b)}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(a){clearInterval(timer),currentTime=parseInt(a.target.value),document.getElementById("currentTime").textContent=formatTime(currentTime),player.getPlayState()=="started"&&(player.seekTo(currentTime),setTimer(currentTime))}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),document.getElementById("currentTime").textContent=formatTime(b)}async function loadMIDI(b){const a=.2;ns=await core.urlToNoteSequence(b),ns.totalTime+=a,ns.notes.forEach(b=>{b.startTime+=a,b.endTime+=a}),ns.controlChanges.forEach(b=>{b.time+=a}),ns.tempos.slice(1).forEach(b=>{b.time+=a}),ns.timeSignatures.slice(1).forEach(b=>{b.time+=a}),nsCache=core.sequences.clone(ns),ns.controlChanges.forEach(a=>a.p=a.program),ns.notes.map(a=>{a.p=a.program})}async function loadSoundFontFileEvent(a){if(player){document.getElementById("soundfonts").options[0].selected=!0;const b=a.target.files[0],c=await b.arrayBuffer();await player.loadSoundFontBuffer(c)}}async function loadSoundFontUrlEvent(a){if(player){document.getElementById("soundfonts").options[0].selected=!0;const b=await fetch(a.target.value),c=await b.arrayBuffer();await player.loadSoundFontBuffer(c)}}function unlockAudio(){if(!player)return;if(!player.synth)return;player.resumeContext(),document.removeEventListener("click",unlockAudio)}async function playMIDI(a){disableController(),clearInterval(timer),setNoteInstruments(ns),player instanceof SoundFontPlayer&&await loadSoundFont(player);const b=parseInt(document.getElementById("speed").value);setSpeed(ns,b);const c=parseInt(document.getElementById("volumebar").value);player.changeVolume(c),setLoadingTimer(a),player.start(ns),initSeekbar(ns,a),enableController()}function playNext(){const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),c=b.parentNode.parentNode.parentNode,e=[...a.children].indexOf(c);b.className="bi bi-play-fill";const d=$table.bootstrapTable("getData",{useCurrentPage:!0});if((e+1)%d.length==0){const a=$table.bootstrapTable("getData");if(a.at(-1)==d.at(-1)){{const a=document.getElementById("repeat"),b=a.classList.contains("active");if(b){$table.bootstrapTable("selectPage",1);const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}}else{$table.bootstrapTable("nextPage");const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}else{const a=c.nextElementSibling.querySelector(".bi-play-fill");a&&a.click()}}function setNoteInstruments(a){const b=document.getElementById("instruments").selectedIndex-1;b>0?(a.controlChanges.forEach(a=>a.program=b),a.notes.forEach(a=>a.program=b)):(a.controlChanges.forEach(a=>a.program=a.p),a.notes.forEach(a=>a.program=a.p))}function loadSoundFontList(){return fetch("https://soundfonts.pages.dev/list.json").then(a=>a.json()).then(a=>{const b=document.getElementById("soundfonts");a.forEach(c=>{const a=document.createElement("option");a.textContent=c.name,c.name=="GeneralUser_GS_v1.471"&&(a.selected=!0),b.appendChild(a)})})}function loadInstrumentList(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value,c=document.getElementById("instruments");return fetch(`/free-midi/${b}/instruments.lst`).then(a=>a.text()).then(b=>{const a=[];return b.trimEnd().split("\n").forEach(b=>{const d=document.createElement("option");d.textContent=b,c.appendChild(d),a.push(b)}),a})}async function changeConfig(){switch(player.getPlayState()){case"started":{player.stop(!0),setNoteInstruments(ns),player instanceof SoundFontPlayer&&await loadSoundFont(player);const b=parseInt(document.getElementById("speed").value);setSpeed(ns,b);const a=parseInt(document.getElementById("seekbar").value);initSeekbar(ns,a),setLoadingTimer(a),player.start(ns);break}case"paused":configChanged=!0;break}}function addFilterControl(){const a=document.querySelectorAll("#midiList > thead > tr > th");[...a].slice(2).forEach(b=>{const c=b.dataset.field,e=b.querySelector("div.fht-cell"),a=document.createElement("input");a.type="search",a.className="form-control";const d=getFilterPlaceholder(c);d&&(a.placeholder=d),a.onchange=()=>{filterTable(c,a.value)},e.replaceChildren(a)})}function getFilterPlaceholder(a){switch(a){case"born":return">1850";case"died":return"<1920";case"difficulty":return"<50";case"bpm":return"<120";case"time":return">30(sec)"}}function getFilterFunction(a){switch(a){case"born":case"died":case"difficulty":case"bpm":return filterByRange;case"time":return filterByTime;default:return filterByPartialMatch}}function filterTable(a,b){filterTexts.set(a,b),$table.bootstrapTable("filterBy",{},{filterAlgorithm:b=>{let a=!0;for(const[c,d]of filterTexts.entries()){if(d=="")continue;const e=getFilterFunction(c),f=e(d,b[c]);if(!f){a=!1;break}}return a}})}function filterByPartialMatch(b,a){return!!a&&a.toLowerCase().includes(b.toLowerCase())}function filterByRange(a,b){switch(a[0]){case">":return a.length==1||(parseInt(b)>parseInt(a.slice(1)));case"<":return a.length==1||(parseInt(b)<parseInt(a.slice(1)));default:return b==a}}function filterByTime(a,b){const[d,e]=b.split(":"),c=parseInt(d)*60+parseInt(e);switch(a[0]){case">":return a.length==1||(c>parseInt(a.slice(1)));case"<":return a.length==1||(c<parseInt(a.slice(1)));default:return b==a}}function toString(a){return a||""}function toLink(a,b){return a?`<a href="${a}">${b}</a>`:b}function toWeb(b){const c=b.split("/")[0],a=collections.get(c),d=a.web,e=a.name;return`<a href="${d}">${e}</a>`}function toLicense(a,b){if(!a){const c=b.split("/")[0],d=collections.get(c);a=d.license}try{return new URL(a),toLink(a,"Custom")}catch{return a}}function toDownload(a,b,c){if(c!=void 0)switch(b){case"ja":return"HP からダウンロードしてください。";case"en":return"Please download from the homepage."}else return toLink(a,"MIDI")}function toURLSearchParams(a){const c=`${midiDB}/${a.file}`,b=new URLSearchParams;b.set("url",c),a.title&&b.set("title",a.title),a.composer&&b.set("composer",a.composer),a.maintainer&&b.set("maintainer",a.maintainer),a.web&&b.set("web",a.web);try{new URL(a.license)}catch{b.set("license",a.license)}return b}function _detailFormatterEn(k,a){const e=`${midiDB}/${a.file}`,f=toURLSearchParams(a),b=f.toString(),g=toLicense(a.license,a.file),d=toWeb(a.file),h=a.file.split("/")[0],i=collections.get(h).redistribution,j=toDownload(e,"en",i);let c="";return a.instruments.split(", ").forEach(a=>{c+=`<li>${a}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>Score</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${b}">
          <img class="favicon" alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${b}">
          <img class="favicon" alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${b}">
          <img class="favicon" alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${b}">
          <img class="favicon" alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${b}">
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
      <tr><th>Title</th><td>${toString(a.title)}</td></tr>
      <tr><th>Composer</th><td>${toString(a.composer)}</td></tr>
      <tr><th>Opus</th><td>${toString(a.opus)}</td></tr>
      <tr><th>Lyricist</th><td>${toString(a.lyricist)}</td></tr>
      <tr><th>Date</th><td>${toString(a.date)}</td></tr>
      <tr><th>Style</th><td>${toString(a.style)}</td></tr>
      <tr><th>Arranger</th><td>${toString(a.arranger)}</td></tr>
      <tr><th>Source</th><td>${toString(a.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>File Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>License</th><td>${toString(g)}</td></tr>
      <tr><th>Download</th><td>${j}</td></tr>
      <tr><th>Maintainer</th><td>${toString(a.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(a.email)}</td></tr>
      <tr><th>Web</th><td>${toString(d)}</td></tr>
    </table>
  </div>
  <div>
    <h5>Annotation Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Time</th><td>${a.time}</td></tr>
      <tr><th>Difficulty</th><td>${a.difficulty}</td></tr>
      <tr><th>BPM</th><td>${a.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${c}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _detailFormatterJa(k,a){const e=`${midiDB}/${a.file}`,f=toURLSearchParams(a),b=f.toString(),g=toLicense(a.license,a.file),d=toWeb(a.file),h=a.file.split("/")[0],i=collections.get(h).redistribution,j=toDownload(e,"ja",i);let c="";return a.instruments.split(", ").forEach(a=>{c+=`<li>${a}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>楽譜</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/midi2abc/?${b}">
          <img class="favicon" alt="midi2abc" src="https://marmooo.github.io/midi2abc/favicon/favicon.svg" width="16" height="16">
          midi2abc
        </a></td>
      </tr>
      <tr><th>Waterfall</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/waterfall-piano/?${b}">
          <img class="favicon" alt="Waterfall Piano" src="https://marmooo.github.io/waterfall-piano/favicon/favicon.svg" width="16" height="16">
          Waterfall Piano
        </a></td>
      </tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Modern</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-rhythm/?${b}">
          <img class="favicon" alt="Tip Tap Rhythm" src="https://marmooo.github.io/tip-tap-rhythm/favicon/favicon.svg" width="16" height="16">
          Tip Tap Rhythm
        </a></td>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/tip-tap-notes/?${b}">
          <img class="favicon" alt="Tip Tap Notes" src="https://marmooo.github.io/tip-tap-notes/favicon/favicon.svg" width="16" height="16">
          Tip Tap Notes
        </td></a>
      </tr>
      <tr><th>Classic</th>
        <td><a target="_blank" rel="noopener" href="https://marmooo.github.io/doremi-piano/?${b}">
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
      <tr><th>タイトル</th><td>${toString(a.title)}</td></tr>
      <tr><th>作曲者</th><td>${toString(a.composer)}</td></tr>
      <tr><th>作品</th><td>${toString(a.opus)}</td></tr>
      <tr><th>作詞者</th><td>${toString(a.lyricist)}</td></tr>
      <tr><th>日付</th><td>${toString(a.date)}</td></tr>
      <tr><th>スタイル</th><td>${toString(a.style)}</td></tr>
      <tr><th>編曲者</th><td>${toString(a.arranger)}</td></tr>
      <tr><th>ソース</th><td>${toString(a.source)}</td></tr>
    </table>
  </div>
  <div>
    <h5>ファイル情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>ライセンス</th><td>${toString(g)}</td></tr>
      <tr><th>ダウンロード</th><td>${j}</td></tr>
      <tr><th>保守者</th><td>${toString(a.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(a.email)}</td></tr>
      <tr><th>Web</th><td>${toString(d)}</td></tr>
    </table>
  </div>
  <div>
    <h5>注釈情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>時間</th><td>${a.time}</td></tr>
      <tr><th>難易度</th><td>${a.difficulty}</td></tr>
      <tr><th>BPM</th><td>${a.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${c}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _toolFormatterEn(a,b,c){return`
<button title="play" class="btn p-0" type="button"><i class="bi bi-play-fill"></i></button>
  `}function _toolFormatterJa(a,b,c){return`
<button title="再生" class="btn p-0" type="button"><i class="bi bi-play-fill"></i></button>
  `}function play(a,b){if(!a){const c=$table.bootstrapTable("getData",{useCurrentPage:!0});a=document.querySelector("#midiList td:nth-child(2) i"),b=c[0]}const c=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");[...c].forEach(a=>{a.className="bi bi-play-fill"}),player.isPlaying()&&player.stop(),a.className="bi bi-pause-fill";const d=`${midiDB}/${b.file}`;loadMIDI(d).then(()=>{playMIDI(0)})}function replay(a){if(!a){const b="#midiList td:nth-child(2) i[class='bi bi-play']";a=document.querySelector(b)}if(a.className="bi bi-pause-fill",configChanged){player.stop(!0);const a=parseInt(document.getElementById("seekbar").value),b=document.getElementById("speed"),c=b.value/100;playMIDI(a/c),configChanged=!1}else player.resume(currentTime),setTimer(currentTime)}function pause(a){if(!a){const b="#midiList td:nth-child(2) i[class='bi bi-pause-fill']";a=document.querySelector(b)}a.className="bi bi-play",player.pause(),clearInterval(timer)}window.toolEvents={"click .bi-play-fill":function(a,c,b,d){switch(a.target.className){case"bi bi-play-fill":return play(a.target,b);case"bi bi-play":return replay(a.target);case"bi bi-pause-fill":return pause(a.target)}}};function getInstrumentsString(a,b){const c=b.instruments.split(",").map(a=>parseInt(a));return c.map(b=>a[b]).join(", ")}function typeEvent(a){if(!player)return;if(controllerDisabled)return;switch(player.resumeContext(),a.code){case"Space":switch(a.preventDefault(),player.getPlayState()){case"paused":return replay();case"started":return pause();case"stopped":return play()}break}}function initFilterTexts(){const a=new Map,b=document.querySelectorAll("#midiList > thead > tr > th");return[...b].slice(1).forEach(b=>{const c=b.dataset.field;a.set(c,"")}),a}async function fetchCollections(){const a=await fetch(`${midiDB}/collections.json`);return await a.json()}function shuffle(a){for(let b=a.length;1<b;b--){const c=Math.floor(Math.random()*b);[a[c],a[b-1]]=[a[b-1],a[c]]}return a}function complementTable(a,e){const b=a.country,c=a.composer,d=a.maintainer,f=a.web,g=a.license;e.forEach(a=>{!a.country&&b&&(a.country=b),!a.composer&&c&&(a.composer=c),!a.maintainer&&d&&(a.maintainer=d),a.web||(a.web=f),a.license||(a.license=g)})}async function fetchPlayList(d){const a=Array.from(d.values());shuffle(a);const c=document.documentElement.lang,e=await fetch(`${midiDB}/json/${a[0].id}/${c}.json`),b=await e.json();complementTable(a[0],b),$table.bootstrapTable("load",b),addFilterControl(),instrumentListPromise.then(a=>{b.forEach(b=>{b.instruments=getInstrumentsString(a,b)})});const f=a.slice(1).map(async a=>{const b=await fetch(`${midiDB}/json/${a.id}/${c}.json`);return b.json()});Promise.all(f).then(c=>{c.forEach((b,c)=>{complementTable(a[c+1],b),$table.bootstrapTable("append",b),addFilterControl(),instrumentListPromise.then(a=>{b.forEach(b=>{b.instruments=getInstrumentsString(a,b)})})});const b=document.querySelector(".buttons-toolbar");[...b.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",addFilterControl)});const d=b.children[1].querySelector("button");d.addEventListener("click",()=>{$table.bootstrapTable("filterBy",{},{filterAlgorithm:()=>!0}),filteredInstrumentNode.classList.remove("checked"),filteredCollectionNode.classList.remove("checked")})})}function addCollectionSelector(){const a=document.getElementById("collections");collections.forEach(c=>{const b=document.createElement("button");c.status=="CLOSED"?b.className="btn btn-sm btn-outline-secondary m-1":b.className="btn btn-sm btn-outline-primary m-1",b.type="button",b.textContent=c.name,b.onclick=()=>{let a=c.id;filteredCollectionNode==b?(b.classList.remove("checked"),a=""):(b.classList.add("checked"),filteredCollectionNode&&filteredCollectionNode.classList.remove("checked"));const d=document.getElementById("midiList").querySelector("thead > tr > th[data-field='file'] input");d&&(d.value=a),filterTable("file",a),filteredCollectionNode=b},a.appendChild(b)})}function loadLibraries(a){const b=a.map(a=>new Promise((c,d)=>{const b=document.createElement("script");b.src=a,b.async=!0,b.onload=c,b.onerror=d,document.body.appendChild(b)}));return Promise.all(b)}function setFilterInstrumentsButtons(){const b=document.documentElement.lang,c=b=="en"?["Piano","Accordion","Violin","Guitar","Trumpet","Sax"]:["ピアノ","アコーディオン","ヴァイオリン","ギター","トランペット","サックス"],a=document.getElementById("midiList").querySelector("thead > tr > th[data-field='instruments'] input"),d=document.getElementById("filterInstruments").getElementsByTagName("button");[...d].forEach((b,d)=>{b.onclick=()=>{let e=c[d];filteredInstrumentNode==b?(b.classList.remove("checked"),e=""):(b.classList.add("checked"),filteredInstrumentNode&&filteredInstrumentNode.classList.remove("checked")),a&&(a.value=e),filterTable("instruments",e),filteredInstrumentNode=b}})}loadConfig();const midiDB="https://midi-db.pages.dev",$table=$("#midiList"),filterTexts=initFilterTexts(),collections=new Map;let controllerDisabled,currentTime=0,ns,nsCache,configChanged=!1,timer,player,filteredInstrumentNode,filteredCollectionNode;setFilterInstrumentsButtons();const instrumentListPromise=loadInstrumentList();fetchCollections().then(a=>{a.forEach(a=>{collections.set(a.id,a)}),addCollectionSelector(),fetchPlayList(a)}),loadSoundFontList(),Module={},loadLibraries(["https://cdn.jsdelivr.net/combine/npm/tone@14.7.77,npm/@magenta/music@1.23.1/es6/core.js"]).then(()=>{initPlayer()});const JSSynthPromise=loadLibraries(["https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.min.js","https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js"]);document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("lang").onchange=changeLang,document.getElementById("speed").onchange=changeSpeedEvent,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("instruments").onchange=changeConfig,document.getElementById("soundfonts").onchange=changeConfig,document.getElementById("inputSoundFontFile").onchange=loadSoundFontFileEvent,document.getElementById("inputSoundFontUrl").onchange=loadSoundFontUrlEvent,document.addEventListener("keydown",typeEvent),document.addEventListener("click",unlockAudio)