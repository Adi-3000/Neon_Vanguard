import { Enemy } from '../entities/Enemy';
import type { EnemyType } from '../entities/Enemy';
import { Entity } from '../entities/Entity';

export class WaveManager {
    spawnTimer: number = 0;
    spawnInterval: number = 1.2;
    wave: number = 1;
    player: Entity;
    screenWidth: number;
    screenHeight: number;

    hpMult: number = 1;
    speedMult: number = 1.0;

    constructor(player: Entity, w: number, h: number) {
        this.player = player;
        this.screenWidth = w;
        this.screenHeight = h;
    }

    setDifficulty(hpMult: number) {
        this.hpMult = hpMult;
        // Faster speed scaling: 1.0 + (wave * 0.05)
        this.speedMult = 1.0 + (this.wave * 0.05);
        // Spawn Interval Logic:
        // Start: 1.2s
        // Decrease by 0.1s per wave
        // Min: 0.15s (Extreme speed)
        this.spawnInterval = Math.max(0.15, 1.2 - (this.wave * 0.1));
    }

    update(dt: number, enemiesList: Enemy[]) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy(enemiesList);
        }
    }

    spawnEnemy(enemiesList: Enemy[]) {
        // Boss Logic: Every 6 waves
        if (this.wave % 6 === 0) {
            const bossExists = enemiesList.some(e => e.type === 'BOSS');
            if (!bossExists) {
                const x = this.screenWidth / 2;
                const y = -100; // Drop from top
                const boss = new Enemy(x, y, this.player, 'BOSS');
                boss.hp *= (1 + (this.wave * 0.2));
                boss.maxHp = boss.hp;
                enemiesList.push(boss);
                return;
            }
            if (Math.random() > 0.3) return;
        }

        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -30 : this.screenWidth + 30;
            y = Math.random() * this.screenHeight;
        } else {
            x = Math.random() * this.screenWidth;
            y = Math.random() < 0.5 ? -30 : this.screenHeight + 30;
        }

        let type: EnemyType = 'BASIC';
        const rand = Math.random();

        // Progressive Spawning: Much faster introduction
        // Wave 1: Basic
        // Wave 2: Basic + Runners
        // Wave 3-4: Basic + Runners + Shooters
        // Wave 5+: Full Mix

        if (this.wave >= 5) {
            // Wave 5+: All types
            if (rand < 0.15) type = 'TANK';
            else if (rand < 0.45) type = 'SHOOTER';
            else if (rand < 0.75) type = 'RUNNER';
            else type = 'BASIC';
        } else if (this.wave >= 3) {
            // Wave 3-4: Add Shooters
            if (rand < 0.35) type = 'SHOOTER';
            else if (rand < 0.70) type = 'RUNNER';
            else type = 'BASIC';
        } else if (this.wave >= 2) {
            // Wave 2: Add Runners
            if (rand < 0.50) type = 'RUNNER';
            else type = 'BASIC';
        } else {
            type = 'BASIC';
        }

        const enemy = new Enemy(x, y, this.player, type);
        enemy.hp *= this.hpMult;
        enemy.maxHp = enemy.hp; // Sync maxHp with scaled starting health
        enemy.speed *= this.speedMult;

        enemiesList.push(enemy);
    }
}
