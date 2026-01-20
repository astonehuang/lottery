/* =========================================
   2. 列表編輯器邏輯 (右上)
   ========================================= */
const listContainer = document.getElementById('list-container');
const addContainer = document.getElementById('add-container');
const newItemInput = document.getElementById('new-item-input');
const saveBtn = document.getElementById('save-btn');
const resetListBtn = document.getElementById('reset-list-btn');
const modeBadge = document.getElementById('mode-badge');
// startBtn is used here but defined globally or should be expected provided. 
// In game.html, startBtn is defined later. We can get it here safely if script runs at end body.
const startBtn = document.getElementById('start-lottery-btn');

// AI Modal 相關
const listModal = document.getElementById('ai-list-modal');
const listPrompt = document.getElementById('ai-list-prompt');
const listAiBtn = document.getElementById('ai-list-btn');

/* =========================================
   1. 全域資料與初始化
   ========================================= */
const defaultItems = [
    { name: "珍珠奶茶", hidden: false },
    { name: "雞排", hidden: false },
    { name: "牛肉麵", hidden: false },
    { name: "小籠包", hidden: false },
    { name: "滷肉飯", hidden: false },
    { name: "臭豆腐", hidden: false }
];
let items = [...defaultItems];

// 嘗試讀取 localStorage
const saved = localStorage.getItem('lottery_items');
if (saved) {
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            // Migration: Check if array of strings
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                items = parsed.map(name => ({ name, hidden: false }));
            } else {
                items = parsed;
            }
        }
    } catch (e) {
        console.error("Parse error", e);
    }
}
let isEditing = false;

function toggleAIModal(type) {
    if (type === 'list') {
        listModal.classList.toggle('hidden');
        if (!listModal.classList.contains('hidden')) listPrompt.focus();
    } else if (type === 'timer') {
        const timerModal = document.getElementById('ai-timer-modal');
        timerModal.classList.toggle('hidden');
        if (!timerModal.classList.contains('hidden')) document.getElementById('ai-timer-prompt').focus();
    }
}

async function generateAIList() {
    const prompt = listPrompt.value.trim();
    if (!prompt) return;

    // UI Loading 狀態
    const originalBtnText = listAiBtn.innerHTML;
    listAiBtn.innerHTML = `<span class="loading-dots">生成中</span>`;
    listAiBtn.disabled = true;

    const systemPrompt = `
        You are a creative assistant for a lottery app. 
        The user will give you a theme (e.g., 'Lunch ideas', 'Party games'). 
        Generate a list of 5 to 10 items related to that theme. 
        The items should be concise (under 15 characters if possible). 
        Return ONLY a raw JSON array of strings. 
        Example output: ["Item1", "Item2", "Item3"]
    `;

    const result = await callGeminiAPI(prompt, systemPrompt);

    if (result && Array.isArray(result)) {
        items = result.map(name => ({ name, hidden: false })); // Convert to objects
        renderList();
        renderBoxes(); // Global or from cubes.js
        renderGachapon(); // Global or from gachapon.js
        toggleAIModal('list');
        listPrompt.value = ''; // 清空
    }

    // 恢復 UI
    listAiBtn.innerHTML = originalBtnText;
    listAiBtn.disabled = false;
}

function renderList() {
    listContainer.innerHTML = '';
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = isEditing
            ? "flex items-center gap-2 mb-2 animate-fade-in"
            : `p-2 border-b border-gray-100 last:border-0 text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-between ${item.hidden ? 'bg-gray-100' : ''}`;

        if (isEditing) {
            div.innerHTML = `
                <span class="text-gray-400 w-5 text-xs text-center">${index + 1}</span>
                <input type="text" value="${item.name}" oninput="updateItem(${index}, this.value)" 
                    class="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none ${item.hidden ? 'text-gray-400 line-through' : ''}">
                <button onclick="toggleHidden(${index})" class="text-gray-400 hover:text-indigo-500 p-1" title="切換隱藏">
                    ${item.hidden
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'}
                </button>
                <button onclick="deleteItem(${index})" class="text-gray-400 hover:text-red-500 p-1" title="刪除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
        } else {
            const statusIcon = item.hidden
                ? '<span class="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">隱藏</span>'
                : '';
            div.innerHTML = `
                <div class="flex items-center ${item.hidden ? 'opacity-50 grayscale' : ''}">
                    <span class="font-bold text-indigo-500 mr-2 text-sm">${index + 1}.</span> 
                    <span class="text-sm font-medium ${item.hidden ? 'line-through text-gray-400' : 'truncate max-w-[120px]'}">${item.name}</span>
                </div>
                ${statusIcon}
            `;
        }
        listContainer.appendChild(div);
    });

    if (items.length === 0) {
        listContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                <p class="text-sm">列表是空的</p>
            </div>`;
    }
}

function enterEditMode() {
    if (isEditing || isLotteryRunning) return;
    isEditing = true;
    updateListUI();
    renderList();
}

function saveList() {
    items = items.filter(i => i.name.trim() !== "");
    localStorage.setItem('lottery_items', JSON.stringify(items));
    isEditing = false;
    updateListUI();
    renderList();
    renderBoxes();
    renderGachapon();
}

function resetList() {
    // Reset to default
    items = JSON.parse(JSON.stringify(defaultItems));

    // UI updates
    renderList();
    isEditing = false;
    updateListUI();
    renderBoxes();
    renderGachapon();
    localStorage.setItem('lottery_items', JSON.stringify(items));
}

function addItem() {
    const val = newItemInput.value.trim();
    if (val) {
        items.push({ name: val, hidden: false });
        newItemInput.value = '';
        renderList();
        newItemInput.focus();
        renderBoxes();
        renderGachapon();
    }
}
function deleteItem(idx) { items.splice(idx, 1); renderList(); renderBoxes(); renderGachapon(); }
function updateItem(idx, val) { items[idx].name = val; }
function toggleHidden(idx) {
    items[idx].hidden = !items[idx].hidden;
    renderList();
    renderBoxes();
    renderGachapon();
}

function updateListUI() {
    if (isEditing) {
        addContainer.classList.remove('hidden');
        saveBtn.disabled = false;
        saveBtn.classList.replace('bg-gray-100', 'bg-indigo-600');
        saveBtn.classList.replace('text-gray-400', 'text-white');
        saveBtn.classList.replace('cursor-not-allowed', 'hover:bg-indigo-700');
        modeBadge.textContent = "編輯中";
        modeBadge.className = "px-2 py-0.5 text-xs font-bold rounded bg-yellow-500 border border-yellow-400 text-white animate-pulse";
    } else {
        addContainer.classList.add('hidden');
        saveBtn.disabled = true;
        saveBtn.classList.replace('bg-indigo-600', 'bg-gray-100');
        saveBtn.classList.replace('text-white', 'text-gray-400');
        saveBtn.classList.replace('hover:bg-indigo-700', 'cursor-not-allowed');
        modeBadge.textContent = "唯讀";
        modeBadge.className = "px-2 py-0.5 text-xs font-bold rounded bg-indigo-500 border border-indigo-400 text-white";
    }
}

function checkStartButton() {
    const visibleCount = items.filter(i => !i.hidden).length;
    if (visibleCount < 2) {
        startBtn.disabled = true;
        startBtn.textContent = "項目不足";
    } else {
        startBtn.disabled = false;
        startBtn.textContent = "開始抽獎";
    }
}
