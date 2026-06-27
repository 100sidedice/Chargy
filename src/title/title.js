import resizeCanvas from "../canvas/helpers.js";

const canvas = document.getElementById("background-canvas");

window.addEventListener("resize", () => {
    resizeCanvas(canvas);
});

resizeCanvas(canvas);

const COLORS = [
    "#ffffff",
    "#ffe6ff",
    "#ff7df2",
    "#c84dff",
    "#6d3cff",
    "#2d4fff",
    "#00a8ff",
    "#00d4c0",
    "#003a66",
    "#000814",
    "#333333",
    "#443333",
    "#334433",
    "#333344"
];
const particleCount = 3000;
const starCount = 500;
const nebulaCount = particleCount - starCount;

const stride = 5; // x, y, vx, vy, colorIndex
const particles = new Float32Array(particleCount * stride);

const waveAmplitude = 50;
const waveCenter = canvas.height / 2;
const bandHeight = canvas.height / 3;

// ----- Stars -----
for (let i = 0; i < starCount; i++) {
    const p = i * stride;

    particles[p] = Math.random() * canvas.width;
    particles[p + 1] = Math.random() * canvas.height;

    // Tiny drift (or set to 0 for completely static)
    particles[p + 2] = (Math.random() - 0.5) * 0.01;
    particles[p + 3] = (Math.random() - 0.5) * 0.01;

    // Bright colors only
    particles[p + 4] = 11+Math.floor(Math.random() * 3);
}

// ----- Nebula -----
for (let i = starCount; i < particleCount; i++) {
    const p = i * stride;

    const x = Math.random() * canvas.width;

    const centerY =
        waveCenter +
        Math.sin((x / canvas.width) * Math.PI * 2) * waveAmplitude;

    const offset = (Math.random() - 0.5) * bandHeight;
    const y = centerY + offset;

    particles[p] = x;
    particles[p + 1] = y;
    particles[p + 2] = (Math.random() - 0.5) * 0.5 * 0.1;
    particles[p + 3] = (Math.random() - 0.5) * 0.2 * 0.1;

    const t = Math.min(Math.abs(offset) / (bandHeight / 2), 1);
    particles[p + 4] = Math.floor(Math.pow(t, 2) * (COLORS.length - 1));
}

const ctx = canvas.getContext("2d");

function animate() {
    const width = canvas.width;
    const height = canvas.height;

    // Fade previous frame slightly for motion trails
    ctx.fillStyle = "#00000011";
    ctx.fillRect(0, 0, width, height);

    let currentColor = -1;

    for (let i = 0; i < particles.length; i += stride) {
        // Update position
        particles[i] += particles[i + 2];
        particles[i + 1] += particles[i + 3];

        // Wrap around screen
        if (particles[i] < 0) particles[i] = width;
        if (particles[i] > width) particles[i] = 0;
        if (particles[i + 1] < 0) particles[i + 1] = height;
        if (particles[i + 1] > height) particles[i + 1] = 0;

        // Only change fillStyle when necessary
        const colorIndex = particles[i + 4];
        if (colorIndex !== currentColor) {
            currentColor = colorIndex;
            ctx.fillStyle = COLORS[currentColor];
        }

        ctx.fillRect(particles[i], particles[i + 1], 3, 3);
    }

    requestAnimationFrame(animate);
}

animate();