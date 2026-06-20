export default class Button {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.spriteData = spriteData;
        this.data = data;
        this.state = data.state ?? 0
        this.attackHitbox = {
            x: this.data.x,
            y: this.data.y+0.5,
            w: 1,
            h: 0.5,
            shape: "rect",
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

        // 2 frames, 16x16, first is state 0, second is state 1
        const frameX = state * this.spriteData.w;
        const frameY = 0;
        
        ctx.drawImage(this.img, frameX, frameY, this.spriteData.w, this.spriteData.h, this.data.x, this.data.y, 1, 1);
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