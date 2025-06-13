class Snake {
    constructor() {
        this.segments = [
            { x: 200, y: 200 },
            { x: 190, y: 200 },
            { x: 180, y: 200 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
    }

    move() {
        this.direction = this.nextDirection;
        const head = { ...this.segments[0] };

        switch (this.direction) {
            case 'up': head.y -= 10; break;
            case 'down': head.y += 10; break;
            case 'left': head.x -= 10; break;
            case 'right': head.x += 10; break;
        }

        this.segments.unshift(head);
    }

    grow() {
        // 不删除尾部，蛇身就会增长
    }

    shrink() {
        this.segments.pop();
    }

    checkCollision() {
        const head = this.segments[0];
        
        // 检查是否撞墙
        if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400) {
            return true;
        }

        // 检查是否撞到自己
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }

        return false;
    }
}

class Food {
    constructor() {
        this.positions = [];
        this.spawnMultiple(5); // 初始生成5个食物
    }

    getRandomPosition() {
        return {
            x: Math.floor(Math.random() * 40) * 10,
            y: Math.floor(Math.random() * 40) * 10
        };
    }

    spawnMultiple(count) {
        for (let i = 0; i < count; i++) {
            this.positions.push(this.getRandomPosition());
        }
    }

    removeFood(index) {
        this.positions.splice(index, 1);
        if (this.positions.length < 3) { // 当食物少于3个时，补充到5个
            this.spawnMultiple(2);
        }
    }
}

class AISnake extends Snake {
    constructor(startX, startY, color) {
        super();
        this.segments = [
            { x: startX, y: startY },
            { x: startX - 10, y: startY },
            { x: startX - 20, y: startY }
        ];
        this.color = color;
        this.isDead = false;
    }

    decideNextMove(food, playerSnake, otherAISnakes) {
        if (this.isDead) return;

        const head = this.segments[0];
        let nearestFood = null;
        let minDistance = Infinity;

        // 找到最近的食物
        food.positions.forEach(foodPos => {
            const distance = Math.abs(foodPos.x - head.x) + Math.abs(foodPos.y - head.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestFood = foodPos;
            }
        });

        if (!nearestFood) return;

        // 决定移动方向
        const possibleDirections = ['up', 'down', 'left', 'right'];
        const currentDirection = this.direction;
        const oppositeDirection = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };

        // 移除不允许的方向
        const allowedDirections = possibleDirections.filter(dir => {
            if (dir === oppositeDirection[currentDirection]) return false;

            let nextHead = {...head};
            switch (dir) {
                case 'up': nextHead.y -= 10; break;
                case 'down': nextHead.y += 10; break;
                case 'left': nextHead.x -= 10; break;
                case 'right': nextHead.x += 10; break;
            }

            // 检查是否会撞墙
            if (nextHead.x < 0 || nextHead.x >= 400 || nextHead.y < 0 || nextHead.y >= 400) {
                return false;
            }

            // 检查是否会撞到自己
            if (this.segments.some(segment => segment.x === nextHead.x && segment.y === nextHead.y)) {
                return false;
            }

            // 检查是否会撞到玩家
            if (playerSnake.segments.some(segment => segment.x === nextHead.x && segment.y === nextHead.y)) {
                return false;
            }

            // 检查是否会撞到其他AI蛇
            return !otherAISnakes.some(snake => 
                !snake.isDead && snake !== this && 
                snake.segments.some(segment => segment.x === nextHead.x && segment.y === nextHead.y)
            );
        });

        if (allowedDirections.length === 0) {
            // 如果没有安全的方向，随机选择一个方向
            this.nextDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
            return;
        }

        // 选择最接近食物的方向
        let bestDirection = allowedDirections[0];
        let minFoodDistance = Infinity;

        allowedDirections.forEach(dir => {
            let nextHead = {...head};
            switch (dir) {
                case 'up': nextHead.y -= 10; break;
                case 'down': nextHead.y += 10; break;
                case 'left': nextHead.x -= 10; break;
                case 'right': nextHead.x += 10; break;
            }

            const distance = Math.abs(nextHead.x - nearestFood.x) + Math.abs(nextHead.y - nearestFood.y);
            if (distance < minFoodDistance) {
                minFoodDistance = distance;
                bestDirection = dir;
            }
        });

        this.nextDirection = bestDirection;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.startButton = document.getElementById('start-btn');
        this.pauseButton = document.getElementById('pause-btn');
        this.snake = new Snake();
        this.aiSnakes = [
            new AISnake(300, 100, '#FF5722'),
            new AISnake(100, 300, '#9C27B0')
        ];
        this.food = new Food();
        this.score = 0;
        this.gameLoop = null;
        this.gameSpeed = 100;
        this.isPaused = false;

        // 初始化移动端控制按钮
        this.upButton = document.getElementById('up-btn');
        this.downButton = document.getElementById('down-btn');
        this.leftButton = document.getElementById('left-btn');
        this.rightButton = document.getElementById('right-btn');

        this.startButton.addEventListener('click', () => this.startGame());
        this.pauseButton.addEventListener('click', () => this.togglePause());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // 添加移动端控制按钮事件监听
        this.upButton.addEventListener('click', () => this.handleMobileControl('up'));
        this.downButton.addEventListener('click', () => this.handleMobileControl('down'));
        this.leftButton.addEventListener('click', () => this.handleMobileControl('left'));
        this.rightButton.addEventListener('click', () => this.handleMobileControl('right'));

        // 阻止移动端按钮的触摸滑动
        const mobileControls = document.querySelector('.mobile-controls');
        mobileControls.addEventListener('touchstart', (e) => e.preventDefault());
        mobileControls.addEventListener('touchmove', (e) => e.preventDefault());
        mobileControls.addEventListener('touchend', (e) => e.preventDefault());
    }

    startGame() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }

        this.snake = new Snake();
        this.aiSnakes = [
            new AISnake(300, 100, '#FF5722'),
            new AISnake(100, 300, '#9C27B0')
        ];
        this.food = new Food();
        this.score = 0;
        this.isPaused = false;
        this.updateScore();
        this.startButton.textContent = '重新开始';
        this.pauseButton.style.display = 'block';
        this.pauseButton.textContent = '暂停';
        
        this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
    }

    togglePause() {
        if (this.gameLoop) {
            if (this.isPaused) {
                this.gameLoop = setInterval(() => this.update(), this.gameSpeed);
                this.pauseButton.textContent = '暂停';
                this.isPaused = false;
            } else {
                clearInterval(this.gameLoop);
                this.gameLoop = null;
                this.pauseButton.textContent = '继续';
                this.isPaused = true;
            }
        }
    }

    checkVictory() {
        return this.aiSnakes.every(aiSnake => aiSnake.isDead);
    }

    victory() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        this.pauseButton.style.display = 'none';
        
        const modal = document.getElementById('victory-modal');
        const victoryScore = document.getElementById('victory-score');
        victoryScore.textContent = this.score;
        modal.style.display = 'block';
        
        const restartBtn = document.getElementById('victory-restart-btn');
        const handleRestart = () => {
            modal.style.display = 'none';
            this.startGame();
            restartBtn.removeEventListener('click', handleRestart);
        };
        restartBtn.addEventListener('click', handleRestart);
    }

    update() {
        let playerAteFood = false;
        let aiAteFoodMap = new Map();

        // 移动玩家蛇
        this.snake.move();

        // 移动AI蛇
        this.aiSnakes.forEach(aiSnake => {
            if (!aiSnake.isDead) {
                aiSnake.decideNextMove(this.food, this.snake, this.aiSnakes);
                aiSnake.move();
            }
        });

        // 检查玩家是否吃到食物
        const head = this.snake.segments[0];
        for (let i = 0; i < this.food.positions.length; i++) {
            const foodPos = this.food.positions[i];
            if (head.x === foodPos.x && head.y === foodPos.y) {
                playerAteFood = true;
                this.food.removeFood(i);
                this.score += 10;
                this.updateScore();
                break;
            }
        }

        // 检查AI蛇是否吃到食物
        this.aiSnakes.forEach(aiSnake => {
            if (!aiSnake.isDead) {
                const aiHead = aiSnake.segments[0];
                for (let i = 0; i < this.food.positions.length; i++) {
                    const foodPos = this.food.positions[i];
                    if (aiHead.x === foodPos.x && aiHead.y === foodPos.y) {
                        aiAteFoodMap.set(aiSnake, true);
                        this.food.removeFood(i);
                        break;
                    }
                }
            }
        });

        // 根据是否吃到食物决定是否缩短蛇身
        if (!playerAteFood) {
            this.snake.shrink();
        }

        this.aiSnakes.forEach(aiSnake => {
            if (!aiSnake.isDead && !aiAteFoodMap.get(aiSnake)) {
                aiSnake.shrink();
            }
        });

        // 检查玩家碰撞
        if (this.snake.checkCollision()) {
            this.gameOver();
            return;
        }

        // 检查玩家是否撞到AI蛇
        for (const aiSnake of this.aiSnakes) {
            if (!aiSnake.isDead && aiSnake.segments.some(segment => 
                head.x === segment.x && head.y === segment.y
            )) {
                this.gameOver();
                return;
            }
        }

        // 检查AI蛇是否撞到玩家或其他AI蛇
        this.aiSnakes.forEach((aiSnake, index) => {
            if (aiSnake.isDead) return;

            const aiHead = aiSnake.segments[0];

            // 检查是否撞墙或自身
            if (aiSnake.checkCollision()) {
                aiSnake.isDead = true;
                return;
            }

            // 检查是否撞到玩家
            if (this.snake.segments.some(segment => 
                aiHead.x === segment.x && aiHead.y === segment.y
            )) {
                aiSnake.isDead = true;
                this.score += 50; // 奖励分数
                this.updateScore();
                return;
            }

            // 检查是否撞到其他AI蛇
            this.aiSnakes.forEach((otherSnake, otherIndex) => {
                if (index !== otherIndex && !otherSnake.isDead && 
                    otherSnake.segments.some(segment => 
                        aiHead.x === segment.x && aiHead.y === segment.y
                    )) {
                    aiSnake.isDead = true;
                }
            });
        });

        // 检查是否达到胜利条件
        if (this.checkVictory()) {
            this.victory();
            return;
        }

        this.draw();
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制食物
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ff6b6b';
        this.ctx.fillStyle = '#ff0000';
        this.food.positions.forEach(position => {
            this.ctx.beginPath();
            this.ctx.arc(position.x + 5, position.y + 5, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 绘制玩家蛇
        this.drawSnake(this.snake, '#4CAF50', '#2E7D32');

        // 绘制AI蛇
        this.aiSnakes.forEach(aiSnake => {
            if (!aiSnake.isDead) {
                const colorEnd = this.adjustColor(aiSnake.color, -20);
                this.drawSnake(aiSnake, aiSnake.color, colorEnd);
            }
        });
    }

    drawSnake(snake, colorStart, colorEnd) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = colorStart;
        
        const gradient = this.ctx.createLinearGradient(
            snake.segments[0].x,
            snake.segments[0].y,
            snake.segments[snake.segments.length-1].x,
            snake.segments[snake.segments.length-1].y
        );
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        
        snake.segments.forEach((segment, index) => {
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(segment.x, segment.y, 10, 10, 3);
            this.ctx.fill();
            
            if (index === 0) {
                this.ctx.fillStyle = '#fff';
                switch(snake.direction) {
                    case 'right':
                        this.ctx.fillRect(segment.x + 7, segment.y + 2, 2, 2);
                        this.ctx.fillRect(segment.x + 7, segment.y + 6, 2, 2);
                        break;
                    case 'left':
                        this.ctx.fillRect(segment.x + 1, segment.y + 2, 2, 2);
                        this.ctx.fillRect(segment.x + 1, segment.y + 6, 2, 2);
                        break;
                    case 'up':
                        this.ctx.fillRect(segment.x + 2, segment.y + 2, 2, 2);
                        this.ctx.fillRect(segment.x + 6, segment.y + 2, 2, 2);
                        break;
                    case 'down':
                        this.ctx.fillRect(segment.x + 2, segment.y + 6, 2, 2);
                        this.ctx.fillRect(segment.x + 6, segment.y + 6, 2, 2);
                        break;
                }
            }
        });
    }

    adjustColor(hex, amount) {
        const color = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (color >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
        const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    gameOver() {
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        this.pauseButton.style.display = 'none';
        
        // 更新最终分数并显示弹窗
        const modal = document.getElementById('game-over-modal');
        const finalScore = document.getElementById('final-score');
        finalScore.textContent = this.score;
        modal.style.display = 'block';
        
        // 添加重新开始按钮事件监听
        const restartBtn = document.getElementById('restart-btn');
        const handleRestart = () => {
            modal.style.display = 'none';
            this.startGame();
            restartBtn.removeEventListener('click', handleRestart);
        };
        restartBtn.addEventListener('click', handleRestart);
    }

    updateScore() {
        this.scoreElement.textContent = `分数: ${this.score}`;
    }

    handleKeyPress(event) {
        const key = event.key;
        const direction = this.snake.direction;

        // 防止蛇反向移动
        switch (key) {
            case 'ArrowUp':
                if (direction !== 'down') this.snake.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (direction !== 'up') this.snake.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (direction !== 'right') this.snake.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (direction !== 'left') this.snake.nextDirection = 'right';
                break;
        }
    }

    handleMobileControl(direction) {
        const currentDirection = this.snake.direction;

        // 防止蛇反向移动
        switch (direction) {
            case 'up':
                if (currentDirection !== 'down') this.snake.nextDirection = 'up';
                break;
            case 'down':
                if (currentDirection !== 'up') this.snake.nextDirection = 'down';
                break;
            case 'left':
                if (currentDirection !== 'right') this.snake.nextDirection = 'left';
                break;
            case 'right':
                if (currentDirection !== 'left') this.snake.nextDirection = 'right';
                break;
        }
    }
}

// 启动游戏
window.onload = () => {
    new Game();
};