// ==============================
// script.js — Self-hosted single-thread only
// ==============================

// Ambil global FFmpeg dari UMD resmi
const ffmpegGlobal = window.FFmpegWASM?.FFmpeg || window.FFmpegWASM || window.FFmpeg;
if (!ffmpegGlobal) {
    alert("FFmpeg library not found. Pastikan ./libs/ffmpeg.js sudah di-load.");
    throw new Error("FFmpeg global not found");
}

// Destructuring
const { createFFmpeg, fetchFile } = ffmpegGlobal;

// Paths untuk self-hosted
const ffmpeg = createFFmpeg({
    log: true,
    corePath: "./libs/ffmpeg-core.js",
    wasmPath: "./libs/ffmpeg-core.wasm",
});

// ==============================
// UI Elements
// ==============================
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

let currentFile = null;

// ==============================
// Helper functions
// ==============================
function showLoader() { loader.classList.remove("hidden"); progressWrap.classList.remove("hidden"); updateProgress(0); }
function hideLoader() { loader.classList.add("hidden"); }
function updateProgress(p) { progressBar.style.width = p + "%"; progressText.textContent = p + "%"; }
function showNotice(msg, timeout=5000){ notice.textContent = msg; notice.classList.remove("hidden"); if(timeout)setTimeout(()=>notice.classList.add("hidden"), timeout);}
function resetResults(){ linksWrap.innerHTML=""; results.classList.add("hidden"); }

// ==============================
// Event listeners
// ==============================

// File select
uploader.addEventListener("change", e=>{
    currentFile = e.target.files[0]||null;
    fileNameEl.textContent = currentFile ? currentFile.name : "No file chosen";
    resetResults();
});

// Clear
clearBtn.addEventListener("click", ()=>{
    uploader.value = "";
    currentFile = null;
    fileNameEl.textContent = "No file chosen";
    resetResults();
    notice.classList.add("hidden");
});

// Attach progress
ffmpeg.setProgress(({ratio})=>{
    updateProgress(Math.round(ratio*100));
});

// ==============================
// Conversion function
// ==============================
async function runConversion(mode){
    if(!currentFile){ alert("Pilih video dulu."); return; }
    try{
        showLoader();
        resetResults();
        showNotice("Loading FFmpeg engine...");
        if(!ffmpeg.isLoaded()) await ffmpeg.load();

        // Buat nama file unik
        const ts = Date.now();
        const ext = (currentFile.name.split(".").pop() || "mp4");
        const inputName = `input_${ts}.${ext}`;
        const outputName = mode==="audio" ? `audio_${ts}.mp3` : `video_${ts}_muted.mp4`;

        // Tulis file input ke FFmpeg FS
        const uint8 = await fetchFile(currentFile);
        ffmpeg.FS("writeFile", inputName, uint8);

        // Jalankan konversi
        if(mode==="audio"){
            await ffmpeg.run("-i", inputName, "-q:a","0","-map","a", outputName);
        } else {
            await ffmpeg.run("-i", inputName, "-an","-vcodec","copy", outputName);
        }

        // Ambil file output
        const outData = ffmpeg.FS("readFile", outputName);
        const mime = mode==="audio" ? "audio/mpeg" : "video/mp4";
        const blob = new Blob([outData.buffer], {type:mime});
        const url = URL.createObjectURL(blob);

        // Tampilkan hasil download
        const a = document.createElement("a");
        a.href = url;
        a.download = outputName;
        a.textContent = `⬇️ ${outputName}`;
        a.className = "result-link";
        linksWrap.appendChild(a);
        results.classList.remove("hidden");
        showNotice("Selesai! File siap di-download.",4000);

    } catch(e){
        console.error("Conversion error:", e);
        showNotice("Konversi gagal. Lihat console.", 6000);
    } finally {
        hideLoader();
        updateProgress(0);
    }
}

// ==============================
// Wire buttons
// ==============================
extractAudioBtn.addEventListener("click", ()=>runConversion("audio"));
extractVideoBtn.addEventListener("click", ()=>runConversion("video"));
