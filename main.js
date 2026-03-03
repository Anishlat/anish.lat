/* ═══════════════════════════════════════════════════════════════════════════
   Full-Page Conway's Game of Life + Site Interactions
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Game of Life (full viewport) ──────────────────────────────────────────
function initGameOfLife() {
    const canvas = document.getElementById('life');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const CELL_SIZE = 10;     // px per cell
    const TICK = 200;         // ms per generation
    function getPopCap() {
        return window.innerWidth <= 640 ? 120 : 800;
    }

    let cols, rows, grid;
    let prevStates = [];
    const MAX_HISTORY = 6;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        cols = Math.ceil(w / CELL_SIZE);
        rows = Math.ceil(h / CELL_SIZE);

        seed();
    }

    function seed() {
        // Start with empty grid
        grid = Array.from({ length: rows }, () => Array(cols).fill(0));
        prevStates = [];

        // Small known patterns to place at edges/corners
        // Each pattern is [rowOffsets, colOffsets] pairs of live cells
        const gliderSE = [[0, 0], [0, 1], [0, 2], [1, 0], [2, 1]];           // moves SE
        const gliderSW = [[0, 0], [0, -1], [0, -2], [1, 0], [2, -1]];        // moves SW
        const gliderNE = [[0, 0], [0, 1], [0, 2], [-1, 0], [-2, 1]];        // moves NE
        const gliderNW = [[0, 0], [0, -1], [0, -2], [-1, 0], [-2, -1]];     // moves NW
        const lwss = [[0, 1], [0, 4], [1, 0], [2, 0], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3]]; // lightweight spaceship
        const rpentomino = [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]];         // chaotic growth

        function place(pattern, startR, startC) {
            pattern.forEach(([dr, dc]) => {
                const r = startR + dr;
                const c = startC + dc;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = 1;
                }
            });
        }

        // Gliders at corners — they travel diagonally forever
        place(gliderSE, 2, 2);
        place(gliderSE, 4, 7);
        place(gliderSW, 2, cols - 4);
        place(gliderSW, 5, cols - 8);
        place(gliderNE, rows - 4, 3);
        place(gliderNE, rows - 6, 8);
        place(gliderNW, rows - 3, cols - 4);
        place(gliderNW, rows - 6, cols - 9);

        // Spaceships along edges
        place(lwss, 1, cols - 14);
        place(gliderSE, 2, Math.floor(cols / 2) - 3);
        place(gliderNW, rows - 3, Math.floor(cols / 2));

        // One small methuselah for organic chaos
        // On mobile, place it lower (75% down) to avoid overlapping text
        const isMobile = window.innerWidth <= 640;
        const rpRow = isMobile ? Math.floor(rows * 0.75) : Math.floor(rows / 2);
        place(rpentomino, rpRow, 3);
    }

    function countNeighbors(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = (r + dr + rows) % rows;
                const nc = (c + dc + cols) % cols;
                count += grid[nr][nc];
            }
        }
        return count;
    }

    function step() {
        const next = Array.from({ length: rows }, () => Array(cols).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const n = countNeighbors(r, c);
                if (grid[r][c]) {
                    next[r][c] = (n === 2 || n === 3) ? 1 : 0;
                } else {
                    next[r][c] = (n === 3) ? 1 : 0;
                }
            }
        }

        // Population count
        let pop = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                pop += next[r][c];
            }
        }

        // Reseed if population exceeds cap or stagnates (same pop count repeated)
        if (pop > getPopCap()) {
            seed();
            return;
        }

        // Stagnation: if population hasn't changed in MAX_HISTORY ticks, reseed
        prevStates.push(pop);
        if (prevStates.length > MAX_HISTORY) prevStates.shift();
        if (prevStates.length === MAX_HISTORY && prevStates.every(p => p === pop)) {
            seed();
            return;
        }

        grid = next;
    }

    function draw() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, w, h);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c]) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(
                        c * CELL_SIZE,
                        r * CELL_SIZE,
                        CELL_SIZE - 1,   // 1px gap between cells
                        CELL_SIZE - 1
                    );
                }
            }
        }
    }

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 200);
    });

    // Cursor interaction — spawn cells on click & drag
    let isMouseDown = false;
    let lastSpawn = 0;

    function spawnAtCursor(e) {
        const now = Date.now();
        if (now - lastSpawn < 80) return;
        lastSpawn = now;

        // Don't spawn cells over the text content
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el.closest('main')) return;

        const col = Math.floor(e.clientX / CELL_SIZE);
        const row = Math.floor(e.clientY / CELL_SIZE);

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (Math.random() < 0.4) {
                    const r = row + dr;
                    const c = col + dc;
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        grid[r][c] = 1;
                    }
                }
            }
        }
    }

    window.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        spawnAtCursor(e);
    });
    window.addEventListener('mouseup', () => { isMouseDown = false; });
    window.addEventListener('mousemove', (e) => {
        if (isMouseDown) spawnAtCursor(e);
    });

    // Init
    resize();
    draw();
    setInterval(() => {
        step();
        draw();
    }, TICK);
}

// ─── Scroll Reveals ────────────────────────────────────────────────────────
function initRevealAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    reveals.forEach((el) => observer.observe(el));
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initGameOfLife();
    initRevealAnimations();
});
