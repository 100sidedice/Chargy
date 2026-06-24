// node.js
// get dependencies
const { createCanvas } = require('canvas');
const { createWriteStream } = require('fs');

const pixelSize = 1;
const outputWidth = 1920/2;
const outputHeight = 1080/4;

const canvas = createCanvas(outputWidth, outputHeight);
function addStars(canvas, numStars, settings) {
    const ctx = canvas.getContext('2d');
    const colorMin = settings.colorMin || 200;
    const colorMax = settings.colorMax || 255;

    for (let i = 0; i < numStars; i++) {
        // pixelated stars, use pixelSize to determine size of star
        const x = Math.floor(Math.random() * canvas.width / pixelSize) * pixelSize;
        const y = Math.floor(Math.random() * canvas.height / pixelSize) * pixelSize;
        const size = pixelSize/2; // 1 or 2 pixels
        const color = "#FFFFFF"
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
    }
}
function addNebula(canvas) {
    // vars
    const wavelength = 20 * Math.PI; // percentage of width for the wavelength of the sine wave
    const noise = 1; // percentage of for the noise of the sine wave


    const fracture = 0.2; // 
    const fractureDist = 0.3;
    const fractureNoise = 0.003; // percentage of for the noise for the fracture points
    const fracturePointCount = 0;
    const numPoints = 5000; 

    const heightMin = 0.45 * canvas.height;
    const heightMax = 0.55 * canvas.height;

    const ctx = canvas.getContext('2d');

    const startX = 0;
    const endX = canvas.width;

    const arrColors = [
        "#ffffff",
        "#ffe6ff",
        "#ff7df2",
        "#c84dff",
        "#6d3cff",
        "#2d4fff",
        "#00a8ff",
        "#00d4c0",
        "#003a66",
        "#000814"
    ];


    const runningLine = [];
    // point: {x: number, y: number}
    
    // subdivide the line into points based on the wavelength
    
    const domain = endX - startX;
    const range = heightMax - heightMin;
    for (let i = 0; i <= numPoints; i++) {
        const noiseY = (Math.random() - 0.5) * noise * range;
        const noiseX = (Math.random() - 0.5) * noise * domain;
        const x = (i*domain / numPoints) + noiseX;
        const y = (Math.sin(x / wavelength)/2 * range + heightMin + range/2)+ noiseY;
        runningLine.push({ x, y});
    }
    // fracture
    // choose random set of points to fracture
    const numFractures = Math.floor(numPoints * fracture);
    const fracturePoints = [];
    for (let i = 0; i < numFractures; i++) {
        const index = Math.floor(Math.random() * numPoints);
        fracturePoints.push(index);
    }
    // fracture the points
    for (const index of fracturePoints) {
        const point = runningLine[index];
        const offset = (Math.random() - 0.5) * fractureDist * range;
        point.y += offset;
        // same for x
        point.x += (Math.random() - 0.5) * fractureDist * domain;

        // add to line, add points between start and end
        const start = runningLine[index - 1] || { x: point.x - (domain / numPoints), y: point.y };
        const end = runningLine[index + 1] || { x: point.x + (domain / numPoints), y: point.y };
        const numSubPoints = Math.floor(Math.random() * 5) + fracturePointCount;
        for (let i = 1; i < numSubPoints; i++) {
            const subX = start.x + (end.x - start.x) * (i / numSubPoints);
            const subY = start.y + (end.y - start.y) * (i / numSubPoints);
            // add fracture noise
            const noiseY = (Math.random() - 0.5) * fractureNoise * range;
            const noiseX = (Math.random() - 0.5) * fractureNoise * domain;
            runningLine.splice(index + i, 0, { x: subX + noiseX, y: subY + noiseY });
        }
    }
    for (let i = 0; i < runningLine.length - 1; i++) {
        const point = runningLine[i];

        // choose color based on distance from the center of sine wave, exponentially weighted
        function sineY(y){
            const centerY = (heightMin + heightMax) / 2;
            const amplitude = (heightMax - heightMin) / 2;
            const frequency = 1 / wavelength;
            return centerY + amplitude * Math.sin(frequency * y);
        }
        const distanceFromSine = Math.abs(point.y - sineY(point.x));
        const maxDistance = (heightMax - heightMin) / 2;
        const weight = distanceFromSine / maxDistance;
        const flippedWeight = 1 - weight; // flip the weight so that points closer to the sine wave are brighter
        const colorIndex = Math.floor(flippedWeight * (arrColors.length - 1));
        const color = arrColors[colorIndex];
        
        // add color to the point
        point.color = color;
        // random rotation
        point.rotation = Math.random() * Math.PI * 2;
        // draw rect 
        ctx.save();

        ctx.translate(Math.floor(point.x/pixelSize)*pixelSize, Math.floor(point.y/pixelSize)*pixelSize);
        ctx.fillStyle = point.color;
        ctx.fillRect(0, 0, pixelSize, pixelSize);
        ctx.restore();
    }

}
function addBg (canvas) {
    const ctx = canvas.getContext('2d');
    // fill with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
addBg(canvas);
addStars(canvas, 1000, { colorMin: 200, colorMax: 255});
addNebula(canvas, { color1: 'rgba(255, 0, 0, 0.5)', color2: 'rgba(0, 255, 0, 0.5)', color3: 'rgba(0, 0, 255, 0.5)' });

// save to file
const out = createWriteStream(__dirname + '/spaceBg.png');
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on('finish', () => console.log('The PNG file was created.'));
