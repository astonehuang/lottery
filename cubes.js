/* =========================================
   3. 3D 抽獎邏輯 (左側 - 方塊模式)
   ========================================= */
function renderBoxes() {
    boxesStage.innerHTML = '';
    boxElements = [];
    const visibleItems = items.map((item, index) => ({ ...item, originalIndex: index })).filter(item => !item.hidden);

    countDisplay.textContent = `剩餘 ${visibleItems.length} 個項目`;

    visibleItems.forEach((itemObj) => {
        const container = document.createElement('div');
        container.className = 'relative group';

        const cube = document.createElement('div');
        cube.className = 'cube-container';
        // cube.id = `cube-${itemObj.originalIndex}`; // Optional

        // 3D 方塊面
        const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
        faces.forEach(faceName => {
            const face = document.createElement('div');
            face.className = `cube-face ${faceName} cube-face-dark`;
            if (faceName === 'front') face.textContent = itemObj.name;
            cube.appendChild(face);
        });

        container.appendChild(cube);
        boxesStage.appendChild(container);

        // Store element and original index mapping
        boxElements.push({ element: cube, originalIndex: itemObj.originalIndex, name: itemObj.name });
    });
    checkStartButton();
}

function runCubesLottery() {
    let currentIndex = 0;
    let currentDelay = 50;
    let maxDelay = 1000;

    function cycle() {
        boxElements.forEach(obj => obj.element.classList.remove('cube-active'));

        const activeObj = boxElements[currentIndex];
        if (activeObj) {
            activeObj.element.classList.add('cube-active');
            // 簡單的縮放動畫
            activeObj.element.style.transform = 'rotateX(-20deg) rotateY(-25deg) scale(1.15) translateZ(20px)';
            setTimeout(() => {
                if (activeObj) activeObj.element.style.transform = 'rotateX(-20deg) rotateY(-25deg) scale(1) translateZ(0)';
            }, currentDelay * 0.8);
        }

        if (currentDelay > maxDelay) {
            setTimeout(() => showWinner(currentIndex), 600);
            return;
        }

        currentIndex = (currentIndex + 1) % boxElements.length;

        if (currentDelay < 100) currentDelay += 5;
        else if (currentDelay < 300) currentDelay *= 1.1;
        else currentDelay *= 1.15;

        setTimeout(cycle, currentDelay);
    }
    cycle();
}

function showWinner(boxIndex) {
    const winnerObj = boxElements[boxIndex];
    lastWinnerOriginalIndex = winnerObj.originalIndex;

    winnerText.textContent = winnerObj.name;
    winnerOverlay.classList.remove('hidden');

    // 播放音效 (瀏覽器內建)
    playBeep(600, 0.1, 'sine');
    setTimeout(() => playBeep(800, 0.2, 'sine'), 150);
}
