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

            if (window.world) {
                const ui = document.getElementById("UI");
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
            }
        });
        window.saver = new Saver("chargy-save");
        await window.saver.load("data/defaultData.json");
        window.saver.enableAutoSave();
        
        
        this.world = new World(this.canvas, this.ctx);
        window.world = this.world; // for debugging
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