import resizeCanvas from "../canvas/helpers.js";
import World from "./world.js";

class Main {
    constructor() {
    }
    async setup() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");
        // Listen for window resize events and adjust the canvas size accordingly
        window.addEventListener("resize", () => {
            const canvas = document.getElementById("canvas");
            resizeCanvas(canvas);
            this.rasterizeCanvas();
        });
        this.world = new World(this.canvas, this.ctx, this.rasterizeCanvas);
        window.world = this.world; // for debugging
        await this.world.preload("data/dataKeys.json");
        resizeCanvas(this.canvas);
        this.rasterizeCanvas();
    }
    rasterizeCanvas(){
        if (window.world) {
            const ui = document.getElementById("UI");
            const canvas = document.getElementById("canvas");
            const dpr = window.devicePixelRatio || 1;
            if (ui) {
                const scale = Math.min(
                    canvas.width / (16 * 16)/dpr,
                    canvas.height / (9 * 16)/dpr
                );
                const trueTileSize = 16 * scale;
                const renderWidth = 16 * trueTileSize;
                const renderHeight = 9 * trueTileSize;
                const xOffset = (canvas.width/dpr - renderWidth) / 2;
                const yOffset = (canvas.height/dpr - renderHeight) / 2;
                ui.style.position = "absolute";
                ui.style.left = `${xOffset}px`;
                ui.style.top = `${yOffset}px`;
                ui.style.width = `${renderWidth}px`;
                ui.style.height = `${renderHeight}px`;
            }
        }
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
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transformation matrix
        this.ctx.save();
        this.draw(this.ctx);
        this.ctx.restore();
        
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