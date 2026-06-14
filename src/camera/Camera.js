export class Camera {
    constructor(world) {
        this.world = world;
        this.keyframes = [null];
        this.startTime = 0;
        this.runningTime = 0;
        this.pushed = false;
    }
    clearKeyframes() {
        this.keyframes = [null];
        this.startTime = 0;
        this.runningTime = 0;
        this.lastKeyframeIndex = 0;
    }
    addKeyframe(duration, bezier, effects, onStart, onEnd) {
        this.keyframes.push(new CameraKeyframe(duration, bezier, effects, onStart, onEnd));
    }
    pullQueue(){
        if(this.keyframes.length < 2) return; // need at least 2 keyframes to transition
        this.keyframes.shift();
    }
    checkQueue(){
        if (this.keyframes[0] === null) return false; // no keyframe to play
        return this.keyframes.length >= 2;
    }
    playKeyframe(){
        this.pullQueue();
        if(!this.checkQueue()) return;
        this.startTime = performance.now();
        const keyframeA = this.keyframes[0];
        const keyframeB = this.keyframes[1];
        keyframeA.ready(keyframeB, this.startTime);
        keyframeA.onStart();
    }
    push(ctx, effectSettings = {}) {
        this.pushed = false;
        this.runningTime = performance.now();
        if (!this.checkQueue()) return;
        // if the current keyframe has ended, pull the queue and start the next keyframe
        if (this.keyframes[0].isInBounds(this.runningTime) === 1) {
            this.keyframes[0].onEnd();
            this.keyframes[0] = null; // mark for deletion
            return;
        }

        this.pushed = true;

        const keyframeA = this.keyframes[0];
        const settings = {
            cameraX: 0,
            cameraY: 0,
            cameraRotate: 0,
            cameraScaleX: 1,
            cameraScaleY: 1,
            trueTileSize: 32,
            ...effectSettings
        };
        keyframeA.push(ctx, settings, this.runningTime);
    }
    pop(ctx) {
        if (!this.pushed) return;
        const keyframeA = this.keyframes[0];
        keyframeA.pop(ctx);
    }
}

export class CameraKeyframe {
    constructor(duration, bezier, effectsA = new Map(), onStart = () => {}, onEnd = () => {}) {
        this.bezier = bezier;
        this.effectsA = effectsA;
        this.effectsB = new Map();
        this.onStart = onStart;
        this.onEnd = onEnd;
        this.duration = duration;
        this.startTime = 0;
        this.running = false;
    }

    ready(effectB, startTime) {
        this.startTime = startTime;
        this.effectsB = new Map();
        for (const [effectName] of this.effectsA) {
            this.effectsB.set(
                effectName,
                effectB.effectsA.get(effectName) ?? new CameraEffect()
            );
        }
        this.running = true;
    }

    getProgress(runningTime = this.runningTime) {
        if (!this.startTime || !this.duration) return -1;
        return Math.min(1, Math.max(0, (runningTime - this.startTime) / this.duration));
    }

    isInBounds(runningTime = this.runningTime) {
        if (runningTime < this.startTime){
            return -1;
        };
        if (runningTime > this.startTime + this.duration){
            return 1;
        };
        return 0;
    }


    push(ctx, effectSettings, runningTime) {
        this.runningTime = runningTime;
        const t = this.getProgress();

        const ease = this.bezier.get(t).y;
        
        for (const [name, effectA] of this.effectsA) {
            const effectB = this.effectsB.get(name);
            
            if (!effectA || !effectB) continue;
            
            effectA.lerpTo = effectB;
            effectA.lerpValue = ease;
            effectSettings.linearValue = t;
            effectSettings.inverseValue = this.bezier.get(t, true).y; // optional second bezier for inverse easing
            
            effectA.push(ctx, effectSettings);
        }
        
    }

    pop(ctx) {
        if (!this.running) return;

        const t = this.getProgress();
        if (t <= 0 || t > 1) return;
        for (const [effectName, effectA] of this.effectsA) {
            const effectB = this.effectsB.get(effectName) || effectA; 
            effectA.pop(ctx);
        }
    }
}

export class BezierSegment {
    constructor(...points) {
        if (points.length < 2) {
            throw new Error("BezierSegment requires at least 2 points");
        }

        this.points = points;
    }

    get(t) {
        t = Math.max(0, Math.min(1, t));

        let x = 0;
        let y = 0;

        const n = this.points.length - 1;

        for (let i = 0; i <= n; i++) {
            const binomial = this.binomialCoefficient(n, i);
            const term =
                Math.pow(1 - t, n - i) *
                Math.pow(t, i);

            x += binomial * term * this.points[i].x;
            y += binomial * term * this.points[i].y;
        }

        return { x, y };
    }

    binomialCoefficient(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;

        let coeff = 1;

        for (let i = 1; i <= k; i++) {
            coeff *= (n - i + 1) / i;
        }

        return coeff;
    }
}

export class Bezier {
    constructor(...segments) {
        this.segments = [];
        this.inverse = false;

        for (const segment of segments) {
            if (segment instanceof BezierSegment) {
                this.segments.push(segment);
                continue;
            }

            if (Array.isArray(segment)) {
                this.segments.push(new BezierSegment(...segment));
                continue;
            }

            // optional config object support
            if (typeof segment === "object" && segment.inverse) {
                this.inverse = true;
            }
        }
    }

    get(t) {
        t = Math.max(0, Math.min(1, t));

        if (this.inverse) {
            t = 1 - t;
        }

        if (this.segments.length === 1) {
            return this.segments[0].get(t);
        }

        const scaledT = t * this.segments.length;

        let segmentIndex = Math.floor(scaledT);

        if (segmentIndex >= this.segments.length) {
            segmentIndex = this.segments.length - 1;
        }

        const localT =
            segmentIndex === this.segments.length - 1 && t === 1
                ? 1
                : scaledT - segmentIndex;

        return this.segments[segmentIndex].get(localT);
    }
}

export class CameraEffect {
    constructor(...params) {
        this.params = params;
        this.lerpTo = null;
        this.lerpValue = 0;
    }
    push(ctx, effectSettings) {}
    pop(ctx) {}
}

export class PosEffect extends CameraEffect {
    constructor(x, y, linear = false, invert = false) {
        super(x, y);
        this.linear = linear;
        this.invert = invert;
    }

    push(ctx, effectSettings = {}) {
        ctx.save();

        let [x, y] = this.params;
        const [tx, ty] = this.lerpTo?.params ?? this.params;

        const t = this.lerpValue;

        const trueTileSize = effectSettings.trueTileSize ?? 32;
        const screenW = effectSettings.regionWidth ?? ctx.canvas.width;
        const screenH = effectSettings.regionHeight ?? ctx.canvas.height;

        const centerX = screenW / 2;
        const centerY = screenH / 2;
        
        // if sentinel used → override BEFORE conversion
        if (x === -1 && y === -1) {
            const tilesX = screenW / trueTileSize;
            const tilesY = screenH / trueTileSize;

            x = tilesX / 2 - 0.5;
            y = tilesY / 2 - 0.5;
        }
        if(this.linear){
            x = x + (tx - x) * effectSettings.linearValue;
            y = y + (ty - y) * effectSettings.linearValue;
        }else if (this.invert){
            x = x + (tx - x) * effectSettings.inverseValue;
            y = y + (ty - y) * effectSettings.inverseValue;
        }else{
            x = x + (tx - x) * t;
            y = y + (ty - y) * t;
        }

        const worldX = x * trueTileSize + trueTileSize / 2;
        const worldY = y * trueTileSize + trueTileSize / 2;

        // -------------------------------------------------
        // your camera model (unchanged)
        // -------------------------------------------------
        const targetX = worldX;
        const targetY = worldY;

        const cameraX = targetX - centerX;
        const cameraY = targetY - centerY;

        ctx.translate(-cameraX, -cameraY);

        effectSettings.cameraX = cameraX;
        effectSettings.cameraY = cameraY;
    }

    pop(ctx) {
        ctx.restore();
        ctx.restore();
    }
}
export class RotateEffect extends CameraEffect {
    constructor(angle) {
        super(angle);
    }
    push(ctx, effectSettings) {
        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        const [angle] = this.params;
        const target = this.lerpTo.params[0];
        const newAngle = angle + (target - angle) * this.lerpValue;
        const rad = newAngle * Math.PI / 180;
        ctx.rotate(rad);
        ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2);
        effectSettings.cameraRotate = rad;
    }
    pop(ctx) {
        ctx.restore();
    }
}

export class ScaleEffect extends CameraEffect {
    constructor(scaleX, scaleY) {
        super(scaleX, scaleY);
    }
    push(ctx, effectSettings) {
        ctx.save();
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        const [sx, sy] = this.params;
        const tx = this.lerpTo.params[0];
        const ty = this.lerpTo.params[1];
        const newScaleX = sx + (tx - sx) * this.lerpValue**2;
        const newScaleY = sy + (ty - sy) * this.lerpValue**2;
        ctx.scale(newScaleX, newScaleY);
        effectSettings.cameraScaleX = newScaleX;
        effectSettings.cameraScaleY = newScaleY;
        ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2);
    }
    pop(ctx) {
        ctx.restore();
    }
}

export class FadeEffect extends CameraEffect {
    constructor(color) {
        super(color);
    }
    push(ctx, effectSettings) {
        const [color] = this.params;
        const distColor = this.lerpTo.params[0] ?? "#00000000";
        const newColor = this.interpolateColor(color, distColor, this.lerpValue);

        ctx.fillStyle = newColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    pop(ctx) {
    }
    interpolateColor(colorA, colorB, t) {
        const parseColor = (color) => {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const a = parseInt(color.slice(7, 9) || "FF", 16) / 255;
            return { r, g, b, a };
        };

        const cA = parseColor(colorA);
        const cB = parseColor(colorB);

        const r = Math.round(cA.r + (cB.r - cA.r) * t);
        const g = Math.round(cA.g + (cB.g - cA.g) * t);
        const b = Math.round(cA.b + (cB.b - cA.b) * t);
        const a = cA.a + (cB.a - cA.a) * t;

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
}
export class ShakeEffect extends CameraEffect {
    constructor(intensity = 10, frequency = 0.1) {
        super(intensity, frequency);

        this.intensity = intensity;
        this.frequency = frequency;

        this.prevShakeX = 0;
        this.prevShakeY = 0;
        this.lastShakeTime = 0;
    }

    push(ctx, effectSettings = {}) {
        ctx.save();
        let shakeX = this.prevShakeX;
        let shakeY = this.prevShakeY;

        // lerp intensity if transitioning to another shake effect
        const targetIntensity = this.intensity + (this.lerpTo.params[0]-this.intensity) * this.lerpValue;
        const targetFrequency = this.frequency + (this.lerpTo.params[1]-this.frequency) * this.lerpValue;
        

        if (effectSettings.linearValue - this.lastShakeTime < targetFrequency) {
            this.lastShakeTime = effectSettings.linearValue;
            shakeX = (Math.random() * 2 - 1) * targetIntensity;
            shakeY = (Math.random() * 2 - 1) * targetIntensity;
            this.prevShakeX = shakeX;
            this.prevShakeY = shakeY;
        }

        ctx.translate(shakeX, shakeY);

        effectSettings.cameraShakeX = shakeX;
        effectSettings.cameraShakeY = shakeY;
    }

    pop(ctx) {
        ctx.restore();
    }
}
export function getEffect(name, ...params) {
    switch(name){
        case "pos": return new PosEffect(...params);
        case "rotate": return new RotateEffect(...params);
        case "scale": return new ScaleEffect(...params);
        case "fade": return new FadeEffect(...params);
        case "shake": return new ShakeEffect(...params);
        case "dither": return new DitherEffect(...params);
        default: throw new Error(`Unknown effect name: ${name}`);
    }
}