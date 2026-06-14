export default class Battery {
    constructor(world, x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.world = world;
        this.timer = 0;
        this.frame = 0;
        this.players = world.players; // reference to players for charging
        this.frameCount = 4; // number of frames in the battery animation
        this.slowFrameRate = 10; // how many updates before advancing the frame
    }
    update(){
        Object.keys(this.players).forEach(key => {
            const player = this.players[key];
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 0.5) {
                player.charge = 1;
            }
        });
        this.timer++;
        if (this.timer >= this.slowFrameRate) {
            this.timer = 0;
            this.frame++;
        }
        if (this.frame > this.frameCount-1) this.frame = 0;
    }
    draw(ctx){
        let image = this.world.images["battery"];
        const frameWidth = image.width / (this.frameCount);
        ctx.drawImage(image, this.frame * frameWidth, 0, frameWidth, image.height, this.x, this.y, this.w, this.h);
    }

}