export default class CutsceneManager {
    constructor(dataKeys) {
        this.cutsceneFiles = dataKeys.cutscenes; // {"name":"path"}

        this.loadedCutscene = null;
        this.loadedName = null;

        this.loadingPromise = null;
    }

    async preload(name) {
        if (!this.cutsceneFiles[name]) {
            throw new Error(`Cutscene ${name} not found`);
        }

        // If it's already loaded, don't reload it.
        if (this.loadedName === name) {
            return;
        }

        this.loadingPromise = (async () => {
            const path = this.cutsceneFiles[name];

            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load cutscene ${name} from ${path}`);
            }

            const blob = await response.blob();

            // Clean up the previous blob URL.
            if (this.loadedCutscene) {
                URL.revokeObjectURL(this.loadedCutscene.src);
            }

            const video = document.createElement("video");

            video.src = URL.createObjectURL(blob);
            video.preload = "auto";
            // up video volume
            video.volume = 1;

            // Wait until the browser says it can play.
            await new Promise((resolve, reject) => {
                video.oncanplay = resolve;
                video.onerror = reject;
            });

            this.loadedCutscene = video;
            this.loadedName = name;
        })();

        try {
            await this.loadingPromise;
        } finally {
            this.loadingPromise = null;
        }
    }

    async play(name, after) {
        // Wait for any current preload.
        if (this.loadingPromise) {
            await this.loadingPromise;
        }

        // Load the requested cutscene if needed.
        if (this.loadedName !== name) {
            await this.preload(name);
        }

        const video = this.loadedCutscene;
        video.classList.add("cutscene");
        document.body.appendChild(video);

        video.currentTime = 0;

        try {
            await video.play();
        } catch (err) {
            console.error("Failed to play cutscene:", err);
            return;
        }

        // Wait until playback finishes.
        await new Promise(resolve => {
            video.addEventListener("ended", resolve, { once: true });
        });
        video.remove();

        if (after) {
            after();
        }
    }
}