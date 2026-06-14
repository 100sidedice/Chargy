export default class Input {
    constructor() {
        // currently pressed keys (normalized)
        this.keys = new Set();
        // key => [{ action, direction }]
        this.actionmap = {};
        this.keymap = {
            "Axis1": {
                "positive": ["d", "arrowright", "#right"],
                "negative": ["a", "arrowleft", "#left"]
            },
            "Axis2": {
                "positive": ["s", "arrowdown", "#down"],
                "negative": ["w", "arrowup", "#up"]
            }
        };
        this.convertKeymap();
        this.attachEvents();
    }

    normalizeKey(key) {
        return key.toLowerCase();
    }
    convertKeymap() {
        this.actionmap = {};
        for (const action in this.keymap) {
            const bindings = this.keymap[action];
            for (const direction in bindings) {
                const keys = bindings[direction];
                keys.forEach((rawKey) => {
                    const key = this.normalizeKey(rawKey);
                    if (!this.actionmap[key]) {
                        this.actionmap[key] = [];
                    }
                    this.actionmap[key].push({
                        action,
                        direction
                    });
                });
            }
        }
    }

    attachEvents() {
        document.addEventListener("keydown", (e) => {
            const key = this.normalizeKey(e.key);

            this.keys.add(key);

            // prevent scrolling for mapped keys
            if (this.actionmap[key]) {
                e.preventDefault();
            }
        });

        document.addEventListener("keyup", (e) => {
            const key = this.normalizeKey(e.key);
            this.keys.delete(key);
        });

        // TOUCH INPUT (mobile buttons with ids)
        document.addEventListener("touchstart", (e) => {
            const el = e.target.closest?.("[id]");
            if (!el) return;

            const key = "#" + this.normalizeKey(el.id);

            if (this.actionmap[key]) {
                this.keys.add(key);
            }
        });

        document.addEventListener("touchend", (e) => {
            const el = e.target.closest?.("[id]");
            if (!el) return;

            const key = "#" + this.normalizeKey(el.id);
            this.keys.delete(key);
        });
    }

    isPressed(key) {
        return this.keys.has(this.normalizeKey(key));
    }

    getAxis(action) {
        const bindings = this.keymap[action];
        if (!bindings) return 0;

        let positive = false;
        let negative = false;

        for (const key of bindings.positive) {
            if (this.keys.has(this.normalizeKey(key))) {
                positive = true;
                break;
            }
        }

        for (const key of bindings.negative) {
            if (this.keys.has(this.normalizeKey(key))) {
                negative = true;
                break;
            }
        }

        // cancel-out logic (optional but common)
        if (positive && negative) return 0;

        if (positive) return 1;
        if (negative) return -1;

        return 0;
    }

    getActionState(action) {
        const bindings = this.keymap[action];
        if (!bindings) return { positive: false, negative: false };

        let positive = false;
        let negative = false;

        for (const key of bindings.positive) {
            if (this.keys.has(this.normalizeKey(key))) {
                positive = true;
            }
        }

        for (const key of bindings.negative) {
            if (this.keys.has(this.normalizeKey(key))) {
                negative = true;
            }
        }

        return { positive, negative };
    }
}