export default class musicMan {
    constructor(tracks = {}, context = null) {
        this.files = tracks;
        this.buffers = {};
        this.context = context;

        this.current = null;
        this.source = null;
        this.gain = null;

        this.volume = 1;
        this.unlocked = false;
        this.pending = null;
    }

    async preload() {
        for (const [name, file] of Object.entries(this.files)) {
            const response = await fetch(file);
            const data = await response.arrayBuffer();
            const buffer = await this.context.decodeAudioData(data);

            this.buffers[name] = buffer;
        }
    }

    async unlock() {
        if (this.context.state === "suspended") {
            await this.context.resume();
        }

        this.unlocked = true;
        console.log("Audio unlocked");

        // Resume pending track if one exists
        if (this.pending) {
            const { name, volume } = this.pending;
            this.pending = null;
            this.start(name, volume);
        }
    }

    stop() {
        if (!this.source) return;

        try {
            this.source.stop();
        } catch (e) {}

        this.source.disconnect();

        if (this.gain) {
            this.gain.disconnect();
        }

        this.source = null;
        this.gain = null;
        this.current = null;
    }

    start(name, volume = 1) {
        if (!this.unlocked) {
            console.log("Waiting for audio unlock");
            this.pending = { name, volume };
            return;
        }

        const buffer = this.buffers[name];
        if (!buffer) return;

        if (this.source) {
            this.source.stop();
        }

        this.source = this.context.createBufferSource();
        this.gain = this.context.createGain();

        this.source.buffer = buffer;
        this.source.loop = true;

        this.gain.gain.value = volume * this.volume;

        this.source.connect(this.gain);
        this.gain.connect(this.context.destination);

        this.source.start();

        this.current = name;
    }

    fadeTo(name, duration = 1000, newVolume = 1) {
        const buffer = this.buffers[name];
        if (!buffer) return;

        const oldSource = this.source;

        this.source = this.context.createBufferSource();
        this.gain = this.context.createGain();

        this.source.buffer = buffer;
        this.source.loop = true;

        this.source.connect(this.gain);
        this.gain.connect(this.context.destination);

        this.gain.gain.value = 0;

        this.source.start();

        const now = this.context.currentTime;

        this.gain.gain.linearRampToValueAtTime(
            newVolume * this.volume,
            now + duration / 1000
        );

        if (oldSource) {
            oldSource.stop(now + duration / 1000);
        }

        this.current = name;
    }

    setVolume(volume = 1) {
        this.volume = Math.max(0, Math.min(1, volume));

        if (!this.gain) return;

        this.gain.gain.setTargetAtTime(
            this.volume,
            this.context.currentTime,
            0.01
        );
    }
}