export default class Wire {
    constructor(world, spriteData, data){
        this.world = world;
        this.spriteData = spriteData;
        this.data = data;
        this.hitboxes = [];
        this.type = "wire";
        for (const node of this.data.nodes){
            this.hitboxes.push({
                x: node.x,
                y: node.y,
                radius: 0.15,
                shape: "circle",
                up: node.up,
                down: node.down,
                left: node.left,
                right: node.right
            })
        }
        this.hash = Math.random().toString(36).substring(2, 15);
        this.moveTime = 200;
        this.exit = false;
    }
    update(){
        const players = Object.values(this.world.players);
        for (const player of players){
            this.collide(player);
            if (!player.inWire) continue;
            if (player.wireHash !== this.hash) continue;
            if (player.exitWire && player.exitWire + 1000 > performance.now()) continue;
            player.x += player.vx;
            player.y += player.vy;
            player.vy *=0.8;
            player.vx *=0.8;
            if (!player.inWire) continue;
            if (player.wireHash !== this.hash) continue;
            let yAxis = player.input.getAxis(player.inputMap.y);
            let xAxis = player.input.getAxis(player.inputMap.x);
            if (yAxis === 0 && xAxis === 0) continue;
            if (xAxis === 1 && yAxis === 1){ // diagonal down-right
                // exit wire
                player.inWire = false;
                player.wireHash = null;
                player.wireHitbox = null;
                player.lastWireMove = performance.now();
                return;
            }
            if (xAxis === 1) {
                player.vx = 0.1;
                player.lastWireMove = performance.now();
            }
            if (xAxis === -1) {
                player.vx = -0.1;
                player.lastWireMove = performance.now();
            }
            if (yAxis === 1) {
                player.vy = 0.1;
                player.lastWireMove = performance.now();
            }
            if (yAxis === -1) {
                player.vy = -0.1;
                player.lastWireMove = performance.now();
            }   
            player.collide();
        };
    }
    draw(ctx){}
    collide(player){
        if (player.exitWire && player.exitWire + 1000 > performance.now()) return; // recently exited, give them a grace period before re-entering
        if (player.wireHash && player.wireHash !== this.hash ) return; // if the player is already in a different wire, don't mess with them
        for (const hitbox of this.hitboxes){
            const dx = player.x+0.5 - hitbox.x-0.5;
            const dy = player.y+0.5 - hitbox.y-0.5;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < hitbox.radius + 0.5){
                let speed = 0.001;
                // adjust player vlos to target the center of the hitbox
                const angle = Math.atan2(dy, dx);
                const targetX = hitbox.x + 0.5 + Math.cos(angle) * (hitbox.radius - 0.5);
                const targetY = hitbox.y + 0.5 + Math.sin(angle) * (hitbox.radius - 0.5);
                player.vx += (targetX - (player.x + 0.5)) * speed;
                player.vy += (targetY - (player.y + 0.5)) * speed;
                if(!player.inWire) window.soundMan.play("cling", 0.8, 0.7);

                player.inWire = true;
                player.wireHash = this.hash;
                player.wireHitbox = hitbox;
                break;
            }
        }
        // if player is not in a wire hitbox technically, but marked as inWire, move to axis center of hitbox (so if close to wire but not close enough to hitbox center, it will still snap to the wire and not be jittery)
        if (player.inWire && player.wireHash === this.hash) {
            // get closer axis to center
            const distY = Math.abs((player.y + 0.5) - (player.wireHitbox.y + 0.5));
            const distX = Math.abs((player.x + 0.5) - (player.wireHitbox.x + 0.5));
            const hitbox = player.wireHitbox;
            const targetX = hitbox.x + 0.5;
            const targetY = hitbox.y + 0.5;

            if (distY < distX) {
                player.vy += (targetY - (player.y + 0.5)) * 0.3;
            } else if (distX < distY) {
                player.vx += (targetX - (player.x + 0.5)) * 0.3;
            }

            // if the wire does not go in the direction the player is in, exit wire. For example if too far down and the wire doesn't go down, exit wire
            if (player.wireHitbox){
                if (!player.wireHitbox.down && player.y+0.5 > player.wireHitbox.y+0.5 + 0.5) {
                    player.inWire = false;
                    player.wireHash = null;
                    player.wireHitbox = null;
                    player.exitWire = performance.now();
                }
                else if (!player.wireHitbox.up && player.y+0.5 < player.wireHitbox.y+0.5 - 0.5) {
                    player.inWire = false;
                    player.wireHash = null;
                    player.wireHitbox = null;
                    player.exitWire = performance.now();
                }
                else if (!player.wireHitbox.left && player.x+0.5 < player.wireHitbox.x+0.5 - 0.5) {
                    player.inWire = false;
                    player.wireHash = null;
                    player.wireHitbox = null;
                    player.exitWire = performance.now();
                }
                else if (!player.wireHitbox.right && player.x+0.5 > player.wireHitbox.x+0.5 + 0.5) {
                    player.inWire = false;
                    player.wireHash = null;
                    player.wireHitbox = null;
                    player.exitWire = performance.now();
                }
            }
        }
    }
}