/* =========================================
   Gachapon Mode Logic (扭蛋模式)
   ========================================= */

// Physics State
let physicsBalls = [];
let physicsRAF;
// Ellipse Radii: 420x320 -> RX=210, RY=160
const RX = 210;
const RY = 160;
const BALL_RADIUS = 30;
const GRAVITY = 0.5;
const DAMPING = 0.7; // Bounce energy loss
const FRICTION = 0.98; // Air resistance

function renderGachapon() {
    const container = document.getElementById('balls-container');
    if (!container) return;
    container.innerHTML = '';

    // Stop any existing cycle
    if (physicsRAF) cancelAnimationFrame(physicsRAF);

    // Reset handle
    const handle = document.getElementById('machine-handle');
    if (handle) handle.style.transform = 'translate(-50%, -50%) rotate(0deg)';

    const visibleItems = items.filter(i => !i.hidden);
    const colors = ['#f87171', '#60a5fa', '#facc15', '#4ade80', '#a78bfa', '#fb923c'];

    physicsBalls = [];

    // Container center (via CSS 420x320)
    const centerX = 210;
    const centerY = 160;

    visibleItems.forEach((item, i) => {
        const ball = document.createElement('div');
        // w-[60px] h-[60px] = 60px size
        ball.className = 'ball absolute rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 border-white/30 select-none';
        ball.style.width = '60px';
        ball.style.height = '60px';
        ball.style.backgroundColor = colors[i % colors.length];
        ball.textContent = item.name.substring(0, 1);
        ball.style.fontSize = '1.25rem'; // larger text

        // Random start pos
        const safeRX = RX - BALL_RADIUS - 10;
        const safeRY = RY - BALL_RADIUS - 10;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        const x = centerX + r * safeRX * Math.cos(angle);
        const y = centerY + r * safeRY * Math.sin(angle);

        container.appendChild(ball);

        physicsBalls.push({
            element: ball,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            item: item,
            originalIndex: i
        });
    });

    // Remove previous dropped ball if any
    const prevBall = document.querySelector('.dropped-ball');
    if (prevBall) prevBall.remove();

    // Start physics loop
    updatePhysics();
}

function updatePhysics() {
    const centerX = 210;
    const centerY = 160;

    physicsBalls.forEach(b1 => {
        // Apply forces
        b1.vy += GRAVITY;
        b1.vx *= FRICTION;
        b1.vy *= FRICTION;

        // Move
        b1.x += b1.vx;
        b1.y += b1.vy;

        // Ellipse Boundary Collision
        const effRX = RX - BALL_RADIUS;
        const effRY = RY - BALL_RADIUS;

        const dx = b1.x - centerX;
        const dy = b1.y - centerY;

        // Normalize distance to effective ellipse
        const distSq = (dx * dx) / (effRX * effRX) + (dy * dy) / (effRY * effRY);

        if (distSq > 1) {
            // Gradient of ellipse x^2/a^2 + y^2/b^2 = 1 is (2x/a^2, 2y/b^2).
            const nxUnscaled = dx / (effRX * effRX);
            const nyUnscaled = dy / (effRY * effRY);
            const len = Math.sqrt(nxUnscaled * nxUnscaled + nyUnscaled * nyUnscaled);
            const nx = nxUnscaled / len;
            const ny = nyUnscaled / len;

            // Simple push back (approx)
            const pushAmt = 2.0;
            b1.x -= nx * pushAmt;
            b1.y -= ny * pushAmt;

            // Reflect velocity
            const dot = b1.vx * nx + b1.vy * ny;

            if (dot > 0) {
                b1.vx = (b1.vx - 2 * dot * nx) * DAMPING;
                b1.vy = (b1.vy - 2 * dot * ny) * DAMPING;
                b1.vx += (Math.random() - 0.5);
            }

            // Force position clamp 
            const scale = 1 / Math.sqrt(distSq);
            b1.x = centerX + dx * scale * 0.99;
            b1.y = centerY + dy * scale * 0.99;
        }
    });

    // Ball-to-Ball Collision
    for (let i = 0; i < physicsBalls.length; i++) {
        for (let j = i + 1; j < physicsBalls.length; j++) {
            const b1 = physicsBalls[i];
            const b2 = physicsBalls[j];

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < BALL_RADIUS * 2) {
                // Collision normal
                const nx = dx / dist;
                const ny = dy / dist;

                // Push apart (separation)
                const overlap = (BALL_RADIUS * 2) - dist;
                const moveX = nx * overlap * 0.5;
                const moveY = ny * overlap * 0.5;

                b1.x -= moveX;
                b1.y -= moveY;
                b2.x += moveX;
                b2.y += moveY;

                // Simple elastic collision response
                // Swap velocities along normal direction (approx)
                // Relative velocity
                const rvx = b2.vx - b1.vx;
                const rvy = b2.vy - b1.vy;
                const velAlongNormal = rvx * nx + rvy * ny;

                if (velAlongNormal > 0) continue; // Moving apart already

                const impulse = -(1 + 0.8) * velAlongNormal; // 0.8 restitution
                // assuming equal mass = 1
                const impulseX = impulse * nx;
                const impulseY = impulse * ny;

                b1.vx -= impulseX * 0.5; // split impulse
                b1.vy -= impulseY * 0.5;
                b2.vx += impulseX * 0.5;
                b2.vy += impulseY * 0.5;
            }
        }
    }

    // Render
    physicsBalls.forEach(b => {
        // center the div on x,y
        b.element.style.transform = `translate(${b.x - BALL_RADIUS}px, ${b.y - BALL_RADIUS}px)`;
    });

    if (physicsBalls.length > 0) {
        physicsRAF = requestAnimationFrame(updatePhysics);
    }
}

function startGachaponLoop() {
    // Boost buttons for chaos
    physicsBalls.forEach(b => {
        b.vx += (Math.random() - 0.5) * 30;
        b.vy -= Math.random() * 30 + 10; // Jump up
    });

    // Continually churn for 2 seconds
    const churnInterval = setInterval(() => {
        physicsBalls.forEach(b => {
            b.vx += (Math.random() - 0.5) * 5;
            b.vy += (Math.random() - 0.5) * 5;
            if (Math.random() > 0.8) b.vy -= 8; // Random jump
        });
    }, 100);

    // Spin handle
    const handle = document.getElementById('machine-handle');
    handle.style.transition = 'transform 2s ease-out'; // Restore transition
    handle.style.transform = 'translate(-50%, -50%) rotate(720deg)'; // Spin more

    setTimeout(() => {
        clearInterval(churnInterval);
        // Pick winner logic remains similar
        // We pick from visible items (same as balls)
        const visibleFilter = items.filter(item => !item.hidden);

        let winnerIndex = Math.floor(Math.random() * visibleFilter.length);
        const winnerItem = visibleFilter[winnerIndex];

        // Animate Drop
        const exit = document.getElementById('exit-hole');
        if (exit) {
            const droppedBall = document.createElement('div');
            droppedBall.className = 'ball dropped-ball flex items-center justify-center font-bold text-white shadow-lg rounded-full border-4 border-white/50';
            // Find color matching winner (hacky but consistent with render)
            // Or just use random color from palette
            const colors = ['#f87171', '#60a5fa', '#facc15', '#4ade80', '#a78bfa', '#fb923c'];
            // We need to find the specific index in visible list to match color ideally, 
            // but random looks fine or just consistent color mapping
            const colorIndex = visibleFilter.indexOf(winnerItem);
            droppedBall.style.backgroundColor = colors[colorIndex % colors.length];

            droppedBall.style.width = '60px';
            droppedBall.style.height = '60px';
            droppedBall.style.position = 'absolute';
            droppedBall.style.left = '10px'; // Center in hole (hole is 96px wide, ball 60. (96-60)/2 = 18)
            droppedBall.style.top = '10px';
            droppedBall.style.zIndex = '50';
            droppedBall.style.fontSize = '1.25rem';

            // Custom keyframe for dropping out
            droppedBall.style.animation = 'drop-out 0.6s ease-out forwards';
            droppedBall.textContent = winnerItem.name.substring(0, 1);

            exit.appendChild(droppedBall);
        }

        playBeep(800, 0.1, 'sine');

        setTimeout(() => {
            // Find original index for full object
            const trueWinner = items.find(i => i === winnerItem);
            // We need an object with originalIndex for closeWinner to work
            // Let's reuse internal mapping or just find index
            const winnerObj = { ...trueWinner, originalIndex: items.indexOf(trueWinner) };

            showWinnerForGachapon(winnerObj);
        }, 800);

    }, 2000); // 2 seconds wait
}

function showWinnerForGachapon(winnerObj) {
    lastWinnerOriginalIndex = winnerObj.originalIndex;
    winnerText.textContent = winnerObj.name;
    winnerOverlay.classList.remove('hidden');
    playBeep(600, 0.1, 'sine');
    setTimeout(() => playBeep(800, 0.2, 'sine'), 150);
}
