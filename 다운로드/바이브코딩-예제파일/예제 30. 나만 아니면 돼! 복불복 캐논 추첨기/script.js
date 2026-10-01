const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let balls = [];
let particles = [];
let boosters = [];
let springs = [];
let gameState = 'IDLE'; // IDLE, GATHERING, LOADED, FIRING, FREE_FALL, FINISHED
let cannon = { x: 0, y: 0, w: 100, h: 150 };
let finishedBalls = 0;
let lastRemovedBall = null;
let cameraY = 0;
let initialGroundY = 0;

// Camera Logic variables
let cameraFocusMode = 'HIGHEST'; // HIGHEST or LOWEST
let lastCameraSwitchTime = 0;

// Grid Config
const GRID_SIZE = 100;

// DOM Elements
const uiContainer = document.getElementById('ui-container');
const nameInput = document.getElementById('nameInput');
const startBtn = document.getElementById('startBtn');
const winnerOverlay = document.getElementById('winner-overlay');
const winnerName = document.getElementById('winner-name');
const restartBtn = document.getElementById('restartBtn');

const colors = ['#FF0055', '#00FF88', '#00CCFF', '#FF9900', '#CC00FF', '#FFFF00'];

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initialGroundY = height;
    cannon.x = width / 2;
    cannon.y = initialGroundY - 50;
}
window.addEventListener('resize', resize);
resize();

// --- Physics Constants ---
const GRAVITY = 0.3;
const FRICTION = 0.99;
const WALL_BOUNCE = 0.7;
const BALL_RADIUS = 20;

class Vector {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector(this.x * n, this.y * n); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        let m = this.mag();
        if (m === 0) return new Vector(0, 0);
        return new Vector(this.x / m, this.y / m);
    }
    static dist(v1, v2) { return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2); }
}

// --- Game Objects ---

// Boosters
class Booster {
    constructor(x, y) {
        this.pos = new Vector(x, y);
        this.radius = 40;
        this.power = -3;
        this.color = '#00FFFF';
        this.pulse = 0;
        this.active = true;
    }

    update() {
        this.pulse += 0.1;
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 200, 200, 0.2)`;
        ctx.fill();

        ctx.fillStyle = '#1a1a2e'; // Dark text
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('BOOST', 0, 5);

        ctx.restore();
    }

    checkCollision(ball) {
        if (!this.active) return false;
        let d = Vector.dist(this.pos, ball.pos);
        if (d < this.radius + ball.radius) {
            let force = new Vector(0, this.power);
            ball.applyForce(force);

            // Visual feedback
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(this.pos.x, this.pos.y, this.color));
            }

            this.active = false;
            return true;
        }
        return false;
    }
}

// Springs
class Spring {
    constructor(x, y, w) {
        this.pos = new Vector(x, y);
        this.w = w;
        this.h = 20;
        this.bounce = -20;
        this.active = true;
    }

    update() {
        // Static
    }

    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#ff0055';
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        // Striped pattern
        ctx.strokeStyle = '#fff'; // Keep white if the fill is dark enough, or change
        ctx.beginPath();
        ctx.moveTo(-this.w / 2, -this.h / 2);
        ctx.lineTo(this.w / 2, 0);
        ctx.stroke();

        ctx.restore();
    }

    checkCollision(ball) {
        if (!this.active) return false;

        // AABB-Circle collision
        if (ball.vel.y > 0) {
            if (ball.pos.x > this.pos.x - this.w / 2 - ball.radius &&
                ball.pos.x < this.pos.x + this.w / 2 + ball.radius) {

                if (ball.pos.y + ball.radius > this.pos.y - this.h / 2 &&
                    ball.pos.y - ball.radius < this.pos.y + this.h / 2) {

                    ball.vel.y = this.bounce;
                    ball.pos.y = this.pos.y - this.h / 2 - ball.radius - 1;

                    // Effect
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(ball.pos.x, ball.pos.y, '#ff0055'));
                    }

                    this.active = false;
                    return true;
                }
            }
        }
        return false;
    }
}


class Ball {
    constructor(x, y, name, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector(0, 0);
        this.acc = new Vector(0, 0);
        this.radius = BALL_RADIUS;
        this.name = name;
        this.color = color;
        this.landed = false;
    }

    applyForce(force) {
        this.acc = this.acc.add(force);
    }

    update() {
        this.vel = this.vel.add(this.acc);
        this.pos = this.pos.add(this.vel);
        this.acc = new Vector(0, 0);
        this.vel = this.vel.mult(FRICTION);

        // Phase specific behaviors
        if (gameState === 'GATHERING') {
            let target = new Vector(cannon.x, initialGroundY - 100);
            let dir = target.sub(this.pos);
            let dist = dir.mag();

            if (this.pos.y < initialGroundY - 200) {
                this.applyForce(new Vector(0, GRAVITY));
                this.applyForce(new Vector((cannon.x - this.pos.x) * 0.02, 0));
            } else {
                if (dist > 10) {
                    dir = dir.normalize().mult(2.0);
                    this.applyForce(dir);
                    this.vel = this.vel.mult(0.9);
                }
            }

            if (this.pos.y > initialGroundY - 150) {
                let distToCenter = Math.abs(this.pos.x - cannon.x);
                if (distToCenter > 40 && this.pos.y < initialGroundY - 50) {
                    if (this.pos.x < cannon.x) this.vel.x += 1;
                    else this.vel.x -= 1;
                }
            }
            if (this.pos.y > initialGroundY - 40) {
                this.pos.y = initialGroundY - 40;
                this.vel.y *= -0.1;
                this.landed = true;
            }
        }
        else if (gameState === 'FIRING' || gameState === 'FREE_FALL') {
            this.applyForce(new Vector(0, GRAVITY));
        }

        // Walls
        if (this.pos.x < this.radius) {
            this.pos.x = this.radius;
            this.vel.x *= -WALL_BOUNCE;
        }
        if (this.pos.x > width - this.radius) {
            this.pos.x = width - this.radius;
            this.vel.x *= -WALL_BOUNCE;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;

        let grad = ctx.createRadialGradient(this.pos.x - 5, this.pos.y - 5, 2, this.pos.x, this.pos.y, this.radius);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, '#000');
        ctx.fillStyle = grad;

        ctx.fill();
        ctx.closePath();

        ctx.fillStyle = '#1a1a2e'; // Dark text name
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, this.pos.x, this.pos.y - this.radius - 12);
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 10 + 5;
        this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.alpha = 1;
        this.color = color;
        this.life = 0.02;
    }
    update() {
        this.pos = this.pos.add(this.vel);
        this.alpha -= this.life;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function resolveCollisions() {
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            let b1 = balls[i];
            let b2 = balls[j];
            let dist = Vector.dist(b1.pos, b2.pos);
            let minDist = b1.radius + b2.radius;

            if (dist < minDist) {
                let normal = b2.pos.sub(b1.pos).normalize();
                let overlap = minDist - dist;
                b1.pos = b1.pos.sub(normal.mult(overlap / 2));
                b2.pos = b2.pos.add(normal.mult(overlap / 2));

                let relVel = b2.vel.sub(b1.vel);
                let sepVel = relVel.x * normal.x + relVel.y * normal.y;
                let newSepVel = -sepVel * 0.8;
                let sepVelVec = normal.mult(newSepVel - sepVel);

                b1.vel = b1.vel.sub(sepVelVec.mult(0.5));
                b2.vel = b2.vel.add(sepVelVec.mult(0.5));
            }
        }
    }
}

function startGame() {
    const names = nameInput.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) {
        alert('Please enter at least one name!');
        return;
    }

    balls = [];
    particles = [];
    boosters = [];
    springs = [];
    finishedBalls = 0;
    lastRemovedBall = null;
    cameraY = 0;
    lastCameraSwitchTime = Date.now();

    // Create Random Level
    for (let i = 0; i < 5; i++) {
        let bx = Math.random() * (width - 200) + 100;
        let by = initialGroundY - 800 - Math.random() * 2000;
        boosters.push(new Booster(bx, by));
    }

    for (let i = 0; i < 3; i++) {
        let sx = Math.random() * (width - 300) + 150;
        let sy = initialGroundY - 500 - Math.random() * 1000;
        springs.push(new Spring(sx, sy, 150));
    }


    names.forEach((name, i) => {
        const x = (width / (names.length + 1)) * (i + 1);
        const y = -50 - Math.random() * 100;
        const color = colors[i % colors.length];
        balls.push(new Ball(x, y, name, color));
    });

    gameState = 'GATHERING';
    uiContainer.classList.add('hidden');

    loop();

    setTimeout(() => {
        fireCannon();
    }, 2500);
}

function fireCannon() {
    gameState = 'FIRING';
    lastCameraSwitchTime = Date.now();

    for (let i = 0; i < 50; i++) {
        particles.push(new Particle(cannon.x, initialGroundY - 50, '#FF4400'));
        particles.push(new Particle(cannon.x, initialGroundY - 50, '#FFFF00'));
    }

    balls.forEach(b => {
        let spread = (Math.random() - 0.5) * 10;
        let power = -60 - Math.random() * 40;
        b.vel = new Vector(spread, power);
        b.landed = false;
    });

    setTimeout(() => {
        gameState = 'FREE_FALL';
    }, 500);
}


function updateCamera() {
    if (gameState === 'FREE_FALL' && balls.length > 0) {
        // Toggle Logic
        let now = Date.now();
        if (now - lastCameraSwitchTime > 2000) {
            cameraFocusMode = (cameraFocusMode === 'HIGHEST') ? 'LOWEST' : 'HIGHEST';
            lastCameraSwitchTime = now;
        }

        let sorted = [...balls].sort((a, b) => a.pos.y - b.pos.y);
        let highest = sorted[0];
        let lowest = sorted[sorted.length - 1];

        let targetBall = (cameraFocusMode === 'HIGHEST') ? highest : lowest;

        let targetCameraY = targetBall.pos.y - height * 0.4;

        if (targetCameraY > 0) targetCameraY = 0;

        // Visual Indicator (Optional, could draw text saying "CAM: LEADER" or "CAM: LAST")

        cameraY += (targetCameraY - cameraY) * 0.05; // Slightly slower smooth

    } else if (gameState === 'FINISHED' && lastRemovedBall) {
        cameraY += (0 - cameraY) * 0.05;
    } else {
        cameraY += (0 - cameraY) * 0.05;
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Dark faint lines
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical lines
    for (let x = 0; x <= width; x += GRID_SIZE) {
        ctx.moveTo(x, cameraY);
        ctx.lineTo(x, cameraY + height);
    }

    // Horizontal lines
    let startY = Math.floor(cameraY / GRID_SIZE) * GRID_SIZE;
    let endY = cameraY + height;

    for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();
}


function drawCannon() {
    ctx.save();
    ctx.translate(cannon.x, initialGroundY);

    ctx.fillStyle = '#444';
    ctx.fillRect(-40, -100, 80, 100);
    ctx.fillStyle = '#666';
    ctx.fillRect(-50, -100, 100, 20);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, 0, 60, Math.PI, 0);
    ctx.fill();

    if (gameState === 'GATHERING') {
        ctx.fillStyle = '#00ff88';
        ctx.font = '12px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('LOADING...', 0, -50);
    }
    ctx.restore();
}

function drawHUD() {
    // Show current camera mode in corner
    if (gameState === 'FREE_FALL') {
        ctx.save();
        ctx.fillStyle = '#1a1a2e'; // Dark HUD text
        ctx.font = '14px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText(`CAMERA: ${cameraFocusMode === 'HIGHEST' ? 'TOP 1' : 'LAST 1'}`, 20, 30);
        ctx.restore();
    }
}

function loop() {
    if ((gameState === 'IDLE' || gameState === 'FINISHED') && balls.length === 0 && !lastRemovedBall) return;

    ctx.clearRect(0, 0, width, height);

    updateCamera();

    ctx.save();
    ctx.translate(0, -cameraY);

    // Draw Grid BEFORE other elements
    drawGrid();

    // Ground
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(0, initialGroundY);
    ctx.lineTo(width, initialGroundY);
    ctx.stroke();

    drawCannon();

    // Objects
    boosters.forEach(b => { b.update(); b.draw(); });
    springs.forEach(s => { s.update(); s.draw(); });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    // Balls
    for (let i = balls.length - 1; i >= 0; i--) {
        let b = balls[i];
        b.update();
        b.draw();

        // Collisions with objects
        if (gameState === 'FIRING' || gameState === 'FREE_FALL') {
            boosters.forEach(booster => booster.checkCollision(b));
            springs.forEach(spring => spring.checkCollision(b));
        }

        // Elimination
        if (gameState === 'FREE_FALL' && b.pos.y > initialGroundY + 50) {
            lastRemovedBall = b;
            balls.splice(i, 1);
            checkProvisionalWinner();
        }
    }

    resolveCollisions();

    ctx.restore();

    drawHUD(); // Draw HUD on top of everything (untransformed)

    if (gameState !== 'IDLE' && gameState !== 'FINISHED') {
        requestAnimationFrame(loop);
    } else if (gameState === 'FINISHED') {
        requestAnimationFrame(loop);
    }
}

function checkProvisionalWinner() {
    if (balls.length === 0) {
        if (lastRemovedBall) {
            showWinner(lastRemovedBall);
        }
    }
}

function showWinner(ball) {
    gameState = 'FINISHED';
    winnerName.innerText = ball.name;
    winnerName.style.textShadow = `0 0 40px ${ball.color}`;
    winnerOverlay.classList.remove('hidden');
    winnerOverlay.classList.add('visible');
}

startBtn.addEventListener('click', startGame);

restartBtn.addEventListener('click', () => {
    winnerOverlay.classList.remove('visible');
    setTimeout(() => {
        winnerOverlay.classList.add('hidden');
    }, 500);

    uiContainer.classList.remove('hidden');
    gameState = 'IDLE';
    balls = [];
    boosters = [];
    springs = [];
    cameraY = 0;
    canvas.width = canvas.width;
    ctx.clearRect(0, 0, width, height);
});
