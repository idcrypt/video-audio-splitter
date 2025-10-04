const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true, corePath: './libs/ffmpeg-core.js' });

const uploader = document.getElementById('uploader');
const splitBtn = document.getElementById('splitBtn');
const loader = document.getElementById('loader');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const output = document.getElementById('output');
const downloadLink = document.getElementById('downloadLink');

splitBtn.addEventListener('click', async () => {
  if (!uploader.files.length) {
    alert('Please select a video file first.');
    return;
  }

  const file = uploader.files[0];

  // Show loader
  loader.classList.remove('hidden');
  progressContainer.classList.add('hidden');
  output.classList.add('hidden');

  // Load FFmpeg if not ready
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  // Hide loader, show progress bar
  loader.classList.add('hidden');
  progressContainer.classList.remove('hidden');

  ffmpeg.setProgress(({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '%';
  });

  // Write input file
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // Run FFmpeg command (extract audio only)
  await ffmpeg.run('-i', file.name, '-vn', '-acodec', 'mp3', 'output.mp3');

  // Read the result
  const data = ffmpeg.FS('readFile', 'output.mp3');
  const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mp3' }));

  // Show download link
  progressContainer.classList.add('hidden');
  output.classList.remove('hidden');
  downloadLink.href = url;
});
