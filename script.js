const { createFFmpeg, fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
  log: true,
  corePath: './libs/ffmpeg-core.js'
});

const uploader = document.getElementById('uploader');
const processBtn = document.getElementById('processBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const downloadAudio = document.getElementById('downloadAudio');
const downloadVideo = document.getElementById('downloadVideo');

processBtn.addEventListener('click', async () => {
  if (!uploader.files.length) {
    alert('Please upload a video first!');
    return;
  }

  loading.classList.remove('hidden');
  results.classList.add('hidden');

  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const file = uploader.files[0];
  const fileName = 'input.mp4';

  ffmpeg.FS('writeFile', fileName, await fetchFile(file));

  // Extract audio
  await ffmpeg.run('-i', fileName, '-q:a', '0', '-map', 'a', 'audio.mp3');
  // Extract video without audio
  await ffmpeg.run('-i', fileName, '-an', '-vcodec', 'copy', 'video.mp4');

  const audioData = ffmpeg.FS('readFile', 'audio.mp3');
  const videoData = ffmpeg.FS('readFile', 'video.mp4');

  // Convert Uint8Array to Blob
  const audioBlob = new Blob([audioData.buffer], { type: 'audio/mp3' });
  const videoBlob = new Blob([videoData.buffer], { type: 'video/mp4' });

  // Create download links
  downloadAudio.href = URL.createObjectURL(audioBlob);
  downloadVideo.href = URL.createObjectURL(videoBlob);

  loading.classList.add('hidden');
  results.classList.remove('hidden');
});
