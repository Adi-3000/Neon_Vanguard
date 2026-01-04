import { Entity } from './Entity';

export type EnemyType = 'RUNNER' | 'SHOOTER' | 'TANK' | 'BOSS' | 'BASIC';

export class Enemy extends Entity {
    type: EnemyType;
    speed: number = 900;
    target: Entity | null;
    hp: number;
    maxHp: number;

    // Shooter specific
    shootTimer: number = 0;
    fireRate: number = 2.0;

    constructor(x: number, y: number, target: Entity | null, type: EnemyType = 'RUNNER') {
        super(x, y, 15, '#ff0055');
        this.target = target;
        this.type = type;

        // Stats based on type
        switch (type) {
            case 'RUNNER':
                this.speed = 220;
                this.hp = 60; // Increased from 20
                this.radius = 12;
                this.color = '#ff0055'; // Red
                break;
            case 'SHOOTER':
                this.speed = 100;
                this.hp = 80; // Increased from 30
                this.radius = 15;
                this.color = '#aa00ff'; // Purple
                break;
            case 'TANK':
                this.speed = 90;
                this.hp = 300; // Increased from 100
                this.radius = 25;
                this.color = '#ffaa00'; // Orange/Brown
                break;
            case 'BOSS':
                this.speed = 60;
                this.hp = 6000; // Decreased from 8000
                this.radius = 60;
                this.color = '#ff0000'; // Big Red
                break;
            case 'BASIC':
                this.speed = 150; // Slower than Runner (180)
                this.hp = 50;     // Increased from 25
                this.radius = 14;
                this.color = '#00ff00'; // Green Zombie
                break;
            default:
                this.speed = 100;
                this.hp = 40;
                break;
        }
        this.maxHp = this.hp;
    }

    update(dt: number, addProjectile?: (x: number, y: number, tx: number, ty: number, isEnemy: boolean) => void, customTarget?: { x: number, y: number, radius: number }) {
        const finalTarget = customTarget || this.target;
        if (!finalTarget) return;

        const dx = finalTarget.x - this.x;
        const dy = finalTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Movement Logic
        if (this.type === 'SHOOTER') {
            const stopDist = 300; // Keep distance
            if (dist > stopDist) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            } else if (dist < stopDist - 50) {
                // Backup if too close
                this.x -= (dx / dist) * this.speed * 0.5 * dt;
                this.y -= (dy / dist) * this.speed * 0.5 * dt;
            }

            // Shooting Logic
            this.shootTimer += dt;
            if (this.shootTimer >= this.fireRate && addProjectile) {
                this.shootTimer = 0;
                addProjectile(this.x, this.y, finalTarget.x, finalTarget.y, true);
            }

        } else {
            // MELEE Behaviors (RUNNER, TANK, BOSS)
            // Just move towards player
            if (dist > this.radius + finalTarget.radius) { // Stop if touching player (overlap allowed slightly for cleaner collisions)
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        switch (this.type) {
            case 'RUNNER': // Triangle
                this.drawPolygon(ctx, 3);
                break;
            case 'BASIC': // Circle (Standard)
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'SHOOTER': // Square
                ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                break;
            case 'TANK': // Hexagon
                this.drawPolygon(ctx, 6);
                break;
            case 'BOSS': // Octagon
                this.drawPolygon(ctx, 8);
                // Inner Eye
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.shadowBlur = 0;

        // Health Bar
        if (this.hp < this.maxHp && this.type !== 'BOSS') {
            const barWidth = this.radius * 2.0;
            const barHeight = 2;
            const x = this.x - barWidth / 2;
            const y = this.y - this.radius - 10;

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

            // Health
            const healthPct = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = healthPct > 0.6 ? '#00ff44' : (healthPct > 0.3 ? '#ffcc00' : '#ff3300');
            ctx.fillRect(x, y, barWidth * healthPct, barHeight);
        }
    }

    drawPolygon(ctx: CanvasRenderingContext2D, sides: number) {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
            const px = this.x + Math.cos(angle) * this.radius;
            const py = this.y + Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
}
