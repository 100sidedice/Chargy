import GrassGoober from "./grassGoober.js";
import Brunk from "./brunk.js";

export default function createMonsters(type, world, img, spriteData, monsterData){
    switch(type){
        case "grassgoober":
            return new GrassGoober(world, img, spriteData, monsterData);
        case "brunk":
            return new Brunk(world, img, spriteData, monsterData);
        default:
            throw new Error(`Unknown monster type: ${type}`);
    }
}