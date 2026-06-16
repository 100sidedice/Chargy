import Tilemap from "../tilemaps/Tilemap.js";
import Player from "../chargy/player.js";
import Input from "../chargy/input.js";
import Phone from "../chargy/phone.js";
import Battery from "../chargy/battery.js";
import {Camera, Bezier, getEffect, createKeyframe} from "../camera/Camera.js";
import createMonsters from "../chargy/monsters/monsters.js";
import ParticleManager from "./particles.js";

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

        this.level = 1;


        this.levelTransition = {
            active: false,
            progress: 0,
            duration: 1000,
            targetTileX: 0,
            targetTileY: 0,

            startZoom: 1,
            endZoom: 50,
            startRot: 0,
            endRot: Math.PI / 6 // 30 degrees max tilt
        };
    }
    async preload(dataKey){
        const data = await fetch(dataKey).then(res => res.json());
        this.data = data;
        // load tilemap
        this.tilemap = new Tilemap();
        await this.tilemap.preload(
            await fetch(data["tilesets-tmx"].replace(/{#}/g, "1")).then(res => res.text()),
            await fetch(data["tilesets-image"].replace(/{#}/g, "1")).then(res => res.blob())
        );
        // load entity images
        const phone = await fetch(data["phone"]).then(res => res.blob());
        this.images["phone"] = await createImageBitmap(phone);
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
            const imgBlob = await fetch(sprite.filePath).then(res => res.blob());
            this.images[key] = await createImageBitmap(imgBlob);
        }

        // create player1
        this.input = new Input();
        this.players[1] = new Player(this, 5, 5, 1, 1, "player1", {"x":"Axis1", "y":"Axis2"}, this.input);  

        this.Camera = new Camera(this.canvas);

        this.switchLevel(this.level);
        this.lastChargeSteal = performance.now();
        this.chargeStealCooldown = 500; 
        this.bgParticles = 0;
        this.bgParticleCooldown = 200;// 1 second cooldown for spawning a new bg particle, to prevent spamming too many particles at start
        this.lastBgParticle = performance.now();
        
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
        if(window.level){
            if(window.level !== -1){
                this.switchLevel(window.level);
                window.level = -1;
            }
        }
        this.ParticleManager.update();
        Object.values(this.players).forEach(player => player.update());
        Object.values(this.entities).forEach(entity => entity.update());
        Object.values(this.phones).forEach(phone => phone.update());

        // check all phones - if all are fully charged, start level transition
        const allCharged = Object.values(this.phones)
            .filter(e => e instanceof Phone)
            .every(phone => phone.charge >= phone.maxCharge);

        if (allCharged && !this.levelTransition.active) {
            this.levelTransition.active = true;

            const firstPhone = this.phones["phone0"];

            this.startPhoneTransition(firstPhone);
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
    switchLevel(levelNum) {
        this.level = levelNum;
        if(this.level > Object.keys(this.levelData).length) {
            this.level = 1; // loop back to level 1 if level number exceeds available levels
        }
        if (!this.levelData[this.level]) {
            console.error(`Level ${this.level} not found in level data!`);
            this.level = 1;
            return;
        }
        // update text
        document.getElementById("Label").innerText = this.levelData[this.level]["text"];
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
        });
        this.entities = {};
        this.phones = {};
        // create phones based on level data
        // add to entities so they get drawn and updated
        this.levelData[this.level].phones.forEach((phoneData, index) => {
            this.phones[`phone${index}`] = new Phone(this, phoneData.x, phoneData.y, 1, 1, phoneData.maxCharge);
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
            "duration": 1000,
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]),
            "effects": new Map()
            .set("fade", getEffect("fade", "#00000000"))
            .set("rotate", getEffect("rotate", 0))
            .set("scale", getEffect("scale", 1, 1))
            .set("pos", getEffect("pos", -1, -1, false, true))
            ,
            "onEnd": () => {
                this.switchLevel(this.level+1);
                this.Camera.playKeyframe();
            }
        }));
        this.Camera.addKeyframe("phone", createKeyframe({
            "duration":0,
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            "effects": new Map()
            .set("fade", getEffect("fade", "#000000FF"))
            .set("rotate", getEffect("rotate", 30))
            .set("scale", getEffect("scale", 5, 5))
            .set("pos", getEffect("pos", phone.x, phone.y))
            ,
            "onEnd": () => {
                this.Camera.playKeyframe();
            }
        }))
        this.Camera.addKeyframe("center", createKeyframe({
            "duration":1000, // 1 second duration
            "bezier": new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            "effects": new Map()
            .set("fade", getEffect("fade", "#000000FF"))
            .set("rotate", getEffect("rotate", 0))
            .set("scale", getEffect("scale", 1.2, 1.2))
            .set("pos", getEffect("pos", -1, -1))
            ,
            "onEnd": () => {
                this.Camera.playKeyframe();
                this.levelTransition.active = false;
            }
        }))
        this.Camera.addKeyframe("fadeIn", createKeyframe({
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
    }
    shakeCamera() {
        this.Camera.clearKeyframes();
        console.log("Starting camera transition test...");
        this.Camera.addKeyframe( // the starting keyframe
            300, // 1 second duration
            new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 0.104, 'y': 0.978}, {'x': 1.0, 'y': 1.0}],[{'x': 0, 'y': 1.0}, {'x': 0.494, 'y': 1}, {'x': 0.504, 'y': 0}, {'x': 1, 'y': 0}]), // starts slow then goes fast.
            new Map()
            .set("shake", getEffect("shake", 0.1, 0.2))
            .set("fade", getEffect("fade", "#FF000000"))
            ,
        );
        this.Camera.addKeyframe(
            100, // 1 second duration
            new Bezier(), // starts slow then goes fast.
            new Map()
            .set("shake", getEffect("shake", 10, 5))
            .set("fade", getEffect("fade", "#FF000066"))
            ,
        );
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
