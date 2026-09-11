export default class Battery {
    constructor(world, x, y, w, h, amount = 1) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.world = world;
        this.amount = amount;
        this.timer = 0;
        this.frame = 0;
        this.players = world.players; // reference to players for charging
        this.frameCount = 4; // number of frames in the battery animation
        this.slowFrameRate = 10; // how many updates before advancing the frame
        this.attackHitbox = {
            "shape": "circle",
            "x": this.x + this.w/2,
            "y": this.y + this.h/2,
            "r": 0.25
        }
    }
    update(){
        Object.keys(this.players).forEach(key => {
            const player = this.players[key];
            const dx = (player.x+0.5) - (this.x + 0.5);
            const dy = (player.y+0.5) - (this.y + 0.5);
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 0.75) {
                const chargePlayer = (targetPlayer) => {
                    if (targetPlayer.charge < this.amount - 1) return;
                    if (targetPlayer.charge < this.amount) {
                        this.world.ParticleManager.spawnAt(targetPlayer.x+0.5, targetPlayer.y+0.5, {"speed": 0.1, "colors": ["#41c9ff"]});
                        window.soundMan.play("battery", 1);
                        targetPlayer.charge = this.amount;
                    }
                };
                chargePlayer(player);
                // give other players charge as well
                Object.keys(this.players).forEach(otherKey => {
                    if (otherKey !== key) {
                        const otherPlayer = this.players[otherKey];
                        chargePlayer(otherPlayer);
                    }
                });
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
        let image = this.world.images[this.amount > 1 ? "overcharge" : "battery"];
        const frameWidth = image.width / (this.frameCount);
        ctx.drawImage(image, this.frame * frameWidth, 0, frameWidth, image.height, this.x, this.y, this.w, this.h);
    }

}