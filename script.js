// Robust multi-thread aware script.js (self-hosted libs)
// Expects these files in ./libs/:
// - ffmpeg.js            (UMD build you placed)
// - ffmpeg-core.js
// - ffmpeg-core.wasm
// - ffmpeg-core.worker.js (optional, for multi-thread; requires COOP/COEP on host)

// get UMD global (tries several common export names)
const ffmpegGlobal = window.FFmpegWASM || window.FFmpeg || window.FFmpegWasm || window.ffmpeg || window.FFmpegWASM?.FFmpeg;
if (!ffmpegGlobal) {
// If library not present, show user-friendly message and stop.
alert("FFmpeg library not found on page. Ensure ./libs/ffmpeg.js is loaded before script.js");
throw new Error("FFmpeg global not found");
}

const { createFFmpeg, fetchFile } = ffmpegGlobal;

// configuration: local paths (self-hosted)
const CORE_JS = "./libs/ffmpeg-core.js";
const CORE_WASM = "./libs/ffmpeg-core.wasm";
const CORE_WORKER = "./libs/ffmpeg-core.worker.js"; // optional

// UI refs
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
let usingWorker = false;

// helpers
function showLoader() {
loader.classList.remove("hidden");
progressWrap.classList.remove("hidden");
updateProgress(0);
}
function hideLoader() {
loader.classList.add("hidden");
}
function updateProgress(percent) {
progressBar.style.width = percent + "%";
progressText.textContent = percent + "%";
}
function showNotice(msg, timeout = 6000) {
notice.textContent = msg;
notice.classList.remove("hidden");
if (timeout) setTimeout(()=> notice.classList.add("hidden"), timeout);
}
function resetResults() {
linksWrap.innerHTML = "";
results.classList.add("hidden");
}

// create ffmpeg instance; attempt worker-enabled first if worker file exists
function createInstance({ useWorker = true } = {}) {
const opts = {
log: true,
corePath: CORE_JS,
wasmPath: CORE_WASM
};
if (useWorker) {
opts.workerPath = CORE_WORKER;
}
return createFFmpeg(opts);
}

// try to initialize ffmpeg (prefer worker). If worker fails (e.g. due to COOP/COEP restriction),
// fallback to single-thread load automatically.
async function ensureFFmpegInitialized() {
if (ffmpeg && ffmpeg.isLoaded()) return;

// attempt using worker first
usingWorker = false;
try {
// create instance with workerPath
ffmpeg = createInstance({ useWorker: true });
showLoader();
showNotice("Initializing FFmpeg (multi-thread attempt)...", 3500);
await ffmpeg.load(); // may fail if worker not permitted
usingWorker = true;
showNotice("Multi-thread engine loaded ✅", 3000);
hideLoader();
return;
} catch (errWorker) {
console.warn("Multi-thread load failed, falling back to single-thread:", errWorker);
// try single-thread fallback
}

try {
ffmpeg = createInstance({ useWorker: false });
showLoader();
showNotice("Initializing FFmpeg (single-thread)...", 3500);
await ffmpeg.load();
usingWorker = false;
showNotice("Single-thread engine loaded (worker unavailable) ✅", 3000);
hideLoader();
return;
} catch (errSingle) {
hideLoader();
console.error("FFmpeg failed to load (both worker & non-worker):", errSingle);
showNotice("FFmpeg failed to initialize. Check console for details and ensure libs exist.", 8000);
throw errSingle;
}
}

// UI wiring
uploader.addEventListener("change", (e) => {
currentFile = e.target.files[0] || null;
fileNameEl.textContent = currentFile ? currentFile.name : "No file chosen";
resetResults();
});

clearBtn.addEventListener("click", () => {
uploader.value = "";
currentFile = null;
fileNameEl.textContent = "No file chosen";
resetResults();
notice.classList.add("hidden");
});

// progress hookup
function attachProgress() {
if (!ffmpeg) return;
ffmpeg.setProgress(({ ratio }) => {
const percent = Math.round(ratio * 100);
updateProgress(percent);
});
}

// run conversion tasks. mode: "audio" => extract mp3 ; "video" => mute video
async function runConversion(mode) {
if (!currentFile) {
alert("Please select a video first.");
return;
}

try {
results.classList.add("hidden");
linksWrap.innerHTML = "";
showLoader();
updateProgress(0);

```
await ensureFFmpegInitialized();
attachProgress();

// generate deterministic input/output names to avoid collisions
const ts = Date.now();
const ext = (currentFile.name.split(".").pop() || "mp4");
const inputName = `input_${ts}.${ext}`;
const outputName = mode === "audio" ? `audio_${ts}.mp3` : `video_${ts}_muted.mp4`;

// write file into ffmpeg FS
const uint8 = await fetchFile(currentFile);
ffmpeg.FS("writeFile", inputName, uint8);

// run appropriate ffmpeg command
if (mode === "audio") {
  // extract best quality mp3
  await ffmpeg.run("-i", inputName, "-q:a", "0", "-map", "a", outputName);
} else {
  // copy video stream, remove audio
  await ffmpeg.run("-i", inputName, "-an", "-vcodec", "copy", outputName);
}

// read resulting file
const outData = ffmpeg.FS("readFile", outputName);
const mime = mode === "audio" ? "audio/mpeg" : "video/mp4";
const blob = new Blob([outData.buffer], { type: mime });
const url = URL.createObjectURL(blob);

// show results
const a = document.createElement("a");
a.href = url;
a.download = outputName;
a.textContent = `⬇️ ${outputName}`;
a.className = "result-link";
linksWrap.appendChild(a);
results.classList.remove("hidden");

showNotice("Done — file ready for download", 4500);
```

} catch (err) {
console.error("Conversion error:", err);
showNotice("Conversion failed — check console. If using multi-thread, ensure COOP/COEP headers on host.", 8000);
} finally {
updateProgress(0);
hideLoader();
}
}

// wire buttons
extractAudioBtn.addEventListener("click", async () => {
await runConversion("audio");
});
extractVideoBtn.addEventListener("click", async () => {
await runConversion("video");
});

// On load: quick detection of worker availability and tip to user (non-blocking)
(async function detectWorkerSupport(){
// quick check: file existence on the same host (does not guarantee run-time permission)
try {
const workerResp = await fetch(CORE_WORKER, { method: "HEAD" });
if (workerResp.ok) {
// worker file present — but to actually run worker you need COOP/COEP headers.
coopNote.textContent = "Worker file present — multi-thread available if your host sets COOP/COEP (SharedArrayBuffer). If using GitHub Pages, worker may not run due to missing headers.";
} else {
coopNote.textContent = "Worker file not found locally — falling back to single-thread.";
}
} catch (e) {
coopNote.textContent = "Couldn't check worker file; server may block HEAD requests.";
}
})();
