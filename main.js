// --- Setup Inicial ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const controls = {
    a: document.getElementById('sliderA'),
    b: document.getElementById('sliderB'),
    c: document.getElementById('sliderC'),
};

const labels = {
    a: document.getElementById('valueA'),
    b: document.getElementById('valueB'),
    c: document.getElementById('valueC'),
};

const launchButton = document.getElementById('launchButton');
const resetButton = document.getElementById('resetButton');
const messageEl = document.getElementById('message');
const equationDisplay = document.getElementById('equationDisplay');
const targetCoords = document.getElementById('targetCoords');

// --- Constantes do Jogo ---
// Onde o (0,0) da matemática estará no canvas
const origin = { x: 50, y: 550 };

// Posição do alvo (em coordenadas matemáticas)
let target = { x: 500, y: 150, radius: 20 };

let bird = { x: 0, y: 0, radius: 10 }; // Posição do pássaro
let animationId = null; // Para controlar a animação
let currentMathX = 0; // Posição X do pássaro na trajetória

// --- Funções de Mapeamento de Coordenadas ---
// Converte (x, y) da matemática para (x, y) do canvas
function mapToCanvas(mathX, mathY) {
    const canvasX = origin.x + mathX;
    const canvasY = origin.y - mathY; // Y é invertido no canvas
    return { x: canvasX, y: canvasY };
}

// --- Funções de Desenho ---
function drawAxes() {
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    // Eixo Y
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.stroke();

    // Eixo X
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.stroke();

    // Números de referência no eixo X (a cada 50 px)
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    for (let x = 0; x <= canvas.width - origin.x; x += 50) {
        if (x === 0) continue;
        let pos = mapToCanvas(x, 0);
        ctx.fillText(x, pos.x - 8, origin.y + 15);
        // Pequena marca
        ctx.beginPath();
        ctx.moveTo(pos.x, origin.y - 5);
        ctx.lineTo(pos.x, origin.y + 5);
        ctx.stroke();
    }
    // Números de referência no eixo Y (a cada 50 px)
    for (let y = 0; y <= origin.y; y += 50) {
        if (y === 0) continue;
        let pos = mapToCanvas(0, y);
        ctx.fillText(y, origin.x - 25, pos.y + 4);
        // Pequena marca
        ctx.beginPath();
        ctx.moveTo(origin.x - 5, pos.y);
        ctx.lineTo(origin.x + 5, pos.y);
        ctx.stroke();
    }
}

function drawTarget() {
    const canvasPos = mapToCanvas(target.x, target.y);

    // Desenha o "porco" (um círculo verde)
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(canvasPos.x, canvasPos.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // Detalhes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(canvasPos.x - 5, canvasPos.y - 5, 3, 0, Math.PI * 2);
    ctx.arc(canvasPos.x + 5, canvasPos.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawBird(canvasX, canvasY) {
    // Desenha o "pássaro" (um círculo vermelho)
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, bird.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Desenha uma prévia da parábola (linha pontilhada)
function drawParabolaPreview(a, b, c) {
    ctx.strokeStyle = 'rgba(0, 86, 179, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Linha pontilhada

    ctx.beginPath();
    const startPos = mapToCanvas(0, c);
    ctx.moveTo(startPos.x, startPos.y);

    for (let mx = 1; mx < canvas.width; mx++) {
        let my = (a * mx * mx) + (b * mx) + c;
        let cPos = mapToCanvas(mx, my);

        if (cPos.x > canvas.width || cPos.y > canvas.height || cPos.y < 0) break; // Sai se estiver fora da tela

        ctx.lineTo(cPos.x, cPos.y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reseta a linha pontilhada
}

// --- Funções de Lógica do Jogo ---

function drawScene() {
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha eixos
    drawAxes();

    // Desenha o alvo
    drawTarget();

    // Desenha a prévia da parábola com os valores atuais dos sliders
    const a = parseFloat(controls.a.value);
    const b = parseFloat(controls.b.value);
    const c = parseFloat(controls.c.value);
    drawParabolaPreview(a, b, c);

    // Desenha o pássaro na posição inicial
    const startPos = mapToCanvas(0, c);
    bird.y = c; // Atualiza a altura inicial do pássaro
    drawBird(startPos.x, startPos.y);

    // Atualiza a equação e as coordenadas do alvo
    updateEquationAndCoords(a, b, c);
}

// Atualiza a exibição da equação e das coordenadas do alvo
function updateEquationAndCoords(a, b, c) {
    const eq = `y = ${a.toFixed(3)}x² ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(1)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c).toFixed(1)}`;
    document.getElementById('equationDisplay').textContent = eq;
    document.getElementById('targetCoords').textContent = `Alvo: (${target.x}, ${target.y})`;
}

function animateLaunch() {
    if (animationId) cancelAnimationFrame(animationId); // Cancela animação anterior

    // Pega os valores *no momento do lançamento*
    const a = parseFloat(controls.a.value);
    const b = parseFloat(controls.b.value);
    const c = parseFloat(controls.c.value);

    currentMathX = 0; // Reseta a posição X do pássaro
    messageEl.textContent = "Lançando...";

    function animationFrame() {
        // 1. Calcula a Posição Y baseada na X
        // Esta é a fórmula da equação do 2º grau!
        let currentMathY = (a * currentMathX * currentMathX) + (b * currentMathX) + c;

        // 2. Converte para coordenadas do Canvas
        let canvasPos = mapToCanvas(currentMathX, currentMathY);

        // 3. Limpa e Redesenha
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawAxes();
        drawTarget();

        // 4. Desenha o pássaro em sua nova posição
        drawBird(canvasPos.x, canvasPos.y);

        // 5. Verifica Colisão
        let distance = Math.sqrt(Math.pow(currentMathX - target.x, 2) + Math.pow(currentMathY - target.y, 2));

        if (distance < bird.radius + target.radius) {
            messageEl.textContent = "ACERTOU! Parabéns!";
            messageEl.style.color = 'green';
            spawnNewTarget(); // Gera um novo alvo
            drawScene(); // Redesenha a cena com o novo alvo
            return; // Para a animação
        }

        // 6. Continua a Animação
        currentMathX += 4; // Velocidade do "pássaro" no eixo X

        // 7. Verifica se saiu da tela
        if (canvasPos.x > canvas.width || canvasPos.y > canvas.height) {
            messageEl.textContent = "Errou! Tente de novo.";
            messageEl.style.color = 'red';
            // Para a animação e reseta o pássaro para o início
            drawScene();
            return;
        }

        animationId = requestAnimationFrame(animationFrame);
    }

    animationId = requestAnimationFrame(animationFrame);
}

// Gera um novo alvo aleatório
function spawnNewTarget() {
    // x entre 200 e 700
    target.x = Math.floor(Math.random() * 500) + 200;
    // y entre 50 e 400
    target.y = Math.floor(Math.random() * 350) + 50;
}

// --- Event Listeners (Ouvintes de Eventos) ---

// Atualiza os labels dos sliders
controls.a.addEventListener('input', () => {
    labels.a.textContent = parseFloat(controls.a.value).toFixed(3);
    drawScene(); // Atualiza a prévia
});
controls.b.addEventListener('input', () => {
    labels.b.textContent = parseFloat(controls.b.value).toFixed(1);
    drawScene(); // Atualiza a prévia
});
controls.c.addEventListener('input', () => {
    labels.c.textContent = controls.c.value;
    drawScene(); // Atualiza a prévia
});

// Botão de Lançar
launchButton.addEventListener('click', animateLaunch);

// Botão de Resetar (reinicia a cena)
resetButton.addEventListener('click', () => {
    if (animationId) cancelAnimationFrame(animationId);
    messageEl.textContent = "";
    spawnNewTarget();
    drawScene();
});

// Atualiza a equação e coordenadas na inicialização
updateEquationAndCoords(
    parseFloat(controls.a.value),
    parseFloat(controls.b.value),
    parseFloat(controls.c.value)
);
// --- Inicialização ---
drawScene(); // Desenha a cena inicial
