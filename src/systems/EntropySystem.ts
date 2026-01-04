export class EntropySystem {
    difficultyLevel: number = 1;
    timeElapsed: number = 0;

    constructor() { }

    update(dt: number) {
        this.timeElapsed += dt;
        // Increase difficulty every 20 seconds (faster scaling)
        this.difficultyLevel = 1 + Math.floor(this.timeElapsed / 20) * 0.6;
    }

    getEnemyStatsMultiplier() {
        return {
            hp: 1 + (this.difficultyLevel - 1) * 0.4, // Smoother scaling
            speed: 1 + (this.difficultyLevel - 1) * 0.15,
            damage: 1 + (this.difficultyLevel - 1) * 0.3
        };
    }
}
