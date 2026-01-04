import { Entity } from './Entity';

export class Projectile extends Entity {
    vx: number;
    vy: number;
    speed: number = 600;
    damage: number = 40;
    isEnemy: boolean = false;

    // Penetration logic
    hitEnemies: Set<any> = new Set();
    currentPenetration: number = 1.0;

    constructor(x: number, y: number, targetX: number, targetY: number, isEnemy: boolean = false) {
        super(x, y, 4, isEnemy ? '#ff0000' : '#ffff00');
        this.isEnemy = isEnemy;

        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
    }

    update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Mark for deletion if off screen (simple check, ideally passed from Game bounds)
        if (this.x < -100 || this.x > window.innerWidth + 100 ||
            this.y < -100 || this.y > window.innerHeight + 100) {
            this.markedForDeletion = true;
        }
    }
}
