export default class GrassGoober {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.x = data.x;
        this.y = data.y;
        this.width = spriteData.w;
        this.height = spriteData.h;
        this.animations = spriteData.animations;
        this.currentAnimation = "walk";
        this.frame = 0;
        this.path = data.path;
        this.speed = data.speed;
        this.nextPoint = 1;
        this.frameTimer = 0;
        this.lastDir = 1;
        this.attackDir = 1;
        this.attackedPlayer = null;

        
    }
    update(){
        const anim = this.animations[this.currentAnimation];
        const frameRate = anim.frameRate
        this.frameTimer++;
        if(this.frameTimer >= frameRate){
            this.frame = (this.frame + 1) % anim.frames;
            this.frameTimer = 0;
        }
        // if attack animation is done, switch back to walk
        if(this.currentAnimation === "attack" && this.frame === 0){
            this.currentAnimation = "walk";
            // Collision detected, reset player position
            this.attackedPlayer.x = this.world.levelData[this.world.level].playerX;
            this.attackedPlayer.y = this.world.levelData[this.world.level].playerY;
        }
        const target = this.path[this.nextPoint];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < this.speed){
            this.x = target.x;
            this.y = target.y;
            this.nextPoint = (this.nextPoint + 1) % this.path.length;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        if (dx > 0) {
            this.lastDir = 1;
        } else if (dx < 0) {
            this.lastDir = -1;
        }
        this.collide();
    }
    draw(ctx){
        const anim = this.animations[this.currentAnimation];
        const framex = this.width * this.frame;
        const framey = this.height * anim.row; // Assuming single row of animations
        let dir = this.lastDir;
        if (this.currentAnimation === "attack") {
            dir = this.attackDir;
        }
        if (dir === -1) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, framex, framey, this.width, this.height, -this.x - this.width/16, this.y, this.width/16, this.height/16);
            ctx.restore();
        } else {
            ctx.drawImage(this.img, framex, framey, this.width, this.height, this.x, this.y, this.width/16, this.height/16);
        }
    }
    collide(){
        if(this.currentAnimation === "attack")return;
        this.attackHitbox = {
            x: this.x+0.4,
            y: this.y+0.4,
            w: 1-0.8,
            h: 1-0.8
        }
        Object.values(this.world.players).forEach(player => {
            const buffer = 0.4; // Small buffer to make collision feel more fair
            const playerHitbox = player.getHitbox();
            if(playerHitbox.x < this.attackHitbox.x + this.attackHitbox.w&&
                playerHitbox.x + playerHitbox.w > this.attackHitbox.x &&
                playerHitbox.y < this.attackHitbox.y + this.attackHitbox.h &&
                playerHitbox.y + playerHitbox.h > this.attackHitbox.y){
                // keyframe shake effect
                this.world.shakeCamera().then(() => {
                    this.currentAnimation = "attack"
                    this.attackDir = player.x < this.x ? -1 : 1;
                    this.attackedPlayer = player;
                    this.frame = 1; // so it does not reset to 0 immediately and switch back to walk right away
                    // reset phones
                    Object.values(this.world.phones).forEach(phone => {
                        phone.charge = 0;
                        phone.charging = false;
                    });
                });
            }
        });
    }
}