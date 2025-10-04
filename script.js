// Get UMD global
const ffmpegGlobal = window.FFmpegWASM || window.FFmpeg || window.ffmpeg;
if (!ffmpegGlobal) {
  alert("FFmpeg library not found. Ensure ./libs/ffmpeg.js is loaded before script.js");
  throw new Error("FFmpeg global not found");
}
const { createFFmpeg, fetchFile } = ffmpegGlobal;

// Paths (self-hosted)
const CORE_JS = "./libs/ffmpeg-core.js";
const CORE_WASM = "./libs/ffmpeg-core.wasm";
const CORE_WORKER = "./libs/ffmpeg-core.worker.js";

// UI elements
const uploader = document.getElementById("uploader");
const fileNameEl = document.getElementById("fileName");
const extractAudioBtn = document.getElementById("extractAudioBtn");
const extractVideoBtn = document.getElementById("extractVideoBtn");
const loader = document.getElementById("loader");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const notice = document.getElementById("notice");
const results = document.getElementById("results");
const linksWrap = document.getElementById("links");
const clearBtn = document.getElementById("clearBtn");
const coopNote = document.getElementById("coopNote");

let ffmpeg = null;
let currentFile = null;

// Helpers
function showLoader() { loader.classList.remove("hidden"); progressWrap.classList.remove("hidden"); updateProgress(0); }
function hideLoader() { loader.classList.add("hidden"); progressWrap.classList.add("hidden"); }
function updateProgress(p) { progressBar.style.width = p + "%"; progressText.textContent = p + "%"; }
function showNotice(msg, t=5000) { notice.textContent = msg; notice.classList.remove("hidden"); setTimeout(()=>notice.classList.add("hidden"), t); }
function resetResults() { linksWrap.innerHTML=""; results.classList.add("hidden"); }

// FFmpeg init
async function loadFFmpeg() {
  if(ffmpeg && ffmpeg.isLoaded()) return ffmpeg;
  ffmpeg = createFFmpeg({ log:true, corePath:CORE_JS, wasmPath:CORE_WASM, workerPath:CORE_WORKER });
  showLoader(); showNotice("Loading FFmpeg...");
  await ffmpeg.load();
  hideLoader();
  showNotice("FFmpeg loaded ✅",3000);
  return ffmpeg;
}

// Uploader
uploader.addEventListener("change", (e)=>{
  currentFile = e.target.files[0];
  fileNameEl.textContent = currentFile ? currentFile.name : "No file chosen";
  resetResults();
});

// Clear button
clearBtn.addEventListener("click", ()=>{
  uploader.value=""; currentFile=null;
  fileNameEl.textContent="No file chosen"; resetResults();
});

// Progress hookup
function attachProgress() {
  ffmpeg.setProgress(({ratio})=>{
    updateProgress(Math.round(ratio*100));
  });
}

// Conversion
async function convert(mode){
  if(!currentFile){ alert("Select a video first"); return; }
  try{
    results.classList.add("hidden");
    linksWrap.innerHTML=""; showLoader(); updateProgress(0);

    await loadFFmpeg(); attachProgress();

    const ts = Date.now();
    const ext = (currentFile.name.split(".").pop() || "mp4");
    const inputName = `input_${ts}.${ext}`;
    const outputName = mode==="audio"?`audio_${ts}.mp3`:`video_${ts}_muted.mp4`;

    const data = await fetchFile(currentFile);
    ffmpeg.FS("writeFile", inputName, data);

    if(mode==="audio"){
      await ffmpeg.run("-i", inputName, "-q:a", "0", "-map", "a", outputName);
    }else{
      await ffmpeg.run("-i", inputName, "-an", "-vcodec","copy", outputName);
    }

    const outData = ffmpeg.FS("readFile", outputName);
    const blob = new Blob([outData.buffer], {type: mode==="audio"?"audio/mpeg":"video/mp4"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url; a.download=outputName;
    a.textContent=`⬇️ ${outputName}`;
    a.className="result-link";
    linksWrap.appendChild(a);
    results.classList.remove("hidden");
    showNotice("Done ✅",4000);

  }catch(err){ console.error(err); showNotice("Conversion failed. See console."); }
  finally{ hideLoader(); updateProgress(0); }
}

// Buttons
extractAudioBtn.addEventListener("click", ()=>convert("audio"));
extractVideoBtn.addEventListener("click", ()=>convert("video"));

// Check worker file
(async()=>{
  try{
    const r = await fetch(CORE_WORKER,{method:"HEAD"});
    if(r.ok) coopNote.textContent="Worker file exists — multi-thread possible if host allows COOP/COEP"; 
    else coopNote.textContent="Worker file missing — single-thread fallback";
  }catch(e){ coopNote.textContent="Cannot detect worker"; }
})();
