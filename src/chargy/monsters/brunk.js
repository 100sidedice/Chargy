export default class Brunk {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.x = data.x;
        this.y = data.y;
        this.width = spriteData.w;
        this.height = spriteData.h;
        this.animations = spriteData.animations;
        this.currentAnimation = "idle";
        this.frame = 0;
        this.frameTimer = 0;
        this.dir = data.dir;
        this.attackedPlayer = null;

        this.hitboxes = [
            {x: this.x+1,y: this.y,w: 1,h: 2},
        ];
        if(this.dir === -1){
            this.hitboxes[0].x -= 1;
        }
        this.attackHitbox = {
            x: this.x,
            y: this.y+1-0.1,
            w: 1,
            h: 1.1
        }
        if(this.dir === -1){
            this.attackHitbox.x += 1;
        }
        // push hitbox to world geometry for collision detection
        this.onDeath = ()=>{
        }
        this.isPlatform = false;
    }
    update(){
        const anim = this.animations[this.currentAnimation];
        const frameRate = anim.frameRate
        this.frameTimer++;
        if(this.frameTimer >= frameRate){
            this.frame = (this.frame + 1) % anim.frames;
            this.frameTimer = 0;
        }
        if(this.currentAnimation === "attack" && this.frame === 0){
            // goto last frame
            this.frame = anim.frames - 1;
        }
        // if attack animation is done, switch back to walk
        if(this.currentAnimation === "attack" && this.attackedPlayer && this.frame === anim.frames - 1){
            this.currentAnimation = "idle";
            this.attackedPlayer.x = this.world.levelData[this.world.level].playerX;
            this.attackedPlayer.y = this.world.levelData[this.world.level].playerY;
            this.attackedPlayer = null;
        }
        if(this.currentAnimation === "attack" && this.frame === anim.frames - 1 && this.isPlatform === false){
            this.isPlatform = true;
            const platformHitbox = {
                x: this.x,
                y: this.y+1,
                w: 1,
                h: 1
            }
            if(this.dir === -1) {
                platformHitbox.x += 1;
            }
            this.hitboxes.push(platformHitbox);
            this.world.updateCollisions();
        }
        if (this.currentAnimation === "death" && this.frame === anim.frames - 1) {
            this.hitboxes = [];
            this.world.updateCollisions();
            this.onDeath(); // call destroy callback to remove from world
            return;
        }
        this.collide();
    }
    draw(ctx){
        const anim = this.animations[this.currentAnimation];
        const framex = this.width * this.frame;
        const framey = this.height * anim.row; // Assuming single row of animations
        if (this.dir === -1) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, framex+1/2, framey+1/2, this.width-2/2, this.height-2/2, -this.x-2, this.y, 2, 2);
            ctx.restore();
        } else {
            ctx.drawImage(this.img, framex+1/2, framey+1/2, this.width-2/2, this.height-2/2, this.x, this.y, 2, 2);
        }
    }
    collide(){
        if (this.currentAnimation === "death") return; // don't collide if dying
        Object.values(this.world.players).forEach(player => {
            const buffer = 0; // Small buffer to make collision feel more fair
            const playerHitbox = player.getHitbox();
            if(playerHitbox.x < this.attackHitbox.x + this.attackHitbox.w + buffer &&
                playerHitbox.x + playerHitbox.w > this.attackHitbox.x - buffer &&
                playerHitbox.y < this.attackHitbox.y + this.attackHitbox.h + buffer &&
                playerHitbox.y + playerHitbox.h > this.attackHitbox.y - buffer){
                    if(this.currentAnimation === "death") return; // don't attack if dying
                    // keyframe shake effect
                    if(this.frame === 0)this.frame = 1;
                    this.currentAnimation = "attack";
                    if(this.frame === 1 && !this.isPlatform) window.soundMan.play("brunkLift", 0.5);
                    if (this.frame === this.animations["attack"].frames - 2) {
                        // only kill player on second to last frame of attack animation, so they have a chance to react, and they can stand onto the hitbox without instantly dying
                        this.world.shakeCamera();
                        this.attackedPlayer = player;
                    }
                    if(this.frame === this.animations["attack"].frames - 1 && (player.charge||0) >= 1){
                        // kill self
                        this.currentAnimation = "death";
                        this.frame = 1;
                        window.soundMan.play("brunkKill", 0.5);
                    }
            }
        });
    }
}