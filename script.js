// ambil API dari global UMD
const { createFFmpeg, fetchFile } = window.FFmpeg;

// inisialisasi
const ffmpeg = createFFmpeg({
  log: true,
  progress: ({ ratio }) => {
    const percent = Math.round(ratio * 100);
    updateProgress(percent);
  },
});

// DOM elements
const uploader = document.getElementById("uploader");
const extractAudioBtn = document.getElementById("extractAudioBtn");
const extractVideoBtn = document.getElementById("extractVideoBtn");
const loader = document.getElementById("loader");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const output = document.getElementById("output");
const downloadLink = document.getElementById("downloadLink");

let uploadedFile = null;

// Upload file
uploader.addEventListener("change", (e) => {
  uploadedFile = e.target.files[0];
  if (uploadedFile) {
    console.log("File siap:", uploadedFile.name);
  }
});

// Update progress UI
function updateProgress(percent) {
  progressBar.style.width = percent + "%";
  progressText.innerText = percent + "%";
}

// Show / Hide loader
function showLoader() {
  loader.classList.remove("hidden");
  progressContainer.classList.remove("hidden");
  output.classList.add("hidden");
  updateProgress(0);
}

function hideLoader() {
  loader.classList.add("hidden");
  progressContainer.classList.add("hidden");
}

// Extract audio (MP3)
extractAudioBtn.addEventListener("click", async () => {
  if (!uploadedFile) {
    alert("Upload video dulu!");
    return;
  }
  await processFile("audio");
});

// Extract video tanpa audio (mute)
extractVideoBtn.addEventListener("click", async () => {
  if (!uploadedFile) {
    alert("Upload video dulu!");
    return;
  }
  await processFile("video");
});

// Main process
async function processFile(mode) {
  showLoader();

  try {
    if (!ffmpeg.isLoaded()) {
      console.log("Loading ffmpeg-core...");
      await ffmpeg.load();
    }

    // Masukkan file ke virtual FS
    ffmpeg.FS("writeFile", uploadedFile.name, await fetchFile(uploadedFile));

    let outputName;
    if (mode === "audio") {
      outputName = "output.mp3";
      await ffmpeg.run("-i", uploadedFile.name, "-q:a", "0", "-map", "a", outputName);
    } else {
      outputName = "output.mp4";
      await ffmpeg.run("-i", uploadedFile.name, "-an", outputName);
    }

    // Ambil hasil
    const data = ffmpeg.FS("readFile", outputName);
    const url = URL.createObjectURL(new Blob([data.buffer], { type: mode === "audio" ? "audio/mp3" : "video/mp4" }));

    downloadLink.href = url;
    downloadLink.download = outputName;
    output.classList.remove("hidden");

  } catch (err) {
    console.error("Error:", err);
    alert("Terjadi kesalahan saat proses.");
  } finally {
    hideLoader();
  }
}
