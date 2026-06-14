import Geometry from "../tilemaps/Geometry.js";
export default class Player {
    constructor(world, x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.world = world;
        this.input = world.input;
        this.canJump = false;
        this.flip = false; 
        this.gravity = 0.008;

        this.charge = 1;
        this.charging = false; // 0 to 1, how much the player is currently charging
        this.chargeX = 8;
        this.chargeY = 5;
        this.chargeParticleSettings = {
            count: 20,
            color: "#00FFFF",
            sizeMin: 0.05,
            sizeMax: 0.15,
            speedMin: 0.02,
            speedMax: 0.05,
            speedHomeMax: 0.1,
            targetRadius: 0.1,
            homingStrength: 0.03
        }
        this.chargeParticles = [];
        this.chargeCallback = (currCharge, amount)=>{
           // for phones to hook into and update display
        }; 
    }
    update(){
        this.collide()
        this.x += this.vx;
        this.y += this.vy;
        // simple input handling for testing
        const x = this.input.getAxis("Axis1");
        const y = this.input.getAxis("Axis2");
        if (y < -0.5 && this.canJump) {
            this.vy = -0.15;
            this.canJump = false;
        }
        // if hold down, fast fall
        if (y > 0.5) {
            this.vy += 0.008; // fast fall multiplier
        }
        this.vy += this.gravity;
        this.vx += x/60;
        // apply friction
        this.vx *= 0.8;
        if (x > 0) this.flip = false;
        else if (x < 0) this.flip = true;

        // charge particles
        this.updateChargeParticles();
        if (this.charge < 0 && this.charging) {
            this.charge = 0;
            this.charging = false;
        }
    }
    draw(ctx){
        this.drawChargeParticles(ctx);
        let image = this.world.images["player-base"];
        if (this.charge >= 1) {
            image = this.world.images["player-charged"];
        }
        if (this.flip) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(image, -this.x - this.w, this.y, this.w, this.h);
            ctx.restore();
        } else{
            ctx.drawImage(image, this.x, this.y, this.w, this.h);
        }
    }
    collide(){
        for (let poly of this.world.collisions) {
            let bounce = 0;
            if (this.vy > 0.3 && this.input.getAxis("Axis2") > 0.5 && this.canJump) bounce = 1; // High bounce when fast falling
            if (this.vy > 0.1 && this.input.getAxis("Axis2") > 0.5 && this.canJump) bounce = 1; // Small bounce if fast falling but not above threshold
            const collision = Geometry.spriteToTile({x: this.x+0.1, y: this.y+0.1},{x: this.vx, y: this.vy}, {x: this.w-0.1, y: this.h-0.1}, {x: poly.x, y: poly.y}, {x: poly.w, y: poly.h}, 0.2, bounce);
            if(!collision.collided) continue;
            this.vx = collision.vlos.x;
            this.vy = collision.vlos.y;
            this.x = collision.pos.x-0.1;
            this.y = collision.pos.y-0.1;
            if(collision.collided.bottom) this.canJump = true;
        }
    }
    spawnChargeParticles(){
        if (this.chargeParticles.length >= this.chargeParticleSettings.count) return;
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * (this.chargeParticleSettings.speedMax - this.chargeParticleSettings.speedMin) + this.chargeParticleSettings.speedMin;
        const size = Math.random() * (this.chargeParticleSettings.sizeMax - this.chargeParticleSettings.sizeMin) + this.chargeParticleSettings.sizeMin;
        this.chargeParticles.push({
            x: this.x + this.w/2,
            y: this.y + this.h/2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            lifetime: 0
        }); 
    }
    updateChargeParticles(){
        if (this.charge > 0 && this.charging) {
            this.spawnChargeParticles();
        };
        // hone in on target pos (grid pos, for target location of the thing to charge)
        const targetX = this.chargeX + 0.5;
        const targetY = this.chargeY + 0.5;
        this.chargeParticles.forEach(p => {
            const dx = targetX - p.x;
            const dy = targetY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const homingStrength = this.chargeParticleSettings.homingStrength; // adjust this for more or less homing
                p.vx += (dx / dist) * (homingStrength);
                p.vy += (dy / dist) * (homingStrength);
                // limit speed
                const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                const maxSpeed = this.chargeParticleSettings.speedHomeMax * 2; // max speed is higher than initial speed to allow homing acceleration
                if (speed > maxSpeed) {
                    p.vx = (p.vx / speed) * maxSpeed;
                    p.vy = (p.vy / speed) * maxSpeed;
                }
            }
            p.x += p.vx;
            p.y += p.vy;
            p.lifetime += 1/60;
        });
        // if particle reaches target, remove it & for now remove charge
        this.chargeParticles = this.chargeParticles.filter(p => {
            const dx = targetX - p.x;
            const dy = targetY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < this.chargeParticleSettings.targetRadius * (p.lifetime+1)) { // target radius increases over time for higher chance to hit as it gets closer
                this.chargeCallback(this.charge, 1/this.chargeParticleSettings.count);
                this.charge -= 1/this.chargeParticleSettings.count;
                return false;
            }
            return true;
        });
    }
    drawChargeParticles(ctx){
        this.chargeParticles.forEach(p => {
            ctx.fillStyle = this.chargeParticleSettings.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
    }

}