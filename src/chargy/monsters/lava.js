export default class Lava {
    constructor(world, data){
        this.world = world;
        this.data = data;
        this.attackHitbox = {
            x: data.x,
            y: data.y+0.5,
            w: data.w ?? 1,
            h: data.h ?? 1-0.5,
            shape: "rect"
        };
        this.cooldown = 0;
    }
    update(){
        if (this.cooldown > 0) this.cooldown--;
        for (const player of Object.values(this.world.players)) {
            this.collide(player);
        }
    }
    draw(ctx){}
    collide(player){
        if (this.cooldown > 0 || player.charge >= (this.data.immuneCharge ?? 2)) return;
        player.collide([this.attackHitbox], collision => {
            if (!collision || this.cooldown > 0) return;
            this.cooldown = 30;
            player.x = this.world.levelData[this.world.level].playerX;
            player.y = this.world.levelData[this.world.level].playerY;
            player.vx = 0;
            player.vy = 0;
            Object.values(this.world.phones).forEach(phone => {
                phone.charge = 0;
                phone.charging = false;
            });
            this.world.shakeCamera();
        });
    }
}
