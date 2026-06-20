export default class GooberWorld {
    constructor(world, img, spriteData, data){
        this.world = world;
        this.img = img;
        this.spriteData = spriteData;
        this.data = data;
    }
    update(){
    }
    draw(ctx){
        // static 
        ctx.drawImage(this.img, 0, 0, this.spriteData.w, this.spriteData.h, this.data.x, this.data.y, 3, 3);
    }
}