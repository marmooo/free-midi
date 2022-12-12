function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function changeLang(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value;location.href=`/free-midi/${b}/`}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10;b<0?a.value=0:a.value=b,document.getElementById("speedDown").disabled=!0,changeSpeed(),document.getElementById("speedDown").disabled=!1}function speedUp(){const a=document.getElementById("speed");a.value=parseInt(a.value)+10,document.getElementById("speedUp").disabled=!0,changeSpeed(),document.getElementById("speedUp").disabled=!1}function changeSpeed(){if(ns)switch(player.getPlayState()){case"started":{const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),c=[...a.children].indexOf(b);player.stop(),setSpeed(ns);const d=parseInt(document.getElementById("seekbar").value);player.start(ns,void 0,d).then(()=>{playNext(b,c)});break}case"paused":configChanged=!0;break}}function setSpeed(b){const e=document.getElementById("speed"),a=parseInt(e.value)/100,f=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=f[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function setNoteInstruments(a){const b=document.getElementById("instruments").selectedIndex-1;b>0?(a.controlChanges.forEach(a=>a.program=b),a.notes.forEach(a=>a.program=b)):(a.controlChanges.forEach(a=>a.program=a.p),a.notes.forEach(a=>a.program=a.p))}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(b){clearInterval(seekbarInterval);const a=parseInt(b.target.value);document.getElementById("currentTime").textContent=formatTime(a),player.isPlaying()&&(player.seekTo(a),setSeekbarInterval(a),player.getPlayState()=="paused"&&player.resume())}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),clearInterval(seekbarInterval),setSeekbarInterval(b)}function setSeekbarInterval(a){seekbarInterval=setInterval(()=>{updateSeekbar(a),a+=1},1e3)}async function playMIDI(b,c,d,a){ns=await core.urlToNoteSequence(d),nsCache=core.sequences.clone(ns),ns.controlChanges.forEach(a=>a.p=a.program),ns.notes.map(a=>{a.p=a.program}),setNoteInstruments(ns),setSpeed(ns),player.loadSamples(ns,void 0,a).then(()=>{const d=document.getElementById("volumebar").value;player.output.volume.value=d,player.start(ns).then(()=>{playNext(b.target,c)}),initSeekbar(ns,a)})}function playNext(a,c){a.className="bi bi-play-fill";const b=$table.bootstrapTable("getData",{useCurrentPage:!0});if((c+1)%b.length==0){const a=$table.bootstrapTable("getData");if(a.at(-1)==b.at(-1)){{const a=document.getElementById("repeat"),b=a.classList.contains("active");if(b){$table.bootstrapTable("selectPage",1);const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}}else{$table.bootstrapTable("nextPage");const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}else{const c=a.parentNode.parentNode.parentNode,b=c.nextElementSibling.querySelector(".bi-play-fill");b&&b.click()}}function loadInstruments(){const a=document.getElementById("lang"),b=a.options[a.selectedIndex].value,c=document.getElementById("instruments");return fetch(`/free-midi/${b}/instruments.lst`).then(a=>a.text()).then(b=>{const a=[];return b.trimEnd().split("\n").forEach(b=>{const d=document.createElement("option");d.textContent=b,c.appendChild(d),a.push(b)}),a})}function changeInstruments(){switch(player.getPlayState()){case"started":{const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),d=[...a.children].indexOf(b);player.stop(),setNoteInstruments(ns),setSpeed(ns);const c=parseInt(document.getElementById("seekbar").value);player.loadSamples(ns).then(()=>{player.start(ns,void 0,c).then(()=>{playNext(b,d)}),initSeekbar(ns,c)})}case"paused":configChanged=!0;break}}loadConfig();const midiDB="/midi-db",$table=$("#midiList"),soundFont="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",player=new core.SoundFontPlayer(soundFont,void 0,void 0,void 0,void 0);let ns,nsCache,configChanged=!1,seekbarInterval;function toString(a){return a||""}function _detailFormatterEn(e,a){const b=encodeURI(`${midiDB}/${a.file}`),c=encodeURIComponent(toString(a.title)),d=encodeURIComponent(toString(a.composer));return`
<div class="d-flex p-2">
  <div>
    <h5>Play</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Score</th><td><a href="https://marmooo.github.io/midi2abc/?url=${b}&title=${c}&composer=${d}">midi2abc</a></td></tr>
      <tr><th>Game</th><td>TODO</td></tr>
    </table>
  </div>
  <div>
    <h5>Music Info</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>Title</th><td>${toString(a.title)}</td></tr>
      <tr><th>Composer</th><td>${toString(a.composer)}</td></tr>
      <tr><th>Opus</th><td>${toString(a.opus)}</td></tr>
      <tr><th>Lyricist</th><td>${toString(a.lyricist)}</td></tr>
      <tr><th>Instruments</th><td>${toString(a.instruments)}</td></tr>
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
</div>
  `}function _detailFormatterJa(e,a){const b=encodeURI(`${midiDB}/${a.file}`),c=encodeURIComponent(toString(a.title)),d=encodeURIComponent(toString(a.composer));return`
<div class="d-flex p-2">
  <div>
    <h5>プレイ</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>楽譜</th><td><a href="https://marmooo.github.io/midi2abc/?url=${b}&title=${c}&composer=${d}">midi2abc</a></td></tr>
      <tr><th>ゲーム</th><td>TODO</td></tr>
    </table>
  </div>
  <div>
    <h5>音楽情報</h5>
    <table class="table table-sm table-striped w-auto">
      <tr><th>タイトル</th><td>${toString(a.title)}</td></tr>
      <tr><th>作曲者</th><td>${toString(a.composer)}</td></tr>
      <tr><th>作品</th><td>${toString(a.opus)}</td></tr>
      <tr><th>作詞者</th><td>${toString(a.lyricist)}</td></tr>
      <tr><th>楽器</th><td>${toString(a.instruments)}</td></tr>
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
</div>
  `}function _toolFormatterEn(a,b,c){return`
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}function _toolFormatterJa(a,b,c){return`
<button title="再生" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}window.toolEvents={"click .bi-play-fill":function(a,d,b,c){switch(a.target.className){case"bi bi-play-fill":{const d=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");[...d].forEach(a=>{a.className="bi bi-play-fill"}),player.isPlaying()&&player.stop(),a.target.className="bi bi-pause-fill";const e=`${midiDB}/${b.file}`;playMIDI(a,c,e,0);break}case"bi bi-play":{if(a.target.className="bi bi-pause-fill",configChanged){player.stop();const d=`${midiDB}/${b.file}`,e=parseInt(document.getElementById("seekbar").value),f=document.getElementById("speed"),g=f.value/100;playMIDI(a,c,d,e/g),configChanged=!1}else{player.resume();const a=parseInt(document.getElementById("seekbar").value);setSeekbarInterval(a)}break}case"bi bi-pause-fill":a.target.className="bi bi-play",player.pause(),clearInterval(seekbarInterval);break}}};function getInstrumentsString(a,b){const c=b.instruments.split(",").map(a=>parseInt(a));return c.map(b=>a[b]).join(", ")}const insturmentsPromise=loadInstruments();$("#midiList").bootstrapTable({onLoadSuccess:function(a){insturmentsPromise.then(b=>{a.forEach(a=>{a.instruments=getInstrumentsString(b,a)})})}}),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("lang").onchange=changeLang,document.getElementById("speed").onchange=changeSpeed,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("instruments").onchange=changeInstruments