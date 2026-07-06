export default class Button {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.spriteData = spriteData;
        this.data = data;
        this.state = data.state ?? 0
        this.type = "button";
        this.rot = data.rot ?? 0;
        this.attackHitbox = {
            x: this.data.x,
            y: this.data.y+0.5,
            w: 1,
            h: 0.5,
            shape: "rect",
        }
        // rotate hitbox based on rotation
        if (this.rot === 90) {
            this.attackHitbox.x = this.data.x+0.5;
            this.attackHitbox.y = this.data.y;
            this.attackHitbox.w = 0.5;
            this.attackHitbox.h = 1;
        } else if (this.rot === 180) {
            this.attackHitbox.x = this.data.x;
            this.attackHitbox.y = this.data.y;
            this.attackHitbox.w = 1;
            this.attackHitbox.h = 0.5;
        } else if (this.rot === 270) {
            this.attackHitbox.x = this.data.x;
            this.attackHitbox.y = this.data.y+0.5;
            this.attackHitbox.w = 0.5;
            this.attackHitbox.h = 1;
        }
        this.lastChecked = 0;
    }
    update(){
        for (const player of Object.values(this.world.players)){
            this.collide(player);
        }
    }
    draw(ctx){
        let state = this.world.buttonState % 2;
        if (this.state === 1) state = 1 - state; // invert state if this button is inverted

        // 2 frames, 16x16, first is state 0, second is state 1
        const frameX = state*16;
        if (this.rot === 0) {
            ctx.drawImage(this.img, frameX, 0, 16, 16, this.data.x, this.data.y, 1, 1);
        } else {
            ctx.save();
            ctx.translate(this.data.x + 0.5, this.data.y + 0.5);
            ctx.rotate(this.rot * Math.PI / 180);
            ctx.drawImage(this.img, frameX, 0, 16, 16, -0.5, -0.5, 1, 1);
            ctx.restore();
        }
    }
    collide(player){
        // we can only collide with un-pressed buttons
        if (this.world.buttonState % 2 !== this.state) return;
        if (player.vy < 0.1) return; // only collide if player is moving down onto the button with sufficient speed
        const hitbox = this.attackHitbox;
        player.collide([hitbox], (collision)=>{
            this.world.buttonState++;
        });
        
    }
}