import { Entity } from './Entity';
import { InputHandler } from '../core/Input';


export type PlayerRole = 'GUNNER' | 'GIANT' | 'HEALER';

export class Player extends Entity {
    speed: number = 300;
    role: PlayerRole;
    baseMaxHp: number = 100;
    maxHp: number = 100;
    hp: number = 100;

    fireRateMult: number = 1;
    damageMult: number = 1;

    // Ability State
    abilityCooldown: number = 10; // Seconds
    abilityTimer: number = 0;
    isAbilityActive: boolean = false;
    activeTimer: number = 0;

    isInvincible: boolean = false;
    isDead: boolean = false;

    // Upgrades (Permanent per run)
    penetration: number = 0; // 0.1 to 0.5

    // Active Timed Power-ups
    powerUps: {
        shield: { active: boolean, timer: number },
        doubleFire: { active: boolean, timer: number },
        sword: { active: boolean, timer: number },
        glassCannon: { active: boolean, timer: number }
    } = {
            shield: { active: false, timer: 0 },
            doubleFire: { active: false, timer: 0 },
            sword: { active: false, timer: 0 },
            glassCannon: { active: false, timer: 0 }
        };

    // Sword rotation
    swordAngle: number = 0;

    // Deadeye State (Gunner)
    maxTargets: number = 3;
    markedTargets: Entity[] = [];

    // Healing Station (Healer only)
    healingStation: { active: boolean, x: number, y: number, radius: number, timer: number, hp: number, maxHp: number } | null = null;

    constructor(x: number, y: number, role: PlayerRole = 'GUNNER') {
        super(x, y, 15, '#00ffff');
        this.role = role;
        this.applyRoleStats();
    }

    applyRoleStats() {
        switch (this.role) {
            case 'GUNNER':
                this.color = '#00ffff';
                this.speed = 400;
                this.fireRateMult = 1.3;
                this.abilityCooldown = 7;
                this.maxTargets = 3;
                break;

            case 'GIANT':
                this.color = '#ff4400'; // Deep Orange
                this.speed = 220;
                this.damageMult = 0.6; // Slightly higher base damage
                this.baseMaxHp = 400;
                this.hp = 400;
                this.abilityCooldown = 15;
                this.radius = 15; // Reset to same as Gunner
                break;
            case 'HEALER':
                this.color = '#00ffaa'; // Mint Green
                this.speed = 320;
                this.damageMult = 0.45;
                this.baseMaxHp = 120;
                this.hp = 120;
                this.abilityCooldown = 20;
                break;
        }
        this.maxHp = this.baseMaxHp;
    }

    update(dt: number, input?: InputHandler) {
        if (this.isDead) return;

        // Cooldown management
        if (this.abilityTimer > 0) {
            this.abilityTimer -= dt;
        }

        // Active ability duration
        if (this.isAbilityActive) {
            this.activeTimer -= dt;
            if (this.activeTimer <= 0) {
                this.deactivateAbility();
            }
        }

        // Power-up timers
        Object.keys(this.powerUps).forEach(key => {
            const pu = (this.powerUps as any)[key];
            if (pu.active) {
                pu.timer -= dt;
                if (pu.timer <= 0) {
                    pu.active = false;
                    // Reset effects
                    if (key === 'glassCannon') {
                        this.damageMult /= 2;
                        // Restore max HP from base
                        this.maxHp = this.baseMaxHp;
                        // Restore current HP: Double the remaining HP as per user request
                        this.hp *= 2;
                        this.hp = Math.min(this.hp, this.maxHp);
                    }
                    if (key === 'shield') {
                        this.isInvincible = false;
                    }
                }
            }
        });

        // Ensure maxHp is always correct (in case of upgrades during powerup)
        if (this.powerUps.glassCannon.active) {
            this.maxHp = this.baseMaxHp / 2;
        } else {
            this.maxHp = this.baseMaxHp;
        }
        this.hp = Math.min(this.hp, this.maxHp);

        if (this.powerUps.sword.active) {
            this.swordAngle += dt * 5; // Rotate sword
        }

        if (!input) return;

        let mx = 0;
        let my = 0;

        // Keyboard
        if (input.isKeyDown('KeyW')) my--;
        if (input.isKeyDown('KeyS')) my++;
        if (input.isKeyDown('KeyA')) mx--;
        if (input.isKeyDown('KeyD')) mx++;

        // Joystick
        if (input.joystick.active) {
            mx = input.joystick.x;
            my = input.joystick.y;
        }

        // Apply movement
        if (mx !== 0 || my !== 0) {
            const length = Math.hypot(mx, my);
            const moveX = (mx / length) * this.speed * dt;
            const moveY = (my / length) * this.speed * dt;

            this.x += moveX;
            this.y += moveY;
        }

        // Clamp to screen (Assuming 800x600 for now, but Game.ts will fix this)
        // We'll use 2000x2000 as a safe large boundary or better yet, pass world size.
        // For now, simple boundary check
        this.x = Math.max(this.radius, Math.min(2000 - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(2000 - this.radius, this.y));
    }

    // Returns true if ability triggered successfully
    tryUseAbility(): boolean {
        if (this.abilityTimer <= 0) {
            this.abilityTimer = this.abilityCooldown;
            this.isAbilityActive = true;
            return true;
        }
        return false;
    }

    deactivateAbility() {
        this.isAbilityActive = false;
        this.isInvincible = false;
        // Gunner: Bullet time reset handled in Game
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Ability Ready Indicator (Ring)
        if (this.abilityTimer <= 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        super.draw(ctx);

        const barWidth = 40;
        const barHeight = 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth / 2, this.y + 25, barWidth, barHeight);
        ctx.fillStyle = this.isInvincible ? '#fff' : '#f00';
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillRect(this.x - barWidth / 2, this.y + 25, barWidth * pct, barHeight);
        ctx.shadowBlur = 0;

        // Draw Shield
        if (this.powerUps.shield.active) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Rotating Sword
        if (this.powerUps.sword.active) {
            const sx = this.x + Math.cos(this.swordAngle) * 60;
            const sy = this.y + Math.sin(this.swordAngle) * 60;
            ctx.fillStyle = '#ff00ff';
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(this.swordAngle + Math.PI / 4);
            ctx.fillRect(-5, -20, 10, 40);
            ctx.restore();
        }
    }
}
