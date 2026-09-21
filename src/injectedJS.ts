/**
 * Injected JavaScript for YouTube Music WebView
 * Fixes:
 * 1. Background & Lock Screen Playback: Overrides Page Visibility API so YouTube never detects app backgrounding/screen lock.
 * 2. Ad-Blocker Engine: Real-time skip clicker, 16x speed + mute for video ads, CSS ad hiding.
 * 3. Media Controls & State Sync.
 */

export const INJECTED_JAVASCRIPT = `
(function() {
  if (window.__YT_BG_ENGINE_INJECTED) return;
  window.__YT_BG_ENGINE_INJECTED = true;

  console.log('[YTMusic Engine] Background & Ad-Blocker Active');

  // ==========================================
  // 1. PREVENT BACKGROUND PAUSE (Visibility API Override)
  // ==========================================
  try {
    Object.defineProperty(document, 'hidden', {
      get: function() { return false; },
      configurable: true
    });
    Object.defineProperty(document, 'visibilityState', {
      get: function() { return 'visible'; },
      configurable: true
    });
  } catch(e) {}

  const stopVisibilityEvents = function(e) {
    if (e) {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }
  };

  window.addEventListener('visibilitychange', stopVisibilityEvents, true);
  document.addEventListener('visibilitychange', stopVisibilityEvents, true);
  window.addEventListener('blur', stopVisibilityEvents, true);

  // Keep AudioContext awake
  if (window.AudioContext || window.webkitAudioContext) {
    const origCreate = window.AudioContext || window.webkitAudioContext;
    window.addEventListener('blur', function() {
      if (window.__yt_audio_ctx && window.__yt_audio_ctx.state === 'suspended') {
        window.__yt_audio_ctx.resume();
      }
    });
  }

  // ==========================================
  // 2. CSS AD SUPPRESSION
  // ==========================================
  const injectStyles = function() {
    if (document.getElementById('yt-bg-ad-style')) return;
    const adCss = \`
      .ytp-ad-overlay-container,
      .ytp-ad-message-container,
      #player-ads,
      .video-ads,
      .ytp-ad-module,
      ytmusic-mealbar-promo-renderer,
      ytmusic-banner-promo-renderer,
      ytmusic-guide-entry-renderer:has(a[href*="premium"]),
      ytmusic-player-bar-promo,
      .ytmusic-search-box-promo,
      .tp-yt-paper-dialog:has(ytmusic-mealbar-promo-renderer),
      .style-scope.ytmusic-popup-container:has(ytmusic-mealbar-promo-renderer),
      ytmusic-popup-container:has(ytmusic-mealbar-promo-renderer) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
      }
    \`;
    const styleEl = document.createElement('style');
    styleEl.id = 'yt-bg-ad-style';
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(adCss));
    (document.head || document.documentElement).appendChild(styleEl);
  };

  injectStyles();
  setInterval(injectStyles, 1000);

  // ==========================================
  // 3. REAL-TIME AD KILLER ENGINE
  // ==========================================
  const SKIP_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.videoAdUiSkipButton',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-overlay-close-button',
    'button.ytp-ad-skip-button-icon',
    '.ytp-ad-skip-button-container',
    'ytmusic-player-bar .ytp-ad-skip-button',
    '.ytp-ad-skip-button-text'
  ];

  let savedVolume = 1;
  let isAdMuted = false;

  function killAds() {
    const video = document.querySelector('video');
    const playerEl = document.querySelector('.html5-video-player') || document.querySelector('#movie_player');

    // A. Auto click skip buttons
    for (let i = 0; i < SKIP_SELECTORS.length; i++) {
      const skipBtn = document.querySelector(SKIP_SELECTORS[i]);
      if (skipBtn) {
        try {
          skipBtn.click();
          console.log('[AdBlocker] Auto-clicked skip button');
        } catch(e) {}
      }
    }

    // B. Detect active video ad
    const isAdShowing = playerEl && (
      playerEl.classList.contains('ad-showing') ||
      playerEl.classList.contains('ad-interrupting') ||
      !!document.querySelector('.ytp-ad-player-overlay') ||
      !!document.querySelector('.ytp-ad-text') ||
      !!document.querySelector('.ytp-ad-preview-text')
    );

    if (video) {
      if (isAdShowing) {
        if (!isAdMuted) {
          savedVolume = video.volume > 0 ? video.volume : 1;
          isAdMuted = true;
        }
        video.muted = true;
        video.playbackRate = 16.0;

        if (isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.05;
        }
      } else {
        if (video.playbackRate > 2.0) {
          video.playbackRate = 1.0;
        }
        if (isAdMuted) {
          video.muted = false;
          video.volume = savedVolume;
          isAdMuted = false;
        }
      }
    }
  }

  // Fast loop for instant ad removal & background protection
  setInterval(killAds, 100);

  const observer = new MutationObserver(killAds);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // ==========================================
  // 4. MEDIA CONTROLS & STATE SYNC
  // ==========================================
  window.__YT_PLAY = function() {
    const video = document.querySelector('video');
    if (video) video.play();
  };

  window.__YT_PAUSE = function() {
    const video = document.querySelector('video');
    if (video) video.pause();
  };

  window.__YT_NEXT = function() {
    const nextBtn = document.querySelector('.next-button.ytmusic-player-bar') || document.querySelector('.next-button');
    if (nextBtn) nextBtn.click();
  };

  window.__YT_PREV = function() {
    const prevBtn = document.querySelector('.previous-button.ytmusic-player-bar') || document.querySelector('.previous-button');
    if (prevBtn) prevBtn.click();
  };

  true;
})();
`;
