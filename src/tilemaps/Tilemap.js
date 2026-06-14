import { gridToRects } from "./gridMerge.js";

export default class Tilemap {
    constructor(){
        this.layers = {};
        this.cachedRegions = {};
        this.tileset = null;
    }
    async preload(tmx, tilesetImage, tilesize = 16){
        const parser = new DOMParser();
        const xml = parser.parseFromString(tmx, "text/xml");

        const layers = xml.getElementsByTagName("layer");
        Array.from(layers).forEach(layer => {
            const name = layer.getAttribute("name");
            const width = parseInt(layer.getAttribute("width"));
            const height = parseInt(layer.getAttribute("height"));
            const data = layer.querySelector("data").textContent.trim();
            const firstgid = parseInt(layer.getAttribute("firstgid")) || 1;
            const tiles = data.trim().split(",").map(n => parseInt(n, 10)).filter(n => !isNaN(n));
            this.layers[name] = {
                firstgid: firstgid,
                width,
                height,
                tiles
            };
        });
        // Image param example: await fetch("data/levels/level1/chargyLevel1.tileset.png").then(res => res.blob())
        this.tileset = {
            firstgid: 1,
            image: await createImageBitmap(tilesetImage),
            tileSize: tilesize,
            columns: 0
        };

        this.tileset.columns = this.tileset.image.width / this.tileset.tileSize;
    }
    pushRegion(origin = [0, 0], size = [16, 9], tilesize = 16, layers = ['bg'], returnTiles = true, returnImage = true, cache = false, cacheKey = null){
        const [w, h] = size;
        const region = {
            "origin": origin,
            "width": w,
            "height": h,
            "tileSize": tilesize,
        };
        if (!returnImage && !returnTiles) return region;
        if (returnTiles) {
            region.layers = {};
            layers.forEach(layer => {
                if (this.layers[layer]) {
                    const layerData = this.layers[layer];
                    const tiles = [];
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const tileX = origin[0] + x;
                            const tileY = origin[1] + y;
                            if (tileX < layerData.width && tileY < layerData.height) {
                                const tileIndex = tileY * layerData.width + tileX;
                                tiles.push(layerData.tiles[tileIndex]);
                            } else {
                                tiles.push(0); // Out of bounds, treat as empty tile
                            }
                        }
                    }
                    region.layers[layer] = tiles;
                }
            });
        }
        if (returnImage) {
            // create offscreen canvas, draw tiles to it, and return it as an image
            const offscreen = new OffscreenCanvas(w * tilesize, h * tilesize);
            const ctx = offscreen.getContext("2d");
            layers.forEach(layer => {
                if (this.layers[layer]) {
                    const layerData = this.layers[layer];
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const tileX = origin[0] + x;
                            const tileY = origin[1] + y;
                            if (tileX < layerData.width && tileY < layerData.height) {
                                const tileIndex = tileY * layerData.width + tileX;
                                const tileId = layerData.tiles[tileIndex];
                                if (tileId === 0) continue;
                                const tileset = this.tileset;
                                const localId = tileId - tileset.firstgid;
                                const columns = tileset.columns;
                                const sx = (localId % columns) * tilesize;
                                const sy = Math.floor(localId / columns) * tilesize;
                                ctx.drawImage(this.tileset.image, sx, sy, tilesize, tilesize, x * tilesize, y * tilesize, tilesize, tilesize);
                                
                            }
                        }
                    }
                }
            });
            region.image = offscreen.transferToImageBitmap();
        }
        if (cache && cacheKey) {
            this.cachedRegions[cacheKey] = region;
        }
        return region;
    }
    getRegion(cacheKey){
        if (!this.cachedRegions[cacheKey]) return null;
        return this.cachedRegions[cacheKey];
    }
    getCollisionRects(region, collisionLayer = "blocks"){
        const layer = region.layers[collisionLayer];
        const columns = region.width;

        const solidGrid = [];
        for (let i = 0; i < layer.length; i += columns) {
            solidGrid.push(layer.slice(i, i + columns).map(tile => tile === 0 ? 0 : 1));
        }
        
        const rects = gridToRects(solidGrid);
        
        return rects;
    }
    drawRegion(ctx, region, x = 0, y = 0, width = null, height = null, isPixelated = true){
        if (!region.image) return;
        if (isPixelated) ctx.imageSmoothingEnabled = false;
        ctx.drawImage(region.image, x, y, width, height);
    }

}