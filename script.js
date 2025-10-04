const { createFFmpeg, fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
  log: true,
  corePath: "./libs/ffmpeg-core.js", // arahkan ke lokal
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
  output.classList.add("hidden");
}
function hideLoader() {
  loader.classList.add("hidden");
  progressContainer.classList.add("hidden");
}
function updateProgress(ratio) {
  const percent = Math.round(ratio * 100);
  progressBar.style.width = percent + "%";
  progressText.innerText = percent + "%";
}

ffmpeg.setProgress(({ ratio }) => updateProgress(ratio));

async function loadFFmpeg() {
  if (!ffmpeg.isLoaded()) {
    showLoader();
    await ffmpeg.load();
    hideLoader();
  }
}

async function extract(type) {
  const file = uploader.files[0];
  if (!file) {
    alert("Please upload a video first.");
    return;
  }

  await loadFFmpeg();
  showLoader();

  const inputName = "input.mp4";
  const outputName = type === "audio" ? "output.mp3" : "output.mp4";

  ffmpeg.FS("writeFile", inputName, await fetchFile(file));

  if (type === "audio") {
    await ffmpeg.run("-i", inputName, "-q:a", "0", "-map", "a", outputName);
  } else {
    await ffmpeg.run("-i", inputName, "-an", outputName);
  }

  const data = ffmpeg.FS("readFile", outputName);
  const blob = new Blob([data.buffer], {
    type: type === "audio" ? "audio/mpeg" : "video/mp4",
  });
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = outputName;

  hideLoader();
  output.classList.remove("hidden");
}

extractAudioBtn.addEventListener("click", () => extract("audio"));
extractVideoBtn.addEventListener("click", () => extract("video"));
