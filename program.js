// =============================================================
// DREAM DROP — PROGRESS + BADGES + REWARDS SYSTEM
// =============================================================

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
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[Progress] Saved level data:', Object.keys(data.levels));
  } catch(e) { console.warn('[Progress] Save failed:', e); }
}

let _levelStartTime   = null;
let currentDifficulty = 'Easy';

function recordLevelStart(level, difficulty) {
  console.log('[Progress] Level started:', level);
  _levelStartTime = Date.now();
  const data = loadProgress();
  if (difficulty && !data.difficulty) data.difficulty = difficulty;
  if (!data.levels[level]) {
    data.levels[level] = { completed: false, bestTime: null, attempts: 0, firstTry: true };
  }
  data.levels[level].attempts++;
  saveProgress(data);
}

function recordLevelComplete(level) {
  console.log('[Progress] Level completed:', level);
  const data = loadProgress();
  const elapsed = _levelStartTime ? Math.round((Date.now() - _levelStartTime) / 1000) : null;

  if (!data.levels[level]) {
    data.levels[level] = { completed: false, bestTime: null, attempts: 1, firstTry: true };
  }

  const entry   = data.levels[level];
  const wasFirst = !entry.completed;

  entry.completed = true;
  entry.firstTry  = entry.firstTry && (entry.attempts === 1);

  if (elapsed !== null && (entry.bestTime === null || elapsed < entry.bestTime)) {
    entry.bestTime = elapsed;
  }

  if (level > data.highestLevel) data.highestLevel = level;
  if (wasFirst) data.totalLevelsCompleted = (data.totalLevelsCompleted || 0) + 1;

  const newBadges = checkBadges(data, level, elapsed);
  saveProgress(data);

  if (newBadges.length > 0) {
    setTimeout(() => showRewardPopup(newBadges), 800);
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

function resetProgress() { localStorage.removeItem(STORAGE_KEY); }

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
  popup.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:flex-start;justify-content:center;padding-top:4vh;z-index:999999;pointer-events:none;';
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
// HOOKS — difficulty buttons only
// recordLevelStart / recordLevelComplete / recordPlayTime are
// called DIRECTLY from scriptt.js — no custom events needed
// =============================================================
document.addEventListener('DOMContentLoaded', function() {
  const easyBtn   = document.getElementById('easyBtn');
  const mediumBtn = document.getElementById('mediumBtn');
  const hardBtn   = document.getElementById('hardBtn');
  if (easyBtn)   easyBtn.addEventListener('click',   () => setDifficulty('Easy'));
  if (mediumBtn) mediumBtn.addEventListener('click', () => setDifficulty('Medium'));
  if (hardBtn)   hardBtn.addEventListener('click',   () => setDifficulty('Hard'));
});