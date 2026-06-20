import Tilemap from "../tilemaps/Tilemap.js";
import Player from "../chargy/player.js";
import Input from "../chargy/input.js";
import Phone from "../chargy/phone.js";
import Battery from "../chargy/battery.js";
import {Camera, Bezier, getEffect, createKeyframe} from "../camera/Camera.js";
import createMonsters from "../chargy/monsters/monsters.js";
import ParticleManager from "./particles.js";
import musicMan from "./musicman.js";
import SFXMan from "./SFXMan.js";

export default class World {
    constructor(canvas, ctx){
        this.tilemap = null;
        this.players = {};
        this.entities = {};
        this.phones = {};
        this.data = {};
        this.images = {};
        this.canvas = canvas;
        this.ctx = ctx;
        this.ParticleManager = new ParticleManager();
        this.collisions = [];

        this.level = 13;
        this.buttonState = 0; // button entity state


        this.levelTransition = {
            active: false,
        };
    }
    async preload(dataKey){
        const data = await fetch(dataKey).then(res => res.json());
        this.data = data;
        // load tilemap
        this.tilemap = new Tilemap();
        // load entity images
        const phone = await fetch(data["phone"]).then(res => res.blob());
        this.images["phone"] = await createImageBitmap(phone);
        const greenphone = await fetch(data["greenphone"]).then(res => res.blob());
        this.images["greenphone"] = await createImageBitmap(greenphone);
        const purplephone = await fetch(data["purplephone"]).then(res => res.blob());
        this.images["purplephone"] = await createImageBitmap(purplephone);
        const orangephone = await fetch(data["orangephone"]).then(res => res.blob());
        this.images["orangephone"] = await createImageBitmap(orangephone);
        const battery = await fetch(data["battery"]).then(res => res.blob());
        this.images["battery"] = await createImageBitmap(battery);
        
        // load player images
        const playerBase = await fetch(data["player-base"]).then(res => res.blob());
        const playerCharged = await fetch(data["player-charged"]).then(res => res.blob());
        this.images["player-base"] = await createImageBitmap(playerBase);
        this.images["player-charged"] = await createImageBitmap(playerCharged);
        
        // load level data
        const levelData = await fetch(data["levels"]).then(res => res.json());
        this.levelData = levelData;
        // create phones based on level data
        
        this.spriteData = await fetch(data["sprite-data"]).then(res => res.json());
        for (let key in this.spriteData) {
            const sprite = this.spriteData[key];
            if(!sprite.filePath) {
                continue;
            };
            const imgBlob = await fetch(sprite.filePath).then(res => res.blob());
            this.images[key] = await createImageBitmap(imgBlob);
        }

        // create player1
        this.input = new Input();
        this.players[1] = new Player(this, 5, 5, 1, 1, "player1", {"x":"Axis1", "y":"Axis2"}, this.input);  

        this.Camera = new Camera(this.canvas);
        this.lastChargeSteal = performance.now();
        this.chargeStealCooldown = 500; 
        this.bgParticles = 0;
        this.bgParticleCooldown = 200;// 1 second cooldown for spawning a new bg particle, to prevent spamming too many particles at start
        this.lastBgParticle = performance.now();
        
        
        // music
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.musicMan = new musicMan({
            world1: data["world1-soundtrack"],
            factory: data["factory-soundtrack"],
            spacestation: data["spacestation-soundtrack"]
        }, audioContext);
        this.sfxMan = new SFXMan({
            land: data["land-sound"],
            battery: data["battery-sound"],
            death: data["death-sound"],
            brunkKill: data["brunk-kill-sound"],
            pop: data["pop-sound"],
            transition: data["transition-sound"],
            ding: data["ding-sound"],
            compute: data["compute-sound"],
            cling: data["cling-sound"],
            brunkLift: data["brunk-lift-sound"]
        }, audioContext);
        
        await this.musicMan.preload();
        await this.sfxMan.preload();
        
        document.addEventListener("click", async () => {
            await this.musicMan.unlock();
            this.musicMan.start("spacestation", 0.1);
        }, { once:true });
        
        await this.switchLevel(this.level, null, "spacestation");
        // im exposing musicMan and sfxMan to window to allow entities and phones to play music and sfx without needing a reference to the world object
        window.musicMan = this.musicMan;
        window.soundMan = this.sfxMan; 
        
    }
    getBaseCamera() {
        const region = this.region;

        const scale = Math.min(
            this.canvas.width / (region.width * region.tileSize),
            this.canvas.height / (region.height * region.tileSize)
        );

        const trueTileSize = region.tileSize * scale;

        const renderWidth = region.width * trueTileSize;
        const renderHeight = region.height * trueTileSize;

        const xOffset = (this.canvas.width - renderWidth) / 2;
        const yOffset = (this.canvas.height - renderHeight) / 2;

        return {
            xOffset,
            yOffset,
            trueTileSize
        };
    }
    drawTilemap(){
        const region = this.region;
        const scale = Math.min(
            this.canvas.width / (region.width * region.tileSize),
            this.canvas.height / (region.height * region.tileSize)
        );
        const trueTileSize = region.tileSize * scale;
        const renderWidth = region.width * trueTileSize;
        const renderHeight = region.height * trueTileSize;
        const xOffset = (this.canvas.width - renderWidth) / 2;
        const yOffset = (this.canvas.height - renderHeight) / 2;
        this.tilemap.drawRegion(this.ctx,region,xOffset,yOffset,renderWidth,renderHeight);
        return [
            xOffset,
            yOffset,
            renderWidth,
            renderHeight,
            trueTileSize
        ];
    }
    draw(ctx) {
        ctx.fillStyle = "black";    
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const { xOffset, yOffset, trueTileSize } = this.getBaseCamera();

        this.Camera.push(ctx, {
            cameraX: xOffset,
            cameraY: yOffset,
            trueTileSize: trueTileSize,
            regionWidth: this.region.width*trueTileSize,
            regionHeight: this.region.height*trueTileSize
        })
        // draw goober world background if we're in level 13
        if (this.level === 13) {
            ctx.save();

            const gooberImg = this.images["gooberworld"];
            const worldX = xOffset + 6 * trueTileSize;
            const worldY = yOffset + -0.5 * trueTileSize;
            const worldW = 10 * trueTileSize;
            const worldH = 10 * trueTileSize;
            ctx.translate(worldX + worldW/2, worldY + worldH/2);
            ctx.rotate(Math.PI)// upside down? (light side of planet)
            ctx.drawImage(
                gooberImg,
                0, 0,
                gooberImg.width, gooberImg.height,
                -worldW/2, -worldH/2,
                worldW, worldH
            );

            ctx.restore();
        }
        if (this.level === 14) {
            ctx.save();

            const gooberImg = this.images["gooberworld"];
            const worldX = xOffset + 6 * trueTileSize;
            const worldY = yOffset + -1 * trueTileSize;
            const worldW = 10 * trueTileSize;
            const worldH = 10 * trueTileSize;

            ctx.drawImage(
                gooberImg,
                0, 0,
                gooberImg.width, gooberImg.height,
                worldX, worldY,
                worldW, worldH
            );

            ctx.restore();
        }
        // draw tilemap (bg + main layer)
        this.tilemap.drawRegion(
            ctx,
            this.region,
            xOffset,
            yOffset,
            this.region.width * trueTileSize,
            this.region.height * trueTileSize
        );

        // draw entities and players
        ctx.save();
            ctx.translate(xOffset, yOffset);
            ctx.scale(trueTileSize, trueTileSize);
            Object.values(this.phones).forEach(phone => phone.draw(ctx, this.images));
            Object.values(this.players).forEach(player => player.draw(ctx, this.images));
            Object.values(this.entities).forEach(entity => entity.draw(ctx, this.images));
            this.ParticleManager.draw(ctx);
            if(window.showHitboxes){
                // show ememy attack hitboxes
                Object.values(this.entities).concat(Object.values(this.phones)).forEach(entity => {
                    if(entity.attackHitbox) {
                        ctx.fillStyle = "#FFA50033";
                        if(entity.attackHitbox.shape === "circle"){
                            ctx.strokeStyle = "orange";
                            ctx.lineWidth = 0.05;
                            ctx.beginPath();
                            ctx.arc(entity.attackHitbox.x, entity.attackHitbox.y, entity.attackHitbox.r, 0, 2 * Math.PI);
                            ctx.fill();
                            ctx.stroke();
                        }else{
                            ctx.strokeStyle = "orange";
                            ctx.lineWidth = 0.05;
                            const rect = entity.attackHitbox;
                            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
                            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
                        }
                    }
                    // and paths
                    if(entity.path){
                        ctx.strokeStyle = "purple";
                        ctx.lineWidth = 0.05;
                        ctx.beginPath();
                        ctx.moveTo(entity.x+0.5, entity.y+0.5);
                        entity.path.forEach(point => {
                            ctx.lineTo(point.x+0.5, point.y+0.5);
                        });
                        ctx.stroke();
                        // show arrow for direction
                        ctx.strokeStyle = "orange";
                        ctx.lineWidth = 0.07;
                        const target = entity.path[entity.nextPoint];
                        const dx = target.x - entity.x;
                        const dy = target.y - entity.y;
                        const angle = Math.atan2(dy, dx);
                        ctx.beginPath();
                        ctx.moveTo(entity.x+0.5, entity.y+0.5);
                        ctx.lineTo(entity.x+0.5 + Math.cos(angle)*0.3, entity.y+0.5 + Math.sin(angle)*0.5);
                        ctx.stroke();
                        ctx.strokeStyle = "purple";
                        ctx.fillStyle = "purple";
                        // draw circle at next point
                        ctx.beginPath();
                        ctx.arc(target.x+0.5, target.y+0.5, 0.1, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                });
                // show wire hitboxes
                Object.values(this.entities).forEach(entity => {
                    if(entity.type && entity.type === "wire"){
                        ctx.strokeStyle = "blue";
                        ctx.lineWidth = 0.05;
                        entity.hitboxes.forEach(hitbox => {
                            if(hitbox.shape === "circle"){
                                ctx.beginPath();
                                ctx.arc(hitbox.x+0.5, hitbox.y+0.5, hitbox.radius, 0, 2 * Math.PI);
                                ctx.stroke();
                            } else {
                                ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
                            }
                        });
                    }
                });

                // show player hitboxes
                ctx.strokeStyle = "green";
                ctx.lineWidth = 0.05;
                Object.values(this.players).forEach(player => {
                    if(player.charge >= 1) ctx.strokeStyle = "cyan";
                    else ctx.strokeStyle = "green";
                    const hitbox = player.getHitbox();
                    const buffer = player.buffer; // 'roundness in pixels'
                    ctx.beginPath();
                    ctx.roundRect(
                        hitbox.x,
                        hitbox.y,
                        hitbox.w,
                        hitbox.h,
                        buffer
                    );
                    ctx.stroke();
                    // also stroke a circle for distance-based collisions
                    ctx.beginPath();
                    ctx.arc(player.x+0.5, player.y+0.5, 0.5, 0, 2 * Math.PI);
                    ctx.stroke();
                });
                ctx.strokeStyle = "red";
                ctx.lineWidth = 0.05;
                this.collisions.forEach(rect => {
                    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
                });
            }
        ctx.restore();
        
            
        // draw tilemap (overlay layer)
        if (!window.showHitboxes){
            this.tilemap.drawRegion(
                ctx,
                this.overlayRegion,
                xOffset,
                yOffset,
                this.overlayRegion.width * trueTileSize,
                this.overlayRegion.height * trueTileSize
            );
        }
        this.Camera.pop(ctx);
        this.Camera.push(ctx);
        this.Camera.pop(ctx);
    }
    update(){
        if (window.switchLevel){
            queueMicrotask(() => {
                this.switchLevel(window.switchLevel[0]??1, window.switchLevel[0]??1, window.switchLevel[1]??"world1");
                window.switchLevel = null;
            });
        }
        if (window.displayLevels){
            // display all levels available in level data as a grid in the console, with current level highlighted
            console.log("Available levels:");
            const levelNumbers = Object.keys(this.levelData).map(num => parseInt(num));
            const maxLevel = Math.max(...levelNumbers);
            let output = "";
            for (let i = 1; i <= maxLevel; i++) {
                if (this.levelData[i] && this.levelData[i].world) {
                    output += "\n";
                    output += `${this.levelData[i].world}`.toWellFormed().padStart(6) + "\n";
                }
                if (i === this.level) {
                    output += `[${i}] `.padStart(6);
                } else if (levelNumbers.includes(i)) {
                    output += `${i} `.padStart(6);
                } else {
                    output += `- `.padStart(6);
                }
            }
            console.log(output);
            window.displayLevels = undefined;
        }
        if (window.debug){
            console.log("All debug commands");
            console.log("- window.switchLevel = [levelNum, loadWorld?]  | Goes to specified level");
            console.log("- window.displayLevels = true  | Displays all levels in console");
            console.log("- window.testCamera = 1  | test phone transition effect");
            console.log("- window.showHitboxes = true/false  | toggle hitbox display");
            window.debug = undefined;
        }
        this.ParticleManager.update();
        Object.values(this.players).forEach(player => player.update());
        Object.values(this.entities).forEach(entity => entity.update());
        Object.values(this.phones).forEach(phone => phone.update());

        // option 1,check all phones - if all are fully charged, start level transition
        const allCharged = Object.values(this.phones)
            .filter(e => e instanceof Phone)
            .filter(phone => phone.load === null) // since phones with 'load' are more for secret/level-select purposes
            .every(phone => phone.charge >= phone.maxCharge);

        if (allCharged && !this.levelTransition.active) {
            this.levelTransition.active = true;

            const firstPhone = this.phones["phone0"];

            this.startPhoneTransition(firstPhone);
        }
        // option 2, if a phone has 'load', then start transition immediately on charge, and load the specified world instead of next level
        if (!this.levelTransition.active) {
            Object.values(this.phones).forEach(phone => {
                if(phone.charge >= phone.maxCharge && phone.load) {
                    this.levelTransition.active = true;
                    this.startPhoneTransition(phone);
                }
            });
        }

        // if multiple players, if they are close enough to each other, steal charge from the one with more charge to the one with less charge
        Object.values(this.players).forEach(player => {
            Object.values(this.players).forEach(otherPlayer => {
                if (player === otherPlayer) return;
                const dx = player.x - otherPlayer.x;
                const dy = player.y - otherPlayer.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 1 && Math.abs(player.charge - otherPlayer.charge) > 0.1 && performance.now() - this.lastChargeSteal > this.chargeStealCooldown) {
                    this.lastChargeSteal = performance.now();
                    const chargeDiff = player.charge - otherPlayer.charge;
                    const transferAmount = chargeDiff; // transfer 10% of the difference
                    player.charge -= transferAmount;
                    otherPlayer.charge += transferAmount;
                }
            });
        });

        if(this.bgParticles < 100 && performance.now() - this.lastBgParticle > this.bgParticleCooldown){
            this.lastBgParticle = performance.now();
            this.ParticleManager.spawnAt(
                Math.random() * this.region.width,
                Math.random() * this.region.height,
                {
                    speed: 0.001,
                    count: 1,
                    colors: ["#00000022", "#FFFFFF08"],
                    size: 1/4,
                    life: 20000,
                    fadeTimeStart: 1000,
                    fadeTimeEnd: 1000,
                    accelY: 1,
                    accelX: 1,
                    onEnd: () => {
                        this.bgParticles--;
                    }
                }
            );
            this.bgParticles++;
        }



        // Camera test
        if (!window.testCamera) return; // only run if testCamera is set to true (for testing purposes, so we can easily turn it on and off without deleting code)
        // Test particle effect
        if(window.testCamera === 1) window.testCamera = 0; // so no spamming in console
    }
    async switchLevel(levelNum, goto=null, load=null) {
        this.level = levelNum;
        if (goto) this.level = goto;
        if (load){
            // reset tilemap
            this.tilemap = new Tilemap();
            await this.tilemap.preload(
                await fetch(this.data["tilesets-tmx"].replace(/#/g, load)).then(res => res.text()),
                await fetch(this.data["tilesets-image"].replace(/#/g, load)).then(res => res.blob())
            )
            if (load === "world1" && this.musicMan.currentTrack !== "world1") {
                // if we're loading world1, also reset the music to world1's soundtrack, in case we were in the factory world before
                this.musicMan.fadeTo("world1", 500, 0.2);
            } 
            if (load === "factory" && this.musicMan.currentTrack !== "factory"){
                this.musicMan.fadeTo("factory", 500, 0.1);
            }
            if (load === "spacestation" && this.musicMan.currentTrack !== "spacestation"){
                this.musicMan.fadeTo("spacestation", 500, 0.1);
            }
        }
        this.buttonState = 0; // reset button state on level switch
        // now we set the main region's pos & size to the level's offset and size to make UI is clean
        const ui =document.getElementById("UI")
        if (ui) {
            const scale = Math.min(
                this.canvas.width / (16 * 16),
                this.canvas.height / (9 * 16)
            );
            const trueTileSize = 16 * scale;
            const renderWidth = 16 * trueTileSize;
            const renderHeight = 9 * trueTileSize;
            const xOffset = (this.canvas.width - renderWidth) / 2;
            const yOffset = (this.canvas.height - renderHeight) / 2;
            ui.style.position = "absolute";
            ui.style.left = `${xOffset}px`;
            ui.style.top = `${yOffset}px`;
            ui.style.width = `${renderWidth}px`;
            ui.style.height = `${renderHeight}px`;
        }
        if (!this.levelData[this.level]) {
            console.error(`Level ${this.level} not found in level data!`);
            this.level = 1;
            return;
        }
        // update text
        document.getElementById("Label").innerText = this.levelData[this.level]["text"];

        if (this.levelData[this.level].world === "spacestation") document.getElementById("Label").style.color = "#FFFFFF55";
        else document.getElementById("Label").style.color = "#00000055";
        const nextX = this.levelData[this.level].origin[0];
        const nextY = this.levelData[this.level].origin[1];
        this.region = this.tilemap.pushRegion([nextX, nextY], [16, 9], 16, ['bg', 'bgdecor', 'blocks'], true, true);
        this.overlayRegion = this.tilemap.pushRegion([nextX, nextY], [16, 9], 16, ['blocks', 'blockDecor'], false, true);
        Object.values(this.players).forEach(player => {
            player.x = this.levelData[this.level].playerX;
            player.y = this.levelData[this.level].playerY;
            player.charge = this.levelData[this.level].startingCharge;
            player.charging = false;
            player.chargeCallback = ()=>{};
            player.chargeParticles = [];
            player.inWire = false;
            player.wireHash = null;
            player.wireHitbox = null;
        });
        this.entities = {};
        this.phones = {};
        // create phones based on level data
        // add to entities so they get drawn and updated
        this.levelData[this.level].phones.forEach((phoneData, index) => {
            this.phones[`phone${index}`] = new Phone(this, phoneData.x, phoneData.y, 1, 1, phoneData.maxCharge, phoneData.goto ?? this.level+1, phoneData.load ?? null);
        });
        // create enemies based on level data
        if(this.levelData[this.level].enemies){
            this.levelData[this.level].enemies.forEach((enemyData, index) => {
                this.entities[`enemy${index}`] = createMonsters(enemyData.type, this, this.images[enemyData.type], this.spriteData[enemyData.type], enemyData);
                this.entities[`enemy${index}`].onDeath = () => {
                    delete this.entities[`enemy${index}`];
                    this.updateCollisions();
                };
            });
        }
        // batteries
        if(this.levelData[this.level].batteries) {
            this.levelData[this.level].batteries.forEach((batteryData, index) => {
                this.entities[`battery${index}`] = new Battery(this, batteryData.x, batteryData.y, 1, 1);
            });
        }
        this.updateCollisions();
        

        
    }
    startPhoneTransition(phone) {
        this.Camera.clearKeyframes();
        this.Camera.addKeyframe("start", createKeyframe({
            "name": "start",
            "duration": 1000,
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]),
            "effects": new Map()
            .set("fade", getEffect("fade", "#00000000"))
            .set("rotate", getEffect("rotate", 0))
            .set("scale", getEffect("scale", 1, 1))
            .set("pos", getEffect("pos", -1, -1, false, true))
            ,
            "onEnd": async () => {
                await this.switchLevel(this.level+1, phone.goto, phone.load);
                this.Camera.playKeyframe();
                window.soundMan.play("transition", 0.5);
            }
        }));
        this.Camera.addKeyframe("phone", createKeyframe({
            "name": "phone",
            "duration":10,
            "bezier": new Bezier([{'x': 0.0, 'y': 1.0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            "effects": new Map()
            .set("fade", getEffect("fade", "#000000FF"))
            .set("rotate", getEffect("rotate", 30))
            .set("scale", getEffect("scale", 5, 5))
            .set("pos", getEffect("pos", phone.x, phone.y))
            ,
            "onEnd": async () => {
                this.Camera.playKeyframe();
            }
        }))
        this.Camera.addKeyframe("center", createKeyframe({
            "name": "center",
            "duration":1000, // 1 second duration
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            "effects": new Map()
            .set("fade", getEffect("fade", "#000000FF"))
            .set("rotate", getEffect("rotate", 0))
            .set("scale", getEffect("scale", 1.2, 1.2))
            .set("pos", getEffect("pos", -1, -1))
            ,
            "onEnd": async () => {
                this.Camera.playKeyframe();
                this.levelTransition.active = false;
                window.soundMan.play("land", 0.5, 0.2);
            }
        }))
        this.Camera.addKeyframe("fadeIn", createKeyframe({
            "name": "fadeIn",
            "duration": 1000,
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]),
            "effects": new Map()
                .set("fade", getEffect("fade", "#00000000"))
                .set("rotate", getEffect("rotate", 0))
                .set("scale", getEffect("scale", 1, 1))
                .set("pos", getEffect("pos", -1, -1, false, true))
            ,
        }));

        this.Camera.addAnimation("start", "phone", "center", "fadeIn");
        this.Camera.playKeyframe();
        window.soundMan.play("transition", 0.5);
    }
    shakeCamera() {
        // reset level transition in case it's already active, so we can replay the shake effect
        this.levelTransition.active = false;
        window.soundMan.play("death", 0.5);
        this.Camera.clearKeyframes();
        this.Camera.addKeyframe("shake", createKeyframe({ // the starting keyframe
            "name":"shake",
            "duration":300, // 1 second duration
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 0.104, 'y': 0.978}, {'x': 1.0, 'y': 1.0}],[{'x': 0, 'y': 1.0}, {'x': 0.494, 'y': 1}, {'x': 0.504, 'y': 0}, {'x': 1, 'y': 0}]), // starts slow then goes fast.
            "effects": new Map()
            .set("shake", getEffect("shake", 0.1, 0.2))
            .set("fade", getEffect("fade", "#FF000000"))
            ,
            "onEnd": async () => {
               
            }
        }));
        this.Camera.addKeyframe("red", createKeyframe({
            "name": "red",
            "duration": 100, // 1 second duration
            "bezier": new Bezier(), // starts slow then goes fast.
            "effects": new Map()
            .set("shake", getEffect("shake", 10, 5))
            .set("fade", getEffect("fade", "#FF000066"))
            ,
        }));
        this.Camera.addAnimation("shake", "red");
        this.Camera.playKeyframe();
    }
    updateCollisions(){
        this.collisions = [];
        // blocks
        this.collisions.push(...this.tilemap.getCollisionRects(this.region, "blocks"));
        // entities
        Object.values(this.entities).forEach(entity => {
            if(entity.hitboxes) {
                this.collisions.push(...entity.hitboxes);
            }
        });
    }
    getCollisions(){
        return [...this.collisions]
    }
}
// add ctrl+c to stop tracking player in console
let timer;
window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "c" && timer) {
        console.log("Stopped tracking player.");
        clearInterval(timer);
        timer = null;
    }
});
window.trackPlayer = (playery="player1")=>{
    // every 100ms, log player position, velocity, and charge
    if (!timer){
        timer = setInterval(() => {
            const player = Object.values(window.world.players).find(p => p.name === playery);

            console.table({
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                charge: player.charge
            });
        }, 500);
    }else{
        clearInterval(timer);
        timer = null;
    }
}