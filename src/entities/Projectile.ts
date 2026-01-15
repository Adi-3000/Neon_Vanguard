import { Entity } from './Entity';

export class Projectile extends Entity {
    vx: number;
    vy: number;
    speed: number = 900;
    damage: number = 40;
    isEnemy: boolean = false;
    ownerRole: string = 'GUNNER';
    ownerId: string = '';
    ownerPenetration: number = 0;

    // Penetration logic
    hitEnemies: Set<any> = new Set();
    currentPenetration: number = 1.0;

    constructor(x: number, y: number, targetX: number, targetY: number, isEnemy: boolean = false, ownerRole: string = 'GUNNER', ownerPen: number = 0, ownerId: string = '') {
        let color = '#ffff00';
        if (isEnemy) {
            color = '#ff0000';
        } else {
            switch (ownerRole) {
                case 'GUNNER': color = '#00ffff'; break;
                case 'GIANT': color = '#ff4400'; break;
                case 'HEALER': color = '#00ffaa'; break;
            }
        }
        super(x, y, 4, color);
        this.isEnemy = isEnemy;
        this.ownerRole = ownerRole;
        this.ownerId = ownerId;
        this.ownerPenetration = ownerPen;
        this.currentPenetration = 1.0;

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
