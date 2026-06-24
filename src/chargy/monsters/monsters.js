import GrassGoober from "./grassGoober.js";
import Brunk from "./brunk.js";
import Wire from "./wire.js";
import Oneway from "./oneway.js";
import RoboGoober from "./roboGoober.js";
import Button from "./button.js";
import GooberWorld from "./gooberworld.js";
import Rocket from "./rocket.js";

export default function createMonsters(type, world, img=null, spriteData=null, monsterData=null){
    switch(type){
        case "grassgoober": return new GrassGoober(world, img, spriteData, monsterData);
        case "roboGoober": return new RoboGoober(world, img, spriteData, monsterData);
        case "brunk": return new Brunk(world, img, spriteData, monsterData);
        case "wire": return new Wire(world, spriteData, monsterData);
        case "oneway": return new Oneway(world, img, spriteData, monsterData);
        case "button": return new Button(world, img, spriteData, monsterData);
        case "gooberworld": return new GooberWorld(world, img, spriteData, monsterData);
        case "rocket": return new Rocket(world, img, spriteData, monsterData);
        default: throw new Error(`Unknown monster type: ${type}`);
    }
}