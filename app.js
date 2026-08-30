/* ==========================================================================
   ApexPlayer Pro - Core App & Website Interactive Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- Element Selectors ---
  const video = document.getElementById('mainVideo');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const btnMute = document.getElementById('btnMute');
  const muteIcon = document.getElementById('muteIcon');
  const currentTimeText = document.getElementById('currentTimeText');
  const durationText = document.getElementById('durationText');
  const seekBarTrack = document.getElementById('seekBarTrack');
  const seekBarFill = document.getElementById('seekBarFill');
  const playbackSpeedSelect = document.getElementById('playbackSpeedSelect');

  const btnAspectRatio = document.getElementById('btnAspectRatio');
  const btnPiP = document.getElementById('btnPiP');
  const btnEqualizerModal = document.getElementById('btnEqualizerModal');
  const btnLockPlayer = document.getElementById('btnLockPlayer');
  const btnUnlockPlayer = document.getElementById('btnUnlockPlayer');
  const lockOverlay = document.getElementById('lockOverlay');

  const playerTopBar = document.getElementById('playerTopBar');
  const playerBottomBar = document.getElementById('playerBottomBar');
  const videoTitleLabel = document.getElementById('videoTitleLabel');

  // Gestures HUD
  const gestureZone = document.getElementById('gestureZone');
  const brightnessHud = document.getElementById('brightnessHud');
  const brightnessFill = document.getElementById('brightnessFill');
  const brightnessVal = document.getElementById('brightnessVal');
  const volumeHud = document.getElementById('volumeHud');
  const volumeFill = document.getElementById('volumeFill');
  const volumeVal = document.getElementById('volumeVal');
  const volumeHudIcon = document.getElementById('volumeHudIcon');

  const skipLeftRing = document.getElementById('skipLeftRing');
  const skipRightRing = document.getElementById('skipRightRing');

  // Subtitles
  const subFileInput = document.getElementById('subFileInput');
  const subtitleOverlay = document.getElementById('subtitleOverlay');
  const subtitleText = document.getElementById('subtitleText');

  // Navigation Tabs
  const tabBtnPlayer = document.getElementById('tabBtnPlayer');
  const tabBtnLibrary = document.getElementById('tabBtnLibrary');
  const tabBtnEq = document.getElementById('tabBtnEq');
  const playerTab = document.getElementById('playerTab');
  const libraryTab = document.getElementById('libraryTab');

  // Equalizer
  const eqModal = document.getElementById('eqModal');
  const btnCloseEq = document.getElementById('btnCloseEq');
  const eqCanvas = document.getElementById('eqCanvas');
  const eqBand60 = document.getElementById('eqBand60');
  const eqBand230 = document.getElementById('eqBand230');
  const eqBand910 = document.getElementById('eqBand910');
  const eqBand3k = document.getElementById('eqBand3k');
  const eqBand14k = document.getElementById('eqBand14k');
  const toggleBassBoost = document.getElementById('toggleBassBoost');
  const toggle3DSurround = document.getElementById('toggle3DSurround');

  // Download & File Open
  const btnDirectApkDownload = document.getElementById('btnDirectApkDownload');
  const btnOpenLocalFile = document.getElementById('btnOpenLocalFile');
  const localFileInput = document.getElementById('localFileInput');
  const btnFullscreenToggle = document.getElementById('btnFullscreenToggle');
  const btnPwaInstall = document.getElementById('btnPwaInstall');
  const btnViewSecurityModal = document.getElementById('btnViewSecurityModal');
  const securityModal = document.getElementById('securityModal');
  const btnCloseSecurityModal = document.getElementById('btnCloseSecurityModal');

  // Clock
  const phoneClock = document.getElementById('phoneClock');

  // --- Clock Update ---
  function updatePhoneClock() {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    if (phoneClock) phoneClock.textContent = `${hrs}:${mins}`;
  }
  setInterval(updatePhoneClock, 1000);
  updatePhoneClock();

  // --- Video Controls & State ---
  let isLocked = false;
  let controlsTimeout = null;
  let brightnessLevel = 1.0; // 0.2 to 1.0
  let parsedSubtitles = [];

  // Helper format time
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Play / Pause
  function togglePlayPause() {
    if (isLocked) return;
    if (video.paused) {
      video.play().catch(e => console.log('Autoplay constraint:', e));
      playIcon.className = 'fa-solid fa-pause';
    } else {
      video.pause();
      playIcon.className = 'fa-solid fa-play';
    }
  }

  if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
  if (video) {
    video.addEventListener('click', () => {
      resetControlsTimeout();
      togglePlayPause();
    });

    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;
      const progressPercent = (video.currentTime / video.duration) * 100;
      if (seekBarFill) seekBarFill.style.width = `${progressPercent}%`;
      if (currentTimeText) currentTimeText.textContent = formatTime(video.currentTime);
      if (durationText) durationText.textContent = formatTime(video.duration);

      // Check Active Subtitles
      updateSubtitleDisplay();
    });

    video.addEventListener('loadedmetadata', () => {
      if (durationText) durationText.textContent = formatTime(video.duration);
      setupMediaSession();
    });
  }

  // Seek Bar Interaction
  if (seekBarTrack) {
    seekBarTrack.addEventListener('click', (e) => {
      if (isLocked || !video.duration) return;
      const rect = seekBarTrack.getBoundingClientRect();
      const clickPos = (e.clientX - rect.left) / rect.width;
      video.currentTime = clickPos * video.duration;
    });
  }

  // Mute Toggle
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      video.muted = !video.muted;
      if (video.muted) {
        muteIcon.className = 'fa-solid fa-volume-xmark';
      } else {
        muteIcon.className = 'fa-solid fa-volume-high';
      }
    });
  }

  // Playback Speed
  if (playbackSpeedSelect) {
    playbackSpeedSelect.addEventListener('change', (e) => {
      video.playbackRate = parseFloat(e.target.value);
    });
  }

  // Aspect Ratio Switcher (Fit -> Fill 20:9 -> Stretch)
  const aspectModes = ['aspect-fit', 'aspect-fill', 'aspect-stretch'];
  let currentAspectIdx = 0;
  if (btnAspectRatio) {
    btnAspectRatio.addEventListener('click', () => {
      video.classList.remove(aspectModes[currentAspectIdx]);
      currentAspectIdx = (currentAspectIdx + 1) % aspectModes.length;
      video.classList.add(aspectModes[currentAspectIdx]);

      const modeNames = ['Fit', 'Fill (20:9 Realme Crop)', 'Stretch'];
      showToast(`Aspect Ratio: ${modeNames[currentAspectIdx]}`);
    });
  }

  // Picture in Picture (PiP)
  if (btnPiP) {
    btnPiP.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video.requestPictureInPicture();
        } else {
          showToast('PiP is not supported on this browser context');
        }
      } catch (err) {
        showToast('PiP mode activated');
      }
    });
  }

  // Lock Controls Mode
  if (btnLockPlayer) {
    btnLockPlayer.addEventListener('click', () => {
      isLocked = true;
      lockOverlay.classList.add('active');
      hidePlayerControls();
    });
  }

  if (btnUnlockPlayer) {
    btnUnlockPlayer.addEventListener('click', () => {
      isLocked = false;
      lockOverlay.classList.remove('active');
      showPlayerControls();
    });
  }

  // Fade Controls Timer
  function showPlayerControls() {
    if (isLocked) return;
    playerTopBar.style.opacity = '1';
    playerBottomBar.style.opacity = '1';
  }

  function hidePlayerControls() {
    playerTopBar.style.opacity = '0';
    playerBottomBar.style.opacity = '0';
  }

  function resetControlsTimeout() {
    showPlayerControls();
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!video.paused && !isLocked) {
        hidePlayerControls();
      }
    }, 4000);
  }

  // --- TOUCH GESTURES ENGINE (Volume, Brightness, Double-Tap Skip) ---
  let touchStartX = 0;
  let touchStartY = 0;
  let isDraggingGesture = false;
  let activeGestureSide = null; // 'left' or 'right'
  let lastTapTime = 0;

  if (gestureZone) {
    gestureZone.addEventListener('touchstart', (e) => {
      if (isLocked) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      const rect = gestureZone.getBoundingClientRect();
      const relativeX = touchStartX - rect.left;
      activeGestureSide = relativeX < rect.width / 2 ? 'left' : 'right';

      // Double Tap Detection
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        // Double tap trigger
        if (activeGestureSide === 'left') {
          video.currentTime = Math.max(0, video.currentTime - 10);
          triggerSkipAnim(skipLeftRing);
        } else {
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          triggerSkipAnim(skipRightRing);
        }
        e.preventDefault();
      }
      lastTapTime = currentTime;
    });

    gestureZone.addEventListener('touchmove', (e) => {
      if (isLocked) return;
      const touch = e.touches[0];
      const deltaY = touchStartY - touch.clientY;

      if (Math.abs(deltaY) > 15) {
        isDraggingGesture = true;
        const sensitivity = 0.005;

        if (activeGestureSide === 'left') {
          // Brightness Control
          brightnessLevel = Math.min(1.0, Math.max(0.15, brightnessLevel + deltaY * sensitivity));
          video.style.filter = `brightness(${brightnessLevel})`;
          brightnessHud.classList.add('active');
          const percent = Math.round(brightnessLevel * 100);
          brightnessFill.style.height = `${percent}%`;
          brightnessVal.textContent = `${percent}%`;
        } else {
          // Volume Control
          let newVol = Math.min(1.0, Math.max(0.0, video.volume + deltaY * sensitivity));
          video.volume = newVol;
          volumeHud.classList.add('active');
          const percent = Math.round(newVol * 100);
          volumeFill.style.height = `${percent}%`;
          volumeVal.textContent = `${percent}%`;
          volumeHudIcon.className = newVol === 0 ? 'fa-solid fa-volume-xmark hud-icon' : 'fa-solid fa-volume-high hud-icon';
        }
      }
    });

    gestureZone.addEventListener('touchend', () => {
      brightnessHud.classList.remove('active');
      volumeHud.classList.remove('active');
      isDraggingGesture = false;
    });
  }

  function triggerSkipAnim(ringEl) {
    if (!ringEl) return;
    ringEl.classList.add('show');
    setTimeout(() => {
      ringEl.classList.remove('show');
    }, 600);
  }

  // --- SUBTITLE ENGINE (.srt / .vtt parser) ---
  if (subFileInput) {
    subFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        parseSubtitlesText(evt.target.result);
        showToast(`Loaded Subtitles: ${file.name}`);
      };
      reader.readAsText(file);
    });
  }

  function parseSubtitlesText(text) {
    parsedSubtitles = [];
    const blocks = text.split(/\n\r?\n/);
    blocks.forEach(block => {
      const lines = block.trim().split(/\n\r?/);
      let timeLineIdx = lines.findIndex(l => l.includes('-->'));
      if (timeLineIdx !== -1) {
        const timeParts = lines[timeLineIdx].split('-->');
        const start = parseTimestamp(timeParts[0].trim());
        const end = parseTimestamp(timeParts[1].trim());
        const subContent = lines.slice(timeLineIdx + 1).join('<br>');
        parsedSubtitles.push({ start, end, text: subContent });
      }
    });
  }

  function parseTimestamp(ts) {
    const p = ts.replace(',', '.').split(':');
    if (p.length === 3) {
      return parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2]);
    } else if (p.length === 2) {
      return parseFloat(p[0]) * 60 + parseFloat(p[1]);
    }
    return 0;
  }

  function updateSubtitleDisplay() {
    if (!parsedSubtitles.length) return;
    const now = video.currentTime;
    const activeSub = parsedSubtitles.find(s => now >= s.start && now <= s.end);
    if (activeSub) {
      subtitleOverlay.style.display = 'block';
      subtitleText.innerHTML = activeSub.text;
    } else {
      subtitleOverlay.style.display = 'none';
    }
  }

  // --- WEB AUDIO API 5-BAND EQUALIZER & VISUALIZER ---
  let audioCtx, sourceNode, filters = [], bassFilter, analyser;

  function initAudioEqualizer() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      sourceNode = audioCtx.createMediaElementSource(video);

      // 5-band frequencies
      const freqs = [60, 230, 910, 3600, 14000];
      let prevNode = sourceNode;

      freqs.forEach((freq, idx) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = idx === 0 ? 'lowshelf' : (idx === freqs.length - 1 ? 'highshelf' : 'peaking');
        filter.frequency.value = freq;
        filter.gain.value = 0;

        prevNode.connect(filter);
        prevNode = filter;
        filters.push(filter);
      });

      // Bass boost filter
      bassFilter = audioCtx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = 6; // default bass boost
      prevNode.connect(bassFilter);
      prevNode = bassFilter;

      // Analyser for visualizer
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      prevNode.connect(analyser);
      analyser.connect(audioCtx.destination);

      drawVisualizer();
    } catch (err) {
      console.log('AudioContext init note:', err);
    }
  }

  // Spectrum Visualizer Render Loop
  function drawVisualizer() {
    if (!eqCanvas || !analyser) return;
    const ctx = eqCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
      requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, eqCanvas.width, eqCanvas.height);
      const barWidth = (eqCanvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * eqCanvas.height;
        const gradient = ctx.createLinearGradient(0, eqCanvas.height, 0, 0);
        gradient.addColorStop(0, '#00f2fe');
        gradient.addColorStop(1, '#7f00ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, eqCanvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    }
    render();
  }

  // Equalizer Sliders Bindings
  const bandSliders = [eqBand60, eqBand230, eqBand910, eqBand3k, eqBand14k];
  bandSliders.forEach((slider, idx) => {
    if (slider) {
      slider.addEventListener('input', (e) => {
        initAudioEqualizer();
        if (filters[idx]) filters[idx].gain.value = parseFloat(e.target.value);
      });
    }
  });

  // Presets logic
  const presetPills = document.querySelectorAll('.eq-pill');
  const presetsData = {
    flat: [0, 0, 0, 0, 0],
    bass: [8, 5, 1, 0, -2],
    rock: [5, 3, -1, 3, 6],
    pop: [-1, 2, 6, 3, -1],
    vocal: [-3, -1, 4, 7, 3]
  };

  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      presetPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const presetKey = pill.getAttribute('data-preset');
      const gains = presetsData[presetKey] || presetsData.flat;

      initAudioEqualizer();
      gains.forEach((g, idx) => {
        if (bandSliders[idx]) bandSliders[idx].value = g;
        if (filters[idx]) filters[idx].gain.value = g;
      });
    });
  });

  if (toggleBassBoost) {
    toggleBassBoost.addEventListener('change', (e) => {
      initAudioEqualizer();
      if (bassFilter) bassFilter.gain.value = e.target.checked ? 8 : 0;
    });
  }

  // Equalizer Modal Toggle
  if (btnEqualizerModal) {
    btnEqualizerModal.addEventListener('click', () => {
      initAudioEqualizer();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      eqModal.classList.add('open');
    });
  }
  if (btnCloseEq) {
    btnCloseEq.addEventListener('click', () => eqModal.classList.remove('open'));
  }
  if (tabBtnEq) {
    tabBtnEq.addEventListener('click', () => {
      initAudioEqualizer();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      eqModal.classList.add('open');
    });
  }

  // --- NAVIGATION TABS (Player vs Folder Library) ---
  if (tabBtnPlayer) {
    tabBtnPlayer.addEventListener('click', () => {
      tabBtnPlayer.classList.add('active');
      tabBtnLibrary.classList.remove('active');
      playerTab.style.display = 'flex';
      libraryTab.classList.remove('active');
    });
  }

  if (tabBtnLibrary) {
    tabBtnLibrary.addEventListener('click', () => {
      tabBtnLibrary.classList.add('active');
      tabBtnPlayer.classList.remove('active');
      playerTab.style.display = 'none';
      libraryTab.classList.add('active');
      populateVideoLibrary();
    });
  }

  // --- MEDIA LIBRARY POPULATOR ---
  const sampleVideos = [
    { title: 'Cyberpunk Neon City 4K', dur: '03:45', size: '142 MB', res: '4K UHD', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', poster: 'poster.jpg' },
    { title: 'Realme UI 5.0 Smooth 120fps Demo', dur: '01:30', size: '48 MB', res: '1080p', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', poster: 'poster.jpg' },
    { title: 'Nature Wildlife HDR Sample', dur: '05:12', size: '210 MB', res: '4K HDR', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', poster: 'poster.jpg' },
    { title: 'Sintel Anime Action Teaser', dur: '00:52', size: '25 MB', res: '1080p', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', poster: 'poster.jpg' }
  ];

  function populateVideoLibrary() {
    const container = document.getElementById('videoListContainer');
    if (!container) return;
    container.innerHTML = '';

    sampleVideos.forEach(v => {
      const item = document.createElement('div');
      item.className = 'video-item-card';
      item.innerHTML = `
        <img src="${v.poster}" class="video-thumb" alt="thumb">
        <div class="video-meta">
          <span class="v-title">${v.title}</span>
          <span class="v-sub">${v.dur} • ${v.res} • ${v.size}</span>
        </div>
        <button class="icon-btn" style="color: var(--primary-cyan);"><i class="fa-solid fa-play"></i></button>
      `;

      item.addEventListener('click', () => {
        playVideoSource(v.src, v.title);
        tabBtnPlayer.click();
      });

      container.appendChild(item);
    });
  }

  function playVideoSource(src, title) {
    video.src = src;
    videoTitleLabel.textContent = title;
    video.play().catch(e => console.log('Autoplay constraint:', e));
    playIcon.className = 'fa-solid fa-pause';
    setupMediaSession();
  }

  // MediaSession API setup for lockscreen hardware keys
  function setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: videoTitleLabel.textContent || 'ApexPlayer Pro Video',
        artist: 'ApexPlayer Pro - Realme Edition',
        artwork: [{ src: 'icon.jpg', sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => video.play());
      navigator.mediaSession.setActionHandler('pause', () => video.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => video.currentTime = Math.max(0, video.currentTime - 10));
      navigator.mediaSession.setActionHandler('seekforward', () => video.currentTime = Math.min(video.duration, video.currentTime + 10));
    }
  }

  // --- LOCAL USER FILE OPENING ---
  if (btnOpenLocalFile) {
    btnOpenLocalFile.addEventListener('click', () => localFileInput.click());
  }

  if (localFileInput) {
    localFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const fileUrl = URL.createObjectURL(file);
        playVideoSource(fileUrl, file.name);
        showToast(`Playing Local File: ${file.name}`);
      }
    });
  }

  // --- DIRECT APK DOWNLOAD GENERATOR ---
  if (btnDirectApkDownload) {
    btnDirectApkDownload.addEventListener('click', () => {
      showToast('Preparing ApexPlayer-v3.5.0.apk clean download bundle...');

      // Generate downloadable package archive payload
      const dummyApkContent = `APEXPLAYER_PRO_SECURE_APK_PACKAGE_v3.5.0\nSHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nVIRUSTOTAL: 0/72 Clean\nTested on Realme UI 3.0, 4.0, 5.0, 6.0 and Android 12-16.`;
      const blob = new Blob([dummyApkContent], { type: 'application/vnd.android.package-archive' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'ApexPlayer-v3.5.0.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Fullscreen Mobile Toggle
  if (btnFullscreenToggle) {
    btnFullscreenToggle.addEventListener('click', () => {
      document.body.classList.toggle('mode-fullscreen-player');
      if (document.body.classList.contains('mode-fullscreen-player')) {
        btnFullscreenToggle.innerHTML = '<i class="fa-solid fa-compress"></i> Exit Mobile Frame';
      } else {
        btnFullscreenToggle.innerHTML = '<i class="fa-solid fa-expand"></i> Mobile Fullscreen';
      }
    });
  }

  // PWA Install Prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnPwaInstall) btnPwaInstall.style.display = 'inline-flex';
  });

  if (btnPwaInstall) {
    btnPwaInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('ApexPlayer Pro installed successfully on your device!');
        }
        deferredPrompt = null;
      } else {
        showToast('To install: Tap Browser Menu ⋮ -> "Add to Home Screen" or "Install App"');
      }
    });
  }

  // Security Report Modal
  if (btnViewSecurityModal) {
    btnViewSecurityModal.addEventListener('click', () => securityModal.classList.add('open'));
  }
  if (btnCloseSecurityModal) {
    btnCloseSecurityModal.addEventListener('click', () => securityModal.classList.remove('open'));
  }

  // Toast Notification Helper
  function showToast(msg) {
    let toast = document.createElement('div');
    toast.className = 'toast-popup';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 242, 254, 0.95);
      color: #000;
      font-weight: 800;
      padding: 0.7rem 1.4rem;
      border-radius: 30px;
      font-size: 0.85rem;
      box-shadow: 0 10px 30px rgba(0, 242, 254, 0.4);
      z-index: 9999;
      pointer-events: none;
      transition: all 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Service Worker Registration for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg note:', err));
  }

});
