export class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 100 + 50;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 0.5 + Math.random() * 0.5; // 0.5 to 1.0 seconds
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }

    update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.size *= 0.95; // Shrink
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

export class TextParticle {
    x: number;
    y: number;
    vy: number;
    life: number;
    text: string;
    color: string;

    constructor(x: number, y: number, text: string, color: string) {
        this.x = x;
        this.y = y;
        this.vy = -60;
        this.life = 0.8;
        this.text = text;
        this.color = color;
    }

    update(dt: number) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

export class ParticleSystem {
    particles: (Particle | TextParticle)[] = [];

    spawnExplosion(x: number, y: number, color: string, count: number = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    spawnDamageNumber(x: number, y: number, amount: number, color: string = '#fff') {
        const text = amount < 1 ? amount.toFixed(1) : Math.floor(amount).toString();
        this.particles.push(new TextParticle(x, y - 20, text, color));
    }

    update(dt: number) {
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.textAlign = 'center';
        this.particles.forEach(p => p.draw(ctx));
        ctx.textAlign = 'left';
    }
}
