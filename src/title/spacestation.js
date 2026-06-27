const spaceStation = document.getElementById("spaceStation"); // canvas
const ctx = spaceStation.getContext("2d");
// load the 4 frames
const urls = [
    "data/sprites/large/spacestation/0.png",
    "data/sprites/large/spacestation/1.png",
    "data/sprites/large/spacestation/2.png",
    "data/sprites/large/spacestation/3.png"
]
const frames = [];
for (const url of urls) {
    const img = new Image();
    img.src = url;
    frames.push(img);
}

let currentFrame = 0;
const frameCount = frames.length;
const frameDuration = 100; // milliseconds
let lastFrameTime = performance.now();

function updateSpaceStationAnimation() {
    const now = performance.now();
    if (now - lastFrameTime >= frameDuration) {
        currentFrame = (currentFrame + 1) % frameCount;
        lastFrameTime = now;
        ctx.clearRect(0, 0, spaceStation.width, spaceStation.height);
        ctx.drawImage(frames[currentFrame], 0, 0, spaceStation.width, spaceStation.height);
    }
    requestAnimationFrame(updateSpaceStationAnimation);
}

updateSpaceStationAnimation();