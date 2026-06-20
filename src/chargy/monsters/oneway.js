export default class Oneway {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.spriteData = spriteData;
        this.data = data;
        this.attackHitbox = {
            x: this.data.x,
            y: this.data.y,
            w: 1,
            h: 1,
            shape: "rect",
            dir: this.data.dir,
            ignoreX: this.data.dir === "up" || this.data.dir === "down",
            ignoreY: this.data.dir === "left" || this.data.dir === "right"
        }
        this.lastChecked = 0;
    }
    update(){
        for (const player of Object.values(this.world.players)){
            this.collide(player);
        }
    }
    draw(ctx){
        let dir = this.data.dir;
        // if button state is active (mod 2 === 1), reverse the direction of the one-way
        if (this.world.buttonState % 2 === 1) {
            if (dir === "up") dir = "down";
            else if (dir === "down") dir = "up";
            else if (dir === "left") dir = "right";
            else if (dir === "right") dir = "left";
        }
        let rot=0;
        if (dir === "up") rot = 0;
        else if (dir === "down") rot = Math.PI;
        else if (dir === "left") rot = -Math.PI / 2;
        else if (dir === "right") rot = Math.PI / 2;
        ctx.save();
        ctx.translate(this.data.x + 0.5, this.data.y + 0.5);
        ctx.rotate(rot);
        ctx.drawImage(this.img, 0, 0, this.spriteData.w, this.spriteData.h, -0.5, -0.5, 1, 1);
        ctx.restore();
    }
    collide(player){
        let dir = this.data.dir;
        // if button state is active (mod 2 === 1), reverse the direction of the one-way
        if (this.world.buttonState % 2 === 1) {
            if (dir === "up") dir = "down";
            else if (dir === "down") dir = "up";
            else if (dir === "left") dir = "right";
            else if (dir === "right") dir = "left";
        }
        const hitbox = this.attackHitbox;
        if (player.vy > 0 && dir === "down") {
            return; 
        }
        if (player.vy < 0 && dir === "up") {
            return; 
        }
        if (player.vx > 0 && dir === "right") {
            return; 
        }
        if (player.vx < 0 && dir === "left") {
            return; 
        }
        if (this.data.allowFall && player.input.getAxis(player.inputMap.y) === 1) {
            this.lastChecked = performance.now();
            return; 
        }
        if (performance.now() - this.lastChecked < 100) return;
        player.collide([hitbox]);
        
    }
}