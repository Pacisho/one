/* =============================================
   🐼 เรียนภาษาจีนกับแพนด้า - script.js
   Games: Balloon Shoot, Basket Drag, Word Runner
   ============================================= */

'use strict';

// ============================================================
// 1. DATA – Chinese vocabulary
// ============================================================
const VOCAB = {
  fruits: [
    { zh:'苹果', th:'แอปเปิล',   emoji:'🍎' },
    { zh:'香蕉', th:'กล้วย',     emoji:'🍌' },
    { zh:'橙子', th:'ส้ม',       emoji:'🍊' },
    { zh:'西瓜', th:'แตงโม',     emoji:'🍉' },
    { zh:'草莓', th:'สตรอเบอร์รี่', emoji:'🍓' },
    { zh:'葡萄', th:'องุ่น',     emoji:'🍇' },
  ],
  animals: [
    { zh:'猫',   th:'แมว',      emoji:'🐱' },
    { zh:'狗',   th:'สุนัข',    emoji:'🐶' },
    { zh:'鸟',   th:'นก',       emoji:'🐦' },
    { zh:'鱼',   th:'ปลา',      emoji:'🐟' },
    { zh:'熊猫', th:'แพนด้า',   emoji:'🐼' },
    { zh:'兔子', th:'กระต่าย',  emoji:'🐰' },
  ],
  colors: [
    { zh:'红色', th:'สีแดง',    emoji:'🔴' },
    { zh:'蓝色', th:'สีน้ำเงิน', emoji:'🔵' },
    { zh:'绿色', th:'สีเขียว',  emoji:'🟢' },
    { zh:'黄色', th:'สีเหลือง', emoji:'🟡' },
    { zh:'紫色', th:'สีม่วง',   emoji:'🟣' },
    { zh:'橙色', th:'สีส้ม',    emoji:'🟠' },
  ],
};

const ALL_VOCAB = [...VOCAB.fruits, ...VOCAB.animals, ...VOCAB.colors];

// ============================================================
// 2. SOUND ENGINE  (Web Audio API, no external files)
// ============================================================
let audioCtx = null;
let soundOn  = true;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.18, vol = 0.35) {
  if (!soundOn) return;
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playCorrect()  { playTone(660,'sine',.12); setTimeout(()=>playTone(880,'sine',.18),100); }
function playWrong()    { playTone(220,'sawtooth',.25,.3); }
function playPop()      { playTone(440,'square',.08,.5); setTimeout(()=>playTone(330,'square',.1,.3),60); }
function playJump()     { playTone(500,'sine',.1); setTimeout(()=>playTone(700,'sine',.1),80); }
function playCollect()  { playCorrect(); }
function playGameOver() { playTone(300,'sawtooth',.15); setTimeout(()=>playTone(220,'sawtooth',.3),150); }

// Speak Chinese word via SpeechSynthesis
function speakChinese(text) {
  if (!soundOn || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch(e) {}
}

function toggleSound() {
  soundOn = !soundOn;
  document.getElementById('btn-sound').textContent = soundOn ? '🔊' : '🔇';
  showToast(soundOn ? '🔊 เปิดเสียงแล้ว' : '🔇 ปิดเสียงแล้ว');
}

// ============================================================
// 3. SCORE SYSTEM
// ============================================================
const SCORE_KEYS = { balloon: 'panda_balloon', basket: 'panda_basket', runner: 'panda_runner' };

function getScore(game)      { return parseInt(localStorage.getItem(SCORE_KEYS[game]) || '0'); }
function setScore(game, val) { localStorage.setItem(SCORE_KEYS[game], Math.max(getScore(game), val)); updateGlobalScore(); }

function updateGlobalScore() {
  const total = getScore('balloon') + getScore('basket') + getScore('runner');
  document.getElementById('total-score').textContent = total;
}

function showScores() {
  showScreen('scores');
  document.getElementById('score-balloon').textContent = getScore('balloon');
  document.getElementById('score-basket').textContent  = getScore('basket');
  document.getElementById('score-runner').textContent  = getScore('runner');
  const total = getScore('balloon') + getScore('basket') + getScore('runner');
  document.getElementById('score-total').textContent   = total;
}

function resetScores() {
  if (!confirm('รีเซ็ตคะแนนทั้งหมด?')) return;
  Object.values(SCORE_KEYS).forEach(k => localStorage.removeItem(k));
  showScores();
  updateGlobalScore();
  showToast('🗑️ รีเซ็ตเรียบร้อยแล้ว');
}

// ============================================================
// 4. NAVIGATION
// ============================================================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

function goHome() {
  stopAllGames();
  showScreen('home');
}

function goToGameSelect() {
  stopAllGames();
  const b = document.getElementById('best-balloon');
  const k = document.getElementById('best-basket');
  const r = document.getElementById('best-runner');
  if (b) b.textContent = getScore('balloon');
  if (k) k.textContent = getScore('basket');
  if (r) r.textContent = getScore('runner');
  showScreen('select');
}

function startGame(game) {
  stopAllGames();
  showScreen(game);
  if      (game === 'balloon') initBalloon();
  else if (game === 'basket')  initBasket();
  else if (game === 'runner')  initRunner();
}

function stopAllGames() {
  stopBalloon();
  stopBasket();
  stopRunner();
}

// ============================================================
// 5. UTILS
// ============================================================
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function pick(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v,a,b) { return Math.min(Math.max(v,a),b); }

function showToast(msg, dur = 1800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast hidden'; }, dur);
}

function spawnStars(x, y) {
  const emojis = ['⭐','✨','💫','🌟'];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'star-burst';
    s.textContent = pick(emojis);
    const angle = (i / 6) * Math.PI * 2;
    const dist  = 50 + Math.random() * 60;
    s.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle)*dist + 'px');
    s.style.left = x + 'px';
    s.style.top  = y + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

// ============================================================
// 6. GAME 1: BALLOON SHOOT 🎈
// ============================================================
const BALLOON_COLORS = ['#FF4D6D','#FF8C42','#FFD166','#06D6A0','#118AB2','#845EC2','#FF6FB8'];
let balloonState = {};

function initBalloon() {
  balloonState = {
    score: 0, timer: 30, running: true,
    target: null, interval: null, timerInterval: null,
    balloons: [],
  };
  document.getElementById('balloon-score').textContent = '0';
  document.getElementById('balloon-timer').textContent = '30';
  document.getElementById('balloon-result').classList.add('hidden');
  document.getElementById('balloon-arena').innerHTML = '';

  pickNewBalloonTarget();

  balloonState.interval = setInterval(spawnBalloon, 1600);
  spawnBalloon();

  balloonState.timerInterval = setInterval(() => {
    if (!balloonState.running) return;
    balloonState.timer--;
    document.getElementById('balloon-timer').textContent = balloonState.timer;
    if (balloonState.timer <= 0) endBalloon();
  }, 1000);
}

function stopBalloon() {
  if (balloonState.interval)      clearInterval(balloonState.interval);
  if (balloonState.timerInterval) clearInterval(balloonState.timerInterval);
  balloonState.running = false;
  const arena = document.getElementById('balloon-arena');
  if (arena) arena.innerHTML = '';
}

function pickNewBalloonTarget() {
  balloonState.target = pick(ALL_VOCAB);
  const q = document.getElementById('balloon-question');
  const m = document.getElementById('balloon-meaning');
  if (q) q.textContent = balloonState.target.zh;
  if (m) m.textContent = balloonState.target.th;
  speakChinese(balloonState.target.zh);
}

function spawnBalloon() {
  if (!balloonState.running) return;
  const arena = document.getElementById('balloon-arena');
  if (!arena) return;

  // Clean up off-screen balloons
  arena.querySelectorAll('.balloon').forEach(b => {
    if (parseFloat(b.style.bottom) > 110) b.remove();
  });

  // Decide: correct or decoy?
  const isCorrect = Math.random() < 0.38;
  const vocab     = isCorrect ? balloonState.target : pick(ALL_VOCAB.filter(v => v !== balloonState.target));
  const color     = pick(BALLOON_COLORS);
  const speed     = 8 + Math.random() * 6; // seconds to float up
  const leftPct   = 5 + Math.random() * 80;

  const balloon = document.createElement('div');
  balloon.className = 'balloon';
  balloon.style.left = leftPct + '%';
  balloon.style.animationDuration = speed + 's';
  balloon.dataset.correct = isCorrect;
  balloon.dataset.zh = vocab.zh;

  balloon.innerHTML = `
    <div class="balloon-body" style="background:${color}">
      <span class="balloon-zh">${vocab.zh}</span>
    </div>
    <div class="balloon-string"></div>
    <div class="balloon-knot" style="background:${color}"></div>
  `;

  balloon.addEventListener('click',  (e) => onBalloonHit(e, balloon, isCorrect));
  balloon.addEventListener('touchend',(e) => { e.preventDefault(); onBalloonHit(e, balloon, isCorrect); });

  arena.appendChild(balloon);

  // Remove when animation ends
  balloon.addEventListener('animationend', () => balloon.remove());
}

function onBalloonHit(e, balloon, isCorrect) {
  if (!balloonState.running || balloon.dataset.popped) return;
  balloon.dataset.popped = '1';

  const rect = balloon.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;

  if (isCorrect) {
    balloonState.score += 10;
    document.getElementById('balloon-score').textContent = balloonState.score;
    balloon.classList.add('pop');
    playPop();
    playCorrect();
    spawnStars(cx, cy);
    showToast('✅ ถูก! +10');
    setTimeout(() => { if (balloonState.running) pickNewBalloonTarget(); }, 400);
  } else {
    balloon.classList.add('pop');
    playWrong();
    showToast('❌ ผิด! ' + balloon.dataset.zh + ' ≠ ' + balloonState.target.zh);
  }

  setTimeout(() => balloon.remove(), 380);
}

function endBalloon() {
  balloonState.running = false;
  clearInterval(balloonState.interval);
  clearInterval(balloonState.timerInterval);
  setScore('balloon', balloonState.score);
  document.getElementById('balloon-final-score').textContent = balloonState.score;
  document.getElementById('balloon-result-emoji').textContent = balloonState.score >= 50 ? '🏆' : '🎉';
  document.getElementById('balloon-result').classList.remove('hidden');
  playGameOver();
}

// ============================================================
// 7. GAME 2: BASKET DRAG 🧺
// ============================================================
const BASKET_CATEGORIES = [
  { key:'fruits',  zh:'水果', th:'ผลไม้',   color:'#FF4D6D', emoji:'🍎' },
  { key:'animals', zh:'动物', th:'สัตว์',   color:'#06D6A0', emoji:'🐾' },
  { key:'colors',  zh:'颜色', th:'สี',      color:'#845EC2', emoji:'🎨' },
];

let basketState = {};
let dragItem    = null;
let dragClone   = null;
let dragStartX  = 0;
let dragStartY  = 0;

function initBasket() {
  basketState = { score: 0, remaining: 0, running: true };
  document.getElementById('basket-score').textContent    = '0';
  document.getElementById('basket-result').classList.add('hidden');

  // Build baskets
  const row = document.getElementById('baskets-row');
  row.innerHTML = '';
  BASKET_CATEGORIES.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'basket';
    div.innerHTML = `
      <span class="basket-icon">${cat.emoji}</span>
      <span class="basket-label" style="background:${cat.color}">${cat.zh} (${cat.th})</span>
      <div class="basket-drop-zone" data-category="${cat.key}" id="zone-${cat.key}">
        <span style="opacity:.4">${cat.emoji}</span>
      </div>
    `;
    row.appendChild(div);
    setupDropZone(div.querySelector('.basket-drop-zone'));
  });

  // Build items
  const area = document.getElementById('items-area');
  area.innerHTML = '';
  const items = shuffle([...VOCAB.fruits, ...VOCAB.animals, ...VOCAB.colors].map(v => ({...v})));
  basketState.remaining = items.length;
  document.getElementById('basket-remaining').textContent = basketState.remaining;

  items.forEach(v => {
    const cat = VOCAB.fruits.includes(v) ? 'fruits' : VOCAB.animals.includes(v) ? 'animals' : 'colors';
    const el = document.createElement('div');
    el.className   = 'drag-item';
    el.dataset.cat = cat;
    el.dataset.zh  = v.zh;
    el.innerHTML = `
      <span class="item-emoji">${v.emoji}</span>
      <span class="item-zh">${v.zh}</span>
      <span class="item-th">${v.th}</span>
    `;
    setupDragItem(el);
    area.appendChild(el);
  });
}

function stopBasket() {
  basketState.running = false;
  dragItem  = null;
  dragClone = null;
}

function setupDragItem(el) {
  // Mouse drag
  el.addEventListener('mousedown',  startDrag);
  // Touch drag
  el.addEventListener('touchstart', startDrag, { passive: false });
}

function startDrag(e) {
  if (!basketState.running) return;
  e.preventDefault();
  dragItem = e.currentTarget;
  dragItem.classList.add('dragging');
  speakChinese(dragItem.dataset.zh);

  const src   = e.touches ? e.touches[0] : e;
  dragStartX  = src.clientX;
  dragStartY  = src.clientY;

  // Create floating clone
  dragClone = dragItem.cloneNode(true);
  const rect = dragItem.getBoundingClientRect();
  Object.assign(dragClone.style, {
    position: 'fixed',
    left:     rect.left + 'px',
    top:      rect.top  + 'px',
    width:    rect.width + 'px',
    zIndex:   '9000',
    transform:'scale(1.15) rotate(5deg)',
    pointerEvents: 'none',
    transition: 'none',
  });
  document.body.appendChild(dragClone);

  window.addEventListener('mousemove',  moveDrag);
  window.addEventListener('mouseup',    endDrag);
  window.addEventListener('touchmove',  moveDrag, { passive: false });
  window.addEventListener('touchend',   endDrag);
}

function moveDrag(e) {
  if (!dragClone) return;
  e.preventDefault();
  const src = e.touches ? e.touches[0] : e;
  const dx  = src.clientX - dragStartX;
  const dy  = src.clientY - dragStartY;
  const rect = dragItem.getBoundingClientRect();
  dragClone.style.left = (rect.left + dx) + 'px';
  dragClone.style.top  = (rect.top  + dy) + 'px';

  // Highlight drop zones
  document.querySelectorAll('.basket-drop-zone').forEach(z => z.classList.remove('drag-over'));
  const el = document.elementFromPoint(src.clientX, src.clientY);
  const zone = el?.closest('.basket-drop-zone');
  if (zone) zone.classList.add('drag-over');
}

function endDrag(e) {
  window.removeEventListener('mousemove',  moveDrag);
  window.removeEventListener('mouseup',    endDrag);
  window.removeEventListener('touchmove',  moveDrag);
  window.removeEventListener('touchend',   endDrag);

  if (!dragItem || !dragClone) return;
  const src = e.changedTouches ? e.changedTouches[0] : e;

  document.querySelectorAll('.basket-drop-zone').forEach(z => z.classList.remove('drag-over'));

  const el   = document.elementFromPoint(src.clientX, src.clientY);
  const zone = el?.closest('.basket-drop-zone');

  if (zone) {
    const targetCat = zone.dataset.category;
    const itemCat   = dragItem.dataset.cat;
    if (targetCat === itemCat) {
      // Correct!
      basketState.score += 10;
      basketState.remaining--;
      document.getElementById('basket-score').textContent     = basketState.score;
      document.getElementById('basket-remaining').textContent = basketState.remaining;
      dragItem.classList.add('correct-drop');
      dragClone.remove();
      playCorrect();
      spawnStars(src.clientX, src.clientY);
      showToast('✅ ถูก! +10');
      setTimeout(() => dragItem.remove(), 380);
      if (basketState.remaining <= 0) setTimeout(endBasket, 500);
    } else {
      // Wrong: bounce back
      dragClone.style.transition = 'all .35s cubic-bezier(.34,1.56,.64,1)';
      const rect = dragItem.getBoundingClientRect();
      dragClone.style.left = rect.left + 'px';
      dragClone.style.top  = rect.top  + 'px';
      dragClone.style.transform = 'scale(1)';
      dragItem.classList.add('wrong-drop');
      playWrong();
      showToast('❌ ผิดหมวด! ลองใหม่');
      setTimeout(() => { dragClone.remove(); dragItem.classList.remove('wrong-drop'); }, 380);
    }
  } else {
    // Dropped nowhere
    dragClone.style.transition = 'all .25s';
    const rect = dragItem.getBoundingClientRect();
    dragClone.style.left = rect.left + 'px';
    dragClone.style.top  = rect.top  + 'px';
    dragClone.style.transform = 'scale(1)';
    setTimeout(() => dragClone.remove(), 270);
  }

  dragItem.classList.remove('dragging');
  dragItem  = null;
  dragClone = null;
}

function setupDropZone(zone) { /* handled in endDrag */ }

function endBasket() {
  basketState.running = false;
  setScore('basket', basketState.score);
  document.getElementById('basket-final-score').textContent = basketState.score;
  document.getElementById('basket-result').classList.remove('hidden');
  playGameOver();
}

// ============================================================
// 8. GAME 3: WORD RUNNER 🏃
// ============================================================
const RUNNER_GRAVITY = 0.55;
const RUNNER_JUMP_V  = -13;
const RUNNER_SPEED   = 4.5;

let runnerState  = {};
let runnerRAF    = null;

function initRunner() {
  const canvas = document.getElementById('runner-canvas');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = H * 0.72;

  runnerState = {
    running: true, score: 0, lives: 3,
    player: {
      x: W * 0.12, y: GROUND,
      vy: 0, onGround: true,
      w: 52, h: 62,
    },
    obstacles: [],
    words: [],
    target: null,
    frameCount: 0,
    speed: RUNNER_SPEED,
    groundY: GROUND,
    W, H,
    bgOffset: 0,
  };

  document.getElementById('runner-score').textContent = '0';
  document.getElementById('runner-lives').textContent = '3';
  document.getElementById('runner-result').classList.add('hidden');

  pickRunnerTarget();

  cancelAnimationFrame(runnerRAF);
  runnerRAF = requestAnimationFrame(runnerLoop);
}

function stopRunner() {
  runnerState.running = false;
  cancelAnimationFrame(runnerRAF);
  runnerRAF = null;
}

function pickRunnerTarget() {
  runnerState.target = pick(ALL_VOCAB);
  const q = document.getElementById('runner-question');
  const m = document.getElementById('runner-meaning');
  if (q) q.textContent = runnerState.target.zh;
  if (m) m.textContent = runnerState.target.th;
  speakChinese(runnerState.target.zh);
}

function runnerJump() {
  if (!runnerState.running) return;
  const p = runnerState.player;
  if (p.onGround) {
    p.vy = RUNNER_JUMP_V;
    p.onGround = false;
    playJump();
  }
}

// Keyboard support
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    runnerJump();
  }
});

function runnerLoop() {
  if (!runnerState.running) return;
  const st = runnerState;
  st.frameCount++;

  const canvas = document.getElementById('runner-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { W, H, groundY } = st;

  // Resize canvas if needed
  if (canvas.offsetWidth !== W || canvas.offsetHeight !== H) {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    st.W = canvas.width;
    st.H = canvas.height;
    st.groundY = canvas.height * 0.72;
  }

  // Speed ramp
  st.speed = RUNNER_SPEED + st.score * 0.015;

  // ---------- Physics ----------
  const p = st.player;
  p.vy += RUNNER_GRAVITY;
  p.y  += p.vy;
  if (p.y >= groundY) { p.y = groundY; p.vy = 0; p.onGround = true; }

  // ---------- Spawn obstacles ----------
  if (st.frameCount % Math.max(60, 110 - st.score) === 0) {
    const h = 40 + Math.random() * 40;
    st.obstacles.push({ x: W + 20, y: groundY - h, w: 28, h, passed: false });
  }

  // ---------- Spawn word coins ----------
  if (st.frameCount % 90 === 0) {
    const isTarget = Math.random() < 0.45;
    const v = isTarget ? st.target : pick(ALL_VOCAB.filter(v => v !== st.target));
    const coinY = groundY - 80 - Math.random() * (groundY * 0.4);
    st.words.push({ x: W + 20, y: coinY, zh: v.zh, th: v.th, emoji: v.emoji, isTarget, collected: false, w: 64, h: 46 });
  }

  // Move obstacles
  st.obstacles = st.obstacles.filter(o => {
    o.x -= st.speed;
    return o.x + o.w > -10;
  });

  // Move words
  st.words = st.words.filter(w => {
    w.x -= st.speed;
    return w.x + w.w > -10;
  });

  // Collision: player vs obstacle
  for (const o of st.obstacles) {
    if (rectsOverlap(p.x, p.y - p.h, p.w, p.h, o.x, o.y, o.w, o.h)) {
      st.lives--;
      document.getElementById('runner-lives').textContent = st.lives;
      st.obstacles = st.obstacles.filter(x => x !== o);
      playWrong();
      if (st.lives <= 0) { endRunner(); return; }
    }
  }

  // Collision: player vs word coin
  for (const w of st.words) {
    if (w.collected) continue;
    if (rectsOverlap(p.x, p.y - p.h, p.w, p.h, w.x, w.y, w.w, w.h)) {
      w.collected = true;
      if (w.isTarget) {
        st.score += 15;
        document.getElementById('runner-score').textContent = st.score;
        playCollect();
        spawnStars(p.x + p.w/2, canvas.getBoundingClientRect().top + p.y - p.h/2);
        showToast('✅ ' + w.zh + ' +15');
        pickRunnerTarget();
      } else {
        st.lives--;
        document.getElementById('runner-lives').textContent = st.lives;
        playWrong();
        showToast('❌ ผิด! ' + w.zh);
        if (st.lives <= 0) { endRunner(); return; }
      }
    }
  }

  // ---------- Draw ----------
  ctx.clearRect(0, 0, W, H);

  // Sky gradient
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,   '#87CEEB');
  sky.addColorStop(0.7, '#E0F4FF');
  sky.addColorStop(1,   '#C8F5C0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Scrolling clouds
  st.bgOffset = (st.bgOffset + 0.5) % W;
  ctx.font = '1.8rem serif';
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) {
    const cx = ((i * W/3 + W - st.bgOffset * 0.4) % (W + 80)) - 40;
    ctx.fillText('☁️', cx, H * 0.15 + (i % 2) * 40);
  }
  ctx.globalAlpha = 1;

  // Ground
  ctx.fillStyle = '#8BC34A';
  ctx.fillRect(0, groundY + 10, W, H - groundY);
  ctx.fillStyle = '#6A9A36';
  ctx.fillRect(0, groundY + 10, W, 6);

  // Draw obstacles (cactus-like)
  for (const o of st.obstacles) {
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.roundRect(o.x, o.y, o.w, o.h, 6);
    ctx.fill();
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.roundRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4, 5);
    ctx.fill();
    // Spikes
    ctx.fillStyle = '#2E7D32';
    for (let s = o.y + 8; s < o.y + o.h - 8; s += 14) {
      ctx.fillRect(o.x - 8, s, 10, 4);
      ctx.fillRect(o.x + o.w - 2, s, 10, 4);
    }
  }

  // Draw word coins
  for (const w of st.words) {
    if (w.collected) continue;
    const bgColor = w.isTarget ? '#FFD166' : '#E0E0E0';
    const border  = w.isTarget ? '#FF8C42' : '#BDBDBD';

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(w.x, w.y, w.w, w.h, 10);
    ctx.fill();
    ctx.stroke();

    // Emoji
    ctx.font = '1rem serif';
    ctx.fillText(w.emoji, w.x + 4, w.y + 18);

    // Chinese character
    ctx.fillStyle = '#2D2D2D';
    ctx.font = `bold ${clamp(14, W * 0.025, 18)}px 'Noto Sans SC', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(w.zh, w.x + w.w / 2, w.y + w.h - 8);
    ctx.textAlign = 'left';
  }

  // Draw player (panda emoji)
  ctx.font = `${p.h}px serif`;
  ctx.fillText('🐼', p.x, p.y);

  runnerRAF = requestAnimationFrame(runnerLoop);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function endRunner() {
  runnerState.running = false;
  cancelAnimationFrame(runnerRAF);
  setScore('runner', runnerState.score);
  document.getElementById('runner-final-score').textContent = runnerState.score;
  document.getElementById('runner-result').classList.remove('hidden');
  playGameOver();
}

// ============================================================
// 9. INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  updateGlobalScore();
  showScreen('home');

  // Resize runner canvas on window resize
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('runner-canvas');
    if (canvas && canvas.offsetParent) {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  });
});
