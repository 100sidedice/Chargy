const text = "chargy_charged.png  chargy_eye_down.png  chargy_eye.png  chargy_eye_up.png  chargy.png  powery_charged.png  powery_eye_down.png  powery_eye.png  powery_eye_up.png  powery.png"
const splitRegex = /\s+/;
const files = text.split(splitRegex).filter(Boolean);

const keys = files.map(file => file.replace('.png', ''));
// values, full paths with data/sprites/players prefix
const values = files.map(file => `data/sprites/players/${file}`);
// log json
const json = {};
keys.forEach((key, index) => {
  json[key] = values[index];
});

console.log(JSON.stringify(json, null, 2));