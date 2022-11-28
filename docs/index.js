function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10;b<0?a.value=0:a.value=b}function speedUp(){const a=document.getElementById("speed");a.value=parseInt(a.value)+10}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function setVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function setNoteInstruments(a){const b=document.getElementById("instruments").selectedIndex-1;b>0?(a.controlChanges.forEach(a=>a.program=b),a.notes.forEach(a=>a.program=b)):(a.controlChanges.forEach(a=>a.program=a.p),a.notes.forEach(a=>a.program=a.p))}function setSpeed(b){const c=document.getElementById("speed"),a=parseInt(c.value)/100;a!=1&&(b.controlChanges.forEach(b=>{b.time/=a}),b.notes.forEach(b=>{b.startTime/=a,b.endTime/=a}),b.totalTime/=a)}function setInstruments(){if(player.isPlaying()){const a=$table[0].querySelector("tbody"),b=a.querySelector(".bi-pause-fill"),c=[...a.children].indexOf(b);player.stop(),setNoteInstruments(ns),setSpeed(ns);const d=document.getElementById("currentTime").textContent;player.loadSamples(ns).then(()=>{player.start(ns,void 0,d).then(()=>playNext(b,c))})}}function playNext(a,c){a.className="bi bi-play-fill";const b=$table.bootstrapTable("getData",{useCurrentPage:!0});if((c+1)%b.length==0){const a=$table.bootstrapTable("getData");if(a.at(-1)==b.at(-1)){{const a=document.getElementById("repeat"),b=a.classList.contains("active");if(b){$table.bootstrapTable("selectPage",1);const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}}else{$table.bootstrapTable("nextPage");const b=$table[0].querySelector("tbody"),a=b.querySelector(".bi-play-fill");a&&a.click()}}else{const c=a.parentNode.parentNode.parentNode,b=c.nextElementSibling.querySelector(".bi-play-fill");b&&b.click()}}function initSeekbar(a){document.getElementById("seekbar").max=a.totalTime,document.getElementById("totalTime").textContent=formatTime(a.totalTime)}async function playMIDI(a,b,c){ns=await core.urlToNoteSequence(c),ns.controlChanges.forEach(a=>a.p=a.program),ns.notes.map(a=>{a.p=a.program}),setNoteInstruments(ns),setSpeed(ns),initSeekbar(ns),player.loadSamples(ns).then(()=>{const c=document.getElementById("volumebar").value;player.output.volume.value=c,player.start(ns).then(()=>playNext(a.target,b))})}function loadInstruments(){const a=document.getElementById("instruments");fetch("instruments.csv").then(a=>a.text()).then(b=>{b.trimEnd().split("\n").forEach(c=>{const b=document.createElement("option");b.textContent=c.split(",")[0],a.appendChild(b)})})}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function setSeekbar(b){seeking=!0;const a=b.target.value;document.getElementById("currentTime").textContent=formatTime(a),player.isPlaying()&&(player.seekTo(a),player.getPlayState()=="paused"&&player.resume()),seeking=!1}function noteCallback(a){if(player.playing)return;if(seeking)return;const b=document.getElementById("seekbar");b.value=Math.floor(a.startTime),document.getElementById("currentTime").textContent=formatTime(a.startTime)}const playerCallback={run:a=>noteCallback(a),stop:()=>{}};loadConfig(),loadInstruments();const midiDB="/midi-db",$table=$("#midiList"),soundFont="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",player=new core.SoundFontPlayer(soundFont,void 0,void 0,void 0,playerCallback);let ns,seeking;function rowInfoHtml(b){let a='<table class="table table-sm table-striped"><tbody>';for(const[c,d]of Object.entries(b))a+=`<tr><th>${c}</th><td>${d}</td></tr>`;return a+="</tbody></table>",a}function toString(a){return a||""}function _detailFormatter(e,a){const b=encodeURI(`${midiDB}/${a.file}`),c=encodeURIComponent(toString(a.title)),d=encodeURIComponent(toString(a.composer));return`
<div class="row p-2">
  <div class="col-sm">
    <h5>Play</h5>
    <table class="table table-sm table-striped">
      <tr><th>score</th><td><a href="https://marmooo.github.io/midi2abc/?url=${b}&title=${c}&composer=${d}">midi2abc</a></td></tr>
      <tr><th>game</th><td>TODO</td></tr>
    </table>
  </div>
  <div class="col-sm">
    <h5>Music Info</h5>
    <table class="table table-sm table-striped">
      <tr><th>title</th><td>${toString(a.title)}</td></tr>
      <tr><th>composer</th><td>${toString(a.composer)}</td></tr>
      <tr><th>opus</th><td>${toString(a.opus)}</td></tr>
      <tr><th>lyricist</th><td>${toString(a.lyricist)}</td></tr>
      <tr><th>instruments</th><td>${toString(a.instruments)}</td></tr>
      <tr><th>date</th><td>${toString(a.date)}</td></tr>
      <tr><th>style</th><td>${toString(a.style)}</td></tr>
      <tr><th>arranger</th><td>${toString(a.arranger)}</td></tr>
      <tr><th>source</th><td>${toString(a.source)}</td></tr>
    </table>
  </div>
  <div class="col-sm">
    <h5>File Info</h5>
    <table class="table table-sm table-striped">
      <tr><th>license</th><td>${toString(a.license)}</td></tr>
      <tr><th>download</th><td><a href="${toString(b)}">MIDI</a></td></tr>
      <tr><th>id</th><td>${toString(a.id)}</td></tr>
      <tr><th>maintainer</th><td>${toString(a.maintainer)}</td></tr>
      <tr><th>email</th><td>${toString(a.email)}</td></tr>
      <tr><th>web</th><td>${toString(a.web)}</td></tr>
    </table>
  </div>
</div>
  `}function _toolFormatter(a,b,c){return`
<button title="play" class="btn p-0"><i class="bi bi-play-fill"></i></button>
  `}window.toolEvents={"click .bi-play-fill":function(a,d,b,c){switch(a.target.className){case"bi bi-play-fill":{const d=$table[0].querySelectorAll("tbody .bi-pause-fill, .bi-play");[...d].forEach(a=>{a.className="bi bi-play-fill"}),player.isPlaying()&&player.stop(),a.target.className="bi bi-pause-fill";const e=`${midiDB}/${b.file}`;playMIDI(a,c,e);break}case"bi bi-play":a.target.className="bi bi-pause-fill",player.resume();break;case"bi bi-pause-fill":a.target.className="bi bi-play",player.pause();break}}},document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=setVolumebar,document.getElementById("seekbar").onchange=setSeekbar,document.getElementById("instruments").onchange=setInstruments