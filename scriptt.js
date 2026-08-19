// =============================================================
// DREAM DROP — PROGRESS + BADGES + REWARDS SYSTEM
// =============================================================

function getStorageKey() {
  var pid = localStorage.getItem('dreamdrop_current_player');
  return pid ? ('dreamdrop_progress_' + pid) : 'dreamdrop_progress_guest';
}
const STORAGE_KEY = 'dreamdrop_progress';

const BADGE_DEFS = {
  first_drop:    { icon: '🏀', name: 'First Drop',      desc: 'Complete your first level!' },
  speed_demon:   { icon: '⚡', name: 'Speed Demon',     desc: 'Complete a level in under 5 seconds' },
  no_miss:       { icon: '🎯', name: 'Perfect Shot',    desc: 'Complete a level on the first try' },
  hat_trick:     { icon: '🎩', name: 'Hat Trick',       desc: 'Complete 3 levels in a row' },
  level_5:       { icon: '⭐', name: 'Rising Star',     desc: 'Complete 5 levels' },
  level_10:      { icon: '🌟', name: 'All Star',        desc: 'Complete 10 levels' },
  level_15:      { icon: '🏆', name: 'Champion',        desc: 'Complete 15 levels' },
  level_20:      { icon: '💎', name: 'Diamond Player',  desc: 'Complete 20 levels' },
  level_25:      { icon: '🚀', name: 'Rocket',          desc: 'Complete 25 levels' },
  level_30:      { icon: '👑', name: 'Dream Drop King', desc: 'Complete ALL 30 levels!' },
  comeback:      { icon: '💪', name: 'Comeback Kid',    desc: 'Complete a level after 3+ fails' },
  hard_mode:     { icon: '🔥', name: 'Fire Starter',   desc: 'Complete a Hard mode level' },
  marathon:      { icon: '⏱️', name: 'Marathon',        desc: 'Play for over 10 minutes total' },
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const data = JSON.parse(raw);
      data.levels               = data.levels || {};
      data.badges               = data.badges || [];
      data.totalPlayTime        = data.totalPlayTime || 0;
      data.totalLevelsCompleted = data.totalLevelsCompleted || 0;
      data.highestLevel         = data.highestLevel || 0;
      return data;
    }
  } catch(e) { console.warn('[Progress] Load error:', e); }
  return { difficulty: null, highestLevel: 0, totalPlayTime: 0, totalLevelsCompleted: 0, levels: {}, badges: [] };
}

function saveProgress(data) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    console.log('[Progress] Saved level data:', Object.keys(data.levels));
  } catch(e) { console.warn('[Progress] Save failed:', e); }
}

let _levelStartTime   = null;
let currentDifficulty = 'Easy';

function recordLevelStart(level, difficulty) {
  console.log('[Progress] Level started:', level, '| Difficulty:', difficulty);
  _levelStartTime = Date.now();

  const data = loadProgress();

  // Always update difficulty so it reflects current session
  if (difficulty) data.difficulty = difficulty;

  // Init level entry on first visit
  if (!data.levels[level]) {
    data.levels[level] = { completed: false, bestTime: null, attempts: 0, firstTry: true };
  }

  data.levels[level].attempts++;
  saveProgress(data);
  console.log('[Progress] Attempt #', data.levels[level].attempts, 'on level', level);
}

function recordLevelComplete(level) {
  console.log('[Progress] Level completed:', level);
  const data = loadProgress();

  // Compute elapsed NOW before recordPlayTime clears _levelStartTime
  const elapsed = _levelStartTime ? Math.round((Date.now() - _levelStartTime) / 1000) : null;
  console.log('[Progress] Elapsed time for level', level, ':', elapsed, 's');

  if (!data.levels[level]) {
    data.levels[level] = { completed: false, bestTime: null, attempts: 1, firstTry: true };
  }

  const entry    = data.levels[level];
  const wasFirst = !entry.completed;

  entry.completed = true;
  // firstTry = true only if this is the first attempt ever on this level
  entry.firstTry  = entry.firstTry !== false && entry.attempts === 1;

  if (elapsed !== null && (entry.bestTime === null || elapsed < entry.bestTime)) {
    entry.bestTime = elapsed;
  }

  if (level > data.highestLevel) data.highestLevel = level;
  if (wasFirst) data.totalLevelsCompleted = (data.totalLevelsCompleted || 0) + 1;

  const newBadges = checkBadges(data, level, elapsed);
  saveProgress(data);

  console.log('[Progress] Saved. Levels done:', data.totalLevelsCompleted, '| Highest:', data.highestLevel);

  if (newBadges.length > 0) {
    setTimeout(() => showRewardPopup(newBadges), 900);
  }
}

function recordPlayTime() {
  if (!_levelStartTime) return;
  const elapsed = Math.round((Date.now() - _levelStartTime) / 1000);
  const data = loadProgress();
  data.totalPlayTime = (data.totalPlayTime || 0) + elapsed;
  saveProgress(data);
  _levelStartTime = null;
}

function setDifficulty(diff) {
  currentDifficulty = diff;
  const data = loadProgress();
  if (!data.difficulty) { data.difficulty = diff; saveProgress(data); }
}

function resetProgress() { localStorage.removeItem(getStorageKey()); }

function formatTime(s) {
  if (s === null || s === undefined) return '—';
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}m ${s%60}s`;
}

// ---- Badge checking ----
function checkBadges(data, level, elapsed) {
  const earned = data.badges || [];
  const newBadges = [];

  function award(id) {
    if (!earned.includes(id)) { earned.push(id); newBadges.push(id); }
  }

  const total = data.totalLevelsCompleted || 0;
  const entry = data.levels[level] || {};

  if (total >= 1)  award('first_drop');
  if (total >= 5)  award('level_5');
  if (total >= 10) award('level_10');
  if (total >= 15) award('level_15');
  if (total >= 20) award('level_20');
  if (total >= 25) award('level_25');
  if (total >= 30) award('level_30');

  if (elapsed !== null && elapsed <= 5) award('speed_demon');
  if (entry.firstTry)    award('no_miss');
  if (entry.attempts >= 4) award('comeback');
  if (level >= 10)       award('hard_mode');
  if ((data.totalPlayTime || 0) >= 600) award('marathon');

  if (level >= 3) {
    const l1 = data.levels[level - 2];
    const l2 = data.levels[level - 1];
    if (l1 && l1.completed && l2 && l2.completed) award('hat_trick');
  }

  data.badges = earned;
  return newBadges;
}

// ---- Reward popup shown in-game ----
function showRewardPopup(badgeIds) {
  const existing = document.getElementById('reward-popup');
  if (existing) existing.remove();

  if (!document.getElementById('reward-anim-style')) {
    const s = document.createElement('style');
    s.id = 'reward-anim-style';
    s.textContent = `
      @keyframes reward-pop {
        0%   { transform: scale(0.3); opacity: 0; }
        70%  { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      #reward-popup-inner { animation: reward-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275); }
      .rp-title { font-size:clamp(1.1rem,3vw,1.5rem); font-weight:bold; color:#e65100; margin-bottom:1.5vh; }
      .rp-badge { display:flex; align-items:center; gap:1em; background:white; border-radius:1em;
                  padding:1vh 1.5vw; margin:0.8vh 0; box-shadow:0 2px 8px rgba(0,0,0,0.08); text-align:left; }
      .rp-icon  { font-size:clamp(1.8rem,4vw,2.5rem); }
      .rp-name  { font-weight:bold; font-size:clamp(0.85rem,1.8vw,1.1rem); color:#333; }
      .rp-desc  { font-size:clamp(0.7rem,1.4vw,0.85rem); color:#777; margin-top:0.2em; }
      .rp-close { margin-top:1.5vh; background:#ffd54f; border:none; border-radius:2em;
                  padding:0.8vh 2.5vw; font-weight:bold; font-size:clamp(0.75rem,1.5vw,0.95rem);
                  cursor:pointer; color:#333; }
      .rp-close:hover { background:#ffca28; }
    `;
    document.head.appendChild(s);
  }

  const popup = document.createElement('div');
  popup.id = 'reward-popup';
  popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:999999;pointer-events:none;';

  const badgesHTML = badgeIds.map(id => {
    const b = BADGE_DEFS[id];
    return `<div class="rp-badge">
      <span class="rp-icon">${b.icon}</span>
      <div><div class="rp-name">${b.name}</div><div class="rp-desc">${b.desc}</div></div>
    </div>`;
  }).join('');

  popup.innerHTML = `
    <div id="reward-popup-inner" style="background:linear-gradient(135deg,#fff8e1,#fffde7);
      border:3px solid #ffd54f;border-radius:1.5em;padding:3vh 3vw;text-align:center;
      box-shadow:0 8px 32px rgba(0,0,0,0.25);pointer-events:all;max-width:min(90vw,380px);">
      <div class="rp-title">🎉 Badge${badgeIds.length > 1 ? 's' : ''} Earned!</div>
      ${badgesHTML}
      <button class="rp-close" onclick="document.getElementById('reward-popup').remove()">✕ Close</button>
    </div>`;

  document.body.appendChild(popup);

  if (typeof spawnEmojiParticles === 'function') {
    spawnEmojiParticles(window.innerWidth/2, window.innerHeight/2, ['🏆','⭐','🎉','✨','🌟','🎊'], 8);
  }

  setTimeout(() => { const el = document.getElementById('reward-popup'); if (el) el.remove(); }, 5000);
}

// =============================================================
// LIVE STATS PANEL — injected into game-over modal after each level
// =============================================================
function injectLevelStats(level, won) {
  // Remove old stats panel if present
  const old = document.getElementById('level-stats-panel');
  if (old) old.remove();

  const data = loadProgress();
  const entry = data.levels[level] || {};
  const total = data.totalLevelsCompleted || 0;
  const badges = (data.badges || []).length;

  const panel = document.createElement('div');
  panel.id = 'level-stats-panel';
  panel.style.cssText = `
    margin: 0.8vh auto 0;
    width: 90%;
    background: rgba(255,255,255,0.9);
    border-radius: 0.8em;
    padding: 1vh 1.5vw;
    font-size: clamp(0.65rem, 1.3vw, 0.82rem);
    color: #333;
    border: 1px solid #e0e0e0;
    text-align: left;
  `;

  const bestTime  = entry.bestTime != null ? formatTime(entry.bestTime) : '—';
  const attempts  = entry.attempts || 1;
  const firstTry  = entry.firstTry ? ' 🎯' : '';
  const totalTime = formatTime(data.totalPlayTime || 0);

  panel.innerHTML = `
    <div style="font-weight:bold;color:#4b2e83;margin-bottom:0.5vh;font-size:clamp(0.72rem,1.4vw,0.88rem);">
      📊 Level ${level} Stats
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.3vh 1vw;">
      <span>⏱️ Best time</span>   <span style="font-weight:bold">${bestTime}${firstTry}</span>
      <span>🎯 Attempts</span>    <span style="font-weight:bold">${attempts}</span>
      <span>🏆 Levels done</span> <span style="font-weight:bold">${total} / 30</span>
      <span>🎖️ Badges</span>      <span style="font-weight:bold">${badges} / 13</span>
      <span>⏳ Total time</span>  <span style="font-weight:bold">${totalTime}</span>
    </div>
  `;

  // Insert inside .game div, before the buttons
  const gameDiv = document.querySelector('#gameOver .game');
  if (gameDiv) {
    const firstBtn = gameDiv.querySelector('button');
    if (firstBtn) gameDiv.insertBefore(panel, firstBtn);
    else gameDiv.appendChild(panel);
  }
}

// =============================================================
// HOOKS — difficulty buttons only
// recordLevelStart / recordLevelComplete / recordPlayTime are
// called DIRECTLY from scriptt.js — no custom events needed

// =============================================================
// GAME CODE
// =============================================================
let score = 0;
let time = 0;
let timer;
let timerInterval;
let ballCreationIntervalId;
let level = 0;
let restartButton;
let ballWidth = 50;
const squareSize = 700;
const ballCreationInterval = 800;
let gamePaused = true;
let obstacleCoordinates = [];
let mouseClickCoordinates = {};
let isGameRunning = false;
let wasPausedByFocus = false;
let GAME_PAUSED = false;
let GAME_STARTED = false;
let PAUSE_LOCK = false;
let IS_DRAGGING = false;

document.addEventListener("wheel", e => {
  if (isGameRunning) e.preventDefault();
}, { passive: false });


function isLaptop() {
  return (
    window.innerWidth <= 1366 ||          // common laptop widths
    navigator.maxTouchPoints > 0           // touchpad-capable devices
  );
}

function forceUnpause() {
  GAME_PAUSED = false;

  const focus = document.getElementById("focus-block");
  if (focus) focus.style.display = "none";

  const overlay = document.getElementById("overlay");
  if (overlay) overlay.style.display = "none";
}



// Single consolidated visibility/focus handlers — no duplicates
document.addEventListener("visibilitychange", () => {
  // Ignore if: game not started, already paused, or splash is showing
  if (!GAME_STARTED || !isGameRunning) return;
  if (document.getElementById('_rm_splash')) return; // roadmap splash active

  if (document.hidden) {
    pauseGame();
    showFocusWarning();
    wasPausedByFocus = true;
  } else {
    if (wasPausedByFocus) {
      hideFocusWarning();
      wasPausedByFocus = false;
    }
  }
});

// Grace period flag — prevents spurious pause on file:// load
var _pageReady = false;
setTimeout(function() { _pageReady = true; }, 2000);

window.addEventListener("blur", () => {
  if (!GAME_STARTED || !isGameRunning || GAME_PAUSED) return;
  if (!_pageReady) return;
  if (document.getElementById('_rm_splash')) return;
  setTimeout(() => {
    if (!document.hasFocus() && isGameRunning && !GAME_PAUSED) {
      pauseGame();
      showFocusWarning();
      wasPausedByFocus = true;
    }
  }, 200);
});

window.addEventListener("focus", () => {
  if (wasPausedByFocus && isGameRunning) {
    hideFocusWarning();
    wasPausedByFocus = false;
  }
});


function blockMobileAndTablet() {
  const isTrueTouch = navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches;
  if (isTrueTouch) document.body.classList.add("is-touch-device");
  const isPhone = isTrueTouch && Math.min(window.innerWidth, window.innerHeight) < 480;
  if (isPhone) document.body.classList.add("is-phone");
  const isVerySmall = isTrueTouch && window.innerWidth < 400 && window.innerHeight < 400;
  if (isVerySmall && document.visibilityState === "visible") {
    document.getElementById("device-block").style.display = "flex";
    document.body.style.overflow = "hidden"; return;
  }
  checkRotate();
}
function checkRotate() {
  const isTrueTouch = navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches;
  if (!isTrueTouch) return;
  const rb = document.getElementById("rotate-block"); if (!rb) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  const isPhone = Math.min(window.innerWidth, window.innerHeight) < 600;
  if (isPhone && isPortrait) { rb.style.display = "flex"; document.body.style.overflow = "hidden"; }
  else { rb.style.display = "none"; document.body.style.overflow = ""; }
}
window.addEventListener("orientationchange", function() { setTimeout(checkRotate, 300); });
window.addEventListener("resize", checkRotate);


function showFocusWarning() {
  const fb = document.getElementById("focus-block");
  fb.style.display = "flex";
  fb.style.pointerEvents = "all";
}

function hideFocusWarning() {
  const fb = document.getElementById("focus-block");
  fb.style.display = "none";
  fb.style.pointerEvents = "none";
  resumeGame();
}


// (focus handler consolidated above)



blockMobileAndTablet();




document.getElementById('overlay').style.display = 'none';

document.querySelector('#instruction-modal button').addEventListener('click', level1);


document.getElementById('easyBtn').addEventListener('click', function () {
  playSfx('/Sounds/Common%20Sound/click.wav');
});


document.getElementById('mediumBtn').addEventListener('click', function () {
  playSfx('/Sounds/Common%20Sound/click.wav');
});


document.getElementById('hardBtn').addEventListener('click', function () {
  playSfx('/Sounds/Common%20Sound/click.wav');
});

//soud and all
const audioSettingCheckbox = document.getElementById('audio_setting');
const audioIconOn = document.getElementById('audio_icon_on');
const audioIconOff = document.getElementById('audio_icon_off');
let backgroundAudio;

// FIX: 'maze' was used by generateObstacles()/addMovingObstacle() but was
// never defined anywhere, causing a ReferenceError ("maze is not defined")
// every time a level tried to build its obstacles — i.e. on almost every
// level from 3 onward. Cache the #maze container element here so both
// functions can append obstacles to it.
const maze = document.getElementById('maze');

// ── Mute-aware sound effect helper ─────────────────────────────
// Point 2 fix: the mute toggle previously only silenced the looping
// background music (via toggleBackgroundAudio). One-off SFX like button
// clicks were created with `new Audio(...).play()` directly, so they kept
// playing even after the user muted. Route all one-off SFX through this
// helper instead so a single mute switch controls everything.
function playSfx(src, volume) {
  var cb = document.getElementById('audio_setting');
  if (cb && !cb.checked) return; // muted — skip playback entirely
  var audio = new Audio(src);
  if (typeof volume === 'number') audio.volume = volume;
  var p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(function () {});
  return audio;
}

function toggleBackgroundAudio() {
  if (audioSettingCheckbox.checked) {
    playBackgroundSound();
    audioIconOn.style.display = 'block';
    audioIconOff.style.display = 'none';
  } else {
    stopBackgroundSound();
    audioIconOn.style.display = 'none';
    audioIconOff.style.display = 'block';
  }
}
function playBackgroundSound() {
  if (backgroundAudio) {
    stopBackgroundSound(); // Stop any existing audio before starting a new one
  }
  backgroundAudio = new Audio('Sounds/Common%20Sound/background.mp3');
  backgroundAudio.volume = 0.1;
  backgroundAudio.loop = true;
  var playPromise = backgroundAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function(err) {
      console.log('[Audio] Background music autoplay blocked, will start on first tap:', err.message);
      // Most browsers block audio until the user interacts with the page.
      // Retry once on the first click/touch/keydown.
      var resumeAudio = function() {
        if (audioSettingCheckbox.checked && backgroundAudio) {
          backgroundAudio.play().catch(function(){});
        }
        document.removeEventListener('click', resumeAudio);
        document.removeEventListener('touchstart', resumeAudio);
        document.removeEventListener('keydown', resumeAudio);
      };
      document.addEventListener('click', resumeAudio, { once: true });
      document.addEventListener('touchstart', resumeAudio, { once: true });
      document.addEventListener('keydown', resumeAudio, { once: true });
    });
  }
}

function stopBackgroundSound() {
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
    backgroundAudio = null; // Ensure the old audio instance is cleared
  }
}

audioSettingCheckbox.addEventListener('change', function() {
  toggleBackgroundAudio();
  try { localStorage.setItem('dreamdrop_muted', audioSettingCheckbox.checked ? '0' : '1'); } catch(e) {}
});
// Restore previous mute preference before first play, so muting truly
// persists "at any point" — including across page reloads and levels.
try {
  if (localStorage.getItem('dreamdrop_muted') === '1') {
    audioSettingCheckbox.checked = false;
  }
} catch(e) {}
toggleBackgroundAudio()



function pauseGame() {
  if (!GAME_STARTED) return;
  if (GAME_PAUSED) return;

  GAME_PAUSED = true;
  PAUSE_LOCK = true;

  clearInterval(timer);
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);

  const fb = document.getElementById("focus-block");
  if (fb) fb.style.display = "flex";
}

function resumeGame() {
  if (!GAME_PAUSED || !PAUSE_LOCK) return;

  GAME_PAUSED = false;
  PAUSE_LOCK = false;
  gamePaused = false;

  const fb = document.getElementById("focus-block");
  if (fb) fb.style.display = "none";

  // Just restart the intervals — do NOT call level functions (that resets the level)
  if (isGameRunning && currentLevel > 0) {
    // Restart the countdown timer
    clearInterval(timer);
    timer = setInterval(() => {
      if (GAME_PAUSED) return;
      time++;
      const tv = document.getElementById('time-value');
      if (tv) tv.innerText = time;
    }, 1000);

    // Restart ball creation if this is a ball-clicking level (1)
    if (currentLevel === 1) {
      clearInterval(ballCreationIntervalId);
      ballCreationIntervalId = setInterval(() => {
        if (GAME_PAUSED) return;
        const ball = createRedBall();
        document.body.appendChild(ball);
        animateBall(ball);
      }, ballCreationInterval);
    }
  }
}




function createRedBall() {
  const ball = document.createElement('div');
  ball.classList.add('ball', 'red');
  let currentFrame = 1;
  ball.style.backgroundImage = `url('Images/Dream_Drop/ball1.png')`;
  ball.style.backgroundSize = 'contain';
  ball.style.backgroundRepeat = 'no-repeat';
  ball.style.cursor = "pointer";

  // FIXED: Previously used a fixed squareSize=700 which could be larger
  // than the actual window on tablets/phones, causing balls to spawn
  // partially or fully outside the visible screen area.
  // Now we use actual window dimensions with a safe margin (ballSize + padding)
  // so every ball is always fully visible and tappable.
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const ballSize = Math.max(44, Math.min(vw, vh) * 0.07);
  const margin = ballSize + 10;
  let left, top, attempts = 0;
  do { left = margin+Math.random()*(vw-margin*2); top = margin+Math.random()*(vh-margin*2); attempts++; if(attempts>50)break; } while(checkCollision(left,top,ballSize+10));

  ball.style.left = left + 'px';
  ball.style.top  = top  + 'px';


  ball.addEventListener('pointerdown', function (e) {
    if (GAME_PAUSED) return;
    e.stopPropagation();
    ball.remove();
    score++;
    document.getElementById('score-value').innerText = score;
    // LIVE FEEDBACK: Fire custom event with click coordinates so
    // the feedback system knows where to spawn the emoji burst
    document.dispatchEvent(new CustomEvent('feedbackScoreGood', {
      detail: { x: e.clientX, y: e.clientY }
    }));
  });


  return ball;
}




function checkCollision(left, top, size) {
  const balls = document.querySelectorAll('.ball');
  balls.forEach(ball => {
    const ballRect = ball.getBoundingClientRect();
    const ballLeft = ballRect.left;
    const ballTop = ballRect.top;
    const ballRight = ballRect.right;
    const ballBottom = ballRect.bottom;

    if (left < ballRight && left + size > ballLeft && top < ballBottom && top + size > ballTop) {
      return true;
    }
  });
  return false;
}


document.addEventListener('click', function (event) {

  let x = event.clientX;
  let y = event.clientY;

  let clickKey = new Date().getTime();  // Use timestamp as the unique key for each click
  mouseClickCoordinates[clickKey] = { x, y };


  console.log(`Click recorded at: (${x}, ${y})`);
  console.log(mouseClickCoordinates);
});



document.addEventListener("DOMContentLoaded", function () {

  document.getElementById('easyBtn').addEventListener('click', function () {
    playSfx('/Sounds/Common%20Sound/click.wav');

    document.getElementById('fidrat-home').style.backgroundImage = 'url("Images/Common_Images/gamebg.png")';
    clearGame();

    // Hide ALL home screen elements at once
    document.getElementById('para').style.display = 'none';
    document.getElementById('para1').style.display = 'none';
    document.getElementById('ie').style.display = 'none';
    document.getElementById('vv').style.display = 'none';
    document.getElementById('shanti').style.display = 'none';
    document.getElementById('prem').style.display = 'none';
    document.getElementById('game-title').style.display = 'none';
    document.getElementById('menu-buttons').style.display = 'none';  // hides Easy/Medium/Hard
    document.getElementById('roadmapBtn').style.display = 'none';    // hides My Progress

    document.getElementById('instruction-modal').style.display = 'block';
    document.getElementById('fidrat-home').style.backgroundColor = 'lightgoldenrodyellow';

    document.getElementById('ok').addEventListener('click', function () {
      score = 0;
      time = 0;
      currentLevel = 1;
      GAME_STARTED = true;
      level1();
    });
  });

  document.getElementById('mediumBtn').addEventListener('click', function () {
    playSfx('/Sounds/Common%20Sound/click.wav');
    clearGame();

    document.getElementById('para').style.display = 'none';
    document.getElementById('para1').style.display = 'none';
    document.getElementById('ie').style.display = 'none';
    document.getElementById('vv').style.display = 'none';
    document.getElementById('shanti').style.display = 'none';
    document.getElementById('prem').style.display = 'none';
    document.getElementById('game-title').style.display = 'none';
    document.getElementById('menu-buttons').style.display = 'none';
    document.getElementById('roadmapBtn').style.display = 'none';
    document.getElementById('instruction-modal').style.display = 'none';

    document.getElementById('fidrat-home').style.backgroundImage = 'url("Images/Common_Images/gamebg.png")';
    document.getElementById('fidrat-home').style.backgroundColor = 'lightgoldenrodyellow';

    score = 0;
    time = 0;
    currentLevel = 3;  // Starts from Level 3 — first easy obstacle maze
    GAME_STARTED = true;
    level3();
  });

  document.getElementById('hardBtn').addEventListener('click', function () {
    document.getElementById('fidrat-home').style.backgroundImage = 'url("Images/Common_Images/gamebg.png")';
    clearGame();

    document.getElementById('para').style.display = 'none';
    document.getElementById('para1').style.display = 'none';
    document.getElementById('ie').style.display = 'none';
    document.getElementById('vv').style.display = 'none';
    document.getElementById('shanti').style.display = 'none';
    document.getElementById('prem').style.display = 'none';
    document.getElementById('game-title').style.display = 'none';
    document.getElementById('menu-buttons').style.display = 'none';
    document.getElementById('roadmapBtn').style.display = 'none';
    document.getElementById('instruction-modal').style.display = 'none';
    document.getElementById('fidrat-home').style.backgroundColor = 'lightgoldenrodyellow';

    score = 0;
    time = 0;
    currentLevel = 13;  // Starts from Level 13 — original hard levels
    GAME_STARTED = true;
    level13();
  });
});


function clearGame() {
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(obstacle => obstacle.remove());
  document.querySelectorAll('.ball').forEach(ball => ball.remove());
}





function level1() {
  isGameRunning = true;
  currentLevel = 1;   // FIX: set BEFORE startTracking so levelStarted fires with correct level
  startTracking();
  document.getElementById('para').style.display = 'none';
  document.getElementById('para1').style.display = 'none';
  document.getElementById('ie').style.display = 'none';
  document.getElementById('vv').style.display = 'none';
  document.getElementById('shanti').style.display = 'none';
  document.getElementById('prem').style.display = 'none';
  document.getElementById('game-title').style.display = 'none';
  document.getElementById('easyBtn').style.display = 'none';
  document.getElementById('mediumBtn').style.display = 'none';
  document.getElementById('hardBtn').style.display = 'none';
  document.getElementById('instruction-modal').style.display = 'none';
  document.getElementById('fidrat-home').style.backgroundColor = 'lightgoldenrodyellow';

  clearInterval(timer);
  clearInterval(ballCreationIntervalId);
  document.getElementById('score').style.display = 'block';
  document.getElementById('time').style.display = 'block';
  document.getElementById('time-value').innerText = time;
  document.getElementById('score-value').innerText = score;

  // Add event listener for clicking the balls


  timer = setInterval(() => {
    if (GAME_PAUSED) return;
    time++;
    document.getElementById('time-value').innerText = time;
    if (time >= 10) {
      clearInterval(timer);
      if (score >= 3) {
        showGameOverAlert(true, 1);
        document.querySelectorAll('.ball').forEach(ball => ball.remove());
        level2();
      } else {
        showGameOverAlert(false, 1);
      }
    }
  }, 1000);

  ballCreationIntervalId = setInterval(() => {
    if (GAME_PAUSED) return;
    const ball = createRedBall();
    document.body.appendChild(ball);
    animateBall(ball);
  }, ballCreationInterval);


}



function showRestartButton() {
  if (!restartButton) {
    restartButton = document.createElement('button');
    restartButton.id = 'restart-button';
    restartButton.innerText = 'Restart';
    restartButton.style.position = 'absolute';
    restartButton.style.top = '50%';
    restartButton.style.left = '50%';
    restartButton.style.transform = 'translate(-50%, -50%)';
    restartButton.style.fontSize = '24px';
    document.body.appendChild(restartButton);
    restartButton.addEventListener('click', restartGame);
  }
  restartButton.style.display = 'block';
}



function restartGame() {
  clearInterval(timer);
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);

  score = 0;
  time = 0;

  document.getElementById('score-value').innerText = score;
  document.getElementById('time-value').innerText = time;

  document.querySelectorAll('.ball').forEach(ball => ball.remove());
  document.removeEventListener('click', clickBall);
  document.getElementById('basket').style.display = 'none';
  document.querySelectorAll('.obstacle').forEach(obstacle => obstacle.remove());
  document.getElementById('instruction-modal2').style.display = 'none';

  // Resume from currentLevel
  switch (currentLevel) {
    case 1:
      level1();
      break;
    case 2:
      forceUnpause();
      level2(true);
      break;
    case 3:
      level3();
      break;
    case 4:
      level4();
      break;
    case 5:
      level5();
      break;
    case 6:
      level6();
      break;
    case 7:
      level7();
      break;
    case 8:
      level8();
      break;
    case 9:
      level9();
      break;
    case 10:
      level10();
      break;
    case 11:
      level11();
      break;
    case 12:
      level12();
      break;

    case 13:
      level13();
      break;

    case 14:
      level14();
      break;

    case 15:
      level15();
      break;

    case 16:
      level16();
      break;

    case 17:
      level17();
      break;

    case 18: level18(); break;
    case 19: level19(); break;
    case 20: level20(); break;
    case 21: level21(); break;
    case 22: level22(); break;
    case 23: level23(); break;
    case 24: level24(); break;
    case 25: level25(); break;
    case 26: level26(); break;
    case 27: level27(); break;
    case 28: level28(); break;
    case 29: level29(); break;
    case 30: level30(); break;
    case 31: level31(); break;
    case 32: level32(); break;
    case 33: level33(); break;
    default: level1();
  }
}




function animateBall(ball) {
  // FIXED: Start position and boundary now use actual window.innerHeight
  // so animation works correctly on any screen size (phone, tablet, desktop)
  const _vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  let position = _vh;
  const speed = 2;

  function updatePosition() {
    if (GAME_PAUSED) return;
    position -= speed;
    if (position > -Math.max(44, _vh * 0.07)) {
      ball.style.top = position + 'px';
      requestAnimationFrame(updatePosition);
    } else {
      ball.remove();
    }
  }

  updatePosition();
}


function startGame() {
  document.getElementById('instruction-modal').style.display = 'block';
}


function clickBall(event) {
  if (currentLevel === 1) {
    const ball = event.target.closest('.ball');
    if (ball && ball.classList.contains('red')) {
      ball.style.cursor = "pointer";
      ball.remove();
      score++;
      document.getElementById('score-value').innerText = score;
      // LIVE FEEDBACK
      document.dispatchEvent(new CustomEvent('feedbackScoreGood', {
        detail: { x: event.clientX, y: event.clientY }
      }));
    }
  }
}

function level2() {
  forceUnpause();
  isGameRunning = true;
  currentLevel = 2;
  startTracking(); // FIX: track level start for progress system
  score = 0;
  time = 0;

  // 1. Force hide the overlay and previous modal
  // We use getElementById to be safe, rather than relying on the variable 'overlay'
  const overlay = document.getElementById('overlay');
  const modal = document.getElementById('gameOver');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const basketEl = document.getElementById('basket');

  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
  if (scoreEl) scoreEl.style.display = 'none';
  if (timeEl) timeEl.style.display = 'none';
  if (basketEl) basketEl.style.display = 'none';

  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.ball').forEach(b => b.remove());

  // 2. IMMEDIATELY show the Level 2 instructions (Do not wait for 'next' click)
  const instrModal2 = document.getElementById('instruction-modal2');
  if (instrModal2) {
    instrModal2.style.display = 'block';
  }

  // 3. Set up the "Start Level 2" button
  const startBtn = document.getElementById('start-level2-button');
  if (startBtn) {
    startBtn.onclick = () => {
      instrModal2.style.display = 'none';

      // Show game UI
      scoreEl.style.display = 'block';
      timeEl.style.display = 'block';
      basketEl.style.display = 'block';

      document.getElementById('score-value').innerText = score;
      document.getElementById('time-value').innerText = time;

      clearInterval(timerInterval);

      // Start the timer
      timerInterval = setInterval(() => {
        if (GAME_PAUSED) return;

        time++;
        document.getElementById('time-value').innerText = time;

        if (time >= 10) {
          clearInterval(timerInterval);
          if (score >= 1) {
            showGameOverAlert(true, 2);
          } else {
            showGameOverAlert(false, 2);
          }
        }
      }, 1000);

      generateBalllevel2();
    };
  }

  // ... Keep your generateBalllevel2 and other helper functions below ...
  
  function generateBalllevel2() {
    const ball = document.createElement("div");
    ball.className = "ball red";
    ball.style.left = `${Math.random() * (window.innerWidth - 40)}px`;
    ball.style.top = `50px`;
    document.body.appendChild(ball);
    enableBallDrag(ball);
  }

  function enableBallDrag(ball) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    ball.addEventListener("pointerdown", e => {
      if (GAME_PAUSED) return;
      dragging = true;
      IS_DRAGGING = true;
      ball.setPointerCapture(e.pointerId);
      const rect = ball.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    ball.addEventListener("pointermove", e => {
      if (!dragging || GAME_PAUSED) return;
      // FIX: setPointerCapture() (called in pointerdown above) can
      // suppress the document-level mousemove/touchmove listeners that
      // analytics relies on to build mouseMovements — this is why
      // Level 2's drag data was recording 0 points even though the
      // player was clearly dragging. Record directly here instead of
      // depending on capture behavior.
      if (isGameRunning && GAME_STARTED && typeof mouseMovements !== 'undefined') {
        mouseMovements.push({ x: e.clientX, y: e.clientY, time: Date.now() });
      }
      requestAnimationFrame(() => {
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        x = Math.max(0, Math.min(window.innerWidth - ball.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - ball.offsetHeight, y));
        ball.style.left = x + "px";
        ball.style.top = y + "px";
      });
    });

    ball.addEventListener("pointerup", e => {
      dragging = false;
      IS_DRAGGING = false;
      ball.releasePointerCapture(e.pointerId);
      checkDrop(ball);
    });

    ball.addEventListener("pointercancel", () => {
      dragging = false;
      IS_DRAGGING = false;
    });
  }

  function checkDrop(ball) {
    const basket = document.getElementById("basket");
    const b = basket.getBoundingClientRect();
    const r = ball.getBoundingClientRect();
    const t = 10;

    if (
      r.left >= b.left - t &&
      r.right <= b.right + t &&
      r.top >= b.top - t &&
      r.bottom <= b.bottom + t
    ) {
      // SUCCESS — ball landed in basket
      ball.remove();
      score++;
      document.getElementById("score-value").innerText = score;
      const bRect = basket.getBoundingClientRect();
      document.dispatchEvent(new CustomEvent('feedbackScoreGood', {
        detail: { x: bRect.left + bRect.width / 2, y: bRect.top }
      }));
      if (score < 5) {
        generateBalllevel2();
      } else {
        // FIX: previously the level-complete screen (with the Analytics
        // button) only appeared once the 10s timer ran out — even if all
        // 5 balls were already dropped. A fast player got stuck on a
        // blank screen with no way to reach "View Analytics" until the
        // clock expired. Now finishing all 5 ends the level immediately,
        // same as every other level.
        clearInterval(timerInterval);
        showGameOverAlert(true, 2);
      }
    } else {
      // MISSED — ball released but didn't land in basket
      // Only fire feedback if ball was reasonably close (player was trying)
      const ballCX = (r.left + r.right) / 2;
      const ballCY = (r.top + r.bottom) / 2;
      const basketCX = (b.left + b.right) / 2;
      const basketCY = (b.top + b.bottom) / 2;
      const dist = Math.hypot(ballCX - basketCX, ballCY - basketCY);
      if (dist < Math.max(b.width, b.height) * 3) {
        document.dispatchEvent(new CustomEvent('feedbackWrongDrop'));
      }
    }
  }
}



// Function to generate obstacles
function generateObstacles(obstacles) {
  const isSmallTouch = navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 600;
  const minPx = isSmallTouch ? 8 : 4;
  obstacles.forEach(obstacle => {
    const div = document.createElement('div');
    div.classList.add('obstacle');
    div.style.top  = `${obstacle.top}vh`;
    div.style.left = `${obstacle.left}vw`;
    div.style.height = obstacle.height <= 4 ? Math.max(obstacle.height * window.innerHeight / 100, minPx) + 'px' : `${obstacle.height}vh`;
    div.style.width  = obstacle.width  <= 4 ? Math.max(obstacle.width  * window.innerWidth  / 100, minPx) + 'px' : `${obstacle.width}vw`;
    maze.appendChild(div);
    obstacleCoordinates.push({
      left: obstacle.left * window.innerWidth / 100, top: obstacle.top * window.innerHeight / 100,
      width: obstacle.width * window.innerWidth / 100, height: obstacle.height * window.innerHeight / 100
    });
  });
}
function checkCollisionWithObstacle(x, y) {
  for (let i = 0; i < obstacleCoordinates.length; i++) {
    const obstacle = obstacleCoordinates[i];

    if (
      x >= obstacle.left &&
      x <= obstacle.left + obstacle.width &&
      y >= obstacle.top &&
      y <= obstacle.top + obstacle.height
    ) {
      return true;
    }
  }
  return false;
}

document.addEventListener('click', function (event) {
  let x = event.clientX;
  let y = event.clientY;

  if (checkCollisionWithObstacle(x, y)) {
    let clickKey = new Date().getTime(); // Using timestamp for a unique key
    mouseClickCoordinates[clickKey] = { x, y };

    console.log(`Click recorded at: (${x}, ${y}) due to collision with an obstacle`);
    console.log(mouseClickCoordinates); // Print out the updated dictionary with collisions
  }
});

// Function to generate a draggable ball
function generateBall(left, bottom, currentLevel) {
  let ball = document.createElement("div");
  ball.classList.add("ball");
  ball.style.left = left;
  ball.style.bottom = bottom;

  document.body.appendChild(ball);


  let currentFrame = 1;

  // Set the initial frame
  ball.style.backgroundImage = `url('Images/Dream_Drop/ball1.png')`;
  ball.style.backgroundSize = "contain";
  ball.style.backgroundRepeat = "no-repeat";


  // Increment frame counter to cycle through the images
  function nextFrame() {
    currentFrame = (currentFrame % 9) + 1; // Cycling through frames from 1 to 9
    ball.style.backgroundImage = `url('Images/Dream_Drop/ball1.png')`;
  }


  const animationInterval = setInterval(nextFrame, 100);

  ball.addEventListener('mousedown', startDrag);

  // =====================================================
  // MOBILE/TABLET SUPPORT ADDED:
  // Add touchstart as an additional trigger for dragging.
  // The original mousedown is kept untouched.
  // We convert touch coordinates to match the existing drag logic.
  // =====================================================
  ball.addEventListener('touchstart', function (e) {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY + 60, preventDefault: () => {} };
    startDrag(fakeEvent);
  }, { passive: false });

  let isDragging = false;
  let offsetX, offsetY;

  function startDrag(event) {

    const ballRect = ball.getBoundingClientRect();
    // BUG FIX (ball over-sensitivity): offsetX/offsetY must be stored in
    // PIXELS, matching the pixel-based e.clientX/e.clientY used in drag().
    // They were previously stored as percentages of viewport size, so on
    // the very first drag frame the ball snapped almost exactly under the
    // cursor instead of keeping the grab point — a large sudden jump that
    // could clip a wall immediately and fail the level on click 1.
    offsetX = event.clientX - ballRect.left;
    offsetY = event.clientY - ballRect.top;
    isDragging = true;

    ball.style.zIndex = "1000";
    document.addEventListener("mousemove", drag);

    document.addEventListener("mouseup", endDrag);

    // =====================================================
    // MOBILE/TABLET SUPPORT ADDED:
    // Add touch equivalents of mousemove and mouseup.
    // The existing drag() and endDrag() functions are reused.
    // Touch coordinates are converted to match mouse format.
    // =====================================================
    document.addEventListener("touchmove", touchDrag, { passive: false });
    document.addEventListener("touchend", endDrag);

    // Prevent default behavior to avoid text selection
    event.preventDefault();


  }

  function drag(e) {
    if (isDragging) {

      const ballRect = ball.getBoundingClientRect();
      // Calculate the new position of the ball.
      // offsetX/offsetY are now pixels (see startDrag fix above), so
      // subtract in pixel space first, then convert the result to vw/vh.
      let newLeftPx = e.clientX - offsetX;
      let newTopPx  = e.clientY - offsetY;
      let newX = newLeftPx / window.innerWidth * 100;
      let newY = (window.innerHeight - newTopPx - ballRect.height) / window.innerHeight * 100;

      // Ensure that the ball stays within the bounds of the viewport
      newX = Math.max(0, Math.min(100 - ballRect.width / window.innerWidth * 100, newX)); // Ensure it doesn't go beyond viewport width
      newY = Math.max(0, Math.min(100 - ballRect.height / window.innerHeight * 100, newY)); // Ensure it doesn't go beyond viewport height

      // Update the position of the ball
      ball.style.left = `${newX}vw`;
      ball.style.bottom = `${newY}vh`;

    }
    if (!e.buttons) {
      endDrag();
    }
    Collision();
  }

  // =====================================================
  // MOBILE/TABLET SUPPORT ADDED:
  // touchDrag converts a touch event into the same format
  // as a mouse event, then calls the existing drag() function.
  // This means we don't change any drag logic — we just bridge it.
  // =====================================================
  function touchDrag(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY + 60, buttons: 1 };
    drag(fakeEvent);
  }

  function Collision() {
    // const GRACE_MS = 200; // <-- how long (ms) after grabbing the ball collisions are ignored
   // if (Date.now() - dragStartTime < GRACE_MS) return;
    const ballRect = ball.getBoundingClientRect();
    const obstacles = document.querySelectorAll('.obstacle');
    const buffer = Math.min(ballRect.width, ballRect.height) * 0.25;

    obstacles.forEach(obstacle => {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (
        ballRect.right - buffer > obstacleRect.left &&
        ballRect.left + buffer < obstacleRect.right &&
        ballRect.bottom - buffer > obstacleRect.top &&
        ballRect.top + buffer < obstacleRect.bottom
      ) {
        endDrag();
        // SMART FEEDBACK: Tell the system it was a collision specifically
        document.dispatchEvent(new CustomEvent('feedbackCollision'));
        showGameOverAlert(false, currentLevel);
      }
    });
  }

  function endDrag() {
    isDragging = false;
    ball.style.zIndex = "0";
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", endDrag);
    // =====================================================
    // MOBILE/TABLET SUPPORT ADDED:
    // Also remove the touch listeners when drag ends,
    // mirroring how mousemove/mouseup are removed above.
    // =====================================================
    document.removeEventListener("touchmove", touchDrag);
    document.removeEventListener("touchend", endDrag);

    // SMART FEEDBACK: Check if the ball was dropped NEAR the basket
    // but missed — so we can give directional hint feedback
    const basket = document.getElementById('basket');
    if (basket && ball) {
      const b = basket.getBoundingClientRect();
      const r = ball.getBoundingClientRect();
      const ballCX = (r.left + r.right) / 2;
      const ballCY = (r.top + r.bottom) / 2;
      const basketCX = (b.left + b.right) / 2;
      const basketCY = (b.top + b.bottom) / 2;
      const dist = Math.hypot(ballCX - basketCX, ballCY - basketCY);
      const threshold = Math.max(b.width, b.height) * 2.5;

      // Ball was dropped close to basket but missed — give a hint
      if (dist < threshold) {
        document.dispatchEvent(new CustomEvent('feedbackWrongDrop'));
      }
    }

    checkDrop(ball);
  }
}

// Function to check if the dragged ball is dropped into the basket
function checkDrop(ball, basketId, currentLevel) {
  const basket = document.getElementById('basket');
  const basketRect = basket.getBoundingClientRect();

  const balls = document.querySelectorAll('.ball');

  balls.forEach(ball => {
    const ballRect = ball.getBoundingClientRect();
    const basketCenterX = (basketRect.left + basketRect.right) / 2;
    const basketCenterY = (basketRect.top + basketRect.bottom) / 2;

    // Check if the ball's position is within the basket
    if (
      ballRect.left >= basketRect.left &&
      ballRect.right <= basketRect.right &&
      ballRect.top >= basketRect.top &&
      ballRect.bottom <= basketRect.bottom &&
      ballRect.left <= basketCenterX &&
      ballRect.right >= basketCenterX &&
      ballRect.top <= basketCenterY &&
      ballRect.bottom >= basketCenterY
    ) {
      // Ball is dropped into the basket
      ball.remove();
      showGameOverAlert(true, currentLevel);

      document.querySelectorAll('.ball').forEach(ball => ball.remove());


    }
  });
}


function showGameOverAlert(levelCompleted, currentLevel) {
  isGameRunning = false;
  wasPausedByFocus = false;

  // FIX: 'overlay' was referenced below (overlay.style.display = ...) but
  // was never defined in this function's scope, causing a ReferenceError
  // ("overlay is not defined") at the end of EVERY level — success or
  // failure — which stopped the game-over modal from ever showing.
  const overlay = document.getElementById('overlay');

  GAME_STARTED  = false;   // stop blur/focus handlers from firing
  GAME_PAUSED = true;
  PAUSE_LOCK  = true;

  // Stop timers silently — do NOT call pauseGame() (it shows focus-block overlay)
  clearInterval(timer);
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);

  // Make absolutely sure focus-block is hidden — game ended, not paused
  const _fb = document.getElementById('focus-block');
  if (_fb) { _fb.style.display = 'none'; _fb.style.pointerEvents = 'none'; }

  // Show the "My Progress" button in the game-over modal
  const _pb = document.getElementById('progressBtn');
  if (_pb) _pb.style.display = 'block';

  document.querySelectorAll('.obstacle').forEach(o => o.style.display = 'none');
  const modal = document.getElementById('gameOver');
  const restartBtn = document.getElementById('restartBtn');
  const quitBtn = document.getElementById('quitBtn');
  const Next = document.getElementById('next');
  clearGame();
  const message = document.getElementById('gameOverMessage');

  // PROGRESS SYSTEM: save stats — ORDER MATTERS:
  // 1. recordLevelComplete first (needs _levelStartTime to compute elapsed)
  // 2. recordPlayTime last    (resets _levelStartTime to null)
  if (levelCompleted) {
    if (typeof recordLevelComplete === 'function') recordLevelComplete(currentLevel);
    if (typeof onLevelComplete     === 'function') onLevelComplete(currentLevel);
  } else {
    if (typeof onPlayerFailed      === 'function') onPlayerFailed('gameover');
  }
  if (typeof recordPlayTime === 'function') recordPlayTime(); // must be last

  // PROGRESS SYSTEM: inject live stats into game over modal
  if (typeof injectLevelStats === 'function') {
    setTimeout(() => injectLevelStats(currentLevel, levelCompleted), 100);
  }

  if (levelCompleted) {
    stopTrackingAndExport(`level ${currentLevel}`);
    message.innerText = "You have cleared the level " + currentLevel;
    // Hide the restart and quit buttons, display next button
    restartBtn.style.display = 'none';
    quitBtn.style.display = 'block';
    Next.style.display = 'block';
    Next.onclick = function () {
      // Clean state — next level starts fresh, no resumeGame needed
      GAME_PAUSED = false; PAUSE_LOCK = false; gamePaused = false;
      isGameRunning = true; GAME_STARTED = true;
      score = 0; time = 0;
      const _pb2 = document.getElementById('progressBtn');
      if (_pb2) _pb2.style.display = 'none';
      document.getElementById('gameOver').style.display = 'none';
      modal.style.display = 'none';
      overlay.style.display = 'none';
      const _sp = document.getElementById('level-stats-panel');
      if (_sp) _sp.remove();
      nextLevelFunction(currentLevel + 1);
    }
    quitBtn.onclick = function () {
      modal.style.display = 'none';
      overlay.style.display = 'none';
      window.location.href = 'roadmap.html';
    }

  }


  else {
    stopTrackingAndExport(`level${currentLevel}`);
    message.innerText = "Game Over! Do you want to restart?";
    // Show the restart and quit buttons, hide next button
    restartBtn.style.display = 'block';
    quitBtn.style.display = 'block';
    Next.style.display = 'none';
    restartBtn.onclick = function () {
      GAME_PAUSED = false; PAUSE_LOCK = false; gamePaused = false;
      isGameRunning = true; GAME_STARTED = true;
      score = 0; time = 0;
      const _pb3 = document.getElementById('progressBtn');
      if (_pb3) _pb3.style.display = 'none';
      overlay.style.display = 'none';
      modal.style.display = 'none';
      const _sp2 = document.getElementById('level-stats-panel');
      if (_sp2) _sp2.remove();
      restartGame();
    }
    quitBtn.onclick = function () {
      overlay.style.display = 'none';
      modal.style.display = 'none';
      window.location.href = 'roadmap.html';
    }
  }

  overlay.style.display = 'none';
  modal.style.display = 'block';

}


// Define nextLevelFunction
function nextLevelFunction(currentLevel) {
  clearInterval(timer);
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);

  console.log("Moving to level " + currentLevel + "...");

  if (currentLevel <= 33) {
    switch (currentLevel) {
      case 2:  level2();  break;
      case 3:  level3();  break;
      case 4:  level4();  break;
      case 5:  level5();  break;
      case 6:  level6();  break;
      case 7:  level7();  break;
      case 8:  level8();  break;
      case 9:  level9();  break;
      case 10:  level10();  break;
      case 11:  level11();  break;
      case 12:  level12();  break;
      case 13: level13(); break;
      case 14: level14(); break;
      case 15: level15(); break;
      case 16: level16(); break;
      case 17: level17(); break;
      case 18: level18(); break;
      case 19: level19(); break;
      case 20: level20(); break;
      case 21: level21(); break;
      case 22: level22(); break;
      case 23: level23(); break;
      case 24: level24(); break;
      case 25: level25(); break;
      case 26: level26(); break;
      case 27: level27(); break;
      case 28: level28(); break;
      case 29: level29(); break;
      case 30: level30(); break;
      case 31: level31(); break;
      case 32: level32(); break;
      case 33: level33(); break;
      default:
        showFinalCompletion();
        break;
    }
  } else {
    showFinalCompletion();
  }
}

function showFinalCompletion() {
  // Big celebration — all 33 levels done!
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnEmojiParticles(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.7,
        ['🏆','🎉','⭐','🌟','🎊','✨','💫','🚀'], 6
      );
    }, i * 250);
  }
  setTimeout(() => {
    alert("🏆 Congratulations! You are a Dream Drop Champion! All 33 levels cleared!");
    setTimeout(() => { window.location.href = './index.html'; }, 500);
  }, 1800);
}


const ball = document.querySelectorAll('.ball'); // Get the ball element
let currentLevel = 0;


// =============================================================
// LEVELS 3–30 — ENHANCED CONSTRAINTS
// Progressive difficulty with distinct mechanics per tier:
//
// TIER 1 — Levels 3–5:   Simple static mazes, no timer, gentle gaps
// TIER 2 — Levels 6–9:   Denser mazes, narrow corridors, 1-2 movers
// TIER 3 — Levels 10–12: 2-3 fast movers, tight gaps, complex paths
// TIER 4 — Levels 13–15: 3-4 movers, some vertical, zigzag corridors
// TIER 5 — Levels 16–18: Timer 35s, 4+ movers, layered walls
// TIER 6 — Levels 19–21: Timer 25s, 5 movers, interlocking rooms
// TIER 7 — Levels 22–24: Timer 20s, 6 movers, gauntlet corridors
// TIER 8 — Levels 25–27: Timer 15s, 7 movers, near-impossible routes
// TIER 9 — Levels 28–30: Timer 12s, 8 movers, labyrinth + decoys
// =============================================================

// ===========================
// TIER 1: Levels 3–5
// Static obstacles, open gaps, basket clearly reachable
// ===========================


// =============================================================
// NEW EASY LEVELS 3, 4, 5 — Simple obstacle maze, same style as
// the original levels. Designed for neurodiverse children.
// No timer. No score. Just drag the ball through wide-gap walls
// into the basket. Very simple paths, generous gaps.
//
// Level 3 — ONE shelf across the middle, big gap on the right.
//            Ball bottom-right, basket top-center. Go straight up.
//
// Level 4 — TWO shelves, gaps alternate left/right (gentle zigzag).
//            Ball bottom-right, basket top-left.
//
// Level 5 — Simple L-shape channel: one vertical wall + one shelf.
//            Ball bottom-left, basket top-right. One corner only.
// =============================================================

// -------------------------------------------------------
// LEVEL 3 — One shelf, one wide gap, go straight up
// -------------------------------------------------------
function level3() {
  startTimedLevel(3, '6vh', '44vw', 50);
  //isGameRunning = true;
  startTracking();
  //currentLevel = 3;

  //document.getElementById('score').style.display  = 'none';
  //document.getElementById('time').style.display   = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top     = '6vh';
  document.getElementById('basket').style.left    = '44vw';  // top-center

  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(function(o) { o.remove(); });

  // One horizontal shelf at 45vh.
  // Left part: 3vw to 58vw (width 55vw). Gap on right: 58vw to 97vw (39vw wide).
  var obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3   },  // top border
    { top: 95, left: 0,  width: 100, height: 3   },  // bottom border
    { top: 0,  left: 0,  width: 3,   height: 100 },  // left border
    { top: 0,  left: 97, width: 3,   height: 100 },  // right border
    { top: 45, left: 3,  width: 55,  height: 4   },  // shelf — gap on right side
  ];
  generateObstacles(obstacles);

  // Ball starts bottom-right — player moves up through the right gap to basket
  generateBall('80vw', '20vh', currentLevel);
  document.addEventListener('mouseup', function() {
    checkDrop(ball, 'basket', currentLevel);
  });
  document.addEventListener('touchend', function() {
    checkDrop(ball, 'basket', currentLevel);
  }, { passive: true });
}

// -------------------------------------------------------
// LEVEL 4 — Two shelves, left gap then right gap (gentle zigzag)
// -------------------------------------------------------
function level4() {
  startTimedLevel(4,  '6vh',  '8vw',  50);
  isGameRunning = true;
  startTracking();
  currentLevel = 4;

  document.getElementById('score').style.display  = 'none';
 // document.getElementById('time').style.display   = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top     = '6vh';
  document.getElementById('basket').style.left    = '8vw';   // top-left

 // clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(function(o) { o.remove(); });

  // Shelf 1 at 35vh — covers RIGHT side (40→97vw). Gap is LEFT (3→40vw = 37vw wide).
  // Shelf 2 at 65vh — covers LEFT side (3→60vw). Gap is RIGHT (60→97vw = 37vw wide).
  var obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3   },
    { top: 95, left: 0,  width: 100, height: 3   },
    { top: 0,  left: 0,  width: 3,   height: 100 },
    { top: 0,  left: 97, width: 3,   height: 100 },
    { top: 35, left: 40, width: 57,  height: 4   },  // shelf 1 — gap on left
    { top: 65, left: 3,  width: 57,  height: 4   },  // shelf 2 — gap on right
  ];
  generateObstacles(obstacles);

  // Ball bottom-right — go up through right gap, then left through left gap
  generateBall('82vw', '20vh', currentLevel);
  document.addEventListener('mouseup', function() {
    checkDrop(ball, 'basket', currentLevel);
  });
  document.addEventListener('touchend', function() {
    checkDrop(ball, 'basket', currentLevel);
  }, { passive: true });
}

// -------------------------------------------------------
// LEVEL 5 — Simple L-shape: one vertical wall + one shelf
//            Only ONE corner to navigate
// -------------------------------------------------------
function level5() {
  startTimedLevel(5,  '6vh',  '20vw', 50);
  isGameRunning = true;
  startTracking();
  currentLevel = 5;

  document.getElementById('score').style.display  = 'none';
  //document.getElementById('time').style.display   = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top     = '6vh';
  document.getElementById('basket').style.left    = '20vw';  // top-right

  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(function(o) { o.remove(); });

  // Horizontal shelf at 50vh — covers left side (3→60vw). Gap right (60→97vw).
  // Vertical wall at 40vw — covers top half (3→50vh). Gap below (50→95vh).
  // Together they form a simple L. Ball bottom-left, basket top-right.
  // Path: move RIGHT past the vertical wall, then move UP past the shelf gap.
  var obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3   },
    { top: 95, left: 0,  width: 100, height: 3   },
    { top: 0,  left: 0,  width: 3,   height: 100 },
    { top: 0,  left: 97, width: 3,   height: 100 },
    { top: 50, left: 3,  width: 57,  height: 4   },  // horizontal shelf — gap on right
    { top: 13,  left: 40, width: 4,   height: 37  },  // vertical wall — gap below shelf
  ];
  generateObstacles(obstacles);

  // Ball bottom-left — move right past vertical wall, then up through shelf gap
  generateBall('12vw', '20vh', currentLevel);
  document.addEventListener('mouseup', function() {
    checkDrop(ball, 'basket', currentLevel);
  });
  document.addEventListener('touchend', function() {
    checkDrop(ball, 'basket', currentLevel);
  }, { passive: true });
}

function level6() {
  startTimedLevel(6,  '6vh',  '48vw', 45);
  isGameRunning = true;
  startTracking();
  currentLevel = 6;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '6vh';
  document.getElementById('basket').style.left = '48vw';
//  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Staircase of shelves — ball must bounce down right side
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 20, left: 75,  width: 3,  height: 70  },
    { top: 20, left: 3,  width: 50,  height: 4  }, // top shelf — gap right side
    { top: 40, left: 25, width: 50,  height: 4  }, // mid shelf — gap left side
    { top: 60, left: 3,  width: 55,  height: 4  }, // lower shelf — gap right side
    { top: 78, left: 20, width: 50,  height: 4  }, // bottom shelf — gap left side
  ];
  generateObstacles(obstacles);
  generateBall('9vw', '8vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level7() {
  startTimedLevel(7,  '80vh', '82vw', 45);
  isGameRunning = true;
  startTracking();
  currentLevel = 7;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '80vh';
  document.getElementById('basket').style.left = '82vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Funnel maze — walls narrow toward center bottom
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 25,  left: 30, width: 3,   height: 20},
    { top: 25,  left: 70, width: 3,   height: 20},
    { top: 50,  left: 60, width: 3,   height: 20},
    { top: 25, left: 3,  width: 40,  height: 4  }, // left shelf
    { top: 25, left: 60, width: 37,  height: 4  }, // right shelf — gap at 43-60
    { top: 50, left: 20, width: 25,  height: 4  }, // inner left
    { top: 50, left: 55, width: 22,  height: 4  }, // inner right — gap at 45-55
    { top: 72, left: 33, width: 32,  height: 4  }, // narrow floor — gaps both sides
    { top: 25, left: 3,  width: 4,   height: 27 }, // left pillar top
    { top: 50, left: 3,  width: 4,   height: 27 }, // left pillar bottom
  ];
  generateObstacles(obstacles);
  generateBall('15vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level8() {
  startTimedLevel(8,  '48vh', '5vw',  45);
  isGameRunning = true;
  startTracking();
  currentLevel = 8;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '48vh';
  document.getElementById('basket').style.left = '5vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // S-shaped corridor — must navigate S curve to reach left-side basket
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 18, left: 3,  width: 65,  height: 4  }, // upper horizontal — gap right
    // right drop wall removed — path now open
    { top: 48, left: 25, width: 44,  height: 4  }, // mid horizontal — gap left and right
    { top: 48, left: 25, width: 4,   height: 30 }, // left rise wall
    { top: 75, left: 28, width: 69,  height: 4  }, // lower horizontal — gap left
    { top: 32, left: 42, width: 4,   height: 18 }, // inner vertical divider
  ];
  generateObstacles(obstacles);
  generateBall('88vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

// ===========================
// TIER 2: Levels 6–9
// Narrow corridors, dead ends, 1-2 slow movers introduced
// ===========================

function level9() {
  startTimedLevel(9,  '5vh',  '9vw',  45);
  isGameRunning = true;
  startTracking();
  currentLevel = 9;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '5vh';
  document.getElementById('basket').style.left = '9vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Spiral inward — must traverse outer then inner ring
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 0,  left: 18,  width: 3, height: 80  },
    { top: 20,  left: 36,  width: 3, height: 77  },
    { top: 0,  left: 56,  width: 3, height: 57  },    
  ];
  generateObstacles(obstacles);
  // One slow moving barrier across the outer entry
  addMovingObstacle('mv6a', 45, 22, 15, 4, 22, 55, 'horizontal', 2.5);
  generateBall('82vw', '82vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level10() {
  startTimedLevel(10, '48vh', '85vw', 40);
  isGameRunning = true;
  startTracking();
  currentLevel = 10;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '48vh';
  document.getElementById('basket').style.left = '85vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Rooms with connecting doorways — ball must go through 3 rooms
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Room divider 1 — door at top (gap top:0–15)
    { top: 0, left: 33, width: 4,   height: 60 },
    // Room divider 2 — door at bottom (gap top:75–95)
    { top: 0,  left: 65, width: 4,   height: 75 },
    // Obstacles inside room 1
    { top: 30, left: 10,  width: 22,  height: 4  },
    { top: 62, left: 3,  width: 20,  height: 4  },
    // Obstacles inside room 2
    { top: 20, left: 50, width: 3,  height: 77  },
    //{ top: 60, left: 38, width: 19,  height: 4  },
    // Obstacles inside room 3
    { top: 20, left: 70, width: 24,  height: 4  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv7a', 42, 6,  18, 4, 6,  18, 'horizontal', 2.8);
  addMovingObstacle('mv7b', 50, 70, 4, 20, 50, 80, 'vertical',   2.4);
  generateBall('8vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level11() {
  startTimedLevel(11, '80vh', '85vw', 40);
  isGameRunning = true;
  startTracking();
  currentLevel = 11;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '80vh';
  document.getElementById('basket').style.left = '85vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Pinball table — dense pegs + shelves, basket top-left
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 18, left: 15, width: 55,  height: 4  }, // top shelf — gap left and right
    { top: 38, left: 3,  width: 40,  height: 4  }, // mid-left shelf
    { top: 38, left: 57, width: 38,  height: 4  }, // mid-right shelf — gap at 43-57
    { top: 58, left: 22, width: 55,  height: 4  }, // lower shelf — gaps both edges
    { top: 77, left: 3,  width: 38,  height: 4  }, // bottom-left shelf
    { top: 77, left: 55, width: 42,  height: 4  }, // bottom-right shelf — gap at 41-55
    { top: 18, left: 68, width: 4,   height: 22 }, // right-side pillar
    { top: 38, left: 42, width: 4,   height: 22 }, // center pillar
  ];
  generateObstacles(obstacles);
  //addMovingObstacle('mv8a', 26, 5,  18, 4, 5,  45,  'horizontal', 2.0);
  addMovingObstacle('mv8b', 66, 55, 4, 18, 45, 80,  'vertical', 2.2);
  generateBall('88vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level12() {
  startTimedLevel(12, '8vh',  '8vw',  40);
  isGameRunning = true;
  startTracking();
  currentLevel = 12;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '8vh';
  document.getElementById('basket').style.left = '8vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Double cross — two crossing corridors, movers guard both
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Horizontal cross bar — gap at 45-55 center
    { top: 42, left: 15,  width: 32,  height: 4  },
    { top: 42, left: 58, width: 42,  height: 4  },
    // Vertical cross bar — gap at 40-52 center
    { top: 3,  left: 45, width: 4,   height: 80 },
    //{ top: 52, left: 45, width: 4,   height: 43 },
    // Corner walls to force routing
    { top: 60, left: 3, width: 22,  height: 4  },
    //{ top: 65, left: 58, width: 22,  height: 4  },
    { top: 70, left: 60, width: 4,   height: 22 },
    { top: 70, left: 30, width: 4,   height: 25 },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv12a', 22, 5,  20, 4, 5,  40,  'horizontal', 1.8);
  addMovingObstacle('mv12b', 62, 50, 20, 4, 50, 85,  'horizontal', 2.0);
  addMovingObstacle('mv12c', 5,  68, 4,  22, 3,  38,  'vertical',   1.9);
  generateBall('88vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

// ===========================
// TIER 3: Levels 10–12
// 3 movers, fast speeds, narrow gaps, basket hard to reach
// ===========================

function level13() {
  startTimedLevel(13, '80vh', '85vw', 38);
  isGameRunning = true;
  startTracking();
  currentLevel = 13;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '80vh';
  document.getElementById('basket').style.left = '85vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Snaking maze — must zigzag left-right-left to reach top-left
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 20, left: 20, width: 77,  height: 4  }, // top band — gap left
    //{ top: 20, left: 20, width: 4,   height: 30 }, // left wall of top band
    { top: 50, left: 3,  width: 72,  height: 4  }, // mid band — gap right
    //{ top: 50, left: 72, width: 4,   height: 30 }, // right wall of mid band
    { top: 78, left: 20, width: 77,  height: 4  }, // bottom band — gap left
    { top: 35, left: 50, width: 4,   height: 16 }, // inner divider top
    { top: 65, left: 40, width: 4,   height: 16 }, // inner divider bottom
  ];
  generateObstacles(obstacles);
  //addMovingObstacle('mv10a', 34, 24, 18, 4, 24, 65, 'horizontal', 1.6);
  addMovingObstacle('mv10b', 50, 72,  4, 18, 25,  70, 'vertical', 1.5);
  addMovingObstacle('mv10c', 5,  30, 4, 18, 3,  40, 'vertical',   1.7);
  generateBall('88vw', '88vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level14() {
  startTimedLevel(14, '80vh', '85vw', 38);
  isGameRunning = true;
  startTracking();
  currentLevel = 14;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '80vh';
  document.getElementById('basket').style.left = '85vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Ascending platforms — tight vertical windows between shelves
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 22, left: 3,  width: 60,  height: 4  }, // shelf 1 — gap right
    //{ top: 22, left: 60, width: 4,   height: 18 }, // right stopper 1
    { top: 42, left: 35, width: 62,  height: 4  }, // shelf 2 — gap left
    //{ top: 42, left: 35, width: 4,   height: 18 }, // left stopper 2
    { top: 60, left: 3,  width: 75,  height: 4  }, // shelf 3 — gap right
    //{ top: 60, left: 65, width: 4,   height: 18 }, // right stopper 3
    { top: 78, left: 30, width: 67,  height: 4  }, // shelf 4 — gap left
    { top: 78, left: 30, width: 4,   height: 4  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv11a', 42, 5,  20, 4, 5,  50, 'horizontal', 1.4);
  addMovingObstacle('mv11b', 42, 35, 4, 20, 40, 67, 'vertical', 1.5);
  addMovingObstacle('mv11c', 60, 74,  4, 20, 25,  68, 'vertical', 1.6);
  addMovingObstacle('mv11d', 10, 70, 4, 18, 5,  30, 'vertical',   1.5);
  generateBall('8vw', '84vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level15() {
  startTimedLevel(15, '28vh', '48vw', 38);
  isGameRunning = true;
  startTracking();
  currentLevel = 15;
  document.getElementById('score').style.display = 'none';
  //document.getElementById('time').style.display = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '28vh';
  document.getElementById('basket').style.left = '48vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Center fortress — basket in middle, walls all around
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Fortress outer walls — each has exactly one gap
    { top: 28, left: 25, width: 50,  height: 4  }, // top wall — gap right (75-97)
    { top: 28, left: 25, width: 4,   height: 22 }, // left wall — gap at top (14-28)
    { top: 72, left: 25, width: 50,  height: 4  }, // bottom wall — gap left (3-25)
    { top: 28, left: 72, width: 4,   height: 22 }, // right wall — gap at bottom (72-90)
    // Decoy inner shelf
    { top: 45, left: 35, width: 18,  height: 4  },
    { top: 45, left: 55, width: 18,  height: 4  },
    // Outer obstacles blocking corner approaches
    { top: 10, left: 10, width: 12,  height: 4  },
    //{ top: 80, left: 78, width: 4,  height: 4  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv12a', 12, 25, 22, 4, 25, 60, 'horizontal', 1.4);
  addMovingObstacle('mv12b', 72, 3,  22, 4, 3,  48, 'horizontal', 1.3);
  addMovingObstacle('mv12e', 45, 3,  22, 4, 3,  35, 'horizontal', 1.3);
  addMovingObstacle('mv12f', 20, 58,  22, 4, 60,  87, 'horizontal', 1.3);
  addMovingObstacle('mv12c', 50, 5,  4, 20, 30, 70, 'vertical',   1.5);
  addMovingObstacle('mv12d', 42, 80, 4, 20, 30, 70, 'vertical',   1.4);
  generateBall('88vw', '15vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

// ===========================
// TIER 4: Levels 13–15
// 4 movers, vertical + horizontal, diagonal-feel corridors
// ===========================

function level16() {
  startTimedLevel(16, '9vh', '85vw', 35);
  isGameRunning = true;
  startTracking();
  currentLevel = 16;
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '9vh';
  document.getElementById('basket').style.left = '85vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Gauntlet corridor — narrow horizontal paths stacked
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 18, left: 13,  width: 52,  height: 4  }, // row 1 — gap right
    { top: 3, left: 62, width: 4,   height: 38 }, // stopper
    { top: 38, left: 23, width: 64,  height: 4  }, // row 2 — gap left
    //{ top: 38, left: 33, width: 4,   height: 20 }, // stopper
    { top: 58, left: 3,  width: 62,  height: 4  }, // row 3 — gap right
    { top: 38, left: 72, width: 4,   height: 40 }, // stopper
    { top: 78, left: 23, width: 64,  height: 4  }, // row 4 — gap left
    //{ top: 78, left: 33, width: 4,   height: 4  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv13a', 26, 5,  15, 4, 5,  50,  'horizontal', 1.3);
  //addMovingObstacle('mv13b', 48, 38, 15, 4, 38, 85,  'horizontal', 1.2);
  //addMovingObstacle('mv13c', 68, 5,  15, 4, 5,  50,  'horizontal', 1.4);
  //addMovingObstacle('mv13d', 8,  70, 4, 20, 5,  35,  'vertical',   1.3);
  generateBall('10vw', '85vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level17() {
  startTimedLevel(17, '10vh', '10vw', 35);
  isGameRunning = true;
  startTracking();
  currentLevel = 17;
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '10vh';
  document.getElementById('basket').style.left = '10vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Rotating cross — horizontal and vertical movers cross paths
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    { top: 30, left: 3,  width: 38,  height: 4  }, // upper-left block
    { top: 30, left: 58, width: 39,  height: 4  }, // upper-right block — gap at 41-58
    { top: 60, left: 3,  width: 38,  height: 4  }, // lower-left block
    { top: 60, left: 55, width: 42,  height: 4  }, // lower-right — gap at 41-55
    { top: 30, left: 38, width: 4,   height: 20 }, // vertical divider — gap below 50
    { top: 20, left: 55, width: 4,   height: 12 }, // right guard
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv14a', 16, 5,  18, 4, 5,  55,  'horizontal', 1.2);
  addMovingObstacle('mv14b', 44, 40, 18, 4, 40, 85,  'horizontal', 1.1);
  addMovingObstacle('mv14c', 74, 5,  18, 4, 5,  55,  'horizontal', 1.3);
  addMovingObstacle('mv14d', 8,  40, 4, 22, 5,  28,  'vertical',   1.2);
  addMovingObstacle('mv14e', 65, 78, 4, 22, 60, 93,  'vertical',   1.1);
  generateBall('88vw', '8vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level18() {
  startTimedLevel(18, '8vh', '45vw', 35);
  isGameRunning = true;
  startTracking();
  currentLevel = 18;
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '8vh';
  document.getElementById('basket').style.left = '45vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());

  // Interlocking rooms — 3 rooms, doors alternating left/right/center
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Room 1 top: gap left 3-18
    { top: 25, left: 18, width: 60,  height: 4  },
    // Room 2 mid: gap right 75-97
    { top: 52, left: 15,  width: 65,  height: 4  },
    // Room 3 bottom: gap center 40-58
    { top: 78, left: 3,  width: 37,  height: 4  },
    { top: 78, left: 58, width: 39,  height: 4  },
    // Vertical connectors
    { top: 25, left: 18, width: 4,   height: 28 },
    { top: 25, left: 75, width: 4,   height: 28 },
    // Decoy obstacles inside rooms
    { top: 35, left: 30, width: 20,  height: 4  },
    { top: 62, left: 50, width: 20,  height: 4  },
  ];
  generateObstacles(obstacles);
  
  addMovingObstacle('mv15b', 28, 3, 18, 4, 3, 30, 'horizontal', 1.0);
  addMovingObstacle('mv15c', 64, 5,  18, 4, 5,  48, 'horizontal', 1.3);
  addMovingObstacle('mv15d', 86, 60, 18, 4, 55, 90, 'horizontal', 1.1);
  addMovingObstacle('mv15e', 30, 85, 4, 22, 28, 52, 'vertical',   1.2);
  addMovingObstacle('mv15f', 3, 18, 4, 22, 3, 30, 'vertical',   1.2);
  addMovingObstacle('mv15g', 3, 75, 4, 22, 3, 30, 'vertical',   1.2);
  generateBall('8vw', '8vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

// =============================================================
// Helper functions (keep here so they're defined before use)
// =============================================================
function addMovingObstacle(name, top, left, width, height, min, max, direction, speed) {
  const div = document.createElement('div');
  div.classList.add('obstacle');
  div.style.top    = `${top}vh`;
  div.style.left   = `${left}vw`;
  div.style.width  = `${width}vw`;
  div.style.height = `${height}vh`;
  maze.appendChild(div);
  let anim;
  if (direction === 'horizontal') {
    anim = `@keyframes ${name} { 0%{left:${min}vw} 100%{left:${max}vw} }`;
  } else {
    anim = `@keyframes ${name} { 0%{top:${min}vh}  100%{top:${max}vh}  }`;
  }
  div.style.animation = `${name} ${speed}s linear infinite alternate`;
  const s = document.createElement('style');
  s.innerHTML = anim;
  document.head.appendChild(s);
}

function startLevelCommon(lvl, basketTop, basketLeft) {
  isGameRunning = true;
  startTracking();
  currentLevel = lvl;
  document.getElementById('score').style.display = 'none';
  document.getElementById('time').style.display  = 'none';
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top    = basketTop;
  document.getElementById('basket').style.left   = basketLeft;
  clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
  
}

function startTimedLevel(lvl, basketTop, basketLeft, seconds) {
  isGameRunning = true;
    currentLevel = lvl;
    let remaining = seconds;
  document.getElementById('time-value').innerText = remaining;
  const tick = () => {
    if (timerInterval !== intervalId) {
      clearInterval(intervalId);
      return;
    }
    remaining--;
    document.getElementById('time-value').innerText = remaining;
    if (remaining <= 0) {
      clearInterval(intervalId);
      if (isGameRunning) {
        document.dispatchEvent(new CustomEvent('feedbackScoreBad', { detail: { type: 'timeout' } }));
        showGameOverAlert(false, currentLevel);
      }
    }
  };
  const intervalId = setInterval(tick, 1000);
  timerInterval = intervalId;
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

// =============================================================
// TIER 5: Levels 16–18 — Timer 35s, 4+ movers, layered walls
// =============================================================

function level19() {
  startTimedLevel(16, '6vh', '80vw', 35);
  isGameRunning = true;//try and check this level
  startTracking();
  currentLevel = 19;
  document.getElementById('basket').style.display = 'block';
  document.getElementById('basket').style.top  = '6vh';
  document.getElementById('basket').style.left = '80vw';
  //clearInterval(timerInterval);
  clearInterval(ballCreationIntervalId);
  document.querySelectorAll('.obstacle').forEach(o => o.remove());//i added to check
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Layer 1: top band — gap right
    { top: 20, left: 3,  width: 50,  height: 4  },
    { top: 20, left: 52, width: 4,   height: 20 },//try to make this move
    // Layer 2: mid band — gap left
    { top: 42, left: 38, width: 40,  height: 4  },
    //{ top: 42, left: 38, width: 4,   height: 20 },
    // Layer 3: lower band — gap right
    { top: 64, left: 12,  width: 45,  height: 4  },
    { top: 64, left: 55, width: 4,   height: 20 },
    // Layer 4: bottom band — gap left
    { top: 82, left: 28, width: 50,  height: 4  },
    { top: 82, left: 78, width: 4,  height: 15  },
  ];
  generateObstacles(obstacles);
  
  addMovingObstacle('mv16b', 30, 62, 16, 4, 62, 90,  'horizontal', 1.4);
  addMovingObstacle('mv16c', 52, 5,  16, 4, 5,  35,  'horizontal', 1.6);
  addMovingObstacle('mv16d', 73, 30, 4, 22, 28, 62,  'vertical',   1.5);
  generateBall('38vw', '22vh', currentLevel);
  document.addEventListener('mouseup', () => checkDrop(ball, 'basket', currentLevel));
}

function level20() {
  startTimedLevel(20, '30vh', '40vw', 35);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Concentric partial frames
    { top: 16, left: 18, width: 64,  height: 4  }, // outer top — gap left+right
    { top: 16, left: 18, width: 4,   height: 35 }, // outer left
    { top: 51, left: 18, width: 50,  height: 4  }, // outer bottom-left
    //{ top: 51, left: 65, width: 4,   height: 35 }, // outer right
    { top: 30, left: 32, width: 38,  height: 4  }, // inner top — gap left+right
    //{ top: 30, left: 32, width: 4,   height: 20 }, // inner left
    { top: 50, left: 32, width: 28,  height: 4  }, // inner bottom — gap right
    { top: 30, left: 58, width: 4,   height: 22 }, // inner right
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv17a', 4,  22, 16, 4, 22, 75,  'horizontal', 1.4);
  addMovingObstacle('mv17b', 58, 22, 16, 4, 22, 60,  'horizontal', 1.3);
  addMovingObstacle('mv17c', 78, 5,  16, 4, 5,  55,  'horizontal', 1.5);
  addMovingObstacle('mv17d', 38, 72, 4, 20, 14, 55,  'vertical',   1.4);
  addMovingObstacle('mv17f', 38, 40, 4, 20, 30, 75,  'vertical',   1.4);
  addMovingObstacle('mv17g', 38, 52, 4, 20, 30, 75,  'vertical',   1.4);
  addMovingObstacle('mv17e', 8,  82, 4, 20, 5,  30,  'vertical',   1.3);
  generateBall('15vw', '8vh', currentLevel);
}

function level21() {
  startTimedLevel(21, '45vh', '45vw', 30);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Pinwheel arms radiating from center, each leaving one passage
    { top: 42, left: 10,  width: 30,  height: 4  }, // left arm — gap inner
    { top: 42, left: 48, width: 35,  height: 4  }, // right arm — gap inner
    { top: 12,  left: 46, width: 4,   height: 28 }, // top arm — gap inner
    { top: 58, left: 46, width: 4,   height: 37 }, // bottom arm — gap inner
    // Corner diagonals (simulated with short walls)
    { top: 18, left: 18, width: 25,  height: 4  },
    { top: 18, left: 18, width: 4,   height: 18 },
    { top: 18, left: 65, width: 18,  height: 4  },
    { top: 18, left: 79, width: 4,   height: 18 },
    { top: 72, left: 18, width: 24,  height: 4  },
    { top: 50, left: 18, width: 4,   height: 23 },
    { top: 72, left: 65, width: 18,  height: 4  },
    { top: 54, left: 79, width: 4,   height: 18 },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv18a', 20, 5,  16, 4, 5,  40,  'horizontal', 1.3);
  addMovingObstacle('mv18b', 20, 55, 16, 4, 55, 90,  'horizontal', 1.2);
  addMovingObstacle('mv18c', 74, 5,  16, 4, 5,  40,  'horizontal', 1.4);
  addMovingObstacle('mv18d', 74, 55, 16, 4, 55, 90,  'horizontal', 1.3);
  addMovingObstacle('mv18e', 5,  25, 4, 20, 3,  38,  'vertical',   1.3);
  addMovingObstacle('mv18f', 5,  70, 4, 20, 3,  38,  'vertical',   1.2);
  generateBall('15vw', '10vh', currentLevel);
}

// =============================================================
// TIER 6: Levels 19–21 — Timer 25s, 5 movers, interlocking
// =============================================================

function level22() {
  startTimedLevel(22, '60vh', '17vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Comb teeth from top — gaps between each tooth
    { top: 13,  left: 15, width: 4,   height: 22 }, // tooth 1
    { top: 3,  left: 30, width: 4,   height: 25 }, // tooth 2
    { top: 13,  left: 45, width: 4,   height: 22 }, // tooth 3 — short (basket above)
    { top: 16,  left: 62, width: 4,   height: 32 }, // tooth 4
    { top: 12,  left: 78, width: 4,   height: 15 }, // tooth 5
    // Base shelf connecting teeth
    { top: 38, left: 18,  width: 80,  height: 4  },
    // Bottom maze
    { top: 60, left: 3,  width: 45,  height: 4  },
    { top: 60, left: 58, width: 28,  height: 4  },
    { top: 78, left: 22, width: 55,  height: 4  },
    //{ top: 42, left: 22, width: 4,   height: 20 },
    //{ top: 42, left: 65, width: 4,   height: 20 },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv19a', 42, 5,  14, 4, 3,  18,  'horizontal', 1.2);
  //addMovingObstacle('mv19b', 48, 30, 14, 4, 30, 58,  'horizontal', 1.1);
  //addMovingObstacle('mv19c', 48, 68, 14, 4, 65, 90,  'horizontal', 1.3);
  addMovingObstacle('mv19d', 64, 50, 14, 4, 45, 80,  'horizontal', 1.2);
  addMovingObstacle('mv19e', 62, 75,  4, 18, 58, 93,  'vertical',   1.2);
  generateBall('88vw', '88vh', currentLevel);
}

function level23() {
  startTimedLevel(23, '40vh', '35vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Diamond-shaped inner obstacle ring
    { top: 22, left: 30, width: 38,  height: 4  }, // top
    { top: 22, left: 30, width: 4,   height: 35 }, // left
    { top: 78, left: 37, width: 38,  height: 4  }, // bottom
    { top: 42, left: 64, width: 4,   height: 35 }, // right
    // Shorter inner cross-sections (leave gaps to navigate)
    { top: 40, left: 34, width: 18,  height: 4  },
    { top: 40, left: 58, width: 10,  height: 4  },
    { top: 55, left: 38, width: 25,  height: 4  },
    // Outer corner guards
    { top: 3, left: 75, width: 4,   height: 80 },
    { top: 15, left: 20, width: 4,   height: 50 },
    { top: 78, left: 3,  width: 25,  height: 4  },
    { top: 15, left: 20, width: 38,  height: 4  },
    { top: 40, left: 3, width: 10,  height: 4  },
  ];
  generateObstacles(obstacles);
  //addMovingObstacle('mv20a', 10, 32, 14, 4, 32, 60,  'horizontal', 1.1);
  addMovingObstacle('mv20b', 74, 25, 14, 4, 25, 60,  'horizontal', 1.0);
  addMovingObstacle('mv20c', 30, 68, 14, 4, 68, 90,  'horizontal', 1.2);
  //addMovingObstacle('mv20d', 30, 5,  4, 20, 24, 70,  'vertical',   1.1);
  addMovingObstacle('mv20e', 55, 80, 4, 20, 22, 70,  'vertical',   1.0);
  generateBall('88vw', '88vh', currentLevel);
}

function level24() {
  startTimedLevel(24, '6vh', '82vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Triple horizontal bands alternating gaps
    { top: 20, left: 3,  width: 35,  height: 4  }, // gap right
    { top: 3, left: 68, width: 4,   height: 60 },
    { top: 42, left: 3, width: 50,  height: 4  }, // gap left
    { top: 42, left: 28, width: 4,   height: 20 },
    { top: 62, left: 13,  width: 25,  height: 4  }, // gap right
    { top: 62, left: 47,  width: 20,  height: 4  },
    { top: 56, left: 70,  width: 20,  height: 4  },
    { top: 37, left: 80,  width: 20,  height: 4  },
    { top: 62, left: 62, width: 4,   height: 20 },
    { top: 80, left: 22, width: 60,  height: 4  }, // gap left
    // Inner cross
    { top: 20, left: 45, width: 4,   height: 22 },
    { top: 62, left: 45, width: 4,   height: 20 },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv24a', 10, 5,  14, 4, 5,  55,  'horizontal', 1.1);
  addMovingObstacle('mv24b', 30, 72, 14, 4, 70, 90,  'horizontal', 1.0);
  addMovingObstacle('mv24c', 48, 25,  14, 4, 25,  60,  'horizontal', 1.2);
  addMovingObstacle('mv24d', 72, 28, 14, 4, 28, 70,  'horizontal', 1.0);
  //addMovingObstacle('mv21e', 8,  85, 4, 20, 5,  30,  'vertical',   1.1);
  generateBall('15vw', '65vh', currentLevel);
}

// =============================================================
// TIER 7: Levels 22–24 — Timer 20s, 6 movers, dense
// =============================================================

function level25() {
  startTimedLevel(25, '45vh', '8vw', 20);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Box with open corners
    { top: 22, left: 40, width: 25,  height: 4  }, // top — gaps at left and right
    { top: 32, left: 20, width: 4,   height: 34 }, // left — gap at very bottom
    { top: 66, left: 20, width: 60,  height: 4  }, // bottom — gaps at corners
    { top: 22, left: 76, width: 4,   height: 14 },
    { top: 52, left: 76, width: 4,   height: 14 }, // right — gap at very bottom
    // Inner divider with gap right
    { top: 44, left: 20, width: 36,  height: 4  },
    // Outer approach walls
    { top: 10, left: 3,  width: 15,  height: 4  },
    { top: 10, left: 82, width: 12,  height: 4  },
    { top: 70, left: 3,  width: 15,  height: 4  },
    { top: 78, left: 38, width: 4,  height: 20  },
    { top: 70, left: 58, width: 4,  height: 16  },
    { top: 78, left: 78, width: 4,  height: 20  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv22a', 8,  5,  12, 4, 3,  18,  'horizontal', 1.0);
  addMovingObstacle('mv22b', 8,  68, 12, 4, 65, 92,  'horizontal', 0.9);
  addMovingObstacle('mv22c', 33, 24, 12, 4, 24, 72,  'horizontal', 1.0);
  addMovingObstacle('mv22d', 56, 24, 12, 4, 24, 72,  'horizontal', 0.9);
  addMovingObstacle('mv22e', 18, 15,  4, 16, 7, 33,  'vertical',   1.0);
  addMovingObstacle('mv22f', 5,  60, 4, 16, 3,  28,  'vertical',   0.9);
  generateBall('16vw', '10vh', currentLevel);
}

function level26() {
  startTimedLevel(26, '60vh', '90vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Comb from bottom — teeth pointing up, basket at top center
    { top: 15,  left: 15,  width: 80, height: 3  },
    { top: 90, left: 3,  width: 80, height: 3  },
    { top: 65, left: 15,  width: 30, height: 3  },
    { top: 78, left: 25,  width: 30, height: 3  },
    { top: 45, left: 65,  width: 8, height: 3  },
    { top: 65, left: 75,  width: 8, height: 3  },
    { top: 30,  left: 15,  width: 3,   height: 60},
    { top: 15,  left: 25,  width: 3,   height: 40},
    { top: 29,  left: 35,  width: 3,   height: 36},
    { top: 15,  left: 45,  width: 3,   height: 40},
    { top: 15,  left: 55,  width: 3,   height: 63},
    { top: 25,  left: 65,  width: 3,   height: 63},
    { top: 15,  left: 82, width: 3,   height: 60},
  ];
  generateObstacles(obstacles);
  
  generateBall('12vw', '86vh', currentLevel);
}

function level27() {
  startTimedLevel(27, '25vh', '23vw', 10);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 98, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Outer box (open corners)
    { top: 18, left: 18, width: 55,  height: 4  },
    { top: 18, left: 18, width: 4,   height: 55 },
    { top: 73, left: 28, width: 55,  height: 4  },
    { top: 18, left: 79, width: 4,   height: 55 },
    // Inner obstacles
    { top: 35, left: 35, width: 30,  height: 4  }, // inner top — gap right
    { top: 58, left: 35, width: 30,  height: 4  }, // inner bottom — gap right
    { top: 35, left: 35, width: 4,   height: 10 }, // inner left
    { top: 35, left: 62, width: 4,   height: 10 }, // inner right
    // Approach corridors
   // { top: 6,  left: 40, width: 4,   height: 14 }, // top approach guide
    //{ top: 80, left: 25, width: 50,  height: 4  }, // bottom approach block
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv27a', 44, 22, 12, 4, 22, 60,  'horizontal', 1.1);
  addMovingObstacle('mv27b', 61, 22, 12, 4, 22, 75,  'horizontal', 0.9);
  addMovingObstacle('mv27c', 20, 83, 4, 18, 18, 45,  'vertical',   0.9);
  addMovingObstacle('mv27d', 20, 5,  4, 18, 50, 75,  'vertical',   0.8);
  generateBall('88vw', '88vh', currentLevel);
}

// =============================================================
// TIER 8: Levels 25–27 — Timer 15s, 7 movers, chaos
// =============================================================

function level28() {
  startTimedLevel(28, '48vh', '85vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Lattice pattern — gaps at intersections
    { top: 20, left: 16,  width: 70,  height: 4  }, // full top
    { top: 45, left: 19,  width: 30,  height: 4  }, // mid left
    { top: 45, left: 55, width: 32,  height: 4  }, // mid right — gap 43-55
    { top: 70, left: 10,  width: 73,  height: 4  }, // full bottom
    //{ top: 20, left: 25, width: 4,   height: 26 }, // pillar 1
    { top: 44, left: 25, width: 4,   height: 26 }, // pillar 1 lower
    { top: 20, left: 50, width: 4,   height: 25 }, // pillar 2 — gap at 45
    //{ top: 20, left: 75, width: 4,   height: 26 }, // pillar 3
    //{ top: 44, left: 75, width: 4,   height: 26 }, // pillar 3 lower
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv28a', 6,  28, 12, 4, 28, 48,  'horizontal', 0.7);
  addMovingObstacle('mv28b', 6,  52, 12, 4, 52, 73,  'horizontal', 0.8);
  addMovingObstacle('mv28c', 58, 28, 12, 4, 28, 48,  'horizontal', 0.8);
  addMovingObstacle('mv28d', 80, 52, 12, 4, 52, 73,  'horizontal', 0.7);
  addMovingObstacle('mv28e', 32, 79, 4, 18, 12, 68,  'vertical',   0.9);
  generateBall('7vw', '85vh', currentLevel);
}

function level29() {
  startTimedLevel(29, '79vh', '85vw', 28);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 98, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Three-ring maze — rings each have one gap, not aligned
    { top: 15, left: 12, width: 76,  height: 4  }, // ring 1 top — gap right (88-97)
    { top: 15, left: 12, width: 4,   height: 30 }, 
    { top: 65, left: 12, width: 4,   height: 25 },// ring 1 left — gap none
    { top: 87, left: 12, width: 56,  height: 4  }, // ring 1 bottom — gap right (68-97)
    { top: 15, left: 84, width: 4,   height: 52 }, // ring 1 right — gap bottom (67-87)
    // Ring 2
    { top: 28, left: 25, width: 50,  height: 4  }, // ring 2 top — gap right (75-84)
    { top: 28, left: 25, width: 4,   height: 16 },
    { top: 57, left: 25, width: 4,   height: 17 }, // ring 2 left
    { top: 73, left: 25, width: 35,  height: 4  }, // ring 2 bottom — gap right (60-75)
    { top: 28, left: 71, width: 4,   height: 45 }, // ring 2 right
    // Ring 3 center
    { top: 40, left: 38, width: 22,  height: 4  }, // ring 3 top — gap right (60-71)
    //{ top: 40, left: 38, width: 4,   height: 20 }, // ring 3 left
    { top: 60, left: 38, width: 22,  height: 4  }, // ring 3 bottom — gap right (60-71)
   // { top: 40, left: 58, width: 4,   height: 20 }, // ring 3 right
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv29a', 3,  16, 12, 4, 16, 62,  'horizontal', 1.0);
  addMovingObstacle('mv29b', 20, 30, 12, 4, 30, 68,  'horizontal', 0.6);
  //addMovingObstacle('mv29c', 36, 28, 10, 4, 28, 35,  'horizontal', 0.7);
  addMovingObstacle('mv29d', 40, 58, 4, 20, 28, 68,  'vertical', 1.20);
  addMovingObstacle('mv29e', 40, 38, 4, 20, 28, 68,  'vertical', 1.20);
  //addMovingObstacle('mv29f', 82, 16, 12, 4, 16, 30,  'horizontal', 0.9);
  addMovingObstacle('mv29g', 8,  88, 4, 18, 5,  30,  'vertical',   0.6);
  generateBall('7vw', '85vh', currentLevel);
}

function level30() {
  startTimedLevel(30, '8vh', '8vw', 30);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 97, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Grid lock — 4x4 grid of walls with one exit each
    { top: 22, left: 3,  width: 94,  height: 4  },
    { top: 44, left: 3,  width: 94,  height: 4  },
    { top: 66, left: 3,  width: 94,  height: 4  },
    { top: 3,  left: 22, width: 4,   height: 94 },
    { top: 3,  left: 44, width: 4,   height: 94 },
    { top: 3,  left: 66, width: 4,   height: 94 },
    // Punch holes in grid walls (remove segments by overlaying bg-colored divs isn't possible
    // so we just skip wall segments — layout above has no holes, we add movers to block
    // the only navigable corners)
  ];
  generateObstacles(obstacles);
  // Replace solid grid with partial walls leaving exactly one gap per section
  document.querySelectorAll('.obstacle').forEach(o => o.remove());
  const partial = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Row 1 walls — gap at left cell
    { top: 22, left: 22, width: 65,  height: 4  },
    // Row 2 walls — gap at right cell
    { top: 44, left: 15,  width: 63,  height: 4  },
    // Row 3 walls — gap at center-left
    //{ top: 66, left: 3,  width: 20,  height: 4  },
    { top: 66, left: 32, width: 28,  height: 4  },
    // Column 1 — gap at row 1
    { top: 36, left: 22, width: 4,   height: 50 },
    // Column 2 — gap at row 2
    { top: 10,  left: 44, width: 4,   height: 13 },
   // { top: 48, left: 44, width: 4,   height: 35 },
    // Column 3 — gap at row 3
    { top: 3,  left: 66, width: 4,   height: 10 },
    //{ top: 70, left: 66, width: 4,   height: 25 },
  ];
  generateObstacles(partial);
  addMovingObstacle('mv30a', 10, 5,  10, 4, 3,  18,  'horizontal', 0.65);
  addMovingObstacle('mv30b', 10, 48, 10, 4, 46, 62,  'horizontal', 0.90);
  addMovingObstacle('mv30c', 54, 48, 10, 4, 46, 62,  'horizontal', 0.60);
  addMovingObstacle('mv30d', 76, 26, 10, 4, 26, 40,  'horizontal', 0.65);
  addMovingObstacle('mv30e', 76, 70, 10, 4, 68, 92,  'horizontal', 0.60);
  addMovingObstacle('mv30f', 32, 70, 4, 18, 22, 66,  'vertical',   1.05);
  addMovingObstacle('mv30g', 32, 26, 10, 4, 26, 40,  'vertical',   1.00);

  generateBall('88vw', '86vh', currentLevel);
}

// =============================================================
// TIER 9: Levels 28–30 — Timer 12s, 8 movers, near-impossible
// =============================================================

function level31() {
  startTimedLevel(31, '8vh', '87vw', 20);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Dense maze — basin in center, basket at center
    { top: 25, left: 15,  width: 40,  height: 4  }, // upper-left shelf
    //{ top: 25, left: 57, width: 28,  height: 4  }, // upper-right — gap 43-57
    { top: 50, left: 20, width: 25,  height: 4  }, 
    { top: 50, left: 60, width: 25,  height: 4  },// wide mid shelf — gaps edges
    { top: 73, left: 15,  width: 26,  height: 4  }, // lower-left shelf
    { top: 73, left: 55, width: 30,  height: 4  }, // lower-right — gap 41-55
    { top: 35, left: 40, width: 4,   height: 15 }, // left inner pillar
    //{ top: 25, left: 57, width: 4,   height: 25 }, // right inner pillar
    { top: 50, left: 35, width: 4,   height: 15 }, // lower-left pillar
    { top: 50, left: 62, width: 4,   height: 15 }, // lower-right pillar
    { top: 38, left: 22, width: 4,   height: 15 }, // outer decoy left
    { top: 38, left: 75, width: 4,   height: 15 }, // outer decoy right
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv31a', 15, 5,  10, 4, 3,  38,  'horizontal', 0.9);
  addMovingObstacle('mv31b', 15, 58, 10, 4, 58, 90,  'horizontal', 0.9);
  addMovingObstacle('mv31c', 36, 5,  10, 4, 3,  25,  'horizontal', 0.9);
  addMovingObstacle('mv31d', 36, 78, 10, 4, 78, 92,  'horizontal', 0.9);
  addMovingObstacle('mv31e', 60, 65, 10, 4, 62, 90,  'horizontal', 0.9);
  addMovingObstacle('mv31f', 82, 22, 10, 4, 22, 75,  'horizontal', 0.9);
  addMovingObstacle('mv31g', 8,  50, 4, 18, 3,  30,  'vertical',   1.0);
  generateBall('7vw', '10vh', currentLevel);
}

function level32() {
  startTimedLevel(32, '6vh', '82vw', 25);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 95, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // Staggered interlocking walls — each blocks a path
    { top: 16, left: 12, width: 55,  height: 4  }, // gap right
    { top: 16, left: 12, width: 4,   height: 30 },
    { top: 46, left: 32, width: 55,  height: 4  }, // gap left
    { top: 46, left: 83, width: 4,   height: 30 },
   // { top: 74, left: 12, width: 55,  height: 4  }, // gap right
    { top: 74, left: 12, width: 4,   height: 21 },
    // Inner thin walls — force specific routes
    { top: 20, left: 25, width: 4,   height: 18 },
    { top: 60, left: 55, width: 4,   height: 16 },
    { top: 30, left: 65, width: 4,   height: 18 },
    // Bottom corridor guard
    { top: 85, left: 30, width: 40,  height: 4  },
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv32a', 25, 5,  5, 4, 3,  10,  'horizontal', 1.20);
  addMovingObstacle('mv32b', 62, 5,  10, 4, 3,  30,  'horizontal', 1.10);
  addMovingObstacle('mv32c', 62, 55, 10, 4, 52, 78,  'horizontal', 1.10);
  addMovingObstacle('mv32d', 8,  55, 4, 18, 3,  28,  'vertical',   1.20);
  generateBall('50vw', '56vh', currentLevel);
}

function level33() {
  startTimedLevel(33, '48vh', '48vw', 15);
  const obstacles = [
    { top: 0,  left: 0,  width: 100, height: 3  },
    { top: 97, left: 0,  width: 100, height: 3  },
    { top: 0,  left: 0,  width: 3,   height: 100},
    { top: 0,  left: 97, width: 3,   height: 100},
    // FINAL LABYRINTH — basket dead center, approach from all 4 corners
    // Outer ring
    { top: 12, left: 12, width: 76,  height: 4  },
    { top: 25, left: 12, width: 4,   height: 45 },
    { top: 88, left: 12, width: 76,  height: 4  },
    { top: 28, left: 84, width: 4,   height: 45 },
    // Middle ring (open corners)
    { top: 26, left: 26, width: 50,  height: 4  }, // gap right (72-84)
    { top: 46, left: 26, width: 4,   height: 33 }, // gap bottom (72-84)
    { top: 76, left: 26, width: 50,  height: 4  }, // gap left (12-26)
    { top: 40, left: 72, width: 4,   height: 40 }, // gap top (12-26)
    // Inner ring (one gap each — none aligned with outer)
    { top: 38, left: 38, width: 26,  height: 4  }, // gap right (62-72)
    { top: 38, left: 38, width: 4,   height: 12 }, // gap bottom (62-76)
    { top: 64, left: 38, width: 26,  height: 4  }, // gap left (26-38)
    { top: 53, left: 60, width: 4,   height: 16 }, // gap top (26-38)
  ];
  generateObstacles(obstacles);
  addMovingObstacle('mv33a', 18, 16, 4, 20, 12, 38,  'vertical',   0.60);
  addMovingObstacle('mv33b', 25,  36, 2, 10, 30, 60,  'vertical', 0.85);
  addMovingObstacle('mv33c', 23,  61, 2, 10, 30, 60,  'vertical', 2);
  addMovingObstacle('mv33d', 18, 80, 4, 10, 12, 45,  'vertical',   0.60);
  generateBall('7vw', '7vh', currentLevel);
}


// MOUSE TRACKING AND EXPORT SETUP
let mouseMovements = [];
let taskStartTime, taskEndTime;

document.addEventListener('mousemove', function (e) {
  if (!isGameRunning || !GAME_STARTED || GAME_PAUSED) return;
  const timestamp = Date.now();
  mouseMovements.push({ x: e.clientX, y: e.clientY, time: timestamp });
});

// =====================================================
// MOBILE/TABLET SUPPORT ADDED:
// Also track finger movements (touchmove) on touch devices.
// This mirrors the existing mousemove tracking above,
// so analytics work on both desktop and mobile.
// =====================================================
document.addEventListener('touchmove', function (e) {
  if (!isGameRunning || !GAME_STARTED || GAME_PAUSED) return;
  const touch = e.touches[0];
  const timestamp = Date.now();
  mouseMovements.push({ x: touch.clientX, y: touch.clientY, time: timestamp });
}, { passive: true });

// Start tracking when a task begins
function startTracking() {
  taskStartTime = Date.now();
  mouseMovements = [];
  _pageReady = false;
  setTimeout(function() { _pageReady = true; }, 1500);
  if (typeof recordLevelStart === 'function') recordLevelStart(currentLevel, currentDifficulty);
}
function stopTrackingAndExport(taskName = 'task') {
  taskEndTime = Date.now();
  const duration = (taskEndTime - taskStartTime) / 1000;

  let content = `Mouse Tracking for ${taskName}\n`;
  content += `Start Time: ${new Date(taskStartTime).toLocaleString()}\n`;
  content += `End Time: ${new Date(taskEndTime).toLocaleString()}\n`;
  content += `Duration: ${duration} seconds\n\n`;
  content += `X,Y,Timestamp\n`;

  mouseMovements.forEach(move => {
    content += `${move.x},${move.y},${new Date(move.time).toISOString()}\n`;
  });

  const formData = new FormData();
  formData.append('filename', `${taskName}_mouse_log.txt`);
  formData.append('content', content);

  fetch('save_mouse_data.php', {
    method: 'POST',
    body: formData
  })
    .then(response => response.text())
    .then(result => console.log('Mouse data saved:', result))
    .catch(error => console.error('Save failed:', error));
}




// =============================================================
// SMART LIVE FEEDBACK SYSTEM — POINT 5
// Context-aware feedback that tracks player performance and
// gives accurate, helpful responses for every situation:
//   - First try success        → special trophy reaction
//   - Combo scores             → escalating excitement
//   - Struggling (3+ fails)    → hints specific to that level
//   - Level completed          → big celebration
//   - Obstacle collision       → specific warning + tip
//   - Wrong basket drop        → guidance on where to aim
// =============================================================

// ---- Player State Tracker ----
// Tracks performance per level to give accurate contextual feedback
const playerState = {
  failCount: 0,          // fails on current level
  successCount: 0,       // scores in current level
  comboCount: 0,         // consecutive successes without fail
  isFirstTry: true,      // true until first fail on this level
  levelStartTime: null,  // when current level started
  totalDrops: 0,         // total drop attempts this level

  // Reset when a new level starts
  reset() {
    this.failCount = 0;
    this.successCount = 0;
    this.comboCount = 0;
    this.isFirstTry = true;
    this.levelStartTime = Date.now();
    this.totalDrops = 0;
  }
};

// Reset player state whenever a new level begins
// We hook into startTracking() which is called at the start of every level
const _originalStartTracking = startTracking;
window.startTracking = function() {
  playerState.reset();
  _originalStartTracking();
};

// ---- Context-aware message banks ----

// First try — special messages
const FIRST_TRY_MESSAGES = [
  "🏆 First try! Incredible!", "⭐ Perfect! First attempt!",
  "🌟 First try legend!", "🎯 Nailed it first go!"
];

// Combo messages — index = combo count (2, 3, 4, 5+)
const COMBO_MESSAGES = [
  "🔥 2 in a row!", "🔥🔥 Triple score!", 
  "💫 On fire! 4 combo!", "🚀 UNSTOPPABLE! 5+!"
];

// Regular success
const SUCCESS_MESSAGES = [
  "Great shot! 🏀", "Well done! 👏", "Amazing! ✨",
  "Brilliant! 🌟", "You got it! 🎉", "Nice drop! 💫"
];

// Level completed — big deal
const LEVEL_COMPLETE_MESSAGES = [
  "🎊 Level cleared! You're a star!", "🏆 Outstanding! Level done!",
  "🌟 Brilliant work! Next level!", "🎉 Champion! Level complete!"
];

// Struggling — first hint (after 2 fails)
const HINT_FIRST = {
  drag:  "💡 Tip: Drag slowly to avoid walls!",
  click: "💡 Tip: Click fast before balls fly away!",
  maze:  "💡 Tip: Plan your path before moving!"
};

// Struggling more — second hint (after 4 fails)  
const HINT_SECOND = {
  drag:  "🗺️ Watch the gaps in the walls — use them!",
  click: "👀 Look for balls near the center first!",
  maze:  "🐢 Go slow near corners — touch = game over!"
};

// Really struggling — encouragement (after 6+ fails)
const ENCOURAGEMENT_MESSAGES = [
  "💪 You can do this! Keep going!", "🤗 Every expert was once a beginner!",
  "😊 Take your time — no rush!", "🌈 Believe in yourself! Try once more!"
];

// Collision specific
const COLLISION_MESSAGES = [
  "🚧 Oops! Hit a wall — watch the path!", 
  "⚠️ Wall hit! Stay in the open spaces!",
  "🛑 Touched the obstacle! Go around it!"
];

// Wrong drop (ball released but not in basket)
const WRONG_DROP_MESSAGES = [
  "🎯 Almost! Drag it INTO the basket!",
  "📍 Get closer to the basket first!",
  "🏀 Try dropping right over the basket!"
];

// Fast completion bonus
const SPEED_MESSAGES = [
  "⚡ Speed demon! Super fast!", "🚀 Lightning fast clear!",
  "⏱️ Amazing speed! Blazing!"
];

// ---- Helper: get level type for context-aware hints ----
function getLevelType(level) {
  if (level === 1) return 'click';          // Level 1 = click balls
  if (level <= 5) return 'drag';            // Early levels = simple drag
  return 'maze';                            // Later levels = maze navigation
}

// ---- Helper: check if completed fast (under 5 seconds) ----
function wasCompletedFast() {
  if (!playerState.levelStartTime) return false;
  return (Date.now() - playerState.levelStartTime) < 5000;
}

// =============================================================
// MAIN FEEDBACK TRIGGERS
// =============================================================

// ---- onPlayerScored ----
// Call this every time player successfully scores (click or basket drop)
// x, y = screen position of the event
function onPlayerScored(x, y) {
  playerState.successCount++;
  playerState.comboCount++;
  playerState.totalDrops++;

  let message = '';
  let emojiSet = ['🏀', '⭐', '✨', '🌟', '🎉'];
  let mood = 'happy';
  let flashType = 'success';

  // --- Determine the right message based on context ---

  if (playerState.isFirstTry && playerState.successCount === 1) {
    // Very first score on this level without any fail
    message = FIRST_TRY_MESSAGES[Math.floor(Math.random() * FIRST_TRY_MESSAGES.length)];
    emojiSet = ['🏆', '⭐', '🌟', '✨', '🎊'];

  } else if (playerState.comboCount >= 5) {
    // 5+ combo — maximum hype
    message = COMBO_MESSAGES[3];
    emojiSet = ['🚀', '🔥', '💫', '⭐', '🌟'];

  } else if (playerState.comboCount >= 4) {
    message = COMBO_MESSAGES[2];
    emojiSet = ['💫', '🔥', '⭐', '✨'];

  } else if (playerState.comboCount >= 3) {
    message = COMBO_MESSAGES[1];
    emojiSet = ['🔥', '⭐', '🌟'];

  } else if (playerState.comboCount >= 2) {
    message = COMBO_MESSAGES[0];
    emojiSet = ['🔥', '✨', '⭐'];

  } else {
    // Regular success
    message = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
  }

  // Extra particles for combos
  const particleCount = Math.min(2 + playerState.comboCount, 7);

  spawnEmojiParticles(x, y, emojiSet, particleCount);
  showMascotMessage(message);
  flashScreen(flashType);
  animateMascots(mood);
  playFeedbackSound('success');
}

// ---- onPlayerFailed ----
// Call this on collision, wrong drop, or game over
// failType: 'collision' | 'wrongdrop' | 'timeout' | 'gameover'
function onPlayerFailed(failType) {
  playerState.failCount++;
  playerState.comboCount = 0;   // Reset combo on fail
  playerState.isFirstTry = false;
  playerState.totalDrops++;

  const levelType = getLevelType(currentLevel);
  let message = '';

  // --- Pick message based on how much they are struggling ---

  if (failType === 'collision') {
    message = COLLISION_MESSAGES[Math.floor(Math.random() * COLLISION_MESSAGES.length)];

  } else if (failType === 'wrongdrop') {
    message = WRONG_DROP_MESSAGES[Math.floor(Math.random() * WRONG_DROP_MESSAGES.length)];

  } else if (playerState.failCount >= 6) {
    // Really struggling — give encouragement
    message = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

  } else if (playerState.failCount >= 4) {
    // Second hint — more specific
    message = HINT_SECOND[levelType];

  } else if (playerState.failCount >= 2) {
    // First hint — gentle tip
    message = HINT_FIRST[levelType];

  } else {
    // First fail — just a gentle nudge
    const gentle = ["Oops! Try again 💪", "So close! Try once more!", "Don't worry — keep going! 😊"];
    message = gentle[Math.floor(Math.random() * gentle.length)];
  }

  spawnEmojiParticles(
    window.innerWidth / 2, window.innerHeight / 2,
    ['😅', '💪', '🙌', '😮'], 2
  );
  showMascotMessage(message);
  flashScreen('fail');
  animateMascots('sad');
  playFeedbackSound('fail');
}

// ---- onLevelComplete ----
// Call this when a level is fully cleared
function onLevelComplete(level) {
  let message;

  if (playerState.isFirstTry) {
    // Completed without a single fail — extra special
    message = `🏆 Perfect run! Level ${level} cleared first try!`;
  } else if (wasCompletedFast()) {
    message = SPEED_MESSAGES[Math.floor(Math.random() * SPEED_MESSAGES.length)];
  } else {
    message = LEVEL_COMPLETE_MESSAGES[Math.floor(Math.random() * LEVEL_COMPLETE_MESSAGES.length)];
  }

  // Big burst of emojis across the whole screen
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnEmojiParticles(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.6,
        ['🎉', '🌟', '⭐', '🏆', '🎊', '✨', '💫'], 5
      );
    }, i * 200);
  }

  showMascotMessage(message);
  flashScreen('success');
  animateMascots('happy');
  playFeedbackSound('levelcomplete');
}

// =============================================================
// CORE DISPLAY FUNCTIONS
// =============================================================

// ---- spawnEmojiParticles ----
function spawnEmojiParticles(x, y, emojiSet, count) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.classList.add('emoji-particle');
    el.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];

    // Spread them around the event point
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 50;
    el.style.left = Math.max(20, Math.min(window.innerWidth - 40, x + offsetX)) + 'px';
    el.style.top  = Math.max(20, y + offsetY) + 'px';
    el.style.animationDelay = (i * 70) + 'ms';

    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ---- showMascotMessage ----
function showMascotMessage(message) {
  const bubble = document.getElementById('mascot-message');
  const text   = document.getElementById('mascot-text');
  if (!bubble || !text) return;

  text.textContent = message;
  bubble.style.display = 'block';
  bubble.style.animation = 'none';
  void bubble.offsetWidth;
  bubble.style.animation = 'bubble-pop 0.4s ease forwards';

  clearTimeout(bubble._hideTimer);
  // Longer display for hints so player has time to read
  const displayTime = message.includes('Tip') || message.includes('Watch') || 
                      message.includes('Drag') || message.includes('Plan') ? 3500 : 2000;
  bubble._hideTimer = setTimeout(() => {
    bubble.style.display = 'none';
  }, displayTime);
}

// ---- flashScreen ----
function flashScreen(type) {
  const flash = document.getElementById('feedback-flash');
  if (!flash) return;
  flash.classList.remove('success', 'fail');
  flash.style.display = 'none';
  void flash.offsetWidth;
  flash.classList.add(type);
  setTimeout(() => {
    flash.style.display = 'none';
    flash.classList.remove('success', 'fail');
  }, 600);
}

// ---- animateMascots ----
function animateMascots(mood) {
  const prem   = document.getElementById('prem');
  const shanti = document.getElementById('shanti');
  if (!prem || !shanti) return;

  const addCls    = mood === 'happy' ? 'mascot-bounce' : 'mascot-shake';
  const removeCls = mood === 'happy' ? 'mascot-shake'  : 'mascot-bounce';

  [prem, shanti].forEach(el => {
    el.classList.remove(removeCls, addCls);
    void el.offsetWidth;
    el.classList.add(addCls);
    el.addEventListener('animationend', () => el.classList.remove(addCls), { once: true });
  });
}

// ---- playFeedbackSound ----
// Uses Web Audio API — no audio files needed
function playFeedbackSound(type) {
  // Respect the audio toggle
  const audioSetting = document.getElementById('audio_setting');
  if (audioSetting && !audioSetting.checked) return;

  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);

    } else if (type === 'levelcomplete') {
      // Fanfare — longer ascending melody
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
        o.start(ctx.currentTime + i * 0.12);
        o.stop(ctx.currentTime + i * 0.12 + 0.3);
      });

    } else {
      // Fail — low descending
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) { /* AudioContext unavailable — skip silently */ }
}

// =============================================================
// HOOK SMART FEEDBACK INTO EXISTING GAME EVENTS
// =============================================================

// ---- Ball click (Level 1) ----
document.addEventListener('feedbackScoreGood', function(e) {
  const x = e.detail ? e.detail.x : window.innerWidth / 2;
  const y = e.detail ? e.detail.y : window.innerHeight / 2;
  onPlayerScored(x, y);
});

document.addEventListener('feedbackScoreBad', function(e) {
  const type = e.detail ? e.detail.type : 'gameover';
  onPlayerFailed(type);
});

// ---- Wrap Collision() in generateBall to detect obstacle hits ----
// We dispatch a custom event from inside Collision() when it fires
document.addEventListener('feedbackCollision', function() {
  onPlayerFailed('collision');
});

// ---- Wrong drop — ball released but missed basket ----
document.addEventListener('feedbackWrongDrop', function() {
  onPlayerFailed('wrongdrop');
  // Also show a visual arrow pointing toward the basket for 2 seconds
  showBasketArrow();
});

// ---- showBasketArrow ----
// Briefly shows an animated arrow pointing at the basket
// so the player knows exactly where to aim
function showBasketArrow() {
  const basket = document.getElementById('basket');
  if (!basket) return;

  // Remove any existing arrow
  const existing = document.getElementById('basket-hint-arrow');
  if (existing) existing.remove();

  const b = basket.getBoundingClientRect();
  const arrow = document.createElement('div');
  arrow.id = 'basket-hint-arrow';
  arrow.textContent = '🎯';
  arrow.style.cssText = `
    position: fixed;
    left: ${b.left + b.width / 2 - 20}px;
    top: ${b.top - 50}px;
    font-size: 2rem;
    z-index: 99999;
    pointer-events: none;
    animation: arrow-bounce 0.5s ease infinite alternate;
  `;
  document.body.appendChild(arrow);

  // Remove after 2 seconds
  setTimeout(() => arrow.remove(), 2000);
}


// =============================================================
document.addEventListener('DOMContentLoaded', function() {
  const easyBtn   = document.getElementById('easyBtn');
  const mediumBtn = document.getElementById('mediumBtn');
  const hardBtn   = document.getElementById('hardBtn');
  if (easyBtn)   easyBtn.addEventListener('click',   () => setDifficulty('Easy'));
  if (mediumBtn) mediumBtn.addEventListener('click', () => setDifficulty('Medium'));
  if (hardBtn)   hardBtn.addEventListener('click',   () => setDifficulty('Hard'));
});
// =============================================================
// ROADMAP LEVEL JUMP — home.html?level=9 → starts level 9
// =============================================================
(function launchFromRoadmap() {
  const params = new URLSearchParams(window.location.search);
  const targetLevel = parseInt(params.get('level'), 10);
  if (!targetLevel || targetLevel < 1 || targetLevel > 33) return;

  const levelFnMap = {
    1:'level1',   2:'level2',   3:'level3',   4:'level4',   5:'level5',
    6:'level6',   7:'level7',   8:'level8',   9:'level9',   10:'level10',
    11:'level11', 12:'level12', 13:'level13', 14:'level14', 15:'level15',
    16:'level16', 17:'level17', 18:'level18', 19:'level19', 20:'level20',
    21:'level21', 22:'level22', 23:'level23', 24:'level24', 25:'level25',
    26:'level26', 27:'level27', 28:'level28', 29:'level29', 30:'level30',
    31:'level31', 32:'level32', 33:'level33',
  };

  const fnName = levelFnMap[targetLevel];
  if (!fnName) return;

  function doLaunch() {
    const fn = window[fnName];
    if (typeof fn !== 'function') return;

    history.replaceState(null, '', window.location.pathname);

    // Temporarily suppress blur/pause while splash is showing
    GAME_STARTED = false;

    // Hide all home screen elements
    ['para','para1','ie','vv','shanti','prem','kids-row',
     'game-title','instruction-modal','instruction-modal2',
     'menu-buttons','roadmapBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.buttons').forEach(el => el.style.display = 'none');

    const body = document.getElementById('fidrat-home') || document.body;
    body.style.backgroundImage = 'url("Images/Common_Images/gamebg.png")';
    body.style.backgroundColor = 'lightgoldenrodyellow';

    clearInterval(timer);
    clearInterval(timerInterval);
    clearInterval(ballCreationIntervalId);
    document.querySelectorAll('.ball').forEach(b => b.remove());
    document.querySelectorAll('.obstacle').forEach(o => o.remove());

    score = 0; time = 0;
    GAME_PAUSED = false; PAUSE_LOCK = false; wasPausedByFocus = false;

    let diff = 'Easy';
    if (targetLevel >= 3  && targetLevel <= 9)  diff = 'Medium';
    if (targetLevel >= 10 && targetLevel <= 15) diff = 'Hard';
    if (targetLevel >= 16)                       diff = 'Expert';
    if (typeof setDifficulty === 'function') setDifficulty(diff);

    // Colour theme per tier
    const tierColors = {
      Easy:'linear-gradient(135deg,#43e97b,#38f9d7)',
      Medium:'linear-gradient(135deg,#f7971e,#ffd200)',
      Hard:'linear-gradient(135deg,#f5515f,#a1051d)',
      Expert:'linear-gradient(135deg,#8e2de2,#4a00e0)'
    };

    // Inject splash animation once
    if (!document.getElementById('_rm_style')) {
      const st = document.createElement('style');
      st.id = '_rm_style';
      st.textContent = `
        @keyframes _rmIn  { 0%{opacity:0;transform:scale(0.7)} 60%{opacity:1;transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
        @keyframes _rmOut { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(1.15)} }
        #_rm_splash { animation: _rmIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
        #_rm_splash.out { animation: _rmOut 0.35s ease forwards; }
      `;
      document.head.appendChild(st);
    }

    const splash = document.createElement('div');
    splash.id = '_rm_splash';
    splash.style.cssText = `
      position:fixed;inset:0;z-index:999999;pointer-events:none;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:${tierColors[diff] || tierColors.Hard};
    `;
    splash.innerHTML = `
      <div style="font-size:clamp(1rem,3vw,1.4rem);font-weight:700;color:rgba(255,255,255,0.85);
        letter-spacing:0.25em;text-transform:uppercase;margin-bottom:1vh">${diff}</div>
      <div style="font-size:clamp(3rem,12vw,7rem);font-weight:900;color:#fff;
        line-height:1;text-shadow:0 4px 24px rgba(0,0,0,0.3)">LEVEL ${targetLevel}</div>
      <div style="margin-top:1.5vh;font-size:1.8rem">
        ${Array.from({length:Math.min(targetLevel,5)},()=>'⭐').join('')}
      </div>
    `;
    document.body.appendChild(splash);

    setTimeout(() => {
      splash.classList.add('out');
      setTimeout(() => {
        splash.remove();
        // Only NOW allow pause detection
        isGameRunning = true;
        GAME_STARTED = true;
        fn(); // 🚀 Launch the level
        // Show taskbar — must happen after fn() sets currentLevel
        setTimeout(function() {
          var tb = document.getElementById('game-taskbar');
          if (tb) tb.classList.add('tb-on');
          var gm = document.getElementById('global-mute-btn');
          if (gm) gm.classList.add('gm-hidden');
          var mh = document.getElementById('mute-hint');
          if (mh) mh.classList.add('gm-hidden');
          var ln = document.getElementById('tb-lvl-num');
          if (ln) ln.textContent = targetLevel;
        }, 50);
      }, 350);
    }, 1400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(doLaunch, 150));
  } else {
    setTimeout(doLaunch, 150);
  }
})();
// =============================================================
// GAME TASKBAR — fixed pause/resume using existing game functions
// =============================================================
(function() {

  function tbShow() {
    var tb = document.getElementById('game-taskbar');
    if (!tb) return;
    tb.classList.add('tb-on');
    var gm = document.getElementById('global-mute-btn');
    if (gm) gm.classList.add('gm-hidden'); // in-level taskbar mute button takes over
    var mh = document.getElementById('mute-hint');
    if (mh) mh.classList.add('gm-hidden');
    var ln = document.getElementById('tb-lvl-num');
    if (ln) ln.textContent = currentLevel || 1;
    tbSyncPause();
  }

  function tbHide() {
    var tb = document.getElementById('game-taskbar');
    if (tb) tb.classList.remove('tb-on');
    var gm = document.getElementById('global-mute-btn');
    if (gm) gm.classList.remove('gm-hidden'); // back to menu — show it again
    var mh = document.getElementById('mute-hint');
    if (mh) mh.classList.remove('gm-hidden');
  }

  function tbSyncPause() {
    var btn = document.getElementById('tb-pause');
    if (!btn) return;
    if (GAME_PAUSED) {
      btn.innerHTML = '▶';
      btn.title = 'Resume';
      btn.classList.add('tb-paused');
    } else {
      btn.innerHTML = '⏸';
      btn.title = 'Pause';
      btn.classList.remove('tb-paused');
    }
  }

  // ── Sound toggle ────────────────────────────────────────────
  window.tbSound = function() {
    var cb = document.getElementById('audio_setting');
    if (!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
    var tb  = document.getElementById('game-taskbar');
    var img = document.getElementById('tb-snd-img');
    if (cb.checked) {
      if (tb)  tb.classList.remove('snd-off');
      if (img) img.src = 'Images/Common_Images/audio_on.png';
    } else {
      if (tb)  tb.classList.add('snd-off');
      if (img) img.src = 'Images/Common_Images/audio_off.png';
    }
    syncGlobalMuteIcon();
  };

  // ── Always-visible mute button (menu screen, pre-level) ────────
  // Shares the same #audio_setting checkbox as the in-level taskbar
  // button, so toggling either one keeps both in sync.
  window.globalMuteToggle = function() {
    var cb = document.getElementById('audio_setting');
    if (!cb) return;
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
    var tb = document.getElementById('game-taskbar');
    if (cb.checked) { if (tb) tb.classList.remove('snd-off'); }
    else            { if (tb) tb.classList.add('snd-off'); }
    syncGlobalMuteIcon();
  };

  function syncGlobalMuteIcon() {
    var cb  = document.getElementById('audio_setting');
    var btn = document.getElementById('global-mute-btn');
    var img = document.getElementById('global-mute-icon');
    var tbImg = document.getElementById('tb-snd-img');
    if (!cb) return;
    var onSrc  = 'Images/Common_Images/audio_on.png';
    var offSrc = 'Images/Common_Images/audio_off.png';
    if (btn) btn.classList.toggle('gm-muted', !cb.checked);
    if (img) img.src = cb.checked ? onSrc : offSrc;
    if (tbImg) tbImg.src = cb.checked ? onSrc : offSrc;
  }
  // Keep icon correct on load (in case a previous mute preference was
  // already applied to the checkbox before this script ran).
  document.addEventListener('DOMContentLoaded', syncGlobalMuteIcon);
  setTimeout(syncGlobalMuteIcon, 0);

  // ── Pause / Resume — uses the game's own pauseGame/resumeGame ─
  window.tbPause = function() {
    if (!GAME_STARTED) return;

    if (GAME_PAUSED) {
      // Currently paused → resume
      // hideFocusWarning() calls resumeGame() internally which restarts all timers
      hideFocusWarning();
    } else {
      // Currently running → pause
      // pauseGame() sets GAME_PAUSED, stops timers, shows focus-block
      pauseGame();
      showFocusWarning();
    }
    tbSyncPause();
  };

  // ── Restart — clean restart of current level ─────────────────
  window.tbRestart = function() {
    if (!GAME_STARTED && !isGameRunning) return;
    // If paused, force-unpause first so restartGame works cleanly
    if (GAME_PAUSED) {
      GAME_PAUSED  = false;
      PAUSE_LOCK   = false;
      gamePaused   = false;
      var fb = document.getElementById('focus-block');
      if (fb) { fb.style.display = 'none'; fb.style.pointerEvents = 'none'; }
    }
    tbSyncPause();
    restartGame();
  };

  // ── Keep pause button in sync whenever focus-block changes ───
  // The game shows/hides focus-block on window blur/focus too,
  // so we watch for that and keep the icon in sync.
  var _observer = null;
  function watchFocusBlock() {
    var fb = document.getElementById('focus-block');
    if (!fb || _observer) return;
    _observer = new MutationObserver(function() { tbSyncPause(); });
    _observer.observe(fb, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Hook level start/end ─────────────────────────────────────
  function patch(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function() {
      var r = orig.apply(this, arguments);
      after();
      return r;
    };
  }

  var onStart = function() {
    setTimeout(function() {
      tbShow();
      var ln = document.getElementById('tb-lvl-num');
      if (ln) ln.textContent = currentLevel || 1;
      watchFocusBlock();
    }, 40);
  };

for (var i = 1; i <= 33; i++) {
  patch('level' + i, onStart);
}
patch('startLevelCommon', onStart);
patch('startTimedLevel',  onStart);
patch('nextLevelFunction',onStart);
patch('restartGame',      onStart);

})();

// =============================================================
// MOUSE ANALYTICS — opens on button click only
// =============================================================
(function() {
  var _spd=[],_heat={},_zones=new Array(9).fill(0),_len=0,_hes=0,_chart=null,_savedLevel=1,_savedDur=0;

  window.analyticsOpen = function() {
    _savedLevel = currentLevel || 1;
    _savedDur   = taskStartTime ? Math.round((Date.now()-taskStartTime)/1000) : 0;
    _build();
    var o = document.getElementById('an-overlay');
    if (o) o.classList.add('an-open');
    _resize(); _render();
  };

  window.analyticsClose = function() {
    var o = document.getElementById('an-overlay');
    if (o) o.classList.remove('an-open');
  };

  function _build() {
    _spd=[];_heat={};_zones=new Array(9).fill(0);_len=0;_hes=0;
    if (!mouseMovements||!mouseMovements.length) return;
    var lx=null,ly=null,lt=null;
    for (var i=0;i<mouseMovements.length;i++) {
      var p=mouseMovements[i],spd=0;
      if (lx!==null) { var d=Math.sqrt(Math.pow(p.x-lx,2)+Math.pow(p.y-ly,2)); var dt=(p.time-lt)/1000; spd=dt>0?Math.round(d/dt):(_spd[_spd.length-1]||0); _len+=d; }
      lx=p.x;ly=p.y;lt=p.time;_spd.push(spd);
      var gx=Math.floor(p.x/window.innerWidth*32),gy=Math.floor(p.y/window.innerHeight*18),k=gx+','+gy;_heat[k]=(_heat[k]||0)+1;
      var zx=Math.floor(p.x/window.innerWidth*3),zy=Math.floor(p.y/window.innerHeight*3),zi=zy*3+zx;if(zi>=0&&zi<9)_zones[zi]++;
      if(spd<20&&i>3)_hes++;
    }
  }

  function _resize(){['an-cv-main','an-cv-heat','an-cv-path'].forEach(function(id){var c=document.getElementById(id);if(c){c.width=c.offsetWidth;c.height=c.offsetHeight;}});}

  function _render(){
    var pts=mouseMovements?mouseMovements.length:0,avg=_spd.length?Math.round(_spd.reduce(function(a,b){return a+b;},0)/_spd.length):0;
    function sv(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
    sv('an-pts',pts);sv('an-spd',avg+' px/s');sv('an-len',Math.round(_len)+' px');sv('an-hes',_hes);sv('an-dur',_savedDur+'s');
    var b=document.getElementById('an-lvl-badge');if(b)b.textContent='Level '+_savedLevel;
    _dMain();_dHeat();_dPath();_dChart();_dPattern();_dZones();
    var dot=document.getElementById('an-fb-dot'),msg=document.getElementById('an-fb-msg');
    if(dot&&msg){
      if(!_spd.length){msg.textContent='No movement recorded.';return;}
      var maxS=Math.max.apply(null,_spd.concat([1])),rel=(_spd.reduce(function(a,b){return a+b;},0)/_spd.length)/maxS;
      var color,text;
      if(rel>0.6){color='#1D9E75';text='Fast confident play — player knew the path.';}
      else if(rel>0.35){color='#378ADD';text='Steady movement — methodical navigation.';}
      else if(rel>0.15){color='#BA7517';text='Slowing down — hesitation near obstacles.';}
      else{color='#E24B4A';text='Many pauses — player struggled.';}
      dot.style.background=color;msg.textContent=text+' (Hesitations: '+_hes+')';
    }
  }
  function _dMain(){var c=document.getElementById('an-cv-main');if(!c)return;var ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.strokeStyle='rgba(0,0,0,0.06)';ctx.lineWidth=0.5;for(var x=0;x<=c.width;x+=c.width/3){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}for(var y=0;y<=c.height;y+=c.height/3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}if(mouseMovements&&mouseMovements.length>0){var last=mouseMovements[mouseMovements.length-1];ctx.beginPath();ctx.arc(last.x/window.innerWidth*c.width,last.y/window.innerHeight*c.height,6,0,Math.PI*2);ctx.fillStyle='rgba(55,138,221,0.8)';ctx.fill();}}
  function _dHeat(){var chk=document.getElementById('an-chk-heat'),c=document.getElementById('an-cv-heat');if(!c)return;var ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(chk&&!chk.checked)return;Object.keys(_heat).forEach(function(key){var v=_heat[key],pts=key.split(',');ctx.fillStyle='rgba(55,138,221,'+Math.min(v/10,0.75)+')';ctx.fillRect(parseInt(pts[0])/32*c.width,parseInt(pts[1])/18*c.height,Math.ceil(c.width/32)+1,Math.ceil(c.height/18)+1);});}
  function _dPath(){var chk=document.getElementById('an-chk-path'),c=document.getElementById('an-cv-path');if(!c||!mouseMovements||mouseMovements.length<2)return;var ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(chk&&!chk.checked)return;var maxS=Math.max.apply(null,_spd.concat([1]));ctx.lineWidth=1.5;for(var i=1;i<mouseMovements.length;i++){var p1=mouseMovements[i-1],p2=mouseMovements[i],t=(_spd[i-1]||0)/maxS,r=Math.round(55*(1-t)+209*t),g=Math.round(138*(1-t)+80*t),bl=Math.round(221*(1-t)+34*t);ctx.strokeStyle='rgba('+r+','+g+','+bl+',0.7)';ctx.beginPath();ctx.moveTo(p1.x/window.innerWidth*c.width,p1.y/window.innerHeight*c.height);ctx.lineTo(p2.x/window.innerWidth*c.width,p2.y/window.innerHeight*c.height);ctx.stroke();}}
  function _dChart(){var cv=document.getElementById('an-cv-spd');if(!cv||!window.Chart)return;var last=_spd.slice(-80);if(!_chart){_chart=new window.Chart(cv,{type:'line',data:{labels:last.map(function(_,i){return i;}),datasets:[{data:last,fill:true,borderColor:'#378ADD',backgroundColor:'rgba(55,138,221,0.12)',borderWidth:1.5,pointRadius:0,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:true,ticks:{font:{size:9},maxTicksLimit:3,callback:function(v){return Math.round(v);}},grid:{color:'rgba(0,0,0,0.05)'}}}}});}else{_chart.data.labels=last.map(function(_,i){return i;});_chart.data.datasets[0].data=last;_chart.update('none');}}
  function _dPattern(){var el=document.getElementById('an-pattern');if(!el||!_spd.length)return;var maxS=Math.max.apply(null,_spd.concat([1]));el.innerHTML='';[{label:'Fast',min:maxS*0.6,max:Infinity,color:'#1D9E75'},{label:'Normal',min:maxS*0.2,max:maxS*0.6,color:'#378ADD'},{label:'Slow',min:0,max:maxS*0.2,color:'#BA7517'}].forEach(function(row){var cnt=_spd.filter(function(s){return s>=row.min&&s<row.max;}).length,pct=Math.round(cnt/Math.max(_spd.length,1)*100),d=document.createElement('div');d.style.cssText='display:flex;align-items:center;gap:5px;font-size:11px;';d.innerHTML='<span style="width:40px;color:#888;">'+row.label+'</span><div style="flex:1;height:7px;background:#e0e4f0;border-radius:3px;overflow:hidden;"><div style="width:'+pct+'%;height:100%;background:'+row.color+';border-radius:3px;"></div></div><span style="width:30px;text-align:right;color:#333;font-weight:700;">'+pct+'%</span>';el.appendChild(d);});}
  function _dZones(){var el=document.getElementById('an-zones');if(!el)return;var max=Math.max.apply(null,_zones.concat([1])),labels=['TL','TC','TR','ML','MC','MR','BL','BC','BR'];el.innerHTML='';_zones.forEach(function(v,i){var pct=Math.round(v/max*100),d=document.createElement('div');d.className='an-zone-cell';d.innerHTML='<div style="color:#aaa;font-size:9px;">'+labels[i]+'</div><div class="an-zone-bar"><div class="an-zone-fill" style="width:'+pct+'%;"></div></div><div style="font-weight:700;color:#333;font-size:10px;">'+v+'</div>';el.appendChild(d);});}
  document.addEventListener('change',function(e){if(e.target.id==='an-chk-heat'||e.target.id==='an-chk-path'){_dHeat();_dPath();}});
  var ov=document.getElementById('an-overlay');if(ov)ov.addEventListener('click',function(e){if(e.target===ov)analyticsClose();});
  function wrapFn(n,cb){var o=window[n];if(typeof o!=='function')return;window[n]=function(){var r=o.apply(this,arguments);cb();return r;};}
  function resetData(){setTimeout(function(){_spd=[];_heat={};_zones=new Array(9).fill(0);_len=0;_hes=0;_chart=null;},60);}
  wrapFn('level1',resetData);wrapFn('level2',resetData);wrapFn('startLevelCommon',resetData);wrapFn('startTimedLevel',resetData);
  window.addEventListener('resize',function(){var o=document.getElementById('an-overlay');if(o&&o.classList.contains('an-open')){_resize();_dMain();_dHeat();_dPath();}});
})();

// =============================================================
// FIREBASE SYNC
// =============================================================
(function() {
  if(typeof FIREBASE_CONFIG==='undefined'||(typeof FIREBASE_ENABLED!=='undefined'&&!FIREBASE_ENABLED))return;
  if(typeof firebase==='undefined')return;
  var db=null;
  try{var app=firebase.apps&&firebase.apps.length?firebase.apps[0]:firebase.initializeApp(FIREBASE_CONFIG);db=firebase.database();}catch(e){return;}
  function pid(){return localStorage.getItem('dreamdrop_current_player')||'guest';}
  window.firebaseSync=function(data){if(!db||!navigator.onLine)return;db.ref('dreamdrop/players/'+pid()+'/progress').set(data).catch(function(){});};
  window.firebaseClear=function(){if(!db||!navigator.onLine)return;db.ref('dreamdrop/players/'+pid()+'/progress').remove().catch(function(){});};
  window.addEventListener('online',function(){try{var raw=localStorage.getItem('dreamdrop_progress_'+pid());if(raw)firebaseSync(JSON.parse(raw));}catch(e){}});
})();

// =============================================================
// MASCOT ANIMATION ENGINE
// =============================================================
(function() {
  var _worryTimer=null,_idleTimer=null,_comfortActive=false,_timeWatcher=null;
  function pe(){return document.getElementById('prem');}
  function se(){return document.getElementById('shanti');}
  var ALL=['mascot-bounce','mascot-shake','mascot-jump','mascot-clap','mascot-point','mascot-worry','mascot-comfort','mascot-retreat','mascot-idle','mascot-entrance'];
  function anim(el,cls,ms){if(!el||el.style.display==='none')return;ALL.forEach(function(c){el.classList.remove(c);});void el.offsetWidth;el.classList.add(cls);if(ms)setTimeout(function(){el.classList.remove(cls);},ms);}
  function both(pc,sc,ms){anim(pe(),pc,ms);anim(se(),sc,ms);}
  function startIdle(){clearTimeout(_idleTimer);_idleTimer=setTimeout(function(){var p=pe(),s=se();if(p&&p.style.display!=='none')p.classList.add('mascot-idle');if(s&&s.style.display!=='none')s.classList.add('mascot-idle');},1500);}
  function stopIdle(){clearTimeout(_idleTimer);var p=pe(),s=se();if(p)p.classList.remove('mascot-idle');if(s)s.classList.remove('mascot-idle');}
  function stopWorry(){clearTimeout(_worryTimer);_worryTimer=null;}
  function onStart(){stopIdle();_comfortActive=false;var p=pe();if(!p||p.style.display==='none')return;anim(p,'mascot-entrance',900);setTimeout(function(){anim(se(),'mascot-entrance',900);},150);setTimeout(startIdle,1300);}
  function onScore(combo){stopIdle();if(combo>=3)both('mascot-jump','mascot-jump',950);else both('mascot-clap','mascot-clap',850);setTimeout(startIdle,1000);}
  function onHint(){stopIdle();anim(pe(),'mascot-point',1400);anim(se(),'mascot-point',1400);setTimeout(startIdle,1600);}
  function onTimeLow(){if(_worryTimer)return;stopIdle();both('mascot-worry','mascot-worry',1100);_worryTimer=setTimeout(function(){_worryTimer=null;onTimeLow();},3000);}
  function onComplete(){stopIdle();stopWorry();_comfortActive=false;anim(pe(),'mascot-jump',950);setTimeout(function(){anim(se(),'mascot-jump',950);},200);setTimeout(function(){anim(pe(),'mascot-jump',950);setTimeout(function(){anim(se(),'mascot-jump',950);},200);},1100);}
  function onFail(){
    stopIdle();stopWorry();_comfortActive=true;
    var p=pe(),s=se();if(!p||p.style.display==='none')return;
    anim(p,'mascot-comfort',1100);setTimeout(function(){anim(se(),'mascot-comfort',1100);},200);
    setTimeout(function(){if(!_comfortActive)return;anim(pe(),'mascot-bounce',700);setTimeout(function(){if(_comfortActive)anim(se(),'mascot-bounce',700);},200);},1400);
    setTimeout(function(){if(!_comfortActive)return;var msgs=["You're doing great! Try again! 💪","We believe in you! 🌟","Every champion fails first! 🏆","Don't give up — you're so close! 😊","We're cheering for you! 🎉"];if(typeof showMascotMessage==='function')showMascotMessage(msgs[Math.floor(Math.random()*msgs.length)]);},1600);
  }
  function onRetreat(){_comfortActive=false;anim(pe(),'mascot-retreat',700);anim(se(),'mascot-retreat',700);setTimeout(startIdle,900);}
  function wrap(name,before,after){var orig=window[name];if(typeof orig!=='function')return;window[name]=function(){if(before)before.apply(this,arguments);var r=orig.apply(this,arguments);if(after)after.apply(this,arguments);return r;};}
  wrap('onPlayerScored',null,function(){onScore(typeof playerState!=='undefined'?playerState.comboCount:1);});
  wrap('onPlayerFailed',null,function(ft){if((ft==='wrongdrop'||ft==='collision')&&typeof playerState!=='undefined'&&playerState.failCount>=2)onHint();});
  wrap('onLevelComplete',null,function(){onComplete();});
  wrap('showGameOverAlert',null,function(done){if(!done)setTimeout(onFail,300);stopWorry();clearInterval(_timeWatcher);});
  wrap('startTimedLevel',null,function(l,bt,bl,secs){onStart();clearInterval(_timeWatcher);var tot=secs;_timeWatcher=setInterval(function(){var el=document.getElementById('time-value');if(!el)return;var val=parseInt(el.textContent,10);if(isNaN(val))return;if(val>0&&val<=Math.ceil(tot*0.25))onTimeLow();if(!isGameRunning){clearInterval(_timeWatcher);stopWorry();}},500);});
  wrap('startLevelCommon',null,onStart);
  wrap('level1',null,onStart);
  wrap('level2',null,onStart);
  wrap('restartGame',onRetreat,null);
  wrap('nextLevelFunction',onRetreat,null);
  document.addEventListener('DOMContentLoaded',startIdle);
})();
