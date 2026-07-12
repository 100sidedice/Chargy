export default class RoboGoober {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.x = data.x;
        this.y = data.y;
        this.data = data;
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
        this.attackLoops = 0;
        this.state = data.state || 0;
        this.attackHitbox = {
            x: this.x+0.4,
            y: this.y+0.4,
            w: 1-0.8,
            h: 1-0.8
        }
        this.rot = 0;
    }
    update(){
        const buttonState = this.world.buttonState % 2 === this.state;
        if (buttonState) {
            this.currentAnimation = "off";
            this.frame = 0;
            return;
        }
        const anim = this.animations[this.currentAnimation];
        const frameRate = anim.frameRate
        this.frameTimer++;
        if(this.frameTimer >= frameRate){
            this.frame = (this.frame + 1) % anim.frames;
            this.frameTimer = 0;
        }
        // if attack animation is done, switch back to walk
        if (this.currentAnimation === "compute" && this.frame < anim.frames - 1) {
            this.speed = 0; // stop moving while computing
        }
        if(this.currentAnimation === "compute" && this.frame === anim.frames - 1){
            this.currentAnimation = "attack";
            this.frame = 1;
            this.frameTimer = 0;
            this.speed = this.data.attackSpeed;
            this.attackLoops = 0;
        }
        if(this.currentAnimation === "attack" && this.frame === 0 && this.attackLoops >10){
            this.currentAnimation = "walk";
            this.speed = this.data.speed;
            this.frame = 0;
            this.frameTimer = 0;
            this.attackLoops = 0;
        }
        if (this.currentAnimation === "attack" && this.frame === anim.frames - 1) {
            this.attackLoops++;
            this.frame = 0;
        }
        const target = this.path[this.nextPoint];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        
        let dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < this.speed){
            this.x = target.x;
            this.y = target.y;
            this.nextPoint = (this.nextPoint + 1) % this.path.length;
        } else if (dist !== 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        if (dx > 0) {
            this.lastDir = 1;
        } else if (dx < 0) {
            this.lastDir = -1;
        }
        if (target.rot !== undefined) {
            this.rot = target.rot;
        } else {
            const prevPoint = this.path[(this.nextPoint - 1 + this.path.length) % this.path.length];
            if (prevPoint.rot !== undefined) {
                this.rot = prevPoint.rot;
                if (Math.abs(this.rot % 180) === 90) {
                    if (dy > 0) {
                        this.lastDir = -1;
                    } else {
                        this.lastDir = 1;
                    }
                }
            }else {
                this.rot = 0;
            }
        }
        if (this.currentAnimation === "off" && this.world.buttonState % 2 === this.state) {
            this.currentAnimation = "walk";
            this.frame = 0;
            this.frameTimer = 0;
        }
        this.collide();
    }
    draw(ctx) {
        const anim = this.animations[this.currentAnimation];
        const framex = this.width * this.frame;
        const framey = this.height * anim.row;
        const w = this.width / 16;
        const h = this.height / 16;
        ctx.save();
        ctx.translate(this.x + w / 2, this.y + h / 2);
        ctx.rotate(this.rot * Math.PI / 180);
        if (this.lastDir === -1) {
            ctx.scale(-1, 1);
        }
        ctx.drawImage(this.img,framex,framey,this.width,this.height,-w / 2,-h / 2,w,h);
        ctx.restore();
    }
    collide(){
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
            // if a player touches the roboGoober's path, switch to compute animation
            if(rectTouchesPath(playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h, this.path)){
                if(this.currentAnimation !== "compute" && this.currentAnimation !== "attack"){
                    this.currentAnimation = "compute";
                    window.soundMan.play("compute", 0.5);
                    this.frame = 0;
                    this.frameTimer = 0;
                }
            }
        });

        // robo goobers can interact with buttons
        // filter entities to only buttons
        const buttons = Object.values(this.world.entities).filter(entity => entity.type === "button");
        // no collide method on button, so just check if the roboGoober's hitbox overlaps with the button's hitbox
        buttons.forEach(button => {
            const buttonHitbox = button.attackHitbox;
            if(this.attackHitbox.x < buttonHitbox.x + buttonHitbox.w &&
                this.attackHitbox.x + this.attackHitbox.w > buttonHitbox.x &&
                this.attackHitbox.y < buttonHitbox.y + buttonHitbox.h &&
                this.attackHitbox.y + this.attackHitbox.h > buttonHitbox.y){
                // if the roboGoober is touching the button, toggle the button state
                if(button.state === this.world.buttonState % 2){
                    this.world.buttonState++;
                    window.soundMan.play("button", 0.5);
                }
            }
        });
    }
}


function rectTouchesPath(rectX, rectY, rectW, rectH, path) {
    const left = rectX;
    const right = rectX + rectW;
    const top = rectY;
    const bottom = rectY + rectH;

    // Check if a point is inside the rectangle
    function pointInRect(px, py) {
        return px >= left && px <= right &&
               py >= top && py <= bottom;
    }

    // Check if two line segments intersect
    function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) return false; // parallel

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    // Rectangle edges
    const edges = [
        [left, top, right, top],       // top
        [right, top, right, bottom],   // right
        [right, bottom, left, bottom], // bottom
        [left, bottom, left, top]      // left
    ];

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];

        // Endpoint inside rectangle?
        if (pointInRect(p1.x+0.5, p1.y+0.5) || pointInRect(p2.x+0.5, p2.y+0.5)) {
            return true;
        }

        // Segment intersects any rectangle edge?
        for (const edge of edges) {
            if (
                lineIntersectsLine(
                    p1.x+0.5, p1.y+0.5, p2.x+0.5, p2.y+0.5,
                    edge[0], edge[1], edge[2], edge[3]
                )
            ) {
                return true;
            }
        }
    }

    return false;
}