export default class ChargePanel {
    constructor(world, spriteData, data){
        this.world = world;
        this.spriteData = spriteData;
        this.data = data;
        this.hitboxes = [];
        this.type = "chargePanel";
        this.dir = data.dir ?? 0;
        this.attackHitbox = {
            x: this.data.x,
            y: this.data.y,
            w: 0.1,
            h: 1,
            shape: "rect"
        }
        if (this.dir === 1) {
            this.attackHitbox.x += 0.9;
        }
        if (this.dir === 2) {
            this.attackHitbox.w = 1;
            this.attackHitbox.h = 0.1;
        }
    }
    update(){
        const players = Object.values(this.world.players);
        for (const player of players){
            this.collide(player);
        };
    }
    draw(ctx){}
    collide(player){
        player.collide([this.attackHitbox], (collision)=>{
            if (collision){
                // if player touching charge panel, they can move freely vertically
                player.vy *= 0.98;
                player.velY = player.input.getAxis(player.inputMap.y);
                player.vy += player.velY * 0.01;
            }
        });
    }
}