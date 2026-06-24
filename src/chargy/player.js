import Geometry from "../tilemaps/Geometry.js";
export default class Player {
    constructor(world, x, y, w, h, name, inputMap, input) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.world = world;
        this.input = input;
        this.canJump = false;
        this.flip = false; 
        this.gravity = 0.008;
        this.inputMap = inputMap;
        this.name = name;

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
        this.shrink = 2/16; // shrink player hitbox to tiles for better feeling collisions
        this.buffer = 2/16;
        this.bounced = false; // whether the player has bounced on the current jump
        this.visible = true; // whether the player is visible (used for rocket countdown)
    }
    update(){
        if(this.world.levelTransition.active) return; // skip update if level transition is active
        // charge particles
        this.updateChargeParticles();
        if (this.charge < 0 && this.charging) {
            this.charge = 0;
            this.charging = false;
        }
        // simple input handling for testing
        const x = this.input.getAxis(this.inputMap.x);
        const y = this.input.getAxis(this.inputMap.y);
        if (x > 0) this.flip = false;
        else if (x < 0) this.flip = true;
        if (this.inWire) return; // skip normal movement if in wire, since wire handles movement
        this.collide()
        // if outside of world bounds, reset to spawn
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }
        if (this.x > this.world.region.width - this.w) {
            this.x = this.world.region.width - this.w;
            this.vx = 0;
        }
        if (this.y > this.world.region.height - this.h) {
            this.y = this.world.region.height - this.h;
            this.vy = 0;
            this.canJump = true;
        }
        this.x += this.vx;
        this.y += this.vy;
        
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
        

        
    }
    draw(ctx){
        if (!this.visible) return;
        this.drawChargeParticles(ctx);
        let player = "chargy";
        if (this.name === "powery") player = "powery";
        let image = this.world.images[`${player}`];
        if (this.charge >= 1) {
            image = this.world.images[`${player}_charged`];
        }
        let dir = "_eye";
        // if vy < 0, show eye up
        if (this.vy < -0.05) {
            dir = "_eye_up";
        }
        // if holding down, show eye down
        if (this.input.getAxis(this.inputMap.y) > 0.5 || this.vy > 0.05) {
            dir = "_eye_down";
        }
        let eyeImage = this.world.images[`${player}${dir}`];
        ctx.save();
        ctx.translate(this.x + this.w * 0.5,this.y + this.h * 0.5);
        // ctx.rotate(this.rotation);
        ctx.scale(1-(this.shrink*2), 1-(this.shrink*2)); // scale up to tile size based on shrink amount
        if (this.flip) {
            ctx.scale(-1, 1);
        }
        ctx.drawImage(
            image,
            -this.w * 0.5,
            -this.h * 0.5,
            this.w,
            this.h
        );
        ctx.drawImage(
            eyeImage,
            -this.w * 0.5,
            -this.h * 0.5,
            this.w,
            this.h
        );

        ctx.restore();
    }
    collide(extraCollisions = [], onCollide = ()=>{}) {
        this.collidingSides = {top: false, bottom: false, left: false, right: false};
        for (let poly of this.world.getCollisions()){
            let bounce = 0;
            let shrink = this.shrink;
            let spawnParticles = false;
            if (this.vy > 0.3 && this.input.getAxis(this.inputMap.y) > 0.5 && this.canJump && (!this.bounced || this.charge >= 1)) {
                bounce = 1
                spawnParticles = true;
                // play sound
            }; // High bounce when fast falling
            if (this.vy > 0.1 && this.input.getAxis(this.inputMap.y) > 0.5 && this.canJump && (!this.bounced || this.charge >= 1)) {
                bounce = 1
                spawnParticles = true;
            }; // Small bounce if fast falling but not above threshold
            const collision = Geometry.spriteToTile({x: this.x+shrink, y: this.y+shrink},{x: this.vx, y: this.vy}, {x: this.w-shrink*2, y: this.h-shrink*2}, {x: poly.x, y: poly.y}, {x: poly.w, y: poly.h}, this.buffer, bounce);
            if(!collision.collided) continue;
            if(!poly.ignoreX) this.x = collision.pos.x-shrink;
            if(!poly.ignoreY) this.y = collision.pos.y-shrink;
            if(collision.collided.bottom){
                if (this.vy > 0.05){
                    if (window.soundMan) window.soundMan.play("land", Math.min(1, this.vy/0.3)); // play land sound with volume based on fall speed
                }
                if (bounce === 1 && !this.bounced) this.bounced = true;
                else if (!this.input.getAxis(this.inputMap.y) > 0.5) this.bounced = false; // If a player has charge they can keep bouncing to gain height
                this.canJump = true;
                if(spawnParticles) this.world.ParticleManager.spawnAt(this.x+1/2, this.y+1-this.shrink-0.1, {"speed": 0.1+this.vy, "accelY": 0, "accelX": 0.7, "colors": ["#41c9ff"]});
            }
            this.vx = collision.vlos.x;
            this.vy = collision.vlos.y;
            for (let side in collision.collided) {
                if (collision.collided[side]) this.collidingSides[side] = true;
            }
        }
        for (let poly of extraCollisions){
            let bounce = 0;
            let shrink = this.shrink;
            let spawnParticles = false;
            if (this.vy > 0.3 && this.input.getAxis(this.inputMap.y) > 0.5 && this.canJump && (!this.bounced || this.charge >= 1)) {
                bounce = 1
                spawnParticles = true;
                // play sound
            }; // High bounce when fast falling
            if (this.vy > 0.1 && this.input.getAxis(this.inputMap.y) > 0.5 && this.canJump && (!this.bounced || this.charge >= 1)) {
                bounce = 1
                spawnParticles = true;
            }; // Small bounce if fast falling but not above threshold
            const collision = Geometry.spriteToTile({x: this.x+shrink, y: this.y+shrink},{x: this.vx, y: this.vy}, {x: this.w-shrink*2, y: this.h-shrink*2}, {x: poly.x, y: poly.y}, {x: poly.w, y: poly.h}, this.buffer, bounce);
            if(!collision.collided) continue;
            if(!poly.ignoreX) this.x = collision.pos.x-shrink;
            if(!poly.ignoreY) this.y = collision.pos.y-shrink;
            if(collision.collided.bottom){
                if (this.vy > 0.05){
                    if (window.soundMan) window.soundMan.play("land", Math.min(1, this.vy/0.3)); // play land sound with volume based on fall speed
                }
                if (bounce === 1 && !this.bounced) this.bounced = true;
                else if (!this.input.getAxis(this.inputMap.y) > 0.5) this.bounced = false; // If a player has charge they can keep bouncing to gain height
                this.canJump = true;
                if(spawnParticles) this.world.ParticleManager.spawnAt(this.x+1/2, this.y+1-this.shrink-0.1, {"speed": 0.1+this.vy, "accelY": 0, "accelX": 0.7, "colors": ["#41c9ff"]});
            }
            this.vx = collision.vlos.x;
            this.vy = collision.vlos.y;
            for (let side in collision.collided) {
                if (collision.collided[side]) this.collidingSides[side] = true;
            }
            onCollide(collision);
        } 

        // check for collisions with other players 
        Object.keys(this.world.players).forEach(key => {
            const otherPlayer = this.world.players[key];
            if (otherPlayer === this) return; // skip self
            const collision = Geometry.spriteToTile({x: this.x+this.shrink, y: this.y+this.shrink},{x: this.vx, y: this.vy}, {x: this.w-this.shrink*2, y: this.h-this.shrink*2}, {x: otherPlayer.x+otherPlayer.shrink, y: otherPlayer.y+otherPlayer.shrink}, {x: otherPlayer.w-otherPlayer.shrink*2, y: otherPlayer.h-otherPlayer.shrink*2}, this.buffer, 0.2);
            if(!collision.collided) return;
            // treat other player as a solid object
            this.x = collision.pos.x-this.shrink;
            this.y = collision.pos.y-this.shrink;
            // conservation of momentum
            if (!this.collidingSides.bottom && collision.collided.top && otherPlayer.vy > 0) {
                this.vy = otherPlayer.vy;
            } else if (!this.collidingSides.top && collision.collided.bottom && otherPlayer.vy < 0) {
                this.vy = otherPlayer.vy;
            }  else {
                this.vy = collision.vlos.y;
            }
            if (!this.collidingSides.top && collision.collided.bottom) {
                this.canJump = true; // allow jump if player is on top of another player
            }
            if (!this.collidingSides.right && collision.collided.left && otherPlayer.vx > 0) {
                this.vx = otherPlayer.vx;
            } else if (!this.collidingSides.left && collision.collided.right && otherPlayer.vx < 0) {
                this.vx = otherPlayer.vx;
            } else {
                this.vx = collision.vlos.x;
            }
            for (let side in collision.collided) {
                if (collision.collided[side]) this.collidingSides[side] = true;
            } 
        });
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
    getHitbox(){
        return {
            x: this.x+this.shrink,
            y: this.y+this.shrink,
            w: this.w-this.shrink*2,
            h: this.h-this.shrink*2
        }
    }
}