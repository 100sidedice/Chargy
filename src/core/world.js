import Tilemap from "../tilemaps/Tilemap.js";
import Player from "../chargy/player.js";
import Input from "../chargy/input.js";
import Phone from "../chargy/phone.js";
import Battery from "../chargy/battery.js";
import {Camera, Bezier, getEffect} from "../camera/Camera.js";

export default class World {
    constructor(canvas, ctx){
        this.tilemap = null;
        this.players = {};
        this.entities = {};
        this.data = {};
        this.images = {};
        this.canvas = canvas;
        this.ctx = ctx;

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
        // add to entities so they get drawn and updated
        levelData["1"].phones.forEach((phoneData, index) => {
            this.entities[`phone${index}`] = new Phone(this, phoneData.x, phoneData.y, 1, 1, phoneData.maxCharge);
        });


        // create player1
        this.input = new Input();
        this.players[1] = new Player(this, 5, 5, 1, 1, "player1");


        this.Camera = new Camera(this.canvas);

        this.switchLevel(this.level);
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

            Object.values(this.entities).forEach(entity => entity.draw(ctx, this.images));
            Object.values(this.players).forEach(player => player.draw(ctx, this.images));
        ctx.restore();

        // draw tilemap (overlay layer)
        this.tilemap.drawRegion(
            ctx,
            this.overlayRegion,
            xOffset,
            yOffset,
            this.overlayRegion.width * trueTileSize,
            this.overlayRegion.height * trueTileSize
        );
        this.Camera.pop(ctx);
        this.Camera.push(ctx);
        this.Camera.pop(ctx);
    }
    update(){
        Object.values(this.players).forEach(player => player.update());
        Object.values(this.entities).forEach(entity => entity.update());

        // check all phones - if all are fully charged, start level transition
        const allCharged = Object.values(this.entities)
            .filter(e => e instanceof Phone)
            .every(phone => phone.charge >= phone.maxCharge);

        if (allCharged && !this.levelTransition.active) {
            this.levelTransition.active = true;

            const firstPhone = this.entities["phone0"];

            this.startPhoneTransition(firstPhone);
        }





        // Camera test
        if (!window.testCamera) return; // only run if testCamera is set to true (for testing purposes, so we can easily turn it on and off without deleting code)
        this.Camera.clearKeyframes();
        console.log("Starting camera transition test...");
        this.Camera.addKeyframe( // the starting keyframe
            1000, // 1 second duration
            new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 0.404, 'y': 0.978}, {'x': 1.0, 'y': 1.0}],[{'x': 0, 'y': 1.0}, {'x': 0.494, 'y': 1}, {'x': 0.504, 'y': 0}, {'x': 1, 'y': 0}]), // starts slow then goes fast.
            new Map()
            .set("shake", getEffect("shake", 0.1, 0.2))
            .set("rotate", getEffect("rotate", 0))
            ,
        );
        this.Camera.addKeyframe(
            1000, // 1 second duration
            new Bezier(), // starts slow then goes fast.
            new Map()
            .set("shake", getEffect("shake", 50, 5))
            .set("rotate", getEffect("rotate", -5))
            ,
        );
        this.Camera.playKeyframe();
        if(window.testCamera === 1) window.testCamera = 0; // so no spamming in console
    }
    switchLevel(levelNum) {
        this.level = levelNum;
        if (!this.levelData[this.level]) {
            console.error(`Level ${this.level} not found in level data!`);
            this.level = 1;
            return;
        }
        const nextX = this.levelData[this.level].origin[0];
        const nextY = this.levelData[this.level].origin[1];
        this.region = this.tilemap.pushRegion([nextX, nextY], [16, 9], 16, ['bg', 'blocks'], true, true);
        this.overlayRegion = this.tilemap.pushRegion([nextX, nextY], [16, 9], 16, ['blocks', 'blockDecor'], false, true);
        this.collisions = this.tilemap.getCollisionRects(this.region, "blocks");
        console.log("Level complete! Loading next level...");
        Object.values(this.players).forEach(player => {
            player.x = this.levelData[this.level].playerX;
            player.y = this.levelData[this.level].playerY;
            player.charge = this.levelData[this.level].startingCharge;
            player.charging = false;
            player.chargeCallback = ()=>{};
            player.chargeParticles = [];
        });
        this.entities = {};
        // create phones based on level data
        // add to entities so they get drawn and updated
        this.levelData[this.level].phones.forEach((phoneData, index) => {
            this.entities[`phone${index}`] = new Phone(this, phoneData.x, phoneData.y, 1, 1, phoneData.maxCharge);
        });
        // batteries
        if(this.levelData[this.level].batteries) {
            this.levelData[this.level].batteries.forEach((batteryData, index) => {
                this.entities[`battery${index}`] = new Battery(this, batteryData.x, batteryData.y, 1, 1);
            });
        }
    }
    startPhoneTransition(phone) {
        console.log("Starting phone transition...");
        this.Camera.clearKeyframes();

        this.Camera.addKeyframe( // the starting keyframe
            1000, // 1 second duration
            new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            new Map()
            .set("fade", getEffect("fade", "#00000000"))
            .set("rotate", getEffect("rotate", 0))
            .set("scale", getEffect("scale", 1, 1))
            .set("pos", getEffect("pos", -1, -1, false, true))
            ,
            () => {},
            () => {
                this.levelTransition.active = false;
                this.switchLevel(this.level+1);
                this.Camera.clearKeyframes();
            }
        );
        this.Camera.addKeyframe(
            1000, // 1 second duration
            new Bezier([{'x': 0.0, 'y': 0.0}, {'x': 1, 'y': 0}, {'x': 1, 'y': 1}]), // starts slow then goes fast.
            new Map()
            .set("fade", getEffect("fade", "#000000FF"))
            .set("rotate", getEffect("rotate", 30))
            .set("scale", getEffect("scale", 5, 5))
            .set("pos", getEffect("pos", phone.x, phone.y))
            ,
            () => {},
            () => {}
        );
        this.Camera.playKeyframe();
    }
}
