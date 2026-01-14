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
import { NetworkSystem } from '../systems/NetworkSystem';

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
    networkSystem: NetworkSystem;
    remotePlayers: Map<string, Player> = new Map();
    isMultiplayer: boolean = false;

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
    gameOverTimer: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        console.log('[GAME] Constructor called with canvas:', canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        console.log('[GAME] Canvas context:', this.ctx);
        this.input = new InputHandler(this.canvas);

        this.highScore = parseInt(localStorage.getItem('antigravity_highscore') || '0');
        this.highWave = parseInt(localStorage.getItem('antigravity_highwave') || '0');

        console.log('[GAME] Setting up fullscreen...');
        this.setupFullscreen();
        console.log('[GAME] Resizing...');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize core systems
        console.log('[GAME] Initializing network system...');
        this.networkSystem = new NetworkSystem();
        console.log('[GAME] Initializing menu system...');
        this.menuSystem = new MenuSystem(this);

        // Multiplayer Listeners
        window.addEventListener('networkStartMission', (e: any) => {
            this.isMultiplayer = true;
            this.startGame(e.detail.role);
        });

        window.addEventListener('networkWorldSync', (e: any) => {
            if (!this.networkSystem.isHost) {
                this.waveCount = e.detail.wave;
                this.shopSystem.shards = e.detail.shards;

                // Sync Enemies
                const serverEnemies = e.detail.enemies || [];
                const serverEnemyIds = new Set(serverEnemies.map((e: any) => e.id));

                serverEnemies.forEach((sEnemy: any) => {
                    let localEnemy = this.enemies.find(e => e.id === sEnemy.id);
                    if (!localEnemy) {
                        // Create new enemy
                        localEnemy = new Enemy(sEnemy.x, sEnemy.y, this.player, sEnemy.type, sEnemy.id);
                        this.enemies.push(localEnemy);
                    }
                    // Update state
                    localEnemy.x = sEnemy.x;
                    localEnemy.y = sEnemy.y;
                    localEnemy.hp = sEnemy.hp;
                    localEnemy.maxHp = sEnemy.maxHp || localEnemy.maxHp;
                    // Reset stale flag if we were tracking that
                });

                // Remove enemies not in server list (died)
                this.enemies = this.enemies.filter(e => serverEnemyIds.has(e.id));
            }
        });

        window.addEventListener('networkFireBullet', (e: any) => {
            // Spawn visual projectile
            const { x, y, tx, ty, damageMult, role, penetration } = e.detail;
            const bullet = new Projectile(x, y, tx, ty, false, role || 'GUNNER', penetration || 0);
            bullet.damage *= (damageMult || 1);
            this.projectiles.push(bullet);
        });

        window.addEventListener('networkRevivePlayer', (e: any) => {
            const { targetId } = e.detail;
            if (targetId === this.networkSystem.myId) {
                console.log('[GAME] Revived!');
                this.player.isDead = false;
                this.player.hp = this.player.maxHp;
                this.player.isInvincible = true;
                setTimeout(() => { if (!this.player.powerUps.shield.active) this.player.isInvincible = false; }, 3000);
                this.particleSystem.spawnExplosion(this.player.x, this.player.y, '#00ff00', 50);
            } else {
                const remote = this.remotePlayers.get(targetId);
                if (remote) {
                    remote.isDead = false;
                    remote.hp = remote.maxHp;
                    this.particleSystem.spawnExplosion(remote.x, remote.y, '#00ff00', 30);
                }
            }
        });

        window.addEventListener('networkMissionFailed', () => {
            console.log('[GAME] Mission Failed event received');
            this.gameOver();
        });

        window.addEventListener('networkRestartMission', () => {
            console.log('[GAME] Restart Mission event received');
            this.startGame(this.player.role);
        });

        window.addEventListener('networkPowerUpPause', (e: any) => {
            console.log('[GAME] Powerup Pause event received');
            this.paused = true;
            setTimeout(() => {
                if (this.isPlaying && !this.isGameOver) {
                    this.paused = false;
                }
            }, (e.detail.duration || 4) * 1000);
        });

        window.addEventListener('networkTriggerPowerup', () => {
            console.log('[GAME] Trigger Powerup event received');
            this.shopSystem.openPowerUpChoice();
        });

        console.log('[GAME] Constructor complete');
    }

    start() {
        console.log('[GAME] start() called');
        // Start the game loop and show main menu
        if (this.lastTime === 0) {
            this.lastTime = performance.now();
            console.log('[GAME] Starting game loop with timestamp:', this.lastTime);
            requestAnimationFrame(this.loop.bind(this));
        }
        console.log('[GAME] Showing main menu...');
        this.menuSystem.showMainMenu();
        console.log('[GAME] Main menu shown');
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
        if (this.isPlaying && !this.isGameOver) return;

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
        if (this.isMultiplayer) {
            this.waveManager.playerCount = this.networkSystem.connections.length + 1;
        }
        this.entropySystem = new EntropySystem();
        this.shopSystem = new ShopSystem(this);
        this.particleSystem = new ParticleSystem();

        // Save game reference on canvas for entities to check context
        (this.canvas as any)._gameRef = this;

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

    loop(timestamp: number) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap DT to prevent huge jumps
        if (dt > 0.1) dt = 0.1;

        if (this.isPlaying) {
            if (this.isGameOver) {
                this.gameOverTimer -= dt;
                if (this.gameOverTimer <= 0) {
                    if (this.input.isKeyPressed('Space')) {
                        if (this.isMultiplayer) {
                            this.networkSystem.broadcast('RESTART_MISSION', {});
                        }
                        this.startGame(this.player.role);
                    }
                    if (this.input.mouse.isDown) {
                        const mx = this.input.mouse.x;
                        const my = this.input.mouse.y;
                        const xc = this.canvas.width / 2;
                        const yc = this.canvas.height / 2;
                        // Restart Click
                        if (mx > xc - 150 && mx < xc + 150 && my > yc + 80 && my < yc + 120) {
                            if (this.isMultiplayer) this.networkSystem.broadcast('RESTART_MISSION', {});
                            this.startGame(this.player.role);
                        }
                        // Main Menu Click
                        if (mx > xc - 100 && mx < xc + 100 && my > yc + 130 && my < yc + 175) {
                            this.returnToMainMenu();
                        }
                    }
                }
            } else {
                this.update(dt, dt * this.timeScale);
            }
        }

        this.draw();
        this.input.update();
        requestAnimationFrame(this.loop.bind(this));
    }

    update(_realDt: number, gameDt: number) {
        if (!this.player || !this.isPlaying) return;
        const dt = gameDt;

        // Manual Pause Restriction
        if (this.input.isKeyPressed('Escape') && !this.isMultiplayer) {
            this.paused = !this.paused;
        }

        if (this.paused) {
            // ... menu clicks ...
            if (this.input.mouse.isDown) {
                const mx = this.input.mouse.x;
                const my = this.input.mouse.y;
                const xc = this.canvas.width / 2;
                const yc = this.canvas.height / 2;

                // Resume Click
                if (mx > xc - 100 && mx < xc + 100 && my > yc + 70 && my < yc + 105) {
                    this.paused = false;
                }
                // Main Menu Click
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

        this.fireTimer += dt;

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        }

        this.entropySystem.update(dt);

        // Ability Input Logic
        if (this.input.isKeyPressed('Space') && !this.player.isDead) {
            if (this.player.role === 'GUNNER' && this.player.isAbilityActive) {
                this.executeDeadEye(); // Early execution
                return;
            } else if (this.player.tryUseAbility()) {
                this.activateAbility();
            }
        }

        // Gunner Dead Eye Input
        if (this.player.isAbilityActive && this.player.role === 'GUNNER' && !this.player.isDead) {
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
            const isEngaged = (this.input.mouse.isDown || this.input.joystick.active || this.input.aimJoystick.active) && !this.player.isDead;
            const shouldFire = this.input.isMobile ? isEngaged : (this.input.mouse.isDown && !this.player.isDead);

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
                    const b1 = new Projectile(this.player.x - 10, this.player.y, tx, ty, false, this.player.role, this.player.penetration);
                    const b2 = new Projectile(this.player.x + 10, this.player.y, tx, ty, false, this.player.role, this.player.penetration);
                    b1.damage *= this.player.damageMult;
                    b2.damage *= this.player.damageMult;
                    this.projectiles.push(b1, b2);

                    if (this.isMultiplayer) {
                        const payload1 = { x: this.player.x - 10, y: this.player.y, tx, ty, damageMult: this.player.damageMult, role: this.player.role, penetration: this.player.penetration };
                        const payload2 = { x: this.player.x + 10, y: this.player.y, tx, ty, damageMult: this.player.damageMult, role: this.player.role, penetration: this.player.penetration };

                        if (this.networkSystem.isHost) {
                            this.networkSystem.broadcast('FIRE_BULLET', payload1);
                            this.networkSystem.broadcast('FIRE_BULLET', payload2);
                        } else {
                            this.networkSystem.sendToHost('FIRE_BULLET', payload1);
                            this.networkSystem.sendToHost('FIRE_BULLET', payload2);
                        }
                    }

                } else {
                    const bullet = new Projectile(this.player.x, this.player.y, tx, ty, false, this.player.role, this.player.penetration);
                    bullet.damage *= this.player.damageMult;
                    this.projectiles.push(bullet);

                    if (this.isMultiplayer) {
                        const payload = { x: this.player.x, y: this.player.y, tx, ty, damageMult: this.player.damageMult, role: this.player.role, penetration: this.player.penetration };
                        if (this.networkSystem.isHost) {
                            this.networkSystem.broadcast('FIRE_BULLET', payload);
                        } else {
                            this.networkSystem.sendToHost('FIRE_BULLET', payload);
                        }
                    }
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

        // Wave Logic: Host Authority in Multiplayer
        const isAuthoritative = !this.isMultiplayer || this.networkSystem.isHost;

        if (isAuthoritative) {
            this.waveTimer += dt;
            if (this.waveTimer >= this.waveDuration) {
                this.waveTimer = 0;
                this.waveCount++;
                this.waveManager.wave = this.waveCount; // Sync wave count

                if (this.waveCount % 2 === 0) { // Every 2 waves, get FREE powerup
                    if (this.isMultiplayer) {
                        this.networkSystem.broadcast('TRIGGER_POWERUP', {});
                    }
                    this.shopSystem.openPowerUpChoice();
                }
            }
            this.waveManager.update(dt, this.enemies);
        }

        const stats = this.entropySystem.getEnemyStatsMultiplier();
        this.waveManager.setDifficulty(stats.hp);

        let playerDt = dt;
        if (this.timeScale < 1.0) playerDt = dt / this.timeScale;
        this.player.update(playerDt, this.input);

        // Boundary Clamping
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));

        const allTargets: any[] = [];
        const activeStations: any[] = [];

        // Collect stations first for priority
        if (this.player.healingStation?.active) {
            activeStations.push({ x: this.player.healingStation.x, y: this.player.healingStation.y, radius: 30, hp: this.player.healingStation.hp, isStation: true, parent: this.player });
        }
        this.remotePlayers.forEach(p => {
            if (p.healingStation?.active) {
                activeStations.push({ x: p.healingStation.x, y: p.healingStation.y, radius: 30, hp: p.healingStation.hp, isStation: true, parent: p });
            }
        });

        if (activeStations.length > 0) {
            // ENEMY PRIORITY: ONLY stations if any are active
            activeStations.forEach(s => allTargets.push(s));
        } else {
            // Standard targeting: all alive players
            if (!this.player.isDead) allTargets.push(this.player);
            this.remotePlayers.forEach(p => {
                if (!p.isDead) allTargets.push(p);
            });
        }

        this.enemies.forEach(e => {
            e.update(dt, (x: number, y: number, tx: number, ty: number, isEnemy: boolean) => {
                // Only Host or Singleplayer spawns enemy projectiles that deal damage
                // But we want clients to see them too. 
                // Using FIRE_BULLET for enemy shots might be too much traffic.
                // Better: Clients run enemy logic too? 
                // No, if we sync Enemy Position, we don't need to run movement logic?
                // If we sync Pos, we override local logic.
                // So Client just interpolates?
                // For this demo, let's keep running local logic but override with sync.
                // For Enemy Shooting: If Host runs logic, Host adds projectile. 
                // Host Syncs projectiles?
                // Current sync doesn't sync All Projectiles (too many).
                // So Clients MUST run Enemy Shooting logic locally or receive events.
                // Let's have Clients spawn projectiles locally based on Enemy update, 
                // but since enemies are synced, they might all shoot at once.

                // DECISION: Host Only spawns enemy bullets, and we need to sync them?
                // Or just let everyone spawn them. If everyone spawns them, we get duplicates if we also sync?
                // We are NOT syncing enemy projectiles currently.
                // So everyone runs `enemy.update` and spawns bullets.
                // This is fine as long as `shootTimer` is somewhat consistent.
                const proj = new Projectile(x, y, tx, ty, isEnemy);
                this.projectiles.push(proj);
            }, undefined, allTargets);
        });

        this.projectiles.forEach(p => p.update(dt));
        this.particleSystem.update(dt);

        this.checkCollisions(dt);

        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        if (this.player.role === 'GUNNER' && this.player.markedTargets) {
            this.player.markedTargets = this.player.markedTargets.filter(e => e && !e.markedForDeletion);
        }

        // Multiplayer State Sync
        if (this.isMultiplayer) {
            // Send our state including firing info
            this.networkSystem.broadcast('PLAYER_SYNC', {
                id: this.networkSystem.myId,
                role: this.player.role,
                x: this.player.x,
                y: this.player.y,
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                isDead: this.player.isDead,
                score: this.score,
                isFiring: this.input.mouse.isDown,
                aimX: this.input.mouse.x,
                aimY: this.input.mouse.y,
                healingStation: this.player.role === 'HEALER' ? this.player.healingStation : null
            });

            // Update remote players
            this.networkSystem.remotePlayers.forEach((state, id) => {
                let remotePlayer = this.remotePlayers.get(id);
                if (!remotePlayer) {
                    remotePlayer = new Player(state.x, state.y, state.role);
                    this.remotePlayers.set(id, remotePlayer);
                }
                remotePlayer.x = state.x;
                remotePlayer.y = state.y;
                remotePlayer.hp = state.hp;
                remotePlayer.maxHp = state.maxHp;
                remotePlayer.isDead = state.isDead;
                if (state.healingStation !== undefined) {
                    remotePlayer.healingStation = state.healingStation as any;
                }
            });

            this.checkAllPlayersDead();

            // If host, send world state
            if (this.networkSystem.isHost) {
                this.networkSystem.broadcast('WORLD_SYNC', {
                    wave: this.waveCount,
                    shards: this.shopSystem.shards,
                    enemies: this.enemies.map(e => ({
                        id: e.id,
                        type: e.type,
                        x: e.x,
                        y: e.y,
                        hp: e.hp,
                        maxHp: e.maxHp
                    }))
                });
            }
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

            // In MP, Client cannot deal damage directly if Host is auth.
            // But DeadEye is a special ability. 
            // We should fire a special event or just apply damage if we trust clients.
            // For simplicity, allow Client to Apply Damage -> Syncs next frame?
            // No, if Client reduces HP, next frame Host overrides it back up.
            // Client MUST send "DAMAGE_EVENT" or similar?
            // Or just "FIRE_BULLET" that hits instantly?
            // Let's make DeadEye send a bullet with infinite speed or handled separately.
            // For now, let's keep visual feedback. Damage only sticks if Host does it.
            // But Host doesn't know Client marked targets.
            // Complex. For now, let it be Visual + Client Local Damage (reverted by sync)
            // Ideally: Send 'USE_ABILITY' event to Host.

            this.particleSystem.spawnExplosion(e.x, e.y, '#ffffff', 20);

            // Apply Instant Damage
            const damage = 1000 * this.player.damageMult;

            if (!this.isMultiplayer || this.networkSystem.isHost) {
                e.hp -= damage;
                if (e.hp <= 0) {
                    this.handleEnemyDeath(e);
                }
            } else {
                // Client Side prediction (shows damage number)
                // But HP will reset unless we tell host.
                // TODO: Send 'HIT_ENEMY' event
            }
            this.particleSystem.spawnDamageNumber(e.x, e.y, damage, '#ffffff');
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
                    timer: 20.0, // Increased to 20 seconds
                    hp: 1000,    // Buffed to 1000 HP
                    maxHp: 1000
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
                    if (!this.player.isInvincible && !this.player.isDead) { // Added !isDead
                        this.player.hp -= 10;
                        this.triggerShake(0.2, 5);
                        if (this.player.hp <= 0) {
                            if (this.isMultiplayer) {
                                this.player.hp = 0;
                                this.player.isDead = true;
                                this.checkAllPlayersDead();
                            } else {
                                this.gameOver();
                            }
                        }
                    }
                    p.markedForDeletion = true;
                }
            } else {
                for (const e of this.enemies) {
                    // Skip if bullet is gone, enemy is already dead, or we already hit this guy
                    if (p.markedForDeletion || e.markedForDeletion || p.hitEnemies.has(e)) continue;

                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < p.radius + e.radius) {
                        // Collision Detected

                        // DAMAGE LOGIC: Host Authority
                        if (!this.isMultiplayer || this.networkSystem.isHost) {
                            const finalDmg = p.damage * p.currentPenetration;
                            e.hp -= finalDmg;
                            if (e.hp <= 0) {
                                this.handleEnemyDeath(e);
                            }
                        }

                        p.hitEnemies.add(e);

                        // Visuals (Always show)
                        const finalDmg = p.damage * p.currentPenetration; // For display
                        if (p.hitEnemies.size > 1) {
                            this.particleSystem.spawnExplosion(e.x, e.y, '#00ffff', 15);
                            this.particleSystem.spawnDamageNumber(e.x, e.y, finalDmg, '#00ffff');
                            this.triggerShake(0.05, 1);
                        } else {
                            this.particleSystem.spawnExplosion(e.x, e.y, e.color, 5);
                            this.particleSystem.spawnDamageNumber(e.x, e.y, finalDmg, '#ffffff');
                        }

                        // Determine if we should keep going or stop
                        if (p.ownerRole === 'GIANT') {
                            // Heavy knockback for primary target
                            const gdx = e.x - p.x;
                            const gdy = e.y - p.y;
                            const gdist = Math.hypot(gdx, gdy) || 1;

                            // Only apply physics if allowed
                            if (!this.isMultiplayer || this.networkSystem.isHost) {
                                e.x += (gdx / gdist) * 60;
                                e.y += (gdy / gdist) * 60;
                            }

                            // Giant bullets splash to NEARBY enemies with high force
                            this.triggerSplashDamage(p.x, p.y, 100, p.damage * 0.6, 80, e);
                            p.markedForDeletion = true;
                            break;
                        }

                        if (p.ownerPenetration > 0 && p.hitEnemies.size < 2) {
                            p.currentPenetration = p.ownerPenetration;
                        } else {
                            p.markedForDeletion = true;
                            break;
                        }
                    }
                }
            }
        }

        // Universal Healing Station Logic
        const allStations: any[] = [];
        if (this.player.healingStation?.active) allStations.push(this.player.healingStation);
        this.remotePlayers.forEach(rp => {
            if (rp.healingStation?.active) allStations.push(rp.healingStation);
        });

        allStations.forEach(s => {
            s.timer -= dt;

            // Health Regen for ALL players (local and remote)
            const checkPlayer = (p: any, isLocal: boolean) => {
                if (p.isDead) return;
                const dist = Math.hypot(p.x - s.x, p.y - s.y);
                if (dist < s.radius) {
                    p.hp = Math.min(p.hp + 20 * dt, p.maxHp);
                    if (isLocal) {
                        // Visual cues could go here
                    }
                }
            };

            checkPlayer(this.player, true);
            this.remotePlayers.forEach(rp => checkPlayer(rp, false));

            // Station Destruction (local check is enough for visibility)
            if (s.timer <= 0 || s.hp <= 0) {
                s.active = false;
                this.particleSystem.spawnExplosion(s.x, s.y, '#00ffaa', 30);
            }
        });

        for (const e of this.enemies) {
            // Collision checks are now handled via allTargets logic basically, but we need damage application
            const targets = [this.player];
            if (this.player.healingStation?.active) targets.push(this.player.healingStation as any);

            targets.forEach(t => {
                if (!t) return;
                const dist = Math.hypot(e.x - t.x, e.y - t.y);
                const isStation = (t as any).radius === 150 || (t as any).timer !== undefined; // Duck typing station

                if (dist < e.radius + (isStation ? 30 : this.player.radius)) {
                    if (isStation) {
                        (t as any).hp -= 50 * dt;
                    } else {
                        const isInvincible = this.player.isInvincible || this.player.powerUps.shield.active || this.player.isDead;
                        if (!isInvincible) {
                            this.player.hp -= 0.5;
                            if (this.player.hp <= 0) {
                                if (this.isMultiplayer) {
                                    this.player.hp = 0;
                                    this.player.isDead = true;
                                    this.checkAllPlayersDead();
                                } else {
                                    this.gameOver();
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    checkAllPlayersDead() {
        if (!this.player.isDead || this.isGameOver) return; // Only process if we are dead and game is NOT yet over

        let allDead = true;
        this.remotePlayers.forEach(rp => {
            if (!rp.isDead) allDead = false;
        });

        if (allDead) {
            console.log('[GAME] All players dead. Broadasting Game Over.');
            this.gameOver();
            if (this.isMultiplayer) {
                this.networkSystem.broadcast('MISSION_FAILED', {});
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



    draw() {
        this.ctx.save();
        this.ctx.textAlign = 'left';

        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // Background
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        if (this.isPlaying) {
            this.particleSystem.draw(this.ctx);

            // Draw all players
            if (this.player) this.player.draw(this.ctx);
            this.remotePlayers.forEach(rp => rp.draw(this.ctx));

            // Remote Bullets
            if (this.isMultiplayer) {
                this.networkSystem.remotePlayers.forEach((state, _) => {
                    if (state.isFiring && state.aimX && state.aimY) {
                        this.ctx.strokeStyle = state.role === 'GUNNER' ? '#00ffff' :
                            state.role === 'GIANT' ? '#ff4400' : '#00ffaa';
                        this.ctx.lineWidth = 2;
                        this.ctx.globalAlpha = 0.6;
                        this.ctx.beginPath();
                        this.ctx.moveTo(state.x, state.y);
                        const dx = state.aimX - state.x;
                        const dy = state.aimY - state.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 0) {
                            const bulletLength = Math.min(dist, 30);
                            this.ctx.lineTo(state.x + (dx / dist) * bulletLength, state.y + (dy / dist) * bulletLength);
                            this.ctx.stroke();
                        }
                        this.ctx.globalAlpha = 1;
                    }
                });
            }

            // Healer Station
            if (this.player?.healingStation?.active) {
                const s = this.player.healingStation;
                this.ctx.beginPath();
                this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#00ffaa33';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
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
                this.ctx.fillRect(tx, ty, barW * (s.timer / 20.0), barH - 2);
            }

            // Sync and Draw Remote Healer Stations
            this.remotePlayers.forEach(rp => {
                if (rp.healingStation?.active) {
                    const s = rp.healingStation;
                    this.ctx.beginPath();
                    this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = '#00ffaa33';
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
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
                    this.ctx.fillRect(tx, ty, barW * (s.timer / 20.0), barH - 2);
                }
            });

            // Enemies & Projectiles
            this.enemies.forEach(e => e.draw(this.ctx));
            this.projectiles.forEach(p => p.draw(this.ctx));

            // Gunner targeting
            if (this.player?.role === 'GUNNER' && this.player.isAbilityActive) {
                this.enemies.forEach(e => {
                    if (this.player.markedTargets.includes(e)) {
                        this.ctx.strokeStyle = '#ff0000';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                });
            }
        }

        // Restore context before drawing HUD (fixed UI)
        this.ctx.restore();

        if (this.isPlaying) {
            this.drawHUD();

            if (this.player?.isDead) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                this.ctx.fillRect(0, 0, this.canvas.width, 100);
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 30px monospace';
                this.ctx.fillText("YOU ARE DEAD - SPECTATING TEAMMATES", this.canvas.width / 2, 60);
                this.ctx.font = '16px monospace';
                this.ctx.fillText("Teammates can revive you from the Arsenal for 100 Shards", this.canvas.width / 2, 90);
                this.ctx.restore();
            }
        }

        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#f00';
            this.ctx.font = 'bold 70px monospace';
            this.ctx.fillText("MISSION FAILED", this.canvas.width / 2, this.canvas.height / 2 - 80);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px monospace';
            this.ctx.fillText(`Waves Survived: ${this.waveCount}`, this.canvas.width / 2, this.canvas.height / 2 - 10);
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);

            this.ctx.fillStyle = '#0ff';
            this.ctx.font = 'bold 30px monospace';
            this.ctx.fillText("PRESS [SPACE] TO RESTART", this.canvas.width / 2, this.canvas.height / 2 + 100);

            // GO Main Menu on Fail Screen
            const xc = this.canvas.width / 2;
            const yc = this.canvas.height / 2;
            this.ctx.fillStyle = 'rgba(255,0,255,0.2)';
            this.ctx.fillRect(xc - 100, yc + 130, 200, 40);
            this.ctx.fillStyle = '#f0f';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText("MAIN MENU", xc, yc + 158);
        }

        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.textAlign = 'center';

            this.ctx.fillStyle = '#0ff';
            this.ctx.font = 'bold 60px monospace';
            this.ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2 - 60);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '22px monospace';
            this.ctx.fillText(`Wave: ${this.waveCount} | Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 10);

            if (this.shopSystem.isShopOpen && this.shopSystem.currentMode === 'POWERUP' && this.isMultiplayer) {
                this.ctx.fillStyle = '#ff0';
                this.ctx.font = '16px monospace';
                this.ctx.fillText("TEAM POWER-UP SELECTION IN PROGRESS", this.canvas.width / 2, this.canvas.height / 2 + 25);
            }

            // Resume Button
            const xc = this.canvas.width / 2;
            const yc = this.canvas.height / 2;
            this.ctx.fillStyle = 'rgba(0,255,255,0.2)';
            this.ctx.fillRect(xc - 100, yc + 70, 200, 35);
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText("RESUME", xc, yc + 95);

            // Main Menu Button
            this.ctx.fillStyle = 'rgba(255,0,255,0.2)';
            this.ctx.fillRect(xc - 100, yc + 120, 200, 35);
            this.ctx.fillStyle = '#f0f';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText("MAIN MENU", xc, yc + 145);
        }

        // Custom Cursor
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.input.mouse.x, this.input.mouse.y, 8, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawHUD() {
        if (!this.player) return;
        this.ctx.save();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px monospace';
        this.ctx.fillText(`Wave: ${this.waveCount}`, 20, 30);
        this.ctx.fillText(`Score: ${this.score}`, 20, 60);
        this.ctx.fillText(`Shards: ${this.shopSystem?.shards || 0}`, 20, 90);
        this.ctx.fillText(`Class: ${this.player.role}`, 20, 120);

        if (this.player.isDead) {
            this.ctx.fillStyle = '#f00';
            this.ctx.fillText(`STATUS: DEAD (SPECTATING)`, 20, 150);
        } else {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(`HP: ${Math.floor(this.player.hp)}/${this.player.maxHp}`, 20, 150);
        }

        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText(`[X] ARSENAL`, 20, 180);

        // Ability Status (Moved to Bottom Right, Less Punchy)
        this.ctx.restore(); // Exit main HUD context
        this.ctx.save();
        const abilityReady = this.player.abilityTimer <= 0;
        const abilityColor = abilityReady ? 'rgba(0, 255, 170, 0.6)' : 'rgba(136, 136, 136, 0.5)';
        this.ctx.fillStyle = abilityColor;
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'right';
        const abilityText = abilityReady ? 'ABILITY READY [SPACE]' : `COOLDOWN: ${this.player.abilityTimer.toFixed(1)}s`;
        this.ctx.fillText(abilityText, this.canvas.width - 20, this.canvas.height - 20);

        this.drawPowerUpStatus();
        this.ctx.restore();
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
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = pu.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.fillStyle = pu.color;
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(pu.icon, x, y + 8);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`${timer.toFixed(1)}s`, x, y + 45);
        });
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

