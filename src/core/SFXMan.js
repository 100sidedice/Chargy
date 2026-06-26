export default class SFXMan {
    constructor(files = {}, audioContext) {
        this.files = files;
        this.ctx = audioContext;
        this.buffers = {};
        this.masterGain = 1;
    }

    async preload() {
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 5;

        for (const [name, file] of Object.entries(this.files)) {
            const response = await fetch(file);
            const arrayBuffer = await response.arrayBuffer();

            this.buffers[name] =
                await this.ctx.decodeAudioData(arrayBuffer);
        }
    }

    play(name, volume = 1, pitch = 0.5) {
        const buffer = this.buffers[name];
        if (!buffer) return;

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();

        source.buffer = buffer;

        // Map 0..1 → 0.5x..2.0x playback speed
        source.playbackRate.value = 0.5 + pitch * 1.5;

        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.masterGain);

        source.start();

        source.onended = () => {
            source.disconnect();
            gain.disconnect();
        };
    }

    setVolume(volume) {
        this.masterGain.gain.value = volume;
    }
}