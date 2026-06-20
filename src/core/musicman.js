export default class musicMan {
    constructor(tracks = {}, context = null) {
        this.files = tracks;
        this.buffers = {};
        this.context = context;
        this.current = null;
        this.source = null;
        this.gain = null;
        this.unlocked = false;
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

        this.gain.gain.value = volume;

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
        const gain = this.context.createGain();

        this.source.buffer = buffer;
        this.source.loop = true;

        this.source.connect(gain);
        gain.connect(this.context.destination);

        gain.gain.value = 0;

        this.source.start();

        const now = this.context.currentTime;

        gain.gain.linearRampToValueAtTime(
            newVolume,
            now + duration / 1000
        );

        if (oldSource) {
            oldSource.stop(now + duration / 1000);
        }
        this.currentTrack = name;

        this.current = name;
    }
}