// cek global UMD
const ffmpegLib = window.FFmpeg || window.FFmpegWASM;
if (!ffmpegLib) {
  alert("FFmpeg WASM not loaded. Cek tag <script src=...> di index.html");
}

// ambil API
const { createFFmpeg, fetchFile } = ffmpegLib;

const ffmpeg = createFFmpeg({
  log: true,
  corePath: "./libs/ffmpeg-core.js", // path engine
  progress: ({ ratio }) => {
    const percent = Math.round(ratio * 100);
    console.log(`Progress: ${percent}%`);
    updateProgress(percent);
  }
});


const uploader = document.getElementById("uploader");
const extractAudioBtn = document.getElementById("extractAudioBtn");
const extractVideoBtn = document.getElementById("extractVideoBtn");
const loader = document.getElementById("loader");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const output = document.getElementById("output");
const downloadLink = document.getElementById("downloadLink");

function showLoader() {
  loader.classList.remove("hidden");
  progressContainer.classList.remove("hidden");
  updateProgress(0);
}

function hideLoader() {
  loader.classList.add("hidden");
}

function updateProgress(percent) {
  progressBar.style.width = percent + "%";
  progressText.textContent = percent + "%";
}

async function ensureFFmpegLoaded() {
  if (!ffmpeg.isLoaded()) {
    showLoader();
    await ffmpeg.load();
    hideLoader();
  }
}

extractAudioBtn.addEventListener("click", async () => {
  if (!uploader.files.length) return alert("Upload a video first!");
  await ensureFFmpegLoaded();

  const file = uploader.files[0];
  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file));

  showLoader();
  await ffmpeg.run("-i", "input.mp4", "-q:a", "0", "-map", "a", "output.mp3");
  hideLoader();

  const data = ffmpeg.FS("readFile", "output.mp3");
  const url = URL.createObjectURL(new Blob([data.buffer], { type: "audio/mpeg" }));

  output.classList.remove("hidden");
  downloadLink.href = url;
  downloadLink.download = "extracted-audio.mp3";
});

extractVideoBtn.addEventListener("click", async () => {
  if (!uploader.files.length) return alert("Upload a video first!");
  await ensureFFmpegLoaded();

  const file = uploader.files[0];
  ffmpeg.FS("writeFile", "input.mp4", await fetchFile(file));

  showLoader();
  await ffmpeg.run("-i", "input.mp4", "-an", "output.mp4");
  hideLoader();

  const data = ffmpeg.FS("readFile", "output.mp4");
  const url = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }));

  output.classList.remove("hidden");
  downloadLink.href = url;
  downloadLink.download = "muted-video.mp4";
});
