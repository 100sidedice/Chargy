export default class Saver {
    constructor(key) {
        this.key = key;
        this.saveHooks = {};
        this.postSaveHooks = {};
        this.data = {};
        this.autoSaveInterval = 10 * 1000; // Default to 10 seconds

        this.debugSave = false; // Set to true to enable console logs for when saving occurs and what data is being saved
    }

    async load(defaultDataKey = "data/defaultData.json") {
        try {
            const raw = localStorage.getItem(this.key);
            this.data = raw ? JSON.parse(raw) : {};
            if (Object.keys(this.data).length === 0) {
                const defaultData = await fetch(defaultDataKey).then(res => res.json());
                this.data = defaultData;
            }
            return this.data;
        } catch (error) {
            console.error("Error loading data, trying default data. Error:", error);
            try {
                const defaultData = await fetch(defaultDataKey).then(res => res.json());
                this.data = defaultData;
                return this.data;
            } catch (defaultError) {
                console.error("Error loading default data, returning empty data. Error:", defaultError);
                this.data = {};
            }
            return this.data;
        }
    }

    save(data = this.data) {
        if (this.debugSave) {
            console.log("Saving data:", data);
        }
        try {
            this.data = data;
            for (const hookKey in this.saveHooks) {
                if (typeof this.saveHooks[hookKey] !== "function") continue;

                try {
                    this.saveHooks[hookKey](this.data);
                } catch (hookError) {
                    console.error(`Error in save hook "${hookKey}":`, hookError);
                }
            }

            localStorage.setItem(this.key, JSON.stringify(this.data));

            for (const hookKey in this.postSaveHooks) {
                if (typeof this.postSaveHooks[hookKey] !== "function") continue;

                try {
                    this.postSaveHooks[hookKey](this.data);
                } catch (hookError) {
                    console.error(`Error in post-save hook "${hookKey}":`, hookError);
                }
            }
        } catch (error) {
            console.error("Error saving data:", error);
        }
    }

    hook(when = "before", key, callback) {
        switch (when) {
            case "before":
                this.saveHooks[key] = callback;
                break;

            case "after":
                this.postSaveHooks[key] = callback;
                break;

            default:
                console.warn(`Didn't specify a valid hook time for key "${key}"`);

                if (this.saveHooks[key]) {
                    console.log(`A hook with this key already exists in the "before" category.`);
                } else if (this.postSaveHooks[key]) {
                    console.log(`A hook with this key already exists in the "after" category.`);
                } else {
                    console.warn(`No existing hook found for key "${key}". Use "before" or "after".`);
                }
        }
    }

    unhook(key, when = null) {
        switch (when) {
            case "before":
                delete this.saveHooks[key];
                break;

            case "after":
                delete this.postSaveHooks[key];
                break;

            default:
                console.warn(`Didn't specify a valid hook time for key "${key}". Try testHookKey(key).`);
        }
    }

    testHookKey(key) {
        if (this.saveHooks[key] && this.postSaveHooks[key]) return "Both before and after categories contain this key.";
        if (this.postSaveHooks[key]) return "after";
        if (this.saveHooks[key]) return "before";
        return "There doesn't appear to be a hook with that key.";
    }

    testHook(key, when = null, expectedValueType = null, expectedValue = null) {
        switch (when) {
            case "before":
                try {
                    const value = this.saveHooks[key]?.();
                    if (expectedValueType && typeof value !== expectedValueType)
                        console.log(`Expected type "${expectedValueType}", got "${typeof value}".`);

                    if (expectedValue !== null && value !== expectedValue)
                        console.log(`Expected "${expectedValue}", got "${value}".`);

                    return value;
                } catch (error) {
                    console.error(`Error testing before hook "${key}":`, error);
                }
                break;

            case "after":
                try {
                    const value = this.postSaveHooks[key]?.();
                    if (expectedValueType && typeof value !== expectedValueType)
                        console.log(`Expected type "${expectedValueType}", got "${typeof value}".`);

                    if (expectedValue !== null && value !== expectedValue)
                        console.log(`Expected "${expectedValue}", got "${value}".`);

                    return value;
                } catch (error) {
                    console.error(`Error testing after hook "${key}":`, error);
                }
                break;

            default:
                console.warn(`Didn't specify a valid hook time for key "${key}". Try testHookKey(key).`);
        }
    }

    testSaveKey(value, ...path) {
        let current = this.data;

        for (const key of path) {
            if (current == null || current[key] === undefined) {
                console.log(`Didn't find key "${key}" in path "${path.join(" -> ")}"`);
                console.log(`Try inspecting saver.data to see the current structure.`);
                return;
            }

            if (value !== null && current[key] !== value) {
                console.log(`Expected "${value}", got "${current[key]}" at "${key}".`);
                return;
            }

            current = current[key];
        }

        return true;
    }

    getData(...path) {
        let current = this.data;

        for (const key of path) {
            if (current == null || current[key] === undefined) {
                console.log(`Didn't find key "${key}" in path "${path.join(" -> ")}"`);
                return null;
            }

            current = current[key];
        }

        return current;
    }

    setData(value, ...path) {
        if (path.length === 0) {
            this.data = value;
            return;
        }

        let current = this.data;

        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];

            if (current[key] == null) current[key] = {};
            current = current[key];
        }

        current[path[path.length - 1]] = value;
    }

    enableAutoSave(interval = this.autoSaveInterval) {
        window.clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = window.setInterval(() => this.save(), interval);
    }
}