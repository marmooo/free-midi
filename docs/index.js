function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function changeLang(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value;location.href=`/free-midi/${b}/`}function unlockAudio(){player.resumeContext()}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10,c=b<0?0:b;a.value=c,document.getElementById("speedDown").disabled=!0,changeSpeed(c),document.getElementById("speedDown").disabled=!1}function speedUp(){const a=document.getElementById("speed"),b=parseInt(a.value)+10;a.value=b,document.getElementById("speedUp").disabled=!0,changeSpeed(b),document.getElementById("speedUp").disabled=!1}function changeSpeed(a){if(!ns)return;switch(player.getPlayState()){case"started":{player.stop(),clearInterval(timer);const c=nsCache.totalTime/ns.totalTime,d=c/(a/100),b=currentTime*d;setSpeed(ns,a),initSeekbar(ns,b),player.start(ns,void 0,b),setTimer(b);break}case"paused":{setSpeed(ns,a);const b=nsCache.totalTime/ns.totalTime,c=b/(a/100),d=currentTime*c;initSeekbar(ns,d);break}}}function changeSpeedEvent(a){const b=parseInt(a.target.value);changeSpeed(b)}function setSpeed(b,a){a/=100;const e=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=e[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function setNoteInstruments(a){const b=document.getElementById("instruments").selectedIndex-1;b>0?(a.controlChanges.forEach(a=>a.program=b),a.notes.forEach(a=>a.program=b)):(a.controlChanges.forEach(a=>a.program=a.p),a.notes.forEach(a=>a.program=a.p))}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(b){clearInterval(timer);const a=parseInt(b.target.value);document.getElementById("currentTime").textContent=formatTime(a),currentTime=a,player.isPlaying()&&(player.seekTo(a),player.getPlayState()=="started"&&setTimer(a))}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),document.getElementById("currentTime").textContent=formatTime(b)}function setTimer(a){const b=100,c=Date.now()-a*1e3,d=ns.totalTime;timer=setInterval(()=>{const a=(Date.now()-c)/1e3;Math.floor(currentTime)!=Math.floor(a)&&updateSeekbar(a),currentTime=a,currentTime>=d&&(clearInterval(timer),currentTime=0)},b)}async function loadMIDI(a){ns=await core.urlToNoteSequence(a),nsCache=core.sequences.clone(ns),ns.controlChanges.forEach(a=>a.p=a.program),ns.notes.map(a=>{a.p=a.program})}function playMIDI(a){clearInterval(timer),setNoteInstruments(ns);const b=parseInt(document.getElementById("speed").value);setSpeed(ns,b);const c=document.getElementById("volumebar").value;player.output.volume.value=c,player.start(ns,void 0,a),setTimer(a),initSeekbar(ns,a)}function playNext(){const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),c=b.parentNode.parentNode.parentNode,e=[...a.children].indexOf(c);b.className="bi bi-play-fill";const d=$table.bootstrapTable("getData",{useCurrentPage:!0});if((e+1)%d.length==0){const a=$table.bootstrapTable("getData");if(a.at(-1)==d.at(-1)){{const a=document.getElementById("repeat"),b=a.classList.contains("active");if(b){$table.bootstrapTable("selectPage",1);const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}}else{$table.bootstrapTable("nextPage");const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}else{const a=c.nextElementSibling.querySelector(".bi-play-fill");a&&a.click()}}function loadInstruments(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value,c=document.getElementById("instruments");return fetch(`/free-midi/${b}/instruments.lst`).then(a=>a.text()).then(b=>{const a=[];return b.trimEnd().split("\n").forEach(b=>{const d=document.createElement("option");d.textContent=b,c.appendChild(d),a.push(b)}),a})}function changeInstruments(){switch(player.getPlayState()){case"started":{player.stop(),setNoteInstruments(ns);const b=parseInt(document.getElementById("speed").value);setSpeed(ns,b);const a=parseInt(document.getElementById("seekbar").value);player.start(ns,void 0,a),initSeekbar(ns,a);break}case"paused":configChanged=!0;break}}function addFilterControl(){const a=document.querySelectorAll("#midiList > thead > tr > th");[...a].slice(2).forEach(c=>{const b=c.dataset.field,d=c.querySelector("div.fht-cell"),a=document.createElement("input");switch(a.value=filterStates.get(b),a.type="search",a.className="form-control",b){case"born":a.placeHolder=">1850",a.onchange=()=>{filterColumn(b,a.value,filterByRange)};break;case"died":a.placeHolder="<1920",a.onchange=()=>{filterColumn(b,a.value,filterByRange)};break;case"difficulty":a.placeHolder="<50",a.onchange=()=>{filterColumn(b,a.value,filterByRange)};break;case"bpm":a.placeHolder="<120",a.onchange=()=>{filterColumn(b,a.value,filterByRange)};break;case"time":a.placeHolder=">30(sec)",a.onchange=()=>{filterColumn(b,a.value,filterByTime)};break;default:a.onchange=()=>{filterColumn(b,a.value,filterByPartialMatch)};break}d.replaceChildren(a)})}function filterColumn(b,a,c){filterStates.set(b,a),a==""?($table.bootstrapTable("filterBy",{},{filterAlgorithm:()=>!0}),$table.bootstrapTable("resetView")):$table.bootstrapTable("filterBy",{},{filterAlgorithm:d=>c(a,d[b])})}function filterByPartialMatch(b,a){return!!a&&a.toLowerCase().includes(b.toLowerCase())}function filterByRange(a,b){switch(a[0]){case">":return a.length==1||(parseInt(b)>parseInt(a.slice(1)));case"<":return a.length==1||(parseInt(b)<parseInt(a.slice(1)));default:return b==a}}function filterByTime(a,b){const[d,e]=b.split(":"),c=parseInt(d)*60+parseInt(e);switch(a[0]){case">":return a.length==1||(c>parseInt(a.slice(1)));case"<":return a.length==1||(c<parseInt(a.slice(1)));default:return b==a}}function toString(a){return a||""}function toLink(a,b){return a?`<a href="${a}">${b}</a>`:b}function toLicense(a){try{return new URL(a),toLink(a,"Custom")}catch{return a}}function toDownload(a,b,c){if(a.startsWith("!"))switch(c){case"ja":return"HP からダウンロードしてください。";case"en":return"Please download from the homepage."}else return toLink(b,"MIDI")}function toURLSearchParams(a){const c=`${midiDB}/${a.file}`,b=new URLSearchParams;b.set("url",c),a.title&&b.set("title",a.title),a.composer&&b.set("composer",a.composer),a.maintainer&&b.set("maintainer",a.maintainer),a.web&&b.set("web",a.web);try{new URL(a.license)}catch{b.set("license",a.license)}return b}function _detailFormatterEn(i,a){const h=`${midiDB}/${a.file}`,e=toURLSearchParams(a),b=e.toString(),f=toLicense(a.license),d=toLink(a.web,a.web),g=toDownload(a.id,h,"en");let c="";return a.instruments.split(", ").forEach(a=>{c+=`<li>${a}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>Score</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?${b}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?${b}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Classic</th><td><a href="https://marmooo.github.io/tip-tap-notes/?${b}">Tip Tap Notes</a></td></tr>
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
      <tr><th>License</th><td>${toString(f)}</td></tr>
      <tr><th>Download</th><td>${g}</td></tr>
      <tr><th>ID</th><td>${toString(a.id)}</td></tr>
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
  `}function _detailFormatterJa(i,a){const h=`${midiDB}/${a.file}`,e=toURLSearchParams(a),b=e.toString(),f=toLicense(a.license),d=toLink(a.web,a.web),g=toDownload(a.id,h,"ja");let c="";return a.instruments.split(", ").forEach(a=>{c+=`<li>${a}</li>`}),`
<div class="d-flex overflow-scroll p-2">
  <div>
    <h5>楽譜</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?${b}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?${b}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Classic</th><td><a href="https://marmooo.github.io/tip-tap-notes/?${b}">Tip Tap Notes</a></td></tr>
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
      <tr><th>ライセンス</th><td>${toString(f)}</td></tr>
      <tr><th>ダウンロード</th><td>${g}</td></tr>
      <tr><th>id</th><td>${toString(a.id)}</td></tr>
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
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}function _toolFormatterJa(a,b,c){return`
<button title="再生" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}function play(a,b){if(!a){const c=$table.bootstrapTable("getData",{useCurrentPage:!0});a=document.querySelector("#midiList td:nth-child(2) i"),b=c[0]}const c=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");[...c].forEach(a=>{a.className="bi bi-play-fill"}),player.isPlaying()&&player.stop(),a.className="bi bi-pause-fill";const d=`${midiDB}/${b.file}`;loadMIDI(d).then(()=>{playMIDI(0)})}function replay(a){if(!a){const b="#midiList td:nth-child(2) i[class='bi bi-play']";a=document.querySelector(b)}if(a.className="bi bi-pause-fill",configChanged){player.stop();const a=parseInt(document.getElementById("seekbar").value),b=document.getElementById("speed"),c=b.value/100;playMIDI(a/c),configChanged=!1}else{player.resume();const a=parseInt(document.getElementById("seekbar").value);setTimer(a)}}function pause(a){if(!a){const b="#midiList td:nth-child(2) i[class='bi bi-pause-fill']";a=document.querySelector(b)}a.className="bi bi-play",player.pause(),clearInterval(timer)}window.toolEvents={"click .bi-play-fill":function(a,c,b,d){switch(a.target.className){case"bi bi-play-fill":return play(a.target,b);case"bi bi-play":return replay(a.target);case"bi bi-pause-fill":return pause(a.target)}}};function getInstrumentsString(a,b){const c=b.instruments.split(",").map(a=>parseInt(a));return c.map(b=>a[b]).join(", ")}function typeEvent(a){switch(a.code){case"Space":switch(a.preventDefault(),player.getPlayState()){case"paused":return replay();case"started":return pause();case"stopped":return play()}break}}function initFilterStates(){const a=new Map,b=document.querySelectorAll("#midiList > thead > tr > th");return[...b].slice(1).forEach(b=>{const c=b.dataset.field;a.set(c,"")}),a}loadConfig();const midiDB="https://midi-db.pages.dev",$table=$("#midiList"),soundFont="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",playerCallback={run:()=>{},stop:()=>{playNext()}},player=new core.SoundFontPlayer(soundFont,void 0,void 0,void 0,playerCallback),filterStates=initFilterStates();let currentTime=0,ns,nsCache,configChanged=!1,timer;const insturmentsPromise=loadInstruments();fetch(`${midiDB}/${document.documentElement.lang}.json`).then(a=>a.json()).then(a=>{insturmentsPromise.then(b=>{a.forEach(a=>{a.instruments=getInstrumentsString(b,a)})}),$table.bootstrapTable("load",a);const b=document.querySelector(".buttons-toolbar");[...b.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",addFilterControl)});const c=b.children[1].querySelector("button");c.addEventListener("click",()=>{$table.bootstrapTable("filterBy",{},{filterAlgorithm:()=>!0})}),addFilterControl()}),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("lang").onchange=changeLang,document.getElementById("speed").onchange=changeSpeedEvent,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("instruments").onchange=changeInstruments,document.addEventListener("keydown",typeEvent),document.addEventListener("click",unlockAudio,{once:!0,useCapture:!0})