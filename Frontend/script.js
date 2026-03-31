// Tab switching
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`${tab}-panel`).classList.add('active');
}

// Drag & drop
function handleDragOver(e, type) {
  e.preventDefault();
  document.getElementById(`${type}-zone`).classList.add('drag-over');
}
function handleDragLeave(type) {
  document.getElementById(`${type}-zone`).classList.remove('drag-over');
}
function handleDrop(e, type) {
  e.preventDefault();
  document.getElementById(`${type}-zone`).classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (type === 'audio') processAudioFile(file);
  else processImageFile(file);
}

// Audio file handling
function handleAudioFile(input) {
  if (input.files[0]) processAudioFile(input.files[0]);
}

function processAudioFile(file) {
  hideError('audio');
  const maxSize = 500 * 1024 * 1024; // 500MB

  if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
    showError('audio', 'Format non supporté. Utilisez MP3, WAV, M4A, FLAC ou OGG.');
    return;
  }
  if (file.size > maxSize) {
    showError('audio', 'Fichier trop volumineux. Maximum 500 MB.');
    return;
  }

  showFileLoading('audio', true);

  const audioUrl = URL.createObjectURL(file);
  const audioPlayer = document.getElementById('audio-player');
  audioPlayer.src = audioUrl;

  // Récupérer la durée via le player principal (évite la double URL)
  audioPlayer.onloadedmetadata = () => {
    const formattedDuration = formatDuration(audioPlayer.duration);
    document.getElementById('audio-duration').textContent = formattedDuration;
    showFileLoading('audio', false);
    // Révoquer l'URL seulement après que le player l'a chargée
    URL.revokeObjectURL(audioUrl);
    audioPlayer.onloadedmetadata = null;
  };

  audioPlayer.onerror = () => {
    showFileLoading('audio', false);
    document.getElementById('audio-duration').textContent = 'Durée inconnue';
    URL.revokeObjectURL(audioUrl);
  };

  document.getElementById('audio-name').textContent = file.name;
  document.getElementById('audio-size').textContent = formatSize(file.size);
  document.getElementById('audio-preview').classList.add('show');
  document.getElementById('audio-submit').disabled = false;
  hideResults('audio');
  window._audioFile = file;
}

// Helper pour formater la durée
function formatDuration(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return 'Durée inconnue';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Afficher/masquer l'indicateur de chargement
function showFileLoading(type, show) {
  const loadingEl = document.getElementById(`${type}-file-loading`);
  const previewContent = document.getElementById(`${type}-preview-content`);

  if (loadingEl) {
    loadingEl.classList.toggle('show', show);
  }
  if (previewContent) {
    previewContent.style.opacity = show ? '0.5' : '1';
  }
}

// Image file handling
function handleImageFile(input) {
  if (input.files[0]) processImageFile(input.files[0]);
}

function processImageFile(file) {
  hideError('image');
  if (!file.type.startsWith('image/')) {
    showError('image', 'Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou BMP.');
    return;
  }

  showFileLoading('image', true);

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('img-preview').src = e.target.result;
    document.getElementById('img-overlay-text').textContent = `${file.name} — ${formatSize(file.size)}`;
    document.getElementById('img-preview-container').classList.add('show');
    showFileLoading('image', false);
  };
  reader.onerror = () => {
    showFileLoading('image', false);
    showError('image', "Erreur lors du chargement de l'image");
  };
  reader.readAsDataURL(file);

  document.getElementById('image-submit').disabled = false;
  hideResults('image');
  window._imageFile = file;
}

function removeFile(type) {
  if (type === 'audio') {
    document.getElementById('audio-preview').classList.remove('show');
    document.getElementById('audio-submit').disabled = true;
    document.getElementById('audio-input').value = '';
    const player = document.getElementById('audio-player');
    player.src = '';
    document.getElementById('audio-duration').textContent = '--:--';
    window._audioFile = null;
  } else {
    document.getElementById('img-preview-container').classList.remove('show');
    document.getElementById('image-submit').disabled = true;
    document.getElementById('image-input').value = '';
    window._imageFile = null;
  }
  hideResults(type);
  hideError(type);
  showFileLoading(type, false);
}

async function simulateTranscription() {
  // FIX : apostrophe échappée
  if (!window._audioFile) {
    showError('audio', "Veuillez d'abord sélectionner ou enregistrer un fichier audio.");
    return;
  }

  setLoading('audio', true);
  hideResults('audio');
  hideError('audio');

  try {
    const formData = new FormData();
    formData.append('audio', window._audioFile);

    const response = await fetch('http://localhost:5500/audio/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur serveur (${response.status})`);
    }

    const data = await response.json();
    const transcript = data.text;

    const audioPlayer = document.getElementById('audio-player');
    let duration = '--:--';
    if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
      duration = formatDuration(audioPlayer.duration);
    }

    const wordCount = transcript.trim().split(/\s+/).length;

    document.getElementById('audio-stats').innerHTML = `
      <div class="stat"><div class="stat-value" style="color:var(--accent)">${wordCount}</div><div class="stat-label">MOTS</div></div>
      <div class="stat"><div class="stat-value" style="color:var(--accent3)">${duration}</div><div class="stat-label">DURÉE</div></div>
      <div class="stat"><div class="stat-value" style="color:#9b9ef8">AUTO</div><div class="stat-label">LANGUE</div></div>
    `;

    document.getElementById('audio-output').textContent = transcript;
    document.getElementById('audio-results').classList.add('show');

  } catch (err) {
    console.error('Erreur API Transcription:', err);
    showError('audio', err.message);
  } finally {
    setLoading('audio', false);
  }
}

// FIX : renommée pour correspondre à l'appel HTML (simulateImageAnalysis → analyzeImage était le bug)
// Le HTML appelait simulateImageAnalysis() — on aligne le nom ici
async function simulateImageAnalysis() {
  setLoading('image', true);
  hideResults('image');
  hideError('image');

  try {
    if (!window._imageFile) {
      throw new Error("Veuillez d'abord sélectionner une image");
    }

    const formData = new FormData();
    formData.append('image', window._imageFile);

    const response = await fetch('http://localhost:5500/api/image/describe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur serveur : ${response.status}`);
    }

    const data = await response.json();
    console.log('Réponse API Image:', data);

    // Correction de la condition : on vérifie si data.description existe
    if (data.description) {
      
      // On prépare l'affichage des stats
      // Si vous n'avez plus de 'labels' pour la confiance, on met une valeur par défaut ou on adapte
      const confidenceHtml = data.confidence 
        ? `<div class="stat"><div class="stat-value" style="color:var(--accent3)">${data.confidence.toFixed(1)}%</div><div class="stat-label">CONFIANCE</div></div>`
        : '';

      document.getElementById('image-stats').innerHTML = `
        <div class="stat" style="flex: 2;">
          <div class="stat-value" style="color:var(--accent2); font-size: 1.1rem;">${data.description}</div>
          <div class="stat-label">DESCRIPTION GÉNÉRÉE</div>
        </div>
        ${confidenceHtml}
      `;

      const container = document.getElementById('image-output');
      container.innerHTML = '';

      // Si l'API ne renvoie plus de tableau "labels", on peut simplement 
      // afficher la description dans le conteneur principal
      const descTag = document.createElement('div');
      descTag.className = `tag high`;
      descTag.innerHTML = `Analyse réussie`;
      container.appendChild(descTag);

      document.getElementById('image-results').classList.add('show');
    } else {
      throw new Error("L'API n'a pas renvoyé de description valide.");
    }

  } catch (err) {
    console.error("Erreur d'analyse:", err);
    showError('image', err.message);
  } finally {
    setLoading('image', false);
  }
}

// Helpers
function animateProgress(type, duration, callback) {
  const bar = document.getElementById(`${type}-progress`);
  const fill = document.getElementById(`${type}-progress-fill`);
  bar.classList.add('show');
  fill.style.width = '0%';

  const start = Date.now();
  const tick = () => {
    const pct = Math.min(((Date.now() - start) / duration) * 100, 95);
    fill.style.width = pct + '%';
    if (pct < 95) requestAnimationFrame(tick);
    else {
      fill.style.width = '100%';
      setTimeout(() => { bar.classList.remove('show'); callback(); }, 200);
    }
  };
  requestAnimationFrame(tick);
}

function setLoading(type, loading) {
  const btn = document.getElementById(`${type}-submit`);
  const spinner = document.getElementById(`${type}-spinner`);
  const text = document.getElementById(`${type}-btn-text`);
  btn.disabled = loading;
  spinner.classList.toggle('show', loading);
  text.textContent = loading
    ? (type === 'audio' ? 'Transcription en cours...' : 'Analyse en cours...')
    : (type === 'audio' ? '🚀 Lancer la transcription' : "🔍 Analyser l'image");
}

function showError(type, msg) {
  document.getElementById(`${type}-error-text`).textContent = msg;
  document.getElementById(`${type}-error`).classList.add('show');
}
function hideError(type) {
  document.getElementById(`${type}-error`).classList.remove('show');
}
function hideResults(type) {
  document.getElementById(`${type}-results`).classList.remove('show');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Live recording ──────────────────────────────────────────
let _recording = false;
let _mediaRecorder = null;
let _audioChunks = [];
let _timerInterval = null;
let _seconds = 0;
let _audioCtx = null;
let _analyser = null;
let _animFrame = null;
let _stream = null;
let _recordedBlob = null;

async function toggleRecording() {
  if (_recording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  hideError('live');
  try {
    _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    showError('live', 'Microphone non accessible. Vérifiez les permissions du navigateur.');
    return;
  }

  document.getElementById('live-actions').classList.remove('show');
  document.getElementById('live-results').classList.remove('show');

  _audioChunks = [];
  _mediaRecorder = new MediaRecorder(_stream);
  _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
  _mediaRecorder.onstop = onRecordingStop;
  _mediaRecorder.start(100);

  _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  _analyser = _audioCtx.createAnalyser();
  _analyser.fftSize = 256;
  const src = _audioCtx.createMediaStreamSource(_stream);
  src.connect(_analyser);
  drawWaveform();

  _recording = true;
  document.getElementById('live-mic-btn').classList.add('recording');
  document.getElementById('live-pulse').classList.add('recording');
  document.getElementById('live-status').textContent = 'Enregistrement en cours…';
  document.getElementById('live-status').classList.add('recording');
  document.getElementById('live-timer').classList.add('recording');
  document.getElementById('live-mic-icon').textContent = '⏹️';

  _seconds = 0;
  updateTimer();
  _timerInterval = setInterval(updateTimer, 1000);
}

function stopRecording() {
  _recording = false;
  clearInterval(_timerInterval);
  cancelAnimationFrame(_animFrame);
  _mediaRecorder.stop();
  _stream.getTracks().forEach(t => t.stop());

  document.getElementById('live-mic-btn').classList.remove('recording');
  document.getElementById('live-pulse').classList.remove('recording');
  document.getElementById('live-status').classList.remove('recording');
  document.getElementById('live-timer').classList.remove('recording');
  document.getElementById('live-mic-icon').textContent = '🎙️';

  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function onRecordingStop() {
  _recordedBlob = new Blob(_audioChunks, { type: 'audio/webm' });
  const audioUrl = URL.createObjectURL(_recordedBlob);

  const audioPlayer = document.getElementById('live-audio-player');
  audioPlayer.src = audioUrl;

  // FIX : révoquer l'URL via le player principal uniquement
  audioPlayer.onloadedmetadata = () => {
    const formattedDuration = formatDuration(audioPlayer.duration);
    document.getElementById('live-audio-duration').textContent = formattedDuration;
    URL.revokeObjectURL(audioUrl);
    audioPlayer.onloadedmetadata = null;
  };

  document.getElementById('live-status').textContent = 'Enregistrement terminé';
  document.getElementById('live-actions').classList.add('show');
}

function playLiveRecording() {
  const audioPlayer = document.getElementById('live-audio-player');
  audioPlayer.play().catch(err => {
    console.error('Erreur de lecture:', err);
    showError('live', "Impossible de lire l'enregistrement");
  });
}

function deleteLiveRecording() {
  _recordedBlob = null;
  document.getElementById('live-audio-player').src = '';
  document.getElementById('live-audio-duration').textContent = '--:--';
  document.getElementById('live-actions').classList.remove('show');
  document.getElementById('live-results').classList.remove('show');
  document.getElementById('live-status').textContent = 'Appuyez pour enregistrer';
  _audioChunks = [];
  _seconds = 0;
  updateTimer();
}

async function validateAndTranscribe() {
  if (!_recordedBlob) {
    showError('live', 'Aucun enregistrement à transcrire');
    return;
  }

  const liveOutput = document.getElementById('live-output');
  const liveStatus = document.getElementById('live-status');
  const liveStats = document.getElementById('live-stats');

  try {
    liveStatus.textContent = 'Transcription en cours...';
    document.getElementById('live-actions').classList.remove('show');

    const formData = new FormData();
    formData.append('audio', _recordedBlob, 'recording.webm');

    const response = await fetch('http://localhost:5500/audio/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);

    const data = await response.json();
    const transcriptText = data.text || 'Aucun texte reçu.';

    const audioPlayer = document.getElementById('live-audio-player');
    let duration = _seconds;
    if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
      duration = Math.floor(audioPlayer.duration);
    }

    const wordCount = transcriptText.split(/\s+/).filter(w => w.length > 0).length;

    liveStats.innerHTML = `
      <div class="stat"><div class="stat-value" style="color:var(--accent3)">${duration}s</div><div class="stat-label">DURÉE</div></div>
      <div class="stat"><div class="stat-value" style="color:var(--accent)">${wordCount}</div><div class="stat-label">MOTS</div></div>
      <div class="stat"><div class="stat-value" style="color:#9b9ef8">AUTO</div><div class="stat-label">LANGUE</div></div>
    `;

    liveOutput.textContent = transcriptText;
    document.getElementById('live-results').classList.add('show');
    liveStatus.textContent = 'Appuyez pour un nouvel enregistrement';

    // FIX : l'élément live-copy-btn n'existe pas dans le HTML — ligne supprimée

  } catch (err) {
    console.error(err);
    liveStatus.textContent = 'Erreur lors de la transcription';
    showError('live', 'Erreur transcription : ' + err.message);
    document.getElementById('live-actions').classList.add('show');
  }
}

function updateTimer() {
  const m = String(Math.floor(_seconds / 60)).padStart(2, '0');
  const s = String(_seconds % 60).padStart(2, '0');
  document.getElementById('live-timer').textContent = `${m}:${s}`;
  _seconds++;
}

function drawWaveform() {
  const canvas = document.getElementById('waveform-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const bufLen = _analyser.frequencyBinCount;
  const dataArr = new Uint8Array(bufLen);

  function draw() {
    if (!_recording) return;
    _animFrame = requestAnimationFrame(draw);
    _analyser.getByteTimeDomainData(dataArr);
    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(91,94,244,0.7)');
    grad.addColorStop(0.5, 'rgba(36,214,176,0.9)');
    grad.addColorStop(1, 'rgba(232,93,158,0.7)');

    ctx.lineWidth = 2;
    ctx.strokeStyle = grad;
    ctx.beginPath();

    const sliceW = W / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = dataArr[i] / 128.0;
      const y = (v * H) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sliceW;
    }
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(36,214,176,0.08)';
    ctx.stroke();
  }
  draw();
}

// FIX : event passé en paramètre pour compatibilité Firefox et mode strict
function copyLiveResult(event) {
  const text = document.getElementById('live-output').textContent;
  navigator.clipboard.writeText(text);
  const btn = event.currentTarget;
  const originalText = btn.textContent;
  btn.textContent = '✅ Copié !';
  setTimeout(() => btn.textContent = originalText, 1500);
}

function newLiveRecording() {
  _recordedBlob = null;
  document.getElementById('live-audio-player').src = '';
  document.getElementById('live-audio-duration').textContent = '--:--';
  document.getElementById('live-actions').classList.remove('show');
  document.getElementById('live-results').classList.remove('show');
  document.getElementById('live-status').textContent = 'Appuyez pour enregistrer';
  document.getElementById('live-output').textContent = '';
  _audioChunks = [];
  _seconds = 0;
  updateTimer();
  hideError('live');
}
// ── End Live recording ────────────────────────────────────────

// FIX : event passé en paramètre pour compatibilité Firefox et mode strict
function copyResult(type, event) {
  if (type === 'audio') {
    const text = document.getElementById('audio-output').textContent;
    navigator.clipboard.writeText(text);
  } else {
    const tags = [...document.querySelectorAll('#image-output .tag')].map(t => t.textContent.trim()).join(', ');
    navigator.clipboard.writeText(tags);
  }
  const btn = event.currentTarget;
  btn.textContent = '✅ Copié !';
  setTimeout(() => btn.textContent = '📋 Copier', 1500);
}

// ── Theme Toggle ──────────────────────────────────────────────
(function () {
  const STORAGE_KEY = 'ms-theme';
  const toggle = document.getElementById('themeToggle');
 
  // Restore saved preference or detect system
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
 
  document.documentElement.setAttribute('data-theme', theme);
 
  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }
 
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
})();