function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function changeLang(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value;location.href=`/free-midi/${b}/`}function unlockAudio(){player.resumeContext()}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10;b<0?a.value=0:a.value=b,document.getElementById("speedDown").disabled=!0,changeSpeed(),document.getElementById("speedDown").disabled=!1}function speedUp(){const a=document.getElementById("speed");a.value=parseInt(a.value)+10,document.getElementById("speedUp").disabled=!0,changeSpeed(),document.getElementById("speedUp").disabled=!1}function changeSpeed(){if(ns)switch(player.getPlayState()){case"started":{player.stop(),setSpeed(ns);const a=parseInt(document.getElementById("seekbar").value);player.start(ns,void 0,a);break}case"paused":configChanged=!0;break}}function setSpeed(b){const e=document.getElementById("speed"),a=parseInt(e.value)/100,f=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=f[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function setNoteInstruments(a){const b=document.getElementById("instruments").selectedIndex-1;b>0?(a.controlChanges.forEach(a=>a.program=b),a.notes.forEach(a=>a.program=b)):(a.controlChanges.forEach(a=>a.program=a.p),a.notes.forEach(a=>a.program=a.p))}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(b){clearInterval(seekbarInterval);const a=parseInt(b.target.value);document.getElementById("currentTime").textContent=formatTime(a),player.isPlaying()&&(player.seekTo(a),setSeekbarInterval(a),player.getPlayState()=="paused"&&player.resume())}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),clearInterval(seekbarInterval),setSeekbarInterval(b)}function setSeekbarInterval(a){seekbarInterval=setInterval(()=>{updateSeekbar(a),a+=1},1e3)}async function loadMIDI(a){ns=await core.urlToNoteSequence(a),nsCache=core.sequences.clone(ns),ns.controlChanges.forEach(a=>a.p=a.program),ns.notes.map(a=>{a.p=a.program})}function playMIDI(a){setNoteInstruments(ns),setSpeed(ns);const b=document.getElementById("volumebar").value;player.output.volume.value=b,player.start(ns,void 0,a),initSeekbar(ns,a)}function playNext(){const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),c=b.parentNode.parentNode.parentNode,e=[...a.children].indexOf(c);b.className="bi bi-play-fill";const d=$table.bootstrapTable("getData",{useCurrentPage:!0});if((e+1)%d.length==0){const a=$table.bootstrapTable("getData");if(a.at(-1)==d.at(-1)){{const a=document.getElementById("repeat"),b=a.classList.contains("active");if(b){$table.bootstrapTable("selectPage",1);const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}}else{$table.bootstrapTable("nextPage");const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}else{const a=c.nextElementSibling.querySelector(".bi-play-fill");a&&a.click()}}function loadInstruments(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value,c=document.getElementById("instruments");return fetch(`/free-midi/${b}/instruments.lst`).then(a=>a.text()).then(b=>{const a=[];return b.trimEnd().split("\n").forEach(b=>{const d=document.createElement("option");d.textContent=b,c.appendChild(d),a.push(b)}),a})}async function changeInstruments(){switch(player.getPlayState()){case"started":{player.stop(),setNoteInstruments(ns),setSpeed(ns);const a=parseInt(document.getElementById("seekbar").value);player.start(ns,void 0,a),initSeekbar(ns,a);break}case"paused":configChanged=!0;break}}loadConfig();const midiDB="https://midi-db.pages.dev",$table=$("#midiList"),soundFont="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",playerCallback={run:()=>{},stop:()=>{playNext()}},player=new core.SoundFontPlayer(soundFont,void 0,void 0,void 0,playerCallback);let ns,nsCache,configChanged=!1,seekbarInterval;function toString(a){return a||""}function _filterRange(a,b,c,d){switch(a[0]){case">":return a.length==1||(parseInt(b)>parseInt(a.slice(1)));case"<":return a.length==1||(parseInt(b)<parseInt(a.slice(1)));default:return b==a}}function _detailFormatterEn(f,a){const b=encodeURI(`${midiDB}/${a.file}`),c=encodeURIComponent(toString(a.title)),d=encodeURIComponent(toString(a.composer));let e="";return a.instruments.split(", ").forEach(a=>{e+=`<li>${a}</li>`}),`
<div class="d-flex p-2">
  <div>
    <h5>Score</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?url=${b}&title=${c}&composer=${d}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?url=${b}&title=${c}&composer=${d}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">Game</h5>
    <table class="table table-sm table-striped w-auto">
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
      <tr><th>License</th><td>${toString(a.license)}</td></tr>
      <tr><th>Download</th><td><a href="${toString(b)}">MIDI</a></td></tr>
      <tr><th>ID</th><td>${toString(a.id)}</td></tr>
      <tr><th>Maintainer</th><td>${toString(a.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(a.email)}</td></tr>
      <tr><th>Web</th><td>${toString(a.web)}</td></tr>
    </table>
  </div>
  <div>
    <h5>Annotation Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Difficulty</th><td>${a.difficulty}</td></tr>
      <tr><th>BPM</th><td>${a.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${e}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _detailFormatterJa(f,a){const b=encodeURI(`${midiDB}/${a.file}`),c=encodeURIComponent(toString(a.title)),d=encodeURIComponent(toString(a.composer));let e="";return a.instruments.split(", ").forEach(a=>{e+=`<li>${a}</li>`}),`
<div class="d-flex p-2">
  <div>
    <h5>楽譜</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Basic</th><td><a href="https://marmooo.github.io/midi2abc/?url=${b}&title=${c}&composer=${d}">midi2abc</a></td></tr>
      <tr><th>Waterfall</th><td><a href="https://marmooo.github.io/waterfall-piano/?url=${b}&title=${c}&composer=${d}">Waterfall Piano</a></td></tr>
    </table>
    <h5 class="pt-3">ゲーム</h5>
    <table class="table table-sm table-striped w-auto">
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
      <tr><th>ライセンス</th><td>${toString(a.license)}</td></tr>
      <tr><th>ダウンロード</th><td><a href="${toString(b)}">MIDI</a></td></tr>
      <tr><th>id</th><td>${toString(a.id)}</td></tr>
      <tr><th>保守者</th><td>${toString(a.maintainer)}</td></tr>
      <tr><th>Email</th><td>${toString(a.email)}</td></tr>
      <tr><th>Web</th><td>${toString(a.web)}</td></tr>
    </table>
  </div>
  <div>
    <h5>注釈情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>難易度</th><td>${a.difficulty}</td></tr>
      <tr><th>BPM</th><td>${a.bpm}</td></tr>
      <tr><th>Instruments</th><td><ul>${e}</ul></td></tr>
    </table>
  </div>
</div>
  `}function _toolFormatterEn(a,b,c){return`
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}function _toolFormatterJa(a,b,c){return`
<button title="再生" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}window.toolEvents={"click .bi-play-fill":function(a,c,b,d){switch(a.target.className){case"bi bi-play-fill":{const c=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");[...c].forEach(a=>{a.className="bi bi-play-fill"}),player.isPlaying()&&player.stop(),a.target.className="bi bi-pause-fill";const d=`${midiDB}/${b.file}`;loadMIDI(d).then(()=>{playMIDI(0)});break}case"bi bi-play":{if(a.target.className="bi bi-pause-fill",configChanged){player.stop();const a=parseInt(document.getElementById("seekbar").value),b=document.getElementById("speed"),c=b.value/100;playMIDI(a/c),configChanged=!1}else{player.resume();const a=parseInt(document.getElementById("seekbar").value);setSeekbarInterval(a)}break}case"bi bi-pause-fill":a.target.className="bi bi-play",player.pause(),clearInterval(seekbarInterval);break}}};function getInstrumentsString(a,b){const c=b.instruments.split(",").map(a=>parseInt(a));return c.map(b=>a[b]).join(", ")}const insturmentsPromise=loadInstruments();fetch(`${midiDB}/${document.documentElement.lang}.json`).then(a=>a.json()).then(a=>{insturmentsPromise.then(b=>{a.forEach(a=>{a.instruments=getInstrumentsString(b,a)})}),$("#midiList").bootstrapTable("load",a)}),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("lang").onchange=changeLang,document.getElementById("speed").onchange=changeSpeed,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("instruments").onchange=changeInstruments,document.addEventListener("click",unlockAudio,{once:!0,useCapture:!0})