const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true, corePath: './libs/ffmpeg-core.js' });

const uploader = document.getElementById('uploader');
const extractAudioBtn = document.getElementById('extractAudioBtn');
const extractVideoBtn = document.getElementById('extractVideoBtn');
const loader = document.getElementById('loader');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const output = document.getElementById('output');
const downloadLink = document.getElementById('downloadLink');

// Helper: run FFmpeg with command
async function runFFmpeg(cmd, outFile, mime) {
  if (!uploader.files.length) {
    alert('Please select a video file first.');
    return;
  }

  const file = uploader.files[0];

  // Reset UI
  loader.classList.remove('hidden');
  progressContainer.classList.add('hidden');
  output.classList.add('hidden');

  // Load FFmpeg if not yet loaded
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  // Hide loader, show progress
  loader.classList.add('hidden');
  progressContainer.classList.remove('hidden');

  ffmpeg.setProgress(({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '%';
  });

  // Write input
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // Run command
  await ffmpeg.run('-i', file.name, ...cmd, outFile);

  // Read result
  const data = ffmpeg.FS('readFile', outFile);
  const url = URL.createObjectURL(new Blob([data.buffer], { type: mime }));

  // Show download
  progressContainer.classList.add('hidden');
  output.classList.remove('hidden');
  downloadLink.href = url;
  downloadLink.download = outFile;
}

// Button actions
extractAudioBtn.addEventListener('click', () => {
  runFFmpeg(['-vn', '-acodec', 'mp3'], 'output.mp3', 'audio/mp3');
});

extractVideoBtn.addEventListener('click', () => {
  runFFmpeg(['-an', '-vcodec', 'copy'], 'output.mp4', 'video/mp4');
});
