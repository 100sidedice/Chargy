export default class Rocktobot {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.rockImg = world.images["rock"];
        this.x = data.x;
        this.y = data.y;
        this.data = data;
        this.width = spriteData.w;
        this.height = spriteData.h;
        this.animations = spriteData.animations;
        this.currentAnimation = "idle";
        this.frame = 0;
        this.rockFrame = 0;
        this.rocks = [2, 4]; // single numbers; they don't need complex collision
        this.frameTimer = 0;
        this.dir = data.dir;
        this.range = data.range;
        this.attackedPlayer = null;
        this.attackLoops = 0;
        this.attackHitbox = {
            x: this.x+0.1,
            y: this.y+0.4,
            w: 1-0.8,
            h: 1-0.8
        }
        this.state = data.state || 1;
    }
    update(){
        // if rocks are out of range, remove them
        this.rocks = this.rocks.filter(rockDistance => rockDistance <= this.range);
        this.rocks.forEach((rockDistance, index) => {
            this.rocks[index] += 0.1; // move rocks forward
        });
        const buttonState = this.world.buttonState % 2 === this.state;
        if (buttonState) {
            this.currentAnimation = "off";
            this.frame = 0;
            return;
        }else if (this.currentAnimation === "off") {
            this.currentAnimation = "idle";
            this.frame = 0;
            this.frameTimer = 0;
        }
        const anim = this.animations[this.currentAnimation];
        const frameRate = anim.frameRate
        this.frameTimer++;
        if(this.frameTimer >= frameRate){
            this.frame = (this.frame + 1) % anim.frames;
            this.frameTimer = 0;
            this.rockFrame = (this.rockFrame + 1) % 2;
        }
        if(this.currentAnimation === "attack" && this.frame === 0 && this.attackLoops > 0){
            this.currentAnimation = "idle";
            this.frame = 0;
            this.frameTimer = 0;
            this.attackLoops = 0;
            this.rocks.push(0); // add a rock at the max range
        }
        if (this.currentAnimation === "attack" && this.frame === anim.frames - 1) {
            this.attackLoops++;
            this.frame = 0;
        }
        
        this.collide();
        
    }
    draw(ctx){
        const anim = this.animations[this.currentAnimation];
        const framex = this.width * this.frame;
        const framey = this.height * anim.row;

        const cropBuffer = 1/8 // shrink to avoid neighboring frame pixel bleed
        if (this.dir === 1) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, framex + cropBuffer, framey + cropBuffer, this.width - 2 * cropBuffer, this.height - 2 * cropBuffer, -this.x - this.width/16, this.y, this.width/16, this.height/16);
            ctx.restore();
        } else {
            ctx.drawImage(this.img, framex + cropBuffer, framey + cropBuffer, this.width - 2 * cropBuffer, this.height - 2 * cropBuffer, this.x, this.y, this.width/16, this.height/16);
        }
        // draw rocks
        // rocks are simple distances (array[number]), direction of dir
        this.rocks.forEach(rockDistance => {
            const rockX = this.x + (this.dir === 1 ? rockDistance : -rockDistance);
            const rockY = this.y + 0.1;
            const rockWidth = 0.8;
            const rockHeight = 0.8;
            const rockFrameX = this.rockFrame * 16;
            ctx.drawImage(this.rockImg, rockFrameX, 0, 16, 16, rockX, rockY, rockWidth, rockHeight);
        });
    }
    collide(){
        if (this.world.buttonState % 2 === this.state) return;
        if(this.currentAnimation === "compute")return;
        this.attackHitbox = {
            x: this.x+0.4,
            y: this.y+0.4,
            w: 1-0.8,
            h: 1-0.8
        }
        Object.values(this.world.players).forEach(player => {
            const playerHitbox = player.getHitbox();
            if(playerHitbox.x < this.attackHitbox.x + this.attackHitbox.w&&
                playerHitbox.x + playerHitbox.w > this.attackHitbox.x &&
                playerHitbox.y < this.attackHitbox.y + this.attackHitbox.h &&
                playerHitbox.y + playerHitbox.h > this.attackHitbox.y){
                // keyframe shake effect
                this.world.shakeCamera().then(() => {
                    this.attackDir = player.x < this.x ? -1 : 1;
                    this.attackedPlayer = player;
                    // reset phones
                    Object.values(this.world.phones).forEach(phone => {
                        phone.charge = 0;
                        phone.charging = false;
                    });
                    this.attackedPlayer.x = this.world.levelData[this.world.level].playerX;
                    this.attackedPlayer.y = this.world.levelData[this.world.level].playerY;
                    this.attackedPlayer = null;
                });
            }
            function isPlayerInRange(player, rocktobot) {
                if (player.y < rocktobot.y || player.y > rocktobot.y + 1) {
                    return false;
                }
                if (rocktobot.dir === 1 && player.x > rocktobot.x && player.x < rocktobot.x + rocktobot.range) {
                    return true;
                } else if (rocktobot.dir === -1 && player.x < rocktobot.x && player.x > rocktobot.x - rocktobot.range) {
                    return true;
                }
                return false;
            }
            if (isPlayerInRange(player, this)) {
                this.startAttack();
            }
            // rock collision (simple distance check)
            this.rocks.forEach(rockDistance => {
                const rockX = this.x + (this.dir === 1 ? rockDistance : -rockDistance);
                const rockY = this.y + 0.1;
                const collisionRange = 0.8; // same as rock width/height
                const playerDist = Math.sqrt(Math.pow(player.x - rockX, 2) + Math.pow(player.y - rockY, 2));
                if (!playerDist) playerDist = 0; // avoid NaN
                if (playerDist < collisionRange) {
                    // keyframe shake effect
                    this.world.shakeCamera().then(() => {
                        this.attackDir = player.x < this.x ? -1 : 1;
                        this.attackedPlayer = player;
                        // reset phones
                        Object.values(this.world.phones).forEach(phone => {
                            phone.charge = 0;
                            phone.charging = false;
                        });
                        this.attackedPlayer.x = this.world.levelData[this.world.level].playerX;
                        this.attackedPlayer.y = this.world.levelData[this.world.level].playerY;
                        this.attackedPlayer = null;
                        // remove charge from player
                        player.charge = 0;
                        player.charging = false;
                    });
                    // remove rock from array
                    this.rocks = this.rocks.filter(d => d !== rockDistance);
                }
            })
        });
    }
    startAttack() {
        if (this.currentAnimation === "attack") return
        this.currentAnimation = "attack";
        this.frame = 0;
        this.attackLoops = 0;
    }
}

 