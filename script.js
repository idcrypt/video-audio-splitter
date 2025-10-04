// Robust single-thread fallback FFmpeg for GitHub Pages
// Self-hosted: expects libs/ffmpeg.js, ffmpeg-core.js, ffmpeg-core.wasm
// Worker optional, will fallback automatically if unavailable

const ffmpegGlobal = window.FFmpegWASM || window.FFmpeg || window.FFmpegWasm || window.ffmpeg || window.FFmpegWASM?.FFmpeg;
if (!ffmpegGlobal) {
    alert("FFmpeg library not found. Make sure ./libs/ffmpeg.js is loaded before script.js");
    throw new Error("FFmpeg global not found");
}

const { createFFmpeg, fetchFile } = ffmpegGlobal;

// Paths
const CORE_JS = "./libs/ffmpeg-core.js";
const CORE_WASM = "./libs/ffmpeg-core.wasm";
const CORE_WORKER = "./libs/ffmpeg-core.worker.js"; // optional, not used on GitHub Pages

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

// ===== Helpers =====
function showLoader() { loader.classList.remove("hidden"); progressWrap.classList.remove("hidden"); updateProgress(0); }
function hideLoader() { loader.classList.add("hidden"); progressWrap.classList.add("hidden"); }
function updateProgress(percent) { progressBar.style.width = percent + "%"; progressText.textContent = percent + "%"; }
function showNotice(msg, timeout = 4000) { notice.textContent = msg; notice.classList.remove("hidden"); if (timeout) setTimeout(() => notice.classList.add("hidden"), timeout); }
function resetResults() { linksWrap.innerHTML = ""; results.classList.add("hidden"); }

// ===== File input =====
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

// ===== FFmpeg init =====
async function loadFFmpeg() {
    if (ffmpeg && ffmpeg.isLoaded()) return ffmpeg;

    showLoader();
    showNotice("Loading FFmpeg (single-thread)...");

    ffmpeg = createFFmpeg({
        log: true,
        corePath: CORE_JS,
        wasmPath: CORE_WASM,
        // workerPath intentionally skipped for GitHub Pages
    });

    try {
        await ffmpeg.load();
        showNotice("FFmpeg loaded ✅", 3000);
        hideLoader();
        return ffmpeg;
    } catch (err) {
        hideLoader();
        console.error("FFmpeg load failed:", err);
        showNotice("FFmpeg failed to load. Check console.", 6000);
        throw err;
    }
}

// ===== Progress hookup =====
function attachProgress() {
    if (!ffmpeg) return;
    ffmpeg.setProgress(({ ratio }) => {
        const percent = Math.round(ratio * 100);
        updateProgress(percent);
    });
}

// ===== Conversion =====
async function runConversion(mode) {
    if (!currentFile) {
        alert("Please select a video first.");
        return;
    }

    try {
        resetResults();
        showLoader();
        updateProgress(0);

        await loadFFmpeg();
        attachProgress();

        const ts = Date.now();
        const ext = currentFile.name.split(".").pop() || "mp4";
        const inputName = `input_${ts}.${ext}`;
        const outputName = mode === "audio" ? `audio_${ts}.mp3` : `video_${ts}_muted.mp4`;

        const uint8 = await fetchFile(currentFile);
        ffmpeg.FS("writeFile", inputName, uint8);

        if (mode === "audio") {
            await ffmpeg.run("-i", inputName, "-q:a", "0", "-map", "a", outputName);
        } else {
            await ffmpeg.run("-i", inputName, "-an", "-vcodec", "copy", outputName);
        }

        const outData = ffmpeg.FS("readFile", outputName);
        const blob = new Blob([outData.buffer], { type: mode === "audio" ? "audio/mpeg" : "video/mp4" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = outputName;
        a.textContent = `⬇️ ${outputName}`;
        a.className = "result-link";
        linksWrap.appendChild(a);
        results.classList.remove("hidden");

        showNotice("Conversion done ✅", 4000);

    } catch (err) {
        console.error("Conversion error:", err);
        showNotice("Conversion failed. See console.", 6000);
    } finally {
        updateProgress(0);
        hideLoader();
    }
}

// ===== Buttons =====
extractAudioBtn.addEventListener("click", () => runConversion("audio"));
extractVideoBtn.addEventListener("click", () => runConversion("video"));

// ===== Optional: display worker note =====
coopNote.textContent = "GitHub Pages: multi-thread worker not supported, single-thread active.";
