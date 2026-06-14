import resizeCanvas from "../canvas/helpers.js";
import Tilemap from "../tilemaps/Tilemap.js";
import Saver from "./saver.js";
import World from "./world.js";

class Main {
    constructor() {
    }
    async setup() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        resizeCanvas(this.canvas);
        // Listen for window resize events and adjust the canvas size accordingly
        window.addEventListener("resize", () => {
            const canvas = document.getElementById("canvas");
            resizeCanvas(canvas);
        });
        window.saver = new Saver("chargy-save");
        await window.saver.load("data/defaultData.json");
        window.saver.enableAutoSave();
        
        
        this.world = new World(this.canvas, this.ctx);
        await this.world.preload("data/dataKeys.json");
        this.draw(this.ctx);
    }
    draw(ctx) {
        this.world.draw(this.ctx);
    }
    loop(){
        // limit delta
        const now = performance.now();
        let delta = Math.min(1000 / 60, now - (this.lastTime || now));
        this.lastTime = now;
        while (delta > 0) {
            this.update();
            delta -= 1000 / 60;
        }

        this.draw(this.ctx);
        requestAnimationFrame(() => this.loop());
    }
    update(){
        this.world.update();
    }

}
document.addEventListener("DOMContentLoaded", async () =>{
    const main = new Main();
    await main.setup();
    main.loop();
});