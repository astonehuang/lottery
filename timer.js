/* =========================================
   4. 計時器邏輯 (右下) - 含 AI
   ========================================= */
let tInterval;
let tTotal = 0;
let tRemain = 0;
let tIsRunning = false;
let alarmInterval = null; // For continuous alarm
let timerEndTime = 0; // For delta time calculation

const tDisplay = document.getElementById('timer-display');
const tRing = document.getElementById('timer-ring');
const tMinIn = document.getElementById('t-min');
const tSecIn = document.getElementById('t-sec');
const tStartBtn = document.getElementById('t-start');
const tMsg = document.getElementById('timer-msg');

// Persistence Logic
const STORAGE_KEY = 'timer_settings';
function saveTimerSettings() {
    const min = tMinIn.value;
    const sec = tSecIn.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ min, sec }));
}
function loadTimerSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const { min, sec } = JSON.parse(saved);
        return { min, sec };
    }
    return { min: "3", sec: "0" }; // Default
}

// Bind listeners
tMinIn.addEventListener('input', saveTimerSettings);
tSecIn.addEventListener('input', saveTimerSettings);

// Init on Load
const initSettings = loadTimerSettings();
tMinIn.value = initSettings.min;
tSecIn.value = initSettings.sec;
tDisplay.textContent = `${pad(initSettings.min)}:${pad(initSettings.sec)}`;

// AI Timer 相關
const timerPrompt = document.getElementById('ai-timer-prompt');
const timerAiBtn = document.getElementById('ai-timer-btn');

async function generateAITimer() {
    const prompt = timerPrompt.value.trim();
    if (!prompt) return;

    // UI Loading
    const originalBtnText = timerAiBtn.innerHTML;
    timerAiBtn.innerHTML = `<span class="loading-dots">分析中</span>`;
    timerAiBtn.disabled = true;

    const systemPrompt = `
        You are a helpful timer assistant. 
        The user will input a task (e.g., "Boil egg", "Pomodoro").
        Determine the appropriate duration in minutes and seconds.
        Return a JSON object with "minutes" (int), "seconds" (int), and "reason" (string, short explanation in Traditional Chinese).
        Example: {"minutes": 5, "seconds": 0, "reason": "半熟蛋通常需要5分鐘"}
    `;

    const result = await callGeminiAPI(prompt, systemPrompt);

    if (result) {
        tMinIn.value = result.minutes;
        tSecIn.value = result.seconds;
        tMsg.textContent = result.reason || "";

        // 自動重置並準備開始
        // 自動重置並準備開始
        // Save new settings
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ min: result.minutes, sec: result.seconds }));

        resetTimer();
        tMinIn.value = result.minutes;
        tSecIn.value = result.seconds;
        tDisplay.textContent = `${pad(result.minutes)}:${pad(result.seconds)}`;

        toggleAIModal('timer');
        timerPrompt.value = '';
    }

    // 恢復 UI
    timerAiBtn.innerHTML = originalBtnText;
    timerAiBtn.disabled = false;
}

// SVG 環設定
const radius = tRing.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
tRing.style.strokeDasharray = `${circumference} ${circumference}`;

function setRing(percent) {
    const offset = circumference - (percent / 100) * circumference;
    tRing.style.strokeDashoffset = offset;
}

function startTimer() {
    if (tIsRunning) {
        pauseTimer();
        return;
    }

    const m = parseInt(tMinIn.value) || 0;
    const s = parseInt(tSecIn.value) || 0;

    if (tRemain > 0 && tRemain < tTotal) {
        // Resume
    } else {
        // New Start
        tTotal = m * 60 + s;
        tRemain = tTotal;
    }

    if (tTotal <= 0) {
        tMsg.textContent = "請設定時間";
        setTimeout(() => tMsg.textContent = "", 2000);
        return;
    }

    tIsRunning = true;
    tStartBtn.textContent = "暫停";
    tStartBtn.classList.replace('bg-blue-600', 'bg-amber-500');
    tStartBtn.classList.replace('hover:bg-blue-500', 'hover:bg-amber-400');
    tDisplay.classList.remove('text-red-500', 'blink');
    tRing.classList.replace('text-red-500', 'text-blue-500');
    if (tMsg.textContent === "請設定時間" || tMsg.textContent === "時間到！") tMsg.textContent = "計時中...";

    document.getElementById('timer-inputs').classList.add('opacity-50', 'pointer-events-none');

    // Delta Time Logic
    timerEndTime = Date.now() + (tRemain * 1000);

    runTick();
    tInterval = setInterval(runTick, 1000);
}

function runTick() {
    const now = Date.now();
    const remainingMs = timerEndTime - now;

    // Convert to seconds (ceil/round to behave like a normal timer)
    // We use ceil so 0.1s connects to 1s, and only <=0 becomes 0
    tRemain = Math.ceil(remainingMs / 1000);

    if (tRemain <= 0) {
        tRemain = 0;
        updateTimerDisplay();
        timerFinished();
        return;
    }

    updateTimerDisplay();
}

function updateTimerDisplay() {
    const min = Math.floor(tRemain / 60);
    const sec = tRemain % 60;
    tDisplay.textContent = `${pad(min)}:${pad(sec)}`;

    const pct = (tRemain / tTotal) * 100;
    setRing(100 - pct);
}

function pauseTimer() {
    clearInterval(tInterval);
    tIsRunning = false;
    tStartBtn.textContent = "繼續";
    tStartBtn.classList.replace('bg-amber-500', 'bg-blue-600');
    tStartBtn.classList.replace('hover:bg-amber-400', 'hover:bg-blue-500');
    tMsg.textContent = "已暫停";
}

function resetTimer() {
    clearInterval(tInterval);
    tIsRunning = false;
    tIsRunning = false;
    tRemain = 0;
    tTotal = 0;

    const saved = loadTimerSettings();
    tMinIn.value = saved.min;
    tSecIn.value = saved.sec;
    tDisplay.textContent = `${pad(saved.min)}:${pad(saved.sec)}`;

    setRing(0);
    tRing.style.strokeDashoffset = 0;

    tStartBtn.textContent = "開始";
    tStartBtn.classList.replace('bg-amber-500', 'bg-blue-600');
    if (tStartBtn.classList.contains('bg-amber-500')) tStartBtn.classList.remove('bg-amber-500');
    tStartBtn.classList.add('bg-blue-600');

    document.getElementById('timer-inputs').classList.remove('opacity-50', 'pointer-events-none');
    tDisplay.classList.remove('text-red-500', 'blink');
    tRing.classList.replace('text-red-500', 'text-blue-500');
    tMsg.textContent = "";
    tMsg.textContent = "";

    // Ensure alarm is off on reset
    stopTimerAlert();
}

function stopTimerAlert() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    const modal = document.getElementById('timer-alert-modal');
    if (modal) modal.classList.add('hidden');
}

// Expose to window for button click
window.stopTimerAlert = stopTimerAlert;

function timerFinished() {
    clearInterval(tInterval);
    tIsRunning = false;
    tDisplay.textContent = "00:00";
    tMsg.textContent = "時間到！";
    tDisplay.classList.add('text-red-500', 'blink');
    tRing.classList.replace('text-blue-500', 'text-red-500');

    tRing.classList.replace('text-blue-500', 'text-red-500');

    // Continuous Alarm
    const playAlarm = () => {
        playBeep(880, 0.1, 'square');
        setTimeout(() => playBeep(880, 0.1, 'square'), 150);
        setTimeout(() => playBeep(880, 0.1, 'square'), 300);
    };

    playAlarm(); // Play immediately

    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(playAlarm, 1000); // Loop every 1s

    // Show Modal
    const modal = document.getElementById('timer-alert-modal');
    if (modal) modal.classList.remove('hidden');

    tStartBtn.textContent = "開始";
    tStartBtn.classList.replace('bg-amber-500', 'bg-blue-600');
    document.getElementById('timer-inputs').classList.remove('opacity-50', 'pointer-events-none');
}

function pad(n) { return n.toString().padStart(2, '0'); }
