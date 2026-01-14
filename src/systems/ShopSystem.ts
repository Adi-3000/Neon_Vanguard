export type Upgrade = {
    id: string;
    name: string;
    description: (level: number) => string;
    baseCost: number;
    maxLevel: number;
    onUpgrade: (game: any, level: number) => void;
};

export type PowerUp = {
    id: string;
    name: string;
    description: string;
    type: 'INSTANT' | 'TIMED';
    duration?: number;
    onApply: (game: any) => void;
};

export class ShopSystem {
    game: any;
    uiContainer: HTMLElement;
    shards: number = 0;

    levels: Record<string, number> = {
        fireRate: 0,
        maxHp: 0,
        damage: 0,
        penetration: 0
    };

    upgrades: Upgrade[] = [
        {
            id: 'fireRate',
            name: "Rapid Fire",
            description: (lvl) => `Increases your fire rate. Currently: +${lvl * 15}%`,
            baseCost: 20,
            maxLevel: 10,
            onUpgrade: (g, lvl) => {
                // Correct math: mult = base + per-level bonus
                // base mult is from Player.ts (e.g. 1.2 for Gunner)
                // We add the bonus to the mult, then recalc fireRate (delay)
                const baseMult = g.player.role === 'GUNNER' ? 1.2 : 1.0;
                g.player.fireRateMult = baseMult + (lvl * 0.15);
                g.fireRate = 0.15 / g.player.fireRateMult;
            }
        },
        {
            id: 'maxHp',
            name: "Structural Integrity",
            description: (lvl) => `Permanent Max HP increase. Currently: +${lvl * 25}`,
            baseCost: 15,
            maxLevel: 20,
            onUpgrade: (g, _lvl) => { g.player.baseMaxHp += 25; g.player.hp += 25; }
        },
        {
            id: 'damage',
            name: "Plasma Tuning",
            description: (lvl) => `Permanent Damage increase. Currently: +${lvl * 20}%`,
            baseCost: 25,
            maxLevel: 10,
            onUpgrade: (g, lvl) => { g.player.damageMult = 1 + (lvl * 0.2); }
        },
        {
            id: 'penetration',
            name: "Railgun Tech",
            description: (lvl) => `Bullets deal dmg to enemies behind. Currently: ${lvl === 0 ? 0 : Math.round((0.5 + (lvl - 1) * 0.125) * 100)}%`,
            baseCost: 40,
            maxLevel: 5,
            onUpgrade: (g, lvl) => {
                g.player.penetration = lvl === 0 ? 0 : (0.5 + (lvl - 1) * 0.125);
            }
        }
    ];

    powerUps: PowerUp[] = [
        {
            id: 'heal',
            name: "Emergency Repair",
            description: "Instant 100% HP Restore",
            type: 'INSTANT',
            onApply: (g) => { g.player.hp = g.player.maxHp; }
        },
        {
            id: 'meteor',
            name: "Orbital Strike",
            description: "Massive damage to all nearby threats",
            type: 'INSTANT',
            onApply: (g) => {
                g.triggerShake(0.8, 25);
                g.enemies.forEach((e: any) => {
                    const dist = Math.hypot(e.x - g.player.x, e.y - g.player.y);
                    if (dist < 500) {
                        e.hp -= 150;
                        g.particleSystem.spawnExplosion(e.x, e.y, '#ff4400', 30);
                        if (e.hp <= 0) g.handleEnemyDeath(e);
                    }
                });
            }
        },
        {
            id: 'shield',
            name: "Force Field",
            description: "Invulnerability for 10 seconds",
            type: 'TIMED',
            duration: 10,
            onApply: (g) => {
                g.player.powerUps.shield.active = true;
                g.player.powerUps.shield.timer = 10;
                g.player.isInvincible = true;
            }
        },
        {
            id: 'doubleFire',
            name: "Twin Linked",
            description: "Fire from two sub-guns for 15s",
            type: 'TIMED',
            duration: 15,
            onApply: (g) => {
                g.player.powerUps.doubleFire.active = true;
                g.player.powerUps.doubleFire.timer = 15;
            }
        },
        {
            id: 'sword',
            name: "Energy Blade",
            description: "Rotating blade damages close enemies",
            type: 'TIMED',
            duration: 12,
            onApply: (g) => {
                g.player.powerUps.sword.active = true;
                g.player.powerUps.sword.timer = 12;
            }
        },
        {
            id: 'glassCannon',
            name: "Overclock",
            description: "Timed Glass Cannon: Dmg x2, HP / 2 (10s)",
            type: 'TIMED',
            duration: 10,
            onApply: (g) => {
                g.player.powerUps.glassCannon.active = true;
                g.player.powerUps.glassCannon.timer = 10;
                g.player.damageMult *= 2;
                g.player.maxHp /= 2;
                g.player.hp /= 2; // Explicitly halve current HP as per request
                g.player.hp = Math.min(g.player.hp, g.player.maxHp);
            }
        }
    ];

    isShopOpen: boolean = false;
    currentMode: 'ARSENAL' | 'POWERUP' = 'ARSENAL';
    availablePowerUps: PowerUp[] = [];
    selectionTimer: any = null;
    timeLeft: number = 0;

    constructor(game: any) {
        this.game = game;
        this.uiContainer = document.getElementById('ui-layer')!;
    }

    openArsenal() {
        if (this.game.player.isDead) return;
        this.currentMode = 'ARSENAL';
        this.isShopOpen = true;
        let shouldPause = !this.game.isMultiplayer;
        if (this.game.isMultiplayer) {
            let aliveCount = this.game.player.isDead ? 0 : 1;
            this.game.remotePlayers.forEach((p: any) => {
                if (!p.isDead) aliveCount++;
            });
            if (aliveCount <= 1) shouldPause = true;
        }

        if (shouldPause) {
            this.game.paused = true;
            this.game.input.reset();
        }
        this.renderUI();
    }

    openPowerUpChoice() {
        if (this.game.player.isDead) return;
        this.currentMode = 'POWERUP';
        this.isShopOpen = true;
        if (!this.game.isMultiplayer) {
            // Note: MenuSystem/ShopSystem handles internal pausing for singleplayer
            this.game.input.reset();
        } else {
            // Multiplayer Selection Timer
            this.timeLeft = 4; // 4 seconds to choose
            if (this.game.networkSystem.isHost) {
                this.game.networkSystem.broadcast('POWERUP_PAUSE', { duration: 4 });
            }
            if (this.selectionTimer) clearInterval(this.selectionTimer);
            this.selectionTimer = setInterval(() => {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.closeShop();
                } else {
                    this.renderPowerUps();
                }
            }, 1000);
        }
        const shuffled = [...this.powerUps].sort(() => 0.5 - Math.random());
        this.availablePowerUps = shuffled.slice(0, 3);
        this.renderUI();
    }

    closeShop() {
        this.isShopOpen = false;
        if (this.selectionTimer) clearInterval(this.selectionTimer);
        this.selectionTimer = null;
        if (!this.game.isMultiplayer) {
            this.game.paused = false;
        }
        if (!this.game.player.powerUps.shield.active && this.game.player.role !== 'HEALER') {
            this.game.player.isInvincible = false;
        }
        this.uiContainer.innerHTML = '';
    }

    renderUI() {
        if (this.currentMode === 'ARSENAL') {
            this.renderArsenal();
        } else {
            this.renderPowerUps();
        }
    }

    renderArsenal() {
        const isSmall = window.innerWidth < 600;
        this.uiContainer.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(5, 5, 20, 0.98); border: 2px solid #0ff; padding: ${isSmall ? '0.8rem 0.5rem' : '2rem'}; text-align: center; color: #fff; font-family: monospace; pointer-events: auto; width: 95%; max-width: 550px; max-height: 85vh; overflow-y: auto;">
                <h1 style="color: #0ff; text-shadow: 0 0 10px #0ff; font-size: ${isSmall ? '1.1rem' : '1.8rem'}; margin: 0.5rem 0;">ARSENAL</h1>
                <p style="color: #ff0; font-size: ${isSmall ? '1rem' : '1.2rem'}; margin: 0.5rem 0;">Shards: ${this.shards}</p>
                <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem;">
                    ${this.upgrades.map(u => {
            const lvl = this.levels[u.id];
            const cost = u.baseCost * (lvl + 1);
            const canAfford = this.shards >= cost && lvl < u.maxLevel;
            return `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #111; padding: 0.6rem; border: 1px solid #333;">
                            <div style="text-align: left; flex: 1; padding-right: 8px;">
                                <h3 style="margin: 0; color: #0ff; font-size: ${isSmall ? '0.85rem' : '1rem'}; line-height: 1.1;">${u.name}</h3>
                                <p style="margin: 2px 0; font-size: 0.7rem; color: #aaa;">${u.description(lvl)}</p>
                            </div>
                            <button id="upg-${u.id}" ${!canAfford ? 'disabled' : ''} style="background: ${canAfford ? '#0ff' : '#222'}; color: #000; border: none; padding: 0.5rem; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; font-weight: bold; font-size: ${isSmall ? '0.8rem' : '0.9rem'}; min-width: 60px;">
                                ${lvl >= u.maxLevel ? 'MAX' : cost}
                            </button>
                        </div>
                        `;
        }).join('')}
                </div>

                ${this.renderReviveSection(isSmall)}

                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 1.5rem; margin-bottom: 0.5rem;">
                    <button id="close-arsenal" style="background: #f44; border: none; color: white; padding: 0.6rem 2rem; cursor: pointer; font-weight: bold; font-family: monospace;">EXIT</button>
                </div>
            </div>
        `;

        this.upgrades.forEach(u => {
            const btn = document.getElementById(`upg-${u.id}`);
            if (btn && this.shards >= (u.baseCost * (this.levels[u.id] + 1)) && this.levels[u.id] < u.maxLevel) {
                btn.onclick = () => {
                    this.shards -= u.baseCost * (this.levels[u.id] + 1);
                    this.levels[u.id]++;
                    u.onUpgrade(this.game, this.levels[u.id]);
                    this.renderArsenal();
                };
            }
        });

        // Revive listeners
        if (this.game.isMultiplayer) {
            this.game.remotePlayers.forEach((rp: any, id: string) => {
                if (rp.isDead) {
                    const btn = document.getElementById(`revive-${id}`);
                    if (btn && this.shards >= 100) {
                        btn.onclick = () => {
                            this.shards -= 100;
                            // Send revive event
                            if (this.game.networkSystem.isHost) {
                                this.game.networkSystem.broadcast('REVIVE_PLAYER', { targetId: id });
                            } else {
                                this.game.networkSystem.sendToHost('REVIVE_PLAYER', { targetId: id });
                            }
                            // Local event trigger
                            window.dispatchEvent(new CustomEvent('networkRevivePlayer', { detail: { targetId: id } }));
                            this.renderArsenal();
                        };
                    }
                }
            });
        }

        document.getElementById('close-arsenal')?.addEventListener('click', () => this.closeShop());
    }

    renderReviveSection(isSmall: boolean): string {
        if (!this.game.isMultiplayer) return '';

        const deadTeammates: { id: string, role: string }[] = [];
        this.game.remotePlayers.forEach((rp: any, id: string) => {
            if (rp.isDead) deadTeammates.push({ id, role: rp.role });
        });

        if (deadTeammates.length === 0) return '';

        return `
            <div style="margin-top: 1.5rem; border-top: 1px solid #0f0; padding-top: 1rem;">
                <h2 style="color: #0f0; font-size: ${isSmall ? '0.9rem' : '1.1rem'}; margin-bottom: 0.5rem;">DEFIBRILLATOR (REVIVE)</h2>
                <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                    ${deadTeammates.map(tm => {
            const canAfford = this.shards >= 100;
            return `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 255, 0, 0.05); padding: 0.6rem; border: 1px solid #0f0;">
                                <div style="text-align: left;">
                                    <h3 style="margin: 0; color: #0f0; font-size: 0.85rem;">Revive ${tm.role}</h3>
                                    <p style="margin: 0; font-size: 0.7rem; color: #888;">Bring them back with full HP</p>
                                </div>
                                <button id="revive-${tm.id}" ${!canAfford ? 'disabled' : ''} style="background: ${canAfford ? '#0f0' : '#222'}; color: #000; border: none; padding: 0.5rem; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; font-weight: bold; min-width: 80px;">
                                    100 SHARDS
                                </button>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    renderPowerUps() {
        const isSmall = window.innerWidth < 600;
        this.uiContainer.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(5, 20, 5, 0.98); border: 2px solid #0f0; padding: ${isSmall ? '1rem' : '2rem'}; text-align: center; color: #fff; font-family: monospace; pointer-events: auto; width: 95%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <h1 style="color: #0f0; text-shadow: 0 0 10px #0f0; font-size: ${isSmall ? '1.2rem' : '1.5rem'};">FREE POWER-UP CHOICE</h1>
                ${this.game.isMultiplayer ? `<p style="color: #f00; font-weight: bold; font-size: 1.2rem;">AUTO-CLOSING IN: ${this.timeLeft}s</p>` : '<p style="font-size: 0.9rem;">Advanced cycle complete. Select one:</p>'}
                <div style="display: flex; flex-direction: ${isSmall ? 'column' : 'row'}; gap: 0.8rem; margin-top: 1.5rem; justify-content: center; align-items: center;">
                    ${this.availablePowerUps.map((p, i) => `
                        <button id="pu-${i}" style="background: #111; border: 1px solid #0f0; color: #fff; padding: 1rem; width: ${isSmall ? '100%' : '180px'}; cursor: pointer; transition: 0.2s;">
                            <h3 style="color: #0f0; margin: 0; font-size: ${isSmall ? '1rem' : '1.17rem'};">${p.name}</h3>
                            <p style="font-size: 0.75rem; margin: 5px 0;">${p.description}</p>
                            <span style="font-size: 0.65rem; color: #888;">${p.type}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        this.availablePowerUps.forEach((p, i) => {
            document.getElementById(`pu-${i}`)?.addEventListener('click', () => {
                p.onApply(this.game);
                this.closeShop();
            });
        });
    }
}
