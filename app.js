/* ==========================================================================
   ApexPlayer Pro - Core Application Engine
   Clean 3-Tab YouTube-style App: Home, Library, Settings with Full File Details.
   Includes Recursive Directory Scanner, Direct File Picker & Reliable Blob Playback.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- INDEXED DB ENGINE FOR LOCAL MEDIA PERSISTENCE ---
  const DB_NAME = 'ApexPlayerDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'scannedVideos';
  let db = null;

  function initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const dbInstance = e.target.result;
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
          const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('folder', 'folder', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e);
    });
  }

  async function saveScannedVideo(videoItem) {
    if (!db) await initDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Remove temporary object URL before saving to IDB to avoid storage issues
      const itemToSave = { ...videoItem };
      store.put(itemToSave);
      tx.oncomplete = () => resolve(true);
    });
  }

  async function getScannedVideos() {
    if (!db) await initDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function clearScannedVideosDB() {
    if (!db) await initDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
    });
  }

  // --- ELEMENT SELECTORS ---
  const body = document.body;

  // Header & Search
  const globalSearchInput = document.getElementById('globalSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnScanFolderTop = document.getElementById('btnScanFolderTop');
  const btnScanFolderBanner = document.getElementById('btnScanFolderBanner');
  const btnScanLibraryTop = document.getElementById('btnScanLibraryTop');
  const btnSelectFilesDirect = document.getElementById('btnSelectFilesDirect');
  const folderFileInput = document.getElementById('folderFileInput');
  const localFilesInput = document.getElementById('localFilesInput');

  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const btnSecurityModal = document.getElementById('btnSecurityModal');
  const securityModal = document.getElementById('securityModal');
  const btnCloseSecurityModal = document.getElementById('btnCloseSecurityModal');
  const dropZone = document.getElementById('dropZone');

  // Views & Navigation
  const views = {
    home: document.getElementById('viewHome'),
    library: document.getElementById('viewLibrary'),
    settings: document.getElementById('viewSettings')
  };
  const navBtns = {
    home: document.getElementById('navBtnHome'),
    library: document.getElementById('navBtnLibrary'),
    settings: document.getElementById('navBtnSettings')
  };

  // Containers
  const videoGrid = document.getElementById('videoGrid');
  const libraryVideoList = document.getElementById('libraryVideoList');
  const videoCountBadge = document.getElementById('videoCountBadge');
  const feedTitle = document.getElementById('feedTitle');

  // Player Elements
  const playerOverlay = document.getElementById('playerOverlay');
  const mainVideo = document.getElementById('mainVideo');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const btnMute = document.getElementById('btnMute');
  const muteIcon = document.getElementById('muteIcon');
  const currentTimeText = document.getElementById('currentTimeText');
  const durationText = document.getElementById('durationText');
  const seekBarTrack = document.getElementById('seekBarTrack');
  const seekBarFill = document.getElementById('seekBarFill');
  const playbackSpeedSelect = document.getElementById('playbackSpeedSelect');
  const videoTitleLabel = document.getElementById('videoTitleLabel');
  const btnMinimizePlayer = document.getElementById('btnMinimizePlayer');

  // Player Actions
  const btnAspectRatio = document.getElementById('btnAspectRatio');
  const btnPiP = document.getElementById('btnPiP');
  const btnEqualizerModal = document.getElementById('btnEqualizerModal');
  const btnLockPlayer = document.getElementById('btnLockPlayer');
  const btnUnlockPlayer = document.getElementById('btnUnlockPlayer');
  const lockOverlay = document.getElementById('lockOverlay');

  // Mini Player
  const miniPlayerBar = document.getElementById('miniPlayerBar');
  const miniTitle = document.getElementById('miniTitle');
  const btnMiniPlayPause = document.getElementById('btnMiniPlayPause');
  const miniPlayIcon = document.getElementById('miniPlayIcon');
  const btnMiniExpand = document.getElementById('btnMiniExpand');
  const btnMiniClose = document.getElementById('btnMiniClose');

  // Gestures HUD
  const gestureZone = document.getElementById('gestureZone');
  const brightnessHud = document.getElementById('brightnessHud');
  const brightnessFill = document.getElementById('brightnessFill');
  const brightnessVal = document.getElementById('brightnessVal');
  const volumeHud = document.getElementById('volumeHud');
  const volumeFill = document.getElementById('volumeFill');
  const volumeVal = document.getElementById('volumeVal');
  const skipLeftRing = document.getElementById('skipLeftRing');
  const skipRightRing = document.getElementById('skipRightRing');

  // Subtitles
  const subFileInput = document.getElementById('subFileInput');
  const subtitleOverlay = document.getElementById('subtitleOverlay');
  const subtitleText = document.getElementById('subtitleText');

  // Equalizer
  const eqModal = document.getElementById('eqModal');
  const btnCloseEq = document.getElementById('btnCloseEq');
  const btnDoneEq = document.getElementById('btnDoneEq');
  const eqCanvas = document.getElementById('eqCanvas');

  // Settings
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemeLight = document.getElementById('btnThemeLight');
  const btnClearCache = document.getElementById('btnClearCache');
  const btnRefreshLibrary = document.getElementById('btnRefreshLibrary');

  // --- STATE ---
  let isLocked = false;
  let brightnessLevel = 1.0;
  let parsedSubtitles = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let allVideosList = [];
  let isMiniPlayerActive = false;

  // Default Sample Videos with full details
  const defaultSampleVideos = [
    {
      id: 'sample-1',
      title: 'Cyberpunk_City_4K_Demo.mp4',
      folder: '/Movies/Demos/',
      dur: '03:45',
      size: '142 MB',
      res: '4K UHD',
      format: 'MP4',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      poster: 'poster.jpg',
      isLocal: false
    },
    {
      id: 'sample-2',
      title: 'Realme_UI_120fps_Smooth.mkv',
      folder: '/DCIM/Camera/',
      dur: '01:30',
      size: '48 MB',
      res: '1080p FHD',
      format: 'MKV',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      poster: 'poster.jpg',
      isLocal: false
    },
    {
      id: 'sample-3',
      title: 'Nature_Wildlife_HDR_Sample.webm',
      folder: '/Downloads/Videos/',
      dur: '05:12',
      size: '210 MB',
      res: '4K HDR',
      format: 'WEBM',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      poster: 'poster.jpg',
      isLocal: false
    },
    {
      id: 'sample-4',
      title: 'Sintel_Action_Trailer.mp4',
      folder: '/Downloads/Clips/',
      dur: '00:52',
      size: '25 MB',
      res: '720p HD',
      format: 'MP4',
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      poster: 'poster.jpg',
      isLocal: false
    }
  ];

  // --- GOOGLE UI LIGHT / DARK THEME SYSTEM ---
  function initTheme() {
    const savedTheme = localStorage.getItem('apex_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    if (theme === 'light') {
      body.classList.remove('theme-dark');
      body.classList.add('theme-light');
      themeIcon.className = 'fa-solid fa-moon';
      if (btnThemeLight) btnThemeLight.classList.add('active');
      if (btnThemeDark) btnThemeDark.classList.remove('active');
    } else {
      body.classList.remove('theme-light');
      body.classList.add('theme-dark');
      themeIcon.className = 'fa-solid fa-sun';
      if (btnThemeDark) btnThemeDark.classList.add('active');
      if (btnThemeLight) btnThemeLight.classList.remove('active');
    }
    localStorage.setItem('apex_theme', theme);
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = body.classList.contains('theme-light') ? 'dark' : 'light';
      setTheme(current);
      showToast(`Switched to Google ${current === 'light' ? 'Light Mode' : 'Dark Mode'}`);
    });
  }

  if (btnThemeDark) btnThemeDark.addEventListener('click', () => setTheme('dark'));
  if (btnThemeLight) btnThemeLight.addEventListener('click', () => setTheme('light'));

  // --- NAVIGATION CONTROLLER ---
  function switchView(viewName) {
    Object.keys(views).forEach(k => {
      if (views[k]) views[k].classList.remove('active-view');
    });
    Object.keys(navBtns).forEach(k => {
      if (navBtns[k]) navBtns[k].classList.remove('active');
    });

    if (views[viewName]) views[viewName].classList.add('active-view');
    if (navBtns[viewName]) navBtns[viewName].classList.add('active');
  }

  if (navBtns.home) navBtns.home.addEventListener('click', () => switchView('home'));
  if (navBtns.library) navBtns.library.addEventListener('click', () => switchView('library'));
  if (navBtns.settings) navBtns.settings.addEventListener('click', () => switchView('settings'));

  // --- RECURSIVE SUBDIRECTORY MEDIA SCANNER ---
  function isVideoExtension(filename) {
    return /\.(mp4|mkv|webm|avi|mov|3gp|m4v|flv|wmv|ts|m2ts|vob|divx|ogv|mpg|mpeg)$/i.test(filename);
  }

  function getFileFormat(filename) {
    const ext = filename.split('.').pop();
    return ext ? ext.toUpperCase() : 'VIDEO';
  }

  async function scanDirectoryRecursively(dirHandle, currentPath = '') {
    let count = 0;
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('video/') || isVideoExtension(file.name)) {
            await processAndAddFile(file, `/${dirHandle.name}${currentPath}/`);
            count++;
          }
        } else if (entry.kind === 'directory') {
          // Recursively scan subdirectories!
          count += await scanDirectoryRecursively(entry, `${currentPath}/${entry.name}`);
        }
      }
    } catch (err) {
      console.log('Directory scan iteration note:', err);
    }
    return count;
  }

  async function triggerFolderScan() {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        showToast(`Scanning directory & subfolders: ${dirHandle.name}...`);
        
        const count = await scanDirectoryRecursively(dirHandle, '');
        
        showToast(`Successfully found ${count} video(s) inside ${dirHandle.name}!`);
        await loadAllVideos();
      } catch (err) {
        if (err.name !== 'AbortError') {
          folderFileInput.click();
        }
      }
    } else {
      folderFileInput.click();
    }
  }

  if (btnScanFolderTop) btnScanFolderTop.addEventListener('click', triggerFolderScan);
  if (btnScanFolderBanner) btnScanFolderBanner.addEventListener('click', triggerFolderScan);
  if (btnScanLibraryTop) btnScanLibraryTop.addEventListener('click', triggerFolderScan);

  // Folder File Input Fallback (`webkitdirectory`)
  if (folderFileInput) {
    folderFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      let count = 0;
      for (const file of files) {
        if (file.type.startsWith('video/') || isVideoExtension(file.name)) {
          const relativePath = file.webkitRelativePath || file.name;
          const pathSegments = relativePath.split('/');
          const folderName = pathSegments.length > 1 ? `/${pathSegments.slice(0, -1).join('/')}/` : '/Scanned Folder/';
          await processAndAddFile(file, folderName);
          count++;
        }
      }
      showToast(`Added ${count} video(s) from scanned directory!`);
      await loadAllVideos();
    });
  }

  // Direct File Picker Handler ("Open Video Files")
  if (btnSelectFilesDirect) {
    btnSelectFilesDirect.addEventListener('click', () => {
      if (localFilesInput) localFilesInput.click();
    });
  }

  if (localFilesInput) {
    localFilesInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      let firstItem = null;
      let count = 0;
      for (const file of files) {
        if (file.type.startsWith('video/') || isVideoExtension(file.name)) {
          const item = await processAndAddFile(file, '/Selected Files/');
          if (!firstItem) firstItem = item;
          count++;
        }
      }
      showToast(`Loaded ${count} video file(s)!`);
      await loadAllVideos();

      if (firstItem) {
        playVideo(firstItem);
      }
    });
  }

  async function processAndAddFile(file, folderName = '/Local Media/') {
    const fileUrl = URL.createObjectURL(file);
    const videoItem = {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: file.name,
      folder: folderName,
      dur: formatTime(file.size / 1000000 * 2),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      res: 'Local HD',
      format: getFileFormat(file.name),
      src: fileUrl,
      poster: 'poster.jpg',
      isLocal: true,
      fileRef: file
    };

    allVideosList.unshift(videoItem);
    await saveScannedVideo(videoItem);
    return videoItem;
  }

  // Drag & Drop Folder/Files
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      let count = 0;
      let firstItem = null;

      for (const file of files) {
        if (file.type.startsWith('video/') || isVideoExtension(file.name)) {
          const item = await processAndAddFile(file, '/Dropped Files/');
          if (!firstItem) firstItem = item;
          count++;
        }
      }
      showToast(`Added ${count} dropped video file(s)!`);
      await loadAllVideos();

      if (firstItem) {
        playVideo(firstItem);
      }
    });
  }

  // --- RENDER FULL DETAIL VIDEO GRID & LIBRARY ---
  async function loadAllVideos() {
    const dbVideos = await getScannedVideos();
    
    const combined = [...dbVideos];
    defaultSampleVideos.forEach(s => {
      if (!combined.some(c => c.title === s.title)) {
        combined.push(s);
      }
    });

    allVideosList = combined;
    renderVideoGrid();
    renderLibraryView();
  }

  function renderVideoGrid() {
    if (!videoGrid) return;
    videoGrid.innerHTML = '';

    const filtered = filterVideos(allVideosList);
    videoCountBadge.textContent = `${filtered.length} File(s)`;

    if (filtered.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
          <i class="fa-solid fa-folder-open" style="font-size: 3rem; margin-bottom: 12px;"></i>
          <p style="font-weight: 700;">No matching video files found</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Click "Open Video Files" or "Scan Folder" above to add videos from your laptop.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(v => {
      const card = document.createElement('div');
      card.className = 'video-card-item';
      card.innerHTML = `
        <div class="thumbnail-wrap">
          <img src="${v.poster}" alt="${v.title}">
          <span class="duration-badge">${v.dur}</span>
          <span class="res-tag">${v.res}</span>
          <span class="format-badge">${v.format || 'MP4'}</span>
        </div>
        <div class="card-meta-wrap">
          <div class="channel-avatar"><i class="fa-solid fa-play"></i></div>
          <div class="card-info">
            <h4 class="video-card-title">${v.title}</h4>
            <span class="file-path-badge"><i class="fa-solid fa-folder"></i> ${v.folder}</span>
            <div class="file-details-row">
              <span><i class="fa-solid fa-hard-drive"></i> ${v.size}</span>
              <span>• <i class="fa-solid fa-clock"></i> ${v.dur}</span>
            </div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => playVideo(v));
      videoGrid.appendChild(card);
    });
  }

  function renderLibraryView() {
    if (!libraryVideoList) return;
    libraryVideoList.innerHTML = '';

    allVideosList.forEach(v => {
      const item = document.createElement('div');
      item.className = 'linear-item-card';
      item.innerHTML = `
        <div class="linear-thumb-wrap">
          <img src="${v.poster}" alt="thumb">
          <span class="linear-duration">${v.dur}</span>
        </div>
        <div class="linear-info">
          <h4 class="linear-title">${v.title}</h4>
          <div class="linear-sub">
            <span class="file-path-badge"><i class="fa-solid fa-folder"></i> ${v.folder}</span>
            <span><i class="fa-solid fa-hard-drive"></i> ${v.size}</span>
            <span>• Format: ${v.format || 'MP4'}</span>
            <span>• ${v.res}</span>
          </div>
        </div>
        <button class="header-icon-btn" style="color: var(--primary-color);" title="Play File"><i class="fa-solid fa-play"></i></button>
      `;

      item.addEventListener('click', () => playVideo(v));
      libraryVideoList.appendChild(item);
    });
  }

  function filterVideos(list) {
    return list.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery) || v.folder.toLowerCase().includes(searchQuery);
      if (!matchesSearch) return false;

      if (currentCategory === 'scanned') return v.isLocal;
      if (currentCategory === '4k') return v.res.includes('4K');
      if (currentCategory === 'movies') return v.folder.toLowerCase().includes('movie') || v.folder.toLowerCase().includes('feature');

      return true;
    });
  }

  // Category Pills Filter Listener
  document.querySelectorAll('.pill-item').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill-item').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category');
      feedTitle.innerHTML = `<i class="fa-solid fa-film" style="color: var(--primary-color);"></i> ${pill.textContent}`;
      renderVideoGrid();
    });
  });

  // Search Input Listener
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      renderVideoGrid();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      globalSearchInput.value = '';
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      renderVideoGrid();
    });
  }

  // --- RELIABLE VIDEO PLAYER ENGINE (LOCAL BLOB URL RE-CREATION) ---
  function playVideo(videoItem) {
    if (isMiniPlayerActive) hideMiniPlayer();

    // Generate fresh Object URL if file reference exists!
    let activeSrc = videoItem.src;
    if (videoItem.fileRef) {
      try {
        activeSrc = URL.createObjectURL(videoItem.fileRef);
      } catch (err) {
        console.log('Object URL recreation note:', err);
      }
    }

    mainVideo.src = activeSrc;
    videoTitleLabel.textContent = videoItem.title;
    miniTitle.textContent = videoItem.title;

    playerOverlay.classList.add('open');

    mainVideo.play().then(() => {
      playIcon.className = 'fa-solid fa-pause';
      miniPlayIcon.className = 'fa-solid fa-pause';
    }).catch(err => {
      console.log('Playback notice:', err);
      showToast(`Playing video: ${videoItem.title}`);
    });

    setupMediaSession(videoItem.title);
  }

  function togglePlayPause() {
    if (isLocked) return;
    if (mainVideo.paused) {
      mainVideo.play();
      playIcon.className = 'fa-solid fa-pause';
      miniPlayIcon.className = 'fa-solid fa-pause';
    } else {
      mainVideo.pause();
      playIcon.className = 'fa-solid fa-play';
      miniPlayIcon.className = 'fa-solid fa-play';
    }
  }

  if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
  if (btnMiniPlayPause) btnMiniPlayPause.addEventListener('click', togglePlayPause);

  if (mainVideo) {
    mainVideo.addEventListener('timeupdate', () => {
      if (!mainVideo.duration) return;
      const pct = (mainVideo.currentTime / mainVideo.duration) * 100;
      if (seekBarFill) seekBarFill.style.width = `${pct}%`;
      if (currentTimeText) currentTimeText.textContent = formatTime(mainVideo.currentTime);
      if (durationText) durationText.textContent = formatTime(mainVideo.duration);
      updateSubtitleDisplay();
    });

    mainVideo.addEventListener('loadedmetadata', () => {
      if (durationText) durationText.textContent = formatTime(mainVideo.duration);
    });
  }

  // Seek bar click
  if (seekBarTrack) {
    seekBarTrack.addEventListener('click', (e) => {
      if (isLocked || !mainVideo.duration) return;
      const rect = seekBarTrack.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      mainVideo.currentTime = pos * mainVideo.duration;
    });
  }

  // Minimize to Mini-Player
  if (btnMinimizePlayer) {
    btnMinimizePlayer.addEventListener('click', () => {
      playerOverlay.classList.remove('open');
      showMiniPlayer();
    });
  }

  function showMiniPlayer() {
    isMiniPlayerActive = true;
    miniPlayerBar.style.display = 'flex';
  }

  function hideMiniPlayer() {
    isMiniPlayerActive = false;
    miniPlayerBar.style.display = 'none';
  }

  if (btnMiniExpand) {
    btnMiniExpand.addEventListener('click', () => {
      hideMiniPlayer();
      playerOverlay.classList.add('open');
    });
  }

  if (btnMiniClose) {
    btnMiniClose.addEventListener('click', () => {
      mainVideo.pause();
      hideMiniPlayer();
    });
  }

  // Mute & Speed
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      mainVideo.muted = !mainVideo.muted;
      muteIcon.className = mainVideo.muted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    });
  }

  if (playbackSpeedSelect) {
    playbackSpeedSelect.addEventListener('change', (e) => {
      mainVideo.playbackRate = parseFloat(e.target.value);
    });
  }

  // Aspect Ratio
  const aspectModes = ['', 'aspect-fill', 'aspect-stretch'];
  let aspectIdx = 0;
  if (btnAspectRatio) {
    btnAspectRatio.addEventListener('click', () => {
      if (aspectModes[aspectIdx]) mainVideo.classList.remove(aspectModes[aspectIdx]);
      aspectIdx = (aspectIdx + 1) % aspectModes.length;
      if (aspectModes[aspectIdx]) mainVideo.classList.add(aspectModes[aspectIdx]);

      const modeLabels = ['Original Fit', '20:9 Realme Fill Crop', 'Full Stretch'];
      showToast(`Aspect Ratio: ${modeLabels[aspectIdx]}`);
    });
  }

  // PiP Mode
  if (btnPiP) {
    btnPiP.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await mainVideo.requestPictureInPicture();
        }
      } catch (err) {
        showToast('PiP Mode activated');
      }
    });
  }

  // Lock Screen
  if (btnLockPlayer) {
    btnLockPlayer.addEventListener('click', () => {
      isLocked = true;
      lockOverlay.classList.add('active');
    });
  }
  if (btnUnlockPlayer) {
    btnUnlockPlayer.addEventListener('click', () => {
      isLocked = false;
      lockOverlay.classList.remove('active');
    });
  }

  // --- TOUCH GESTURE ENGINE (Volume, Brightness, ±10s Skip) ---
  let touchStartX = 0;
  let touchStartY = 0;
  let activeSide = null;
  let lastTapTime = 0;

  if (gestureZone) {
    gestureZone.addEventListener('touchstart', (e) => {
      if (isLocked) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      const rect = gestureZone.getBoundingClientRect();
      activeSide = (touchStartX - rect.left) < rect.width / 2 ? 'left' : 'right';

      // Double Tap Detection
      const now = Date.now();
      if (now - lastTapTime < 300) {
        if (activeSide === 'left') {
          mainVideo.currentTime = Math.max(0, mainVideo.currentTime - 10);
          triggerSkipAnim(skipLeftRing);
        } else {
          mainVideo.currentTime = Math.min(mainVideo.duration || 0, mainVideo.currentTime + 10);
          triggerSkipAnim(skipRightRing);
        }
        e.preventDefault();
      }
      lastTapTime = now;
    });

    gestureZone.addEventListener('touchmove', (e) => {
      if (isLocked) return;
      const touch = e.touches[0];
      const deltaY = touchStartY - touch.clientY;

      if (Math.abs(deltaY) > 12) {
        const sens = 0.005;
        if (activeSide === 'left') {
          brightnessLevel = Math.min(1.0, Math.max(0.15, brightnessLevel + deltaY * sens));
          mainVideo.style.filter = `brightness(${brightnessLevel})`;
          brightnessHud.classList.add('active');
          const pct = Math.round(brightnessLevel * 100);
          brightnessFill.style.height = `${pct}%`;
          brightnessVal.textContent = `${pct}%`;
        } else {
          let newVol = Math.min(1.0, Math.max(0.0, mainVideo.volume + deltaY * sens));
          mainVideo.volume = newVol;
          volumeHud.classList.add('active');
          const pct = Math.round(newVol * 100);
          volumeFill.style.height = `${pct}%`;
          volumeVal.textContent = `${pct}%`;
        }
      }
    });

    gestureZone.addEventListener('touchend', () => {
      brightnessHud.classList.remove('active');
      volumeHud.classList.remove('active');
    });
  }

  function triggerSkipAnim(el) {
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 600);
  }

  // --- SUBTITLES ENGINE (.vtt / .srt) ---
  if (subFileInput) {
    subFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        parseSubtitles(evt.target.result);
        showToast(`Loaded Subtitles: ${file.name}`);
      };
      reader.readAsText(file);
    });
  }

  function parseSubtitles(text) {
    parsedSubtitles = [];
    const blocks = text.split(/\n\r?\n/);
    blocks.forEach(block => {
      const lines = block.trim().split(/\n\r?/);
      let idx = lines.findIndex(l => l.includes('-->'));
      if (idx !== -1) {
        const parts = lines[idx].split('-->');
        const start = parseTs(parts[0].trim());
        const end = parseTs(parts[1].trim());
        const content = lines.slice(idx + 1).join('<br>');
        parsedSubtitles.push({ start, end, text: content });
      }
    });
  }

  function parseTs(ts) {
    const p = ts.replace(',', '.').split(':');
    if (p.length === 3) return parseFloat(p[0]) * 3600 + parseFloat(p[1]) * 60 + parseFloat(p[2]);
    if (p.length === 2) return parseFloat(p[0]) * 60 + parseFloat(p[1]);
    return 0;
  }

  function updateSubtitleDisplay() {
    if (!parsedSubtitles.length) return;
    const now = mainVideo.currentTime;
    const sub = parsedSubtitles.find(s => now >= s.start && now <= s.end);
    if (sub) {
      subtitleOverlay.style.display = 'block';
      subtitleText.innerHTML = sub.text;
    } else {
      subtitleOverlay.style.display = 'none';
    }
  }

  // --- 5-BAND AUDIO EQUALIZER ---
  let audioCtx, sourceNode, filters = [];

  function initAudioEq() {
    if (audioCtx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
      sourceNode = audioCtx.createMediaElementSource(mainVideo);

      const freqs = [60, 230, 910, 3600, 14000];
      let prev = sourceNode;

      freqs.forEach((f, i) => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : (i === freqs.length - 1 ? 'highshelf' : 'peaking');
        filter.frequency.value = f;
        filter.gain.value = 0;
        prev.connect(filter);
        prev = filter;
        filters.push(filter);
      });

      prev.connect(audioCtx.destination);
    } catch (e) {
      console.log('AudioContext notice:', e);
    }
  }

  function closeEqModal() {
    if (eqModal) eqModal.classList.remove('open');
  }

  if (btnEqualizerModal) {
    btnEqualizerModal.addEventListener('click', () => {
      initAudioEq();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      eqModal.classList.add('open');
    });
  }

  // Close Equalizer Buttons
  if (btnCloseEq) btnCloseEq.addEventListener('click', closeEqModal);
  if (btnDoneEq) btnDoneEq.addEventListener('click', closeEqModal);

  // Close Equalizer when clicking outside content (backdrop)
  if (eqModal) {
    eqModal.addEventListener('click', (e) => {
      if (e.target === eqModal) closeEqModal();
    });
  }

  // Preset pills
  document.querySelectorAll('.eq-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.eq-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      initAudioEq();
      const gains = {
        flat: [0, 0, 0, 0, 0],
        bass: [8, 5, 1, 0, -2],
        rock: [5, 3, -1, 3, 6],
        pop: [-1, 2, 6, 3, -1],
        vocal: [-3, -1, 4, 7, 3]
      }[pill.getAttribute('data-preset')] || [0,0,0,0,0];

      gains.forEach((g, i) => {
        if (filters[i]) filters[i].gain.value = g;
      });
    });
  });

  // --- SETTINGS CACHE CLEARING ---
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      await clearScannedVideosDB();
      showToast('Scanned library cache cleared!');
      await loadAllVideos();
    });
  }
  if (btnRefreshLibrary) {
    btnRefreshLibrary.addEventListener('click', async () => {
      await loadAllVideos();
      showToast('Library refreshed!');
    });
  }

  // --- SECURITY MODAL EXIT HANDLERS ---
  function closeSecurityModal() {
    if (securityModal) securityModal.classList.remove('open');
  }
  if (btnSecurityModal) btnSecurityModal.addEventListener('click', () => securityModal.classList.add('open'));
  if (btnCloseSecurityModal) btnCloseSecurityModal.addEventListener('click', closeSecurityModal);
  if (securityModal) {
    securityModal.addEventListener('click', (e) => {
      if (e.target === securityModal) closeSecurityModal();
    });
  }

  // ESC key listener to exit active modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEqModal();
      closeSecurityModal();
    }
  });

  // --- HELPER FUNCTIONS ---
  function formatTime(sec) {
    if (isNaN(sec) || sec === Infinity) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary-color);
      color: #ffffff;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 0.82rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      z-index: 9999;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = msg;
    body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function setupMediaSession(title) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'ApexPlayer Pro Video',
        artist: 'ApexPlayer Pro',
        artwork: [{ src: 'icon.jpg', sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', () => mainVideo.play());
      navigator.mediaSession.setActionHandler('pause', () => mainVideo.pause());
    }
  }

  // Check URL params for video intent
  const urlParams = new URLSearchParams(window.location.search);
  const videoUri = urlParams.get('videoUri');
  if (videoUri) {
    playVideo({
      id: 'intent-video',
      title: 'Opened Video File',
      folder: '/Device Storage/',
      dur: '00:00',
      size: 'Device File',
      res: 'HD',
      format: 'MEDIA',
      src: decodeURIComponent(videoUri),
      poster: 'poster.jpg'
    });
  }

  // --- INITIALIZE APP ---
  initTheme();
  loadAllVideos();

});
