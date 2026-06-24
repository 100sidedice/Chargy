export default class Rocket {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.spriteData = spriteData;
        this.data = data;
        this.anim = "static"
        this.attackHitbox = {
            x: this.data.x+0.5,
            y: this.data.y,
            w: 1,
            h:4,
            shape: "rect"
        }
    }
    update(){
        // if close to a player, set all players to invisible, start countdown
        const players = this.world.players;
        Object.values(players).forEach(player => {
            player.collide([this.attackHitbox],()=>{this.countdown()})
        })
        if (this.anim === "takeoff"){
            this.data.y -= 0.1;
        }
    }
    countdown(){
        if (this.anim === "active" || this.anim === "takeoff") return; // don't restart countdown if already active
        this.anim = "active";
        document.getElementById("Label").textContent = "3!!!";
        Object.values(this.world.players).forEach(player => {
            player.visible = false;
        })
        this.world.shakeRocket();
        setTimeout(()=>{
            document.getElementById("Label").textContent = "2!!!!!";
            setTimeout(()=>{
                document.getElementById("Label").textContent = "1!!!!";
                setTimeout(()=>{
                    document.getElementById("Label").textContent = "0!!!!!!!!!";
                    this.anim = "takeoff";
                }, 1000)
            }, 1000)
        }, 1000)
    }
    draw(ctx){
        // static [in a 4x4 matrix, it's 2x4 centered]
        let startX = 16;
        let startY = this.spriteData["animations"][this.anim].row*64;
        if (this.anim === "takeoff" && this.frame === 1){
            startX += 4;
        }
        ctx.drawImage(this.img, startX, startY, 64, 64, this.data.x, this.data.y+1, 4, 4);
    }
}