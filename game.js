const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const speedLabel = document.getElementById('speed');
const lapLabel = document.getElementById('lap');
const timeLabel = document.getElementById('time');
const messageBox = document.getElementById('message');

const state = {
  running: false,
  gameTime: 0,
  lastFrame: 0,
  speed: 0,
  steer: 0,
  carX: 0,
  distance: 0,
  lap: 1,
  maxLaps: 3,
  raceLength: 4200,
  opponents: [],
  cameraShake: 0,
};

const keys = { left: false, right: false, up: false, down: false };
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;

function curveAt(distance) {
  return Math.sin(distance * 0.013) * 1.9 + Math.sin(distance * 0.031 + 0.8) * 1.1;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const tenths = Math.floor((secs % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}.${tenths}`;
}

function resetOpponents() {
  state.opponents = [];
  for (let i = 0; i < 6; i += 1) {
    state.opponents.push({
      lane: -1 + (i % 3) * 0.9,
      depth: 0.1 + i * 0.15,
      color: ['#ffbe0b', '#fb5607', '#f72585', '#ffc8dd', '#8ecae6', '#2ec4b6'][i % 6],
      speed: 45 + i * 8,
    });
  }
}

function showMessage(titleText, subtitleText, buttonLabel, callback) {
  messageBox.classList.remove('hidden');
  messageBox.innerHTML = `
    <h1>${titleText}</h1>
    <p>${subtitleText}</p>
    <button id="startButton">${buttonLabel}</button>
  `;
  document.getElementById('startButton').addEventListener('click', callback);
}

function startRace() {
  state.running = true;
  state.gameTime = 0;
  state.speed = 28;
  state.steer = 0;
  state.carX = 0;
  state.distance = 0;
  state.lap = 1;
  state.cameraShake = 0;
  resetOpponents();
  messageBox.classList.add('hidden');
}

function resetGame() {
  state.running = false;
  state.gameTime = 0;
  state.speed = 0;
  state.steer = 0;
  state.carX = 0;
  state.distance = 0;
  state.lap = 1;
  state.cameraShake = 0;
  resetOpponents();
  showMessage('Ahmed Cars', 'Use arrow keys to race.', 'Start Race', startRace);
}

function handleInput() {
  const accel = keys.up ? 1 : 0;
  const brake = keys.down ? 1 : 0;
  const left = keys.left ? -1 : 0;
  const right = keys.right ? 1 : 0;

  if (state.running) {
    if (accel) state.speed += 105 * (1 / 60);
    else state.speed -= 28 * (1 / 60);

    if (brake) state.speed -= 120 * (1 / 60);

    state.speed = clamp(state.speed, 0, 220);
  }

  const steerInput = left + right;
  state.steer = lerp(state.steer, steerInput, 0.18);
  state.carX += state.steer * (0.8 + state.speed / 150) * (1 / 60);
  state.carX = clamp(state.carX, -1.45, 1.45);

  if (Math.abs(state.carX) > 1.1 && state.speed > 60) {
    state.speed *= 0.985;
  }
}

function updateOpponents(dt) {
  for (const opponent of state.opponents) {
    opponent.depth += (0.21 + state.speed * 0.0009) * dt;
    if (opponent.depth > 1.1) {
      opponent.depth = -0.2;
      opponent.lane = -1 + Math.random() * 2;
      opponent.color = ['#ffbe0b', '#fb5607', '#f72585', '#ffc8dd', '#8ecae6', '#2ec4b6'][Math.floor(Math.random() * 6)];
    }
  }
}

function updateRace(dt) {
  state.gameTime += dt;
  state.distance += state.speed * dt * 1.4;

  if (state.distance >= state.raceLength) {
    state.distance = 0;
    state.lap += 1;
    state.cameraShake = 16;

    if (state.lap > state.maxLaps) {
      state.running = false;
      showMessage('Ahmed Cars', `Race complete! Time: ${formatTime(state.gameTime)}`, 'Race Again', startRace);
    }
  }

  for (const opponent of state.opponents) {
    const nearEnough = opponent.depth > 0.74 && opponent.depth < 0.96;
    const sameLane = Math.abs(opponent.lane - state.carX) < 0.38;
    if (nearEnough && sameLane) {
      state.speed *= 0.93;
      state.cameraShake = 10;
      break;
    }
  }

  updateOpponents(dt);
  state.cameraShake *= 0.88;
}

function drawBackground() {
  const { width, height } = canvas;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#7ad7ff');
  sky.addColorStop(0.4, '#d9f3ff');
  sky.addColorStop(0.42, '#dff6d9');
  sky.addColorStop(1, '#1f8a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(62, 120, 80, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.55);
  for (let x = 0; x <= width; x += 90) {
    const y = height * (0.48 + Math.sin((x + state.distance * 0.05) * 0.01) * 0.06);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 90 + (state.distance * 0.4) % 90) % (width + 80) - 40;
    const h = 25 + (i % 4) * 28;
    ctx.fillStyle = 'rgba(30, 40, 48, 0.9)';
    ctx.fillRect(x, height * 0.42 - h, 34, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let j = 0; j < 3; j += 1) {
      ctx.fillRect(x + 7 + j * 8, height * 0.42 - h + 8 + (j % 2) * 8, 4, 10);
    }
  }
}

function drawRoad() {
  const { width, height } = canvas;
  const horizon = height * 0.25;
  const roadBottom = height * 0.98;
  const segments = 90;

  for (let i = segments; i >= 1; i -= 1) {
    const t1 = i / segments;
    const t2 = (i - 1) / segments;
    const y1 = lerp(horizon, roadBottom, t1);
    const y2 = lerp(horizon, roadBottom, t2);
    const roadWide1 = lerp(80, width * 0.82, t1);
    const roadWide2 = lerp(80, width * 0.82, t2);

    const c1 = curveAt(state.distance + i * 28) * 260 * (1 - t1 * 0.4);
    const c2 = curveAt(state.distance + (i - 1) * 28) * 260 * (1 - t2 * 0.4);
    const center1 = width / 2 + c1;
    const center2 = width / 2 + c2;

    const left1 = center1 - roadWide1 * 0.5;
    const right1 = center1 + roadWide1 * 0.5;
    const left2 = center2 - roadWide2 * 0.5;
    const right2 = center2 + roadWide2 * 0.5;

    ctx.fillStyle = (i % 2 === 0) ? '#2d8b57' : '#3ab66e';
    ctx.fillRect(left1, y1, roadWide1, Math.max(4, y2 - y1));

    ctx.fillStyle = '#272d33';
    ctx.beginPath();
    ctx.moveTo(left1, y1);
    ctx.lineTo(right1, y1);
    ctx.lineTo(right2, y2);
    ctx.lineTo(left2, y2);
    ctx.closePath();
    ctx.fill();

    if (i % 3 === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo((left1 + right1) / 2, y1);
      ctx.lineTo((left2 + right2) / 2, y2);
      ctx.stroke();
    }
  }
}

function drawOpponent(opponent) {
  const { width, height } = canvas;
  const horizon = height * 0.25;
  const roadBottom = height * 0.98;
  const depth = clamp(opponent.depth, 0, 1);
  const y = lerp(horizon + 50, roadBottom - 85, depth);
  const roadWidth = lerp(80, width * 0.82, depth);
  const center = width / 2 + curveAt(state.distance + depth * 900) * 220 + opponent.lane * roadWidth * 0.28;

  ctx.save();
  ctx.translate(center, y);
  ctx.rotate(Math.sin(state.distance * 0.03 + opponent.lane) * 0.1);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(-20, 18, 40, 10);

  ctx.fillStyle = opponent.color;
  ctx.fillRect(-16, -10, 32, 18);
  ctx.fillStyle = '#1d1d1d';
  ctx.fillRect(-9, -15, 18, 8);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(-8, -14, 6, 4);
  ctx.fillRect(2, -14, 6, 4);
  ctx.fillStyle = '#d1d1d1';
  ctx.fillRect(-18, 2, 6, 8);
  ctx.fillRect(12, 2, 6, 8);
  ctx.restore();
}

function drawPlayerCar() {
  const { width, height } = canvas;
  const x = width * 0.5 + state.carX * 170;
  const y = height * 0.85;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.steer * 0.2);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-28, 28, 56, 12);

  ctx.fillStyle = '#80ed99';
  ctx.fillRect(-22, -18, 44, 28);
  ctx.fillStyle = '#2d6a4f';
  ctx.fillRect(-12, -26, 24, 12);
  ctx.fillStyle = '#dfe7fd';
  ctx.fillRect(-18, -12, 8, 8);
  ctx.fillRect(10, -12, 8, 8);
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(-18, 12, 8, 10);
  ctx.fillRect(10, 12, 8, 10);
  ctx.restore();
}

function drawScenery() {
  const { width, height } = canvas;
  for (let i = 0; i < 28; i += 1) {
    const x = ((i * 90 + state.distance * 2.5) % (width + 150)) - 75;
    const h = 50 + (i % 5) * 20;
    const y = height * 0.72 - h;
    ctx.fillStyle = '#1a4d2a';
    ctx.fillRect(x, y, 12, h);
    ctx.fillStyle = '#66b35f';
    ctx.beginPath();
    ctx.arc(x + 6, y - 8, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHUD() {
  speedLabel.textContent = Math.round(state.speed * 1.8);
  lapLabel.textContent = state.lap;
  timeLabel.textContent = formatTime(state.gameTime);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawScenery();
  drawRoad();

  for (const opponent of state.opponents) {
    drawOpponent(opponent);
  }

  drawPlayerCar();
  drawHUD();
}

function update(dt) {
  handleInput();
  if (state.running) updateRace(dt);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - (state.lastFrame || timestamp)) / 1000, 0.033);
  state.lastFrame = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') keys.left = true;
  if (event.key === 'ArrowRight') keys.right = true;
  if (event.key === 'ArrowUp') keys.up = true;
  if (event.key === 'ArrowDown') keys.down = true;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') keys.left = false;
  if (event.key === 'ArrowRight') keys.right = false;
  if (event.key === 'ArrowUp') keys.up = false;
  if (event.key === 'ArrowDown') keys.down = false;
});

resetGame();
requestAnimationFrame(gameLoop);
