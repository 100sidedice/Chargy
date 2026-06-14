export default class Phone {
    constructor(world, x, y, w, h, maxCharge = 5) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
        this.world = world;
        this.frame = 0;
        this.charging = false;
        this.players = world.players; // reference to players for charging
        this.charge = 0;
        this.maxCharge = maxCharge;
        this.connectedPlayers = []
    }
    update(){
        // if players close enough, start charging
        Object.keys(this.players).forEach(key => {
            const player = this.players[key];
            if (player.charging || this.connectedPlayers.includes(key)) {
                if (this.connectedPlayers.includes(key) && player.charge <= 0) {
                    //remove, since player shouldn't be charging anymore
                    this.connectedPlayers = this.connectedPlayers.filter(k => k !== key);
                    player.charging = false;
                    player.chargeCallback = ()=>{};
                }
            }; // already charging or connected, don't reconnect
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 1.5) { // adjust this distance as needed
                this.charging = true;
                player.charging = true;
                // hook onto player's charge callback to update phone charge
                player.chargeCallback = (currCharge, amount)=>{
                    this.charge += amount;
                    if (this.charge > this.maxCharge) this.charge = this.maxCharge;
                };
                player.chargeX = this.x;
                player.chargeY = this.y;
                this.connectedPlayers.push(key);
            }
        });
        if (this.charge >= this.maxCharge) {
            this.charge = this.maxCharge;
            if (this.connectedPlayers.length > 0) {
                this.connectedPlayers.forEach(key => {
                    const player = this.players[key];
                    player.charging = false;
                    player.chargeCallback = ()=>{}; // disconnect charge callback
                });
                this.connectedPlayers = [];
            }
            this.charging = false;
            
            // fully charged, do something (e.g. open door, end level, etc.)
        }

        // set frame based on charging state, 11 frames in total
        if(this.charge>0){
            let percent = this.charge / this.maxCharge;
            this.frame = Math.floor(percent * 10)+1;
            if (this.frame > 10) this.frame = 10;
        }

    }
    draw(ctx){
        let image = this.world.images["phone"];
        const frameWidth = image.width / 12; // assuming 11 frames in a row
        if(this.charge>0) ctx.drawImage(image, this.frame * frameWidth, 0, frameWidth, image.height, this.x, this.y, this.w, this.h);
        if(this.charge<=0) ctx.drawImage(image, 0 * frameWidth, 0, frameWidth, image.height, this.x, this.y, this.w, this.h);
        if(this.charge>=this.maxCharge) ctx.drawImage(image, 11 * frameWidth, 0, frameWidth, image.height, this.x, this.y, this.w, this.h);
        
    }

}