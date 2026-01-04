import { InputHandler } from './Input';
import type { PlayerRole } from '../entities/Player';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { WaveManager } from '../systems/WaveManager';
import { EntropySystem } from '../systems/EntropySystem';
import { ShopSystem } from '../systems/ShopSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { MenuSystem } from '../systems/MenuSystem';

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: InputHandler;
    lastTime: number = 0;

    // Entities
    player!: Player;
    enemies: Enemy[] = [];
    projectiles: Projectile[] = [];

    // Systems
    waveManager!: WaveManager;
    entropySystem!: EntropySystem;
    shopSystem!: ShopSystem;
    particleSystem!: ParticleSystem;
    menuSystem: MenuSystem;

    // Game State
    isPlaying: boolean = false;
    paused: boolean = false;
    isGameOver: boolean = false;

    // Constants
    fireRate: number = 0.15;
    fireTimer: number = 0;

    // Wave State
    waveCount: number = 1;
    waveTimer: number = 0;
    waveDuration: number = 20; // Faster waves

    // Score
    score: number = 0;

    timeScale: number = 1.0;
    shakeTimer: number = 0;
    shakeIntensity: number = 0;

    // High Scores
    highScore: number = 0;
    highWave: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.input = new InputHandler(this.canvas);

        this.highScore = parseInt(localStorage.getItem('antigravity_highscore') || '0');
        this.highWave = parseInt(localStorage.getItem('antigravity_highwave') || '0');

        this.setupFullscreen();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize core systems that don't depend on player
        this.menuSystem = new MenuSystem(this);
        this.menuSystem.showMainMenu();
    }

    private setupFullscreen() {
        const fsBtn = document.getElementById('fullscreen-btn');
        if (fsBtn) {
            fsBtn.onclick = () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => { });
                } else {
                    document.exitFullscreen();
                }
            };

            // Sync button text with ACTUAL document state
            const syncFS = () => {
                if (document.fullscreenElement) {
                    fsBtn.innerText = '[X] FULLSCREEN';
                } else {
                    fsBtn.innerText = '[ ] FULLSCREEN';
                }
            };
            document.addEventListener('fullscreenchange', syncFS);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        if (this.waveManager) {
            this.waveManager.screenWidth = this.canvas.width;
            this.waveManager.screenHeight = this.canvas.height;
        }
    }

    startGame(role: PlayerRole) {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.isGameOver = false;
        this.menuSystem.hideMenu();

        const mobileHUD = document.getElementById('mobile-controls');
        if (mobileHUD && this.input.isMobile) mobileHUD.style.display = 'block';

        this.enemies = [];
        this.projectiles = [];
        this.waveCount = 1;
        this.waveTimer = 0;
        this.score = 0;

        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, role);
        // Corrected math: Higher mult = smaller delay
        this.fireRate = 0.15 / this.player.fireRateMult;
        this.fireTimer = this.fireRate;

        this.waveManager = new WaveManager(this.player, this.canvas.width, this.canvas.height);
        this.entropySystem = new EntropySystem();
        this.shopSystem = new ShopSystem(this);
        this.particleSystem = new ParticleSystem();

        const btn = document.getElementById('arsenal-btn');
        if (btn) {
            btn.style.display = 'block';
            btn.onclick = () => {
                if (this.shopSystem.isShopOpen) {
                    this.shopSystem.closeShop();
                } else {
                    this.shopSystem.openArsenal();
                }
            };
        }

        // Only start loop if not already running
        if (this.lastTime === 0) {
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop.bind(this));
        }
    }

    // The start method is now redundant as the game loop is initiated in startGame
    // If there's other setup needed before the loop, it should be moved to startGame
    // or this method should be called from startGame.
    // For now, it's left empty as per the implied change.
    start() {
        // This method is now effectively empty or can be removed if its functionality
        // has been moved to startGame.
    }

    loop(timestamp: number) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (this.isPlaying) {
            if (this.isGameOver) {
                this.gameOverTimer -= dt;
                // Internal Restart (Preserves Fullscreen)
                if (this.gameOverTimer <= 0) {
                    if (this.input.isKeyPressed('Space')) {
                        this.startGame(this.player.role);
                    }
                    if (this.input.mouse.isDown) {
                        const mx = this.input.mouse.x;
                        const my = this.input.mouse.y;
                        const centerX = this.canvas.width / 2;
                        const centerY = this.canvas.height / 2;
                        // Main Menu Zone detection
                        if (mx > centerX - 150 && mx < centerX + 150 && my > centerY + 200 && my < centerY + 240) {
                            this.returnToMainMenu();
                        } else {
                            // Any other click/tap restarts (Desktop & Mobile)
                            this.startGame(this.player.role);
                        }
                    }
                }
            } else {
                // Time scaling for game logic
                // If paused, update() will handle the early return, but we passed dt normally
                // Actually, if paused, we want to freeze game time?
                // The update() method handles the 'if paused return' check now.
                // We just need to make sure we don't apply timeScale if it causes issues, 
                // but since we return early in update, it's fine.

                // However, we want 'dt' to be real time for input updates? 
                // Input update doesn't use DT.

                // Let's just pass raw DT to update, and apply timescale inside update for game logic.
                // Refactoring update to apply timescale internally would be big.
                // Easier: Just call update.

                const gameDt = dt * this.timeScale;
                this.update(dt, gameDt);
            }
        }
        this.draw();

        this.input.update();
        requestAnimationFrame(this.loop.bind(this));
    }

    update(_realDt: number, gameDt: number) {
        // Pause Toggle
        if (this.input.isKeyPressed('Escape')) {
            this.paused = !this.paused;
        }

        if (this.paused) {
            // Handle Resume/Menu clicks on Pause screen
            if (this.input.mouse.isDown) {
                const mx = this.input.mouse.x;
                const my = this.input.mouse.y;
                const xc = this.canvas.width / 2;
                const yc = this.canvas.height / 2;

                // Resume zone (rendered at yc + 110)
                if (mx > xc - 100 && mx < xc + 100 && my > yc + 90 && my < yc + 120) {
                    this.paused = false;
                }
                // Menu zone (rendered at yc + 140)
                if (mx > xc - 100 && mx < xc + 100 && my > yc + 120 && my < yc + 155) {
                    this.returnToMainMenu();
                }
            }
            return;
        }

        // Manual upgrade menu toggle
        if (this.input.isKeyPressed('KeyX') && !this.isGameOver) {
            if (this.shopSystem.isShopOpen) {
                this.shopSystem.closeShop();
            } else {
                this.shopSystem.openArsenal();
            }
        }

        const dt = gameDt; // Logical delta time (scaled)
        this.fireTimer += dt;

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        this.entropySystem.update(dt);

        // Ability Input Logic
        if (this.input.isKeyPressed('Space')) {
            if (this.player.role === 'GUNNER' && this.player.isAbilityActive) {
                this.executeDeadEye(); // Early execution
                return;
            } else if (this.player.tryUseAbility()) {
                this.activateAbility();
            }
        }

        // Gunner Dead Eye Input
        if (this.player.isAbilityActive && this.player.role === 'GUNNER') {
            this.timeScale = 0.1;
            this.player.activeTimer -= dt * 9.0; // Fast decay for real-time feel

            // Handle Target Selection
            if (this.input.mouse.isDown) {
                const mx = this.input.mouse.x;
                const my = this.input.mouse.y;

                for (const e of this.enemies) {
                    const dist = Math.hypot(e.x - mx, e.y - my);
                    if (dist < e.radius + 30) {
                        if (!this.player.markedTargets.includes(e) && this.player.markedTargets.length < this.player.maxTargets) {
                            this.player.markedTargets.push(e);
                        }
                        break;
                    }
                }
            }

            if (this.player.activeTimer <= 0) {
                this.executeDeadEye();
            }

        } else {
            this.timeScale = 1.0;
            // Standard Shooting (WHILE LOOP for consistency in frequency)
            const isEngaged = this.input.mouse.isDown || this.input.joystick.active || this.input.aimJoystick.active;
            const shouldFire = this.input.isMobile ? isEngaged : this.input.mouse.isDown;

            let shotsFiredThisFrame = 0;
            while (shouldFire && this.fireTimer >= this.fireRate && shotsFiredThisFrame < 3) {
                this.fireTimer -= this.fireRate;
                shotsFiredThisFrame++;

                let tx = this.input.mouse.x;
                let ty = this.input.mouse.y;

                if (this.input.isMobile) {
                    if (this.input.aimJoystick.active) {
                        tx = this.player.x + this.input.aimJoystick.x * 100;
                        ty = this.player.y + this.input.aimJoystick.y * 100;
                    } else if (!this.input.mouse.isDown && this.input.joystick.active) {
                        tx = this.player.x + this.input.joystick.x * 100;
                        ty = this.player.y + this.input.joystick.y * 100;
                    } else if (!this.input.mouse.isDown) {
                        // Default aim: right if no input
                        tx = this.player.x + 100;
                        ty = this.player.y;
                    }
                }

                if (this.player.powerUps.doubleFire.active) {
                    const b1 = new Projectile(this.player.x - 10, this.player.y, tx, ty);
                    const b2 = new Projectile(this.player.x + 10, this.player.y, tx, ty);
                    b1.damage *= this.player.damageMult;
                    b2.damage *= this.player.damageMult;
                    this.projectiles.push(b1, b2);
                } else {
                    const bullet = new Projectile(this.player.x, this.player.y, tx, ty);
                    bullet.damage *= this.player.damageMult;
                    this.projectiles.push(bullet);
                }
                this.triggerShake(0.1, 2);
            }
            // CRITICAL: Clamp timer instead of resetting to 0 to ensure the next press is INSTANT.
            if (this.fireTimer > this.fireRate) this.fireTimer = this.fireRate;
        }

        // Sword Damage Logic
        if (this.player.powerUps.sword.active) {
            const sx = this.player.x + Math.cos(this.player.swordAngle) * 60;
            const sy = this.player.y + Math.sin(this.player.swordAngle) * 60;
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - sx, e.y - sy);
                if (dist < e.radius + 20) {
                    e.hp -= 150 * dt; // High DPS close range
                    if (e.hp <= 0) this.handleEnemyDeath(e);
                }
            });
        }

        this.waveTimer += dt;
        if (this.waveTimer >= this.waveDuration) {
            this.waveTimer = 0;
            this.waveCount++;
            this.waveManager.wave = this.waveCount; // Sync wave count
            if (this.waveCount % 2 === 0) { // Every 2 waves, get FREE powerup
                this.shopSystem.openPowerUpChoice();
            }
        }

        const stats = this.entropySystem.getEnemyStatsMultiplier();
        this.waveManager.setDifficulty(stats.hp, stats.speed);

        let playerDt = dt;
        if (this.timeScale < 1.0) playerDt = dt / this.timeScale;
        this.player.update(playerDt, this.input);

        // Boundary Clamping
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));

        // Updates
        this.waveManager.update(dt, this.enemies);

        this.enemies.forEach(e => {
            const customTarget = (this.player.healingStation && this.player.healingStation.active)
                ? { x: this.player.healingStation.x, y: this.player.healingStation.y, radius: 30 }
                : undefined;

            e.update(dt, (x: number, y: number, tx: number, ty: number, isEnemy: boolean) => {
                const proj = new Projectile(x, y, tx, ty, isEnemy);
                this.projectiles.push(proj);
            }, customTarget);
        });

        this.projectiles.forEach(p => p.update(dt));
        this.particleSystem.update(dt);

        this.checkCollisions(dt);

        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        // Cleanup marked targets if dead
        if (this.player.role === 'GUNNER') {
            this.player.markedTargets = this.player.markedTargets.filter(e => !e.markedForDeletion);
        }
    }

    executeDeadEye() {
        this.player.isAbilityActive = false;
        this.player.activeTimer = 0;
        this.timeScale = 1.0;

        // INSTANT HITSCAN
        this.player.markedTargets.forEach((entity) => {
            const e = entity as Enemy;
            if (e.markedForDeletion) return;

            this.particleSystem.spawnExplosion(e.x, e.y, '#ffffff', 20);

            // Apply Instant Damage
            const damage = 1000 * this.player.damageMult;
            e.hp -= damage;
            this.particleSystem.spawnDamageNumber(e.x, e.y, damage, '#ffffff');

            if (e.hp <= 0) {
                this.handleEnemyDeath(e);
            }
        });

        this.player.markedTargets = [];
    }

    triggerShake(duration: number, intensity: number) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    activateAbility() {
        switch (this.player.role) {
            case 'GUNNER':
                this.player.activeTimer = 3.0; // Max time to targets
                this.player.markedTargets = [];
                // Slow mo handled in update
                break;
            case 'GIANT':
                this.player.activeTimer = 5.0; // 5s Invulnerability
                this.player.isInvincible = true;
                // Splash Damage around Giant + Heavy Knockback
                this.triggerSplashDamage(this.player.x, this.player.y, 250, 150, 120);
                this.triggerShake(0.8, 25);
                break;
            case 'HEALER':
                // Deploy Healing Station at current spot
                this.player.healingStation = {
                    active: true,
                    x: this.player.x,
                    y: this.player.y,
                    radius: 150,
                    timer: 15.0, // Lasts 15 seconds
                    hp: 150,     // Has 150 HP
                    maxHp: 150
                };
                // Removing instant shield/HP bonus - focus on regen and decoy
                this.player.isAbilityActive = false; // Instant cast
                break;
        }
    }

    handleEnemyDeath(e: Enemy) {
        e.markedForDeletion = true;

        // Visuals
        this.particleSystem.spawnExplosion(e.x, e.y, '#ffffff', e.type === 'BOSS' ? 50 : 15);
        this.triggerShake(e.type === 'BOSS' ? 0.5 : 0.1, e.type === 'BOSS' ? 20 : 3);

        // Scoring
        switch (e.type) {
            case 'BASIC': this.score += 10; break;
            case 'RUNNER': this.score += 20; break;
            case 'SHOOTER': this.score += 35; break;
            case 'TANK': this.score += 75; break;
            case 'BOSS': this.score += 1000; break;
            default: this.score += 10;
        }

        // Rewards
        if (e.type === 'BOSS') {
            this.shopSystem.shards += 50;
            this.player.hp = this.player.maxHp; // Full Heal
            this.shopSystem.openArsenal(); // Extra Upgrade
        } else {
            this.shopSystem.shards += 2; // Increased from 1
            // Lifesteal chance
            if ((this.player as any).lifesteal) {
                this.player.hp = Math.min(this.player.hp + (this.player as any).lifesteal, this.player.maxHp);
            }
        }
    }

    checkCollisions(dt: number) {
        for (const p of this.projectiles) {
            if (p.markedForDeletion) continue;

            if (p.isEnemy) {
                const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
                if (dist < p.radius + this.player.radius) {
                    if (!this.player.isInvincible) {
                        this.player.hp -= 10;
                        this.triggerShake(0.2, 5);
                        if (this.player.hp <= 0) this.gameOver();
                    }
                    p.markedForDeletion = true;
                }
            } else {
                for (const e of this.enemies) {
                    // Skip if bullet is gone, enemy is already dead, or we already hit this guy
                    if (p.markedForDeletion || e.markedForDeletion || p.hitEnemies.has(e)) continue;

                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < p.radius + e.radius) {
                        // Apply damage based on current penetration multiplier
                        const finalDmg = p.damage * p.currentPenetration;
                        e.hp -= finalDmg;
                        p.hitEnemies.add(e);

                        // Visuals for hit
                        if (p.hitEnemies.size > 1) {
                            // Penetration Hit feedback (Cyan sparks + Cyan damage number)
                            this.particleSystem.spawnExplosion(e.x, e.y, '#00ffff', 15);
                            this.particleSystem.spawnDamageNumber(e.x, e.y, finalDmg, '#00ffff');
                            this.triggerShake(0.05, 1);
                        } else {
                            this.particleSystem.spawnExplosion(e.x, e.y, e.color, 5);
                            this.particleSystem.spawnDamageNumber(e.x, e.y, finalDmg, '#ffffff');
                        }

                        if (e.hp <= 0) {
                            this.handleEnemyDeath(e);
                        }

                        // Determine if we should keep going or stop
                        if (this.player.role === 'GIANT') {
                            // Giant bullets only splash to NEARBY enemies (not primary target)
                            this.triggerSplashDamage(p.x, p.y, 60, p.damage * 0.5, 20, e);
                            p.markedForDeletion = true;
                            break;
                        }

                        if (this.player.penetration > 0 && p.hitEnemies.size < 2) {
                            p.currentPenetration = this.player.penetration;
                        } else {
                            p.markedForDeletion = true;
                            break;
                        }
                    }
                }
            }
        }

        // Healing Station / Giant Invincibility Logic
        if (this.player.healingStation && this.player.healingStation.active) {
            const s = this.player.healingStation;
            s.timer -= dt;

            // Health Regen for Player
            const dist = Math.hypot(this.player.x - s.x, this.player.y - s.y);
            if (dist < s.radius) {
                this.player.hp = Math.min(this.player.hp + 20 * dt, this.player.maxHp);
            }

            // Station Destruction
            if (s.timer <= 0 || s.hp <= 0) {
                s.active = false;
                this.particleSystem.spawnExplosion(s.x, s.y, '#00ffaa', 30);
            }
        }

        for (const e of this.enemies) {
            const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            const distToStation = (this.player.healingStation && this.player.healingStation.active)
                ? Math.hypot(e.x - this.player.healingStation.x, e.y - this.player.healingStation.y)
                : Infinity;

            // Enemy Collision with Player
            if (distToPlayer < e.radius + this.player.radius) {
                const isInvincible = this.player.isInvincible || this.player.powerUps.shield.active;
                if (!isInvincible) {
                    this.player.hp -= 0.5;
                    if (this.player.hp <= 0) this.gameOver();
                }
            }

            // Enemy Collision with Healing Station
            if (this.player.healingStation && this.player.healingStation.active) {
                if (distToStation < e.radius + 30) {
                    this.player.healingStation.hp -= 50 * dt; // Rapid damage from enemies
                }
            }
        }
    }

    triggerSplashDamage(x: number, y: number, radius: number, damage: number, knockbackForce: number = 0, excludeEnemy?: Enemy) {
        this.particleSystem.spawnExplosion(x, y, '#ffaa00', 30);
        this.enemies.forEach(e => {
            if (e === excludeEnemy) return; // Don't combine damage on primary target

            const dx = e.x - x;
            const dy = e.y - y;
            const dist = Math.hypot(dx, dy);

            if (dist < radius + e.radius) {
                e.hp -= damage;

                // Knockback
                if (knockbackForce > 0 && dist > 0) {
                    const ratio = knockbackForce * (1 - dist / (radius + e.radius));
                    e.x += (dx / dist) * ratio;
                    e.y += (dy / dist) * ratio;
                }

                this.particleSystem.spawnDamageNumber(e.x, e.y, damage, '#ffaa00');
                if (e.hp <= 0) this.handleEnemyDeath(e);
            }
        });
    }

    gameOver() {
        this.isGameOver = true;
        this.gameOverTimer = 1.0;

        const btn = document.getElementById('arsenal-btn');
        if (btn) btn.style.display = 'none';

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('antigravity_highscore', this.highScore.toString());
        }
        if (this.waveCount > this.highWave) {
            this.highWave = this.waveCount;
            localStorage.setItem('antigravity_highwave', this.highWave.toString());
        }
    }

    returnToMainMenu() {
        this.isPlaying = false;
        this.isGameOver = false;
        this.paused = false;
        this.menuSystem.showMainMenu();
        const btn = document.getElementById('arsenal-btn');
        if (btn) btn.style.display = 'none';
        const mobileHUD = document.getElementById('mobile-controls');
        if (mobileHUD) mobileHUD.style.display = 'none';
    }

    gameOverTimer: number = 0;

    draw() {
        this.ctx.save();
        this.ctx.textAlign = 'left'; // Reset defaults just in case

        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();

        if (this.isPlaying) {
            this.particleSystem.draw(this.ctx);
            this.player.draw(this.ctx);

            // HEALER Station visuals
            if (this.player.healingStation && this.player.healingStation.active) {
                const s = this.player.healingStation;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#00ffaa33';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();

                // Cross icon in center
                this.ctx.fillStyle = '#00ffaa88';
                this.ctx.fillRect(s.x - 5, s.y - 15, 10, 30);
                this.ctx.fillRect(s.x - 15, s.y - 5, 30, 10);

                // HEALTH BAR (Station)
                const barW = 60;
                const barH = 5;
                const bx = s.x - barW / 2;
                const by = s.y + 25;
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(bx, by, barW, barH);
                this.ctx.fillStyle = '#00ffaa';
                this.ctx.fillRect(bx, by, barW * (s.hp / s.maxHp), barH);

                // TIMER BAR (Station)
                const tx = s.x - barW / 2;
                const ty = s.y + 35;
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(tx, ty, barW, barH - 2);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(tx, ty, barW * (s.timer / 15.0), barH - 2);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(`${Math.ceil(s.timer)}s`, tx + barW + 5, ty + 5);
            }

            // GIANT Ability visuals
            if (this.player.role === 'GIANT' && this.player.isAbilityActive) {
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, 200, 0, Math.PI * 2);
                this.ctx.setLineDash([5, 10]);
                this.ctx.strokeStyle = '#ff4400cc';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }

            this.enemies.forEach(e => e.draw(this.ctx));
            this.projectiles.forEach(p => p.draw(this.ctx));

            // Draw Targeting Reticles for Gunner
            if (this.player.role === 'GUNNER' && this.player.isAbilityActive) {
                this.enemies.forEach(e => {
                    if (this.player.markedTargets.includes(e)) {
                        this.ctx.strokeStyle = '#ff0000';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
                        this.ctx.stroke();
                        // Crosshair
                        this.ctx.moveTo(e.x - 15, e.y); this.ctx.lineTo(e.x + 15, e.y);
                        this.ctx.moveTo(e.x, e.y - 15); this.ctx.lineTo(e.x, e.y + 15);
                        this.ctx.stroke();
                    }
                });
                // Overlay Vignette
                const grad = this.ctx.createRadialGradient(
                    this.canvas.width / 2, this.canvas.height / 2, 100,
                    this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
                );
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,0,0.5)');
                this.ctx.fillStyle = grad;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '30px monospace';
                this.ctx.fillText(`TARGETS: ${this.player.markedTargets.length}/${this.player.maxTargets} - PRESS [SPACE] TO FIRE`, this.canvas.width / 2 - 200, 100);

                // Timer Bar
                const maxTime = 3.0; // Synced with activateAbility
                const timeRatio = Math.max(0, this.player.activeTimer / maxTime);
                const barW = 400;
                const barH = 10;
                const barX = (this.canvas.width - barW) / 2;
                const barY = 120;

                this.ctx.fillStyle = '#550000';
                this.ctx.fillRect(barX, barY, barW, barH);
                this.ctx.fillStyle = '#00ffff'; // Cyan for Gunner theme
                this.ctx.fillRect(barX, barY, barW * timeRatio, barH);
            }

            this.ctx.restore();

            // Boss HP Bar
            const boss = this.enemies.find(e => e.type === 'BOSS') as Enemy;
            if (boss) {
                const hpPercent = Math.min(1, Math.max(0, boss.hp / boss.maxHp));
                const barWidth = 600;
                const barHeight = 20;
                const x = (this.canvas.width - barWidth) / 2;
                const y = 80;

                this.ctx.fillStyle = '#440000';
                this.ctx.fillRect(x, y, barWidth, barHeight);
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, barWidth, barHeight);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '16px monospace';
                this.ctx.fillText("BOSS ENTITY", x + barWidth / 2 - 50, y - 5);
            }

            this.drawHUD();
        } else {
            this.ctx.restore();
        }

        // REFINED GAME OVER SCREEN
        if (this.isGameOver) {
            // Toned down background - Dark Blue/Black Gradient
            const grad = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 100,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
            );
            grad.addColorStop(0, 'rgba(10, 10, 20, 0.85)');
            grad.addColorStop(1, 'rgba(0, 0, 5, 0.98)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.save();
            this.ctx.shadowColor = '#00ffff'; // Cyan glow instead of aggressive red
            this.ctx.shadowBlur = 30;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 80px "Courier New", monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("Mission Failed", this.canvas.width / 2, this.canvas.height / 2 - 100);
            this.ctx.restore();

            this.ctx.textAlign = 'center';

            // Current Run Stats
            this.ctx.fillStyle = '#ffaa00'; // Gold
            this.ctx.font = 'bold 30px monospace';
            this.ctx.fillText(`Waves Survived: ${this.waveCount}`, this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

            // High Scores
            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '20px monospace';
            this.ctx.fillText(`Best Waves: ${this.highWave}  |  Best Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 60);

            // Shards Tip
            this.ctx.fillStyle = '#00A8FF'; // Explanatory Blue
            this.ctx.font = 'italic 18px monospace';
            this.ctx.fillText("Pro Tip: Collect Shards to buy upgrades in the Arsenal Shop (every 2 waves).", this.canvas.width / 2, this.canvas.height / 2 + 100);

            if (this.gameOverTimer <= 0) {
                const alpha = (Math.sin(performance.now() / 200) + 1) / 2 * 0.5 + 0.5;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                this.ctx.font = '24px monospace';
                const restartMsg = this.input.isMobile ? "TAP TO RESTART" : "PRESS [SPACE] TO RESTART";
                this.ctx.fillText(restartMsg, this.canvas.width / 2, this.canvas.height / 2 + 160);

                // Main Menu Option
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.font = '18px monospace';
                this.ctx.fillText("TAP/CLICK HERE FOR MAIN MENU", this.canvas.width / 2, this.canvas.height / 2 + 220);
            }
            this.ctx.textAlign = 'left';
        }

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.input.mouse.x, this.input.mouse.y, 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // VIBRANT PAUSE SCREEN
        if (this.paused && !this.shopSystem.isShopOpen) {
            this.ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < this.canvas.height; i += 4) {
                this.ctx.fillRect(0, i, this.canvas.width, 1);
            }

            this.ctx.save();
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 30;
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = 'bold 60px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.restore();

            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '20px monospace';
            this.ctx.textAlign = 'center';
            const resumeMsg = this.input.isMobile ? "Tap to Resume" : "Press [ESC] to Resume";
            this.ctx.fillText(resumeMsg, this.canvas.width / 2, this.canvas.height / 2 + 30);

            // Stats
            this.ctx.font = '18px monospace';
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillText(`Wave: ${this.waveCount} | Score: ${this.score} | HP: ${Math.floor(this.player.hp)}/${this.player.maxHp}`, this.canvas.width / 2, this.canvas.height / 2 + 70);

            // Clickable Canvas Options
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText("> RESUME", this.canvas.width / 2, this.canvas.height / 2 + 110);
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText("> MAIN MENU", this.canvas.width / 2, this.canvas.height / 2 + 140);

            this.ctx.textAlign = 'left';
        }

        if (this.isPlaying && !this.isGameOver && !this.paused) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px monospace';
            const cd = Math.ceil(this.player.abilityTimer);
            const readyTag = this.input.isMobile ? "TAP" : "[SPACE]";
            const ready = cd <= 0 ? `READY ${readyTag}` : `CD: ${cd}s`;
            this.ctx.fillText(`Ability: ${ready}`, this.canvas.width - 200, this.canvas.height - 50);
        }
    }

    drawHUD() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`Wave: ${this.waveCount}`, 20, 30);
        this.ctx.fillText(`Score: ${this.score}`, 20, 60);
        this.ctx.fillText(`Shards: ${this.shopSystem.shards}`, 20, 90);
        this.ctx.fillText(`Class: ${this.player.role}`, 20, 120);
        this.ctx.fillText(`HP: ${Math.floor(this.player.hp)}/${this.player.maxHp}`, 20, 150);
        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText(`[X] ARSENAL`, 20, 180);

        this.drawPowerUpStatus();
    }

    drawPowerUpStatus() {
        const activePUs = [
            { id: 'shield', name: 'SHIELD', color: '#00ffff', icon: '⬢' },
            { id: 'doubleFire', name: 'DOUBLE', color: '#ffcc00', icon: '⚔' },
            { id: 'sword', name: 'BLADE', color: '#ff00ff', icon: '⚡' },
            { id: 'glassCannon', name: 'OVERCLOCK', color: '#ff4400', icon: '☠' }
        ].filter(pu => (this.player.powerUps as any)[pu.id].active);

        if (activePUs.length === 0) return;

        const startX = this.canvas.width / 2 - (activePUs.length * 60) / 2;
        const y = this.canvas.height - 80;

        activePUs.forEach((pu, i) => {
            const timer = (this.player.powerUps as any)[pu.id].timer;
            const x = startX + i * 70;

            // Icon background
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = pu.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Icon text
            this.ctx.fillStyle = pu.color;
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(pu.icon, x, y + 8);

            // Timer
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`${timer.toFixed(1)}s`, x, y + 45);
        });
        this.ctx.textAlign = 'left';
    }

    drawGrid() {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}
