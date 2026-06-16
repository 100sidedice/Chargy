export default class ParticleManager {
    constructor() {
        this.particles = [];
    }
    /**
     * Spawns a burst of particles at the given (x, y) position with various customizable options.
     * @param {number} x - The x-coordinate for the particle burst origin.
     * @param {number} y - The y-coordinate for the particle burst origin.
     * @param {object} [opts] - Optional parameters to customize the particle burst.
     * @param {number} [opts.count] - Number of particles to spawn (default: 12).
     * @param {number} [opts.speed] - Base speed of particle.
     * @param {number} [opts.life] - Average lifespan of particles in milliseconds.
     * @param {string[]} [opts.colors] - Array of color strings for particles (default: ['#FFCC00', '#FF8844', '#FF4444']).
     * @param {number} [opts.gravityStrength]-  Strength of downward acceleration (multiplier).
     * @param {number} [opts.lifetimeNoise] - Random variation in particle lifespan as a fraction.
     * @param {number} [opts.speedNoise] - Random variation in particle speed as a fraction.
    * @param {number} [opts.accel] - Additional per-particle acceleration. Number -> vertical accel; object -> {x,y} (default: {x:0,y:0}).
    * @param {number} [opts.accelNoise] - Fractional noise applied to accel (default: 0).
     */
    spawnAt(x, y, opts = {}) {
        const defaults = {
            count: 12,
            speed: 0.001,
            life: 500,
            rot: 0,
            colors: ['#FFCC00', '#FF8844', '#FF4444'],
            gravityStrength: 1,
            lifetimeNoise: 0.5,
            speedNoise: 2, // up to 50% variation in speed
            accelX: 0.95, // slow down over time for a nice effect
            accelY: 0.95, // slow down over time for a nice effect
            accelNoiseX: 0,
            accelNoiseY: 0,
            size: 0.1,
            fadeTimeStart: 0, // lifetime spent fading out at the start 
            fadeTimeEnd: 300, // lifetime spent fading out at the end of life
            onEnd: ()=>{} // callback for when particle dies, can be used to chain effects
        };
        opts = { ...defaults, ...opts };
        for (let i = 0; i < opts.count; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = opts.speed * (1 + (Math.random() - 0.5) * opts.speedNoise);
            const velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
            };
            const lifetime = opts.life * (1 + (Math.random() - 0.5) * opts.lifetimeNoise);
            const color = opts.colors[Math.floor(Math.random() * opts.colors.length)];
            const accelNoiseX = opts.accelX + (Math.random() - 0.5) * opts.accelNoiseX;
            const accelNoiseY = opts.accelY + (Math.random() - 0.5) * opts.accelNoiseY;
            
            this.particles.push({
                x,
                y,
                vx: velocity.x,
                vy: velocity.y,
                lifetime,
                age: 0,
                color,
                accelX: accelNoiseX,
                accelY: accelNoiseY,
                gravityStrength: opts.gravityStrength, 
                size: opts.size,
                fadeTimeStart: opts.fadeTimeStart,
                fadeTimeEnd: opts.fadeTimeEnd,
                onEnd: opts.onEnd,
                dead: false
            });
        }
        this.particles.push({ x, y, ...opts });
    }
    
    update(dt=1/60) {
        this.particles.forEach(p => {
            //p.vy += (0.0005 * (p.gravityStrength-1)); // gravity
            p.vx *= p.accelX;
            p.vy *= p.accelY;
            p.x += p.vx;
            p.y += p.vy;
            p.age += dt*1000;
            if(p.age >= p.lifetime) p.dead = true;
            if(p.dead) p.onEnd();
        });
        this.particles = this.particles.filter(p => !p.dead);
    }
    
    draw(ctx, tileSize) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = 0;
            const px = Math.floor(p.x*16)/16;
            const py = Math.floor(p.y*16)/16;
            if (p.age < p.fadeTimeStart && p.fadeTimeStart > 0 && p.age > 100) {
                ctx.globalAlpha = p.age / p.fadeTimeStart;
            } else if (p.age > p.lifetime - p.fadeTimeEnd) {
                ctx.globalAlpha = 1 - ((p.age - p.lifetime + p.fadeTimeEnd) / p.fadeTimeEnd);
            } else if (p.age > p.fadeTimeStart && p.age < p.lifetime - p.fadeTimeEnd) {
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, p.size, p.size);
        });
        ctx.restore();
    }
}
function setAlpha(hex, alpha) {
    return hex.slice(0, 7) + Math.round(alpha * 255).toString(16).padStart(2, '0');
}