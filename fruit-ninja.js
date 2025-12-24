// 游戏主类
class FruitNinjaGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 游戏状态
        this.isPlaying = false;
        this.score = 0;
        this.lives = 3;
        this.highScore = parseInt(localStorage.getItem('fruitNinjaHighScore')) || 0;

        // 游戏对象
        this.fruits = [];
        this.slicedFruits = [];
        this.particles = [];
        this.bladeTrail = [];

        // 鼠标/触摸状态
        this.isSlicing = false;
        this.lastMousePos = null;

        // 连击系统
        this.combo = 0;
        this.comboTimer = null;

        // 水果类型配置
        this.fruitTypes = [
            { emoji: '🍎', color: '#ff4444', points: 1, name: '苹果' },
            { emoji: '🍊', color: '#ff8c00', points: 1, name: '橘子' },
            { emoji: '🍋', color: '#fff44f', points: 1, name: '柠檬' },
            { emoji: '🍉', color: '#ff6b6b', points: 2, name: '西瓜' },
            { emoji: '🍇', color: '#8b5cf6', points: 2, name: '葡萄' },
            { emoji: '🍓', color: '#ff4757', points: 1, name: '草莓' },
            { emoji: '🥝', color: '#7bed9f', points: 2, name: '猕猴桃' },
            { emoji: '🍑', color: '#ffb347', points: 1, name: '桃子' },
            { emoji: '🍒', color: '#dc143c', points: 3, name: '樱桃' },
            { emoji: '🥭', color: '#ffa502', points: 2, name: '芒果' }
        ];

        // 初始化
        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // 鼠标事件
        this.canvas.addEventListener('mousedown', (e) => this.startSlice(e));
        this.canvas.addEventListener('mousemove', (e) => this.moveSlice(e));
        this.canvas.addEventListener('mouseup', () => this.endSlice());
        this.canvas.addEventListener('mouseleave', () => this.endSlice());

        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => this.startSlice(e));
        this.canvas.addEventListener('touchmove', (e) => this.moveSlice(e));
        this.canvas.addEventListener('touchend', () => this.endSlice());

        // 按钮事件
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());

        // 开始渲染循环
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.fruits = [];
        this.slicedFruits = [];
        this.particles = [];

        this.updateUI();
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');

        // 开始生成水果
        this.spawnInterval = setInterval(() => this.spawnFruit(), 800);
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.spawnInterval);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('fruitNinjaHighScore', this.highScore);
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    spawnFruit() {
        if (!this.isPlaying) return;

        const count = Math.random() < 0.3 ? 2 : 1; // 30%几率生成两个

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                // 10%几率生成炸弹
                const isBomb = Math.random() < 0.1;

                const fruit = {
                    x: Math.random() * (this.canvas.width - 100) + 50,
                    y: this.canvas.height + 50,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -(Math.random() * 8 + 15),
                    radius: isBomb ? 40 : 35,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.2,
                    isBomb: isBomb,
                    type: isBomb ? { emoji: '💣', color: '#333', points: 0 } :
                        this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)],
                    sliced: false
                };

                this.fruits.push(fruit);
            }, i * 200);
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startSlice(e) {
        e.preventDefault();
        this.isSlicing = true;
        this.lastMousePos = this.getMousePos(e);
        this.bladeTrail = [this.lastMousePos];
    }

    moveSlice(e) {
        e.preventDefault();
        if (!this.isSlicing || !this.isPlaying) return;

        const pos = this.getMousePos(e);

        // 添加刀痕轨迹
        this.bladeTrail.push({ ...pos, time: Date.now() });

        // 保持轨迹长度
        if (this.bladeTrail.length > 20) {
            this.bladeTrail.shift();
        }

        // 检测切割
        if (this.lastMousePos) {
            this.checkSlice(this.lastMousePos, pos);
        }

        this.lastMousePos = pos;
    }

    endSlice() {
        this.isSlicing = false;
        this.lastMousePos = null;
    }

    checkSlice(from, to) {
        let slicedCount = 0;

        for (let fruit of this.fruits) {
            if (fruit.sliced) continue;

            // 检测线段与圆的相交
            if (this.lineCircleIntersect(from, to, fruit)) {
                if (fruit.isBomb) {
                    // 切到炸弹，游戏结束
                    this.createExplosion(fruit.x, fruit.y);
                    this.endGame();
                    return;
                }

                fruit.sliced = true;
                slicedCount++;

                // 创建切割效果
                this.createSlicedFruit(fruit);
                this.createParticles(fruit.x, fruit.y, fruit.type.color);

                // 更新分数
                this.score += fruit.type.points;
            }
        }

        // 连击系统
        if (slicedCount > 0) {
            this.combo += slicedCount;
            if (this.combo >= 3) {
                this.showCombo(this.combo);
                this.score += this.combo; // 连击奖励
            }

            clearTimeout(this.comboTimer);
            this.comboTimer = setTimeout(() => {
                this.combo = 0;
            }, 1000);

            this.updateUI();
        }
    }

    lineCircleIntersect(p1, p2, circle) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const fx = p1.x - circle.x;
        const fy = p1.y - circle.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - circle.radius * circle.radius;

        let discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return false;

        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }

    createSlicedFruit(fruit) {
        // 创建两半水果
        for (let i = 0; i < 2; i++) {
            this.slicedFruits.push({
                x: fruit.x,
                y: fruit.y,
                vx: (i === 0 ? -3 : 3) + fruit.vx * 0.5,
                vy: fruit.vy * 0.5 - 2,
                radius: fruit.radius * 0.8,
                rotation: fruit.rotation,
                rotationSpeed: (i === 0 ? -0.15 : 0.15),
                type: fruit.type,
                half: i,
                alpha: 1
            });
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                radius: Math.random() * 8 + 3,
                color: color,
                alpha: 1
            });
        }
    }

    createExplosion(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            const speed = Math.random() * 10 + 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 10 + 5,
                color: i % 2 === 0 ? '#ff4444' : '#ff8800',
                alpha: 1
            });
        }
    }

    showCombo(count) {
        const comboDisplay = document.getElementById('combo-display');
        comboDisplay.textContent = `${count}连击! +${count}`;
        comboDisplay.classList.add('show');

        setTimeout(() => {
            comboDisplay.classList.remove('show');
        }, 500);
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;

        let hearts = '';
        for (let i = 0; i < this.lives; i++) {
            hearts += '❤️';
        }
        for (let i = this.lives; i < 3; i++) {
            hearts += '🖤';
        }
        document.getElementById('lives').textContent = hearts;
    }

    update() {
        if (!this.isPlaying) return;

        const gravity = 0.4;

        // 更新水果
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];

            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            fruit.vy += gravity;
            fruit.rotation += fruit.rotationSpeed;

            // 移除已切割或掉落的水果
            if (fruit.sliced) {
                this.fruits.splice(i, 1);
            } else if (fruit.y > this.canvas.height + 100) {
                // 水果掉落未被切割
                if (!fruit.isBomb) {
                    this.lives--;
                    this.updateUI();

                    if (this.lives <= 0) {
                        this.endGame();
                        return;
                    }
                }
                this.fruits.splice(i, 1);
            }
        }

        // 更新切割后的水果
        for (let i = this.slicedFruits.length - 1; i >= 0; i--) {
            const fruit = this.slicedFruits[i];

            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            fruit.vy += gravity;
            fruit.rotation += fruit.rotationSpeed;
            fruit.alpha -= 0.015;

            if (fruit.alpha <= 0 || fruit.y > this.canvas.height + 100) {
                this.slicedFruits.splice(i, 1);
            }
        }

        // 更新粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += gravity * 0.5;
            p.alpha -= 0.02;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 清理旧的刀痕
        const now = Date.now();
        this.bladeTrail = this.bladeTrail.filter(p => now - p.time < 100);
    }

    draw() {
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        this.drawBackground();

        // 绘制粒子
        this.drawParticles();

        // 绘制切割后的水果
        this.drawSlicedFruits();

        // 绘制水果
        this.drawFruits();

        // 绘制刀痕
        this.drawBladeTrail();
    }

    drawBackground() {
        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制一些装饰星星
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 97) % this.canvas.width;
            const y = (i * 53) % this.canvas.height;
            const size = (i % 3) + 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawFruits() {
        for (const fruit of this.fruits) {
            this.ctx.save();
            this.ctx.translate(fruit.x, fruit.y);
            this.ctx.rotate(fruit.rotation);

            // 绘制阴影
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetY = 5;

            // 绘制emoji
            this.ctx.font = `${fruit.radius * 2}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(fruit.type.emoji, 0, 0);

            this.ctx.restore();
        }
    }

    drawSlicedFruits() {
        for (const fruit of this.slicedFruits) {
            this.ctx.save();
            this.ctx.globalAlpha = fruit.alpha;
            this.ctx.translate(fruit.x, fruit.y);
            this.ctx.rotate(fruit.rotation);

            // 绘制半个水果（用裁剪模拟）
            this.ctx.beginPath();
            if (fruit.half === 0) {
                this.ctx.rect(-fruit.radius, -fruit.radius, fruit.radius, fruit.radius * 2);
            } else {
                this.ctx.rect(0, -fruit.radius, fruit.radius, fruit.radius * 2);
            }
            this.ctx.clip();

            this.ctx.font = `${fruit.radius * 2}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(fruit.type.emoji, 0, 0);

            this.ctx.restore();
        }
    }

    drawParticles() {
        for (const p of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    drawBladeTrail() {
        if (this.bladeTrail.length < 2) return;

        this.ctx.save();

        // 绘制刀痕光效
        for (let i = 1; i < this.bladeTrail.length; i++) {
            const p1 = this.bladeTrail[i - 1];
            const p2 = this.bladeTrail[i];
            const alpha = i / this.bladeTrail.length;

            // 外层光晕
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            this.ctx.lineWidth = 15;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();

            // 内层刀痕
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new FruitNinjaGame();
});
