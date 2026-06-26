import Saver from "./saver.js";

window.saver = new Saver("chargy-save");
window.saver.load("data/defaultData.json");
window.saver.enableAutoSave();