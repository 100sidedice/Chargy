function colorCodeKeywords(keywordData) {
    const escapeRegex = str =>
        str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const keywords = Object.keys(keywordData)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegex);

    if (!keywords.length) return;

    const regex = new RegExp(`\\b(${keywords.join("|")})\\b`, "gi");

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentNode;

                if (
                    !node.nodeValue.trim() ||
                    ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName) ||
                    parent.classList?.contains("keyword-colorcoded")
                ) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];

    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    for (const node of textNodes) {
        const text = node.nodeValue;

        if (!regex.test(text)) continue;
        regex.lastIndex = 0;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        text.replace(regex, (match, keyword, offset) => {
            fragment.appendChild(
                document.createTextNode(text.slice(lastIndex, offset))
            );

            const originalKey = Object.keys(keywordData).find(
                k => k.toLowerCase() === match.toLowerCase()
            );

            const data = keywordData[originalKey];

            const span = document.createElement("span");
            span.classList.add("keyword-colorcoded");
            if (data.class) {
                span.classList.add(data.class);
            } else if (data.color) {
                span.style.color = data.color;
            }
            span.textContent = match;

            // Hover tooltip
            span.dataset.description = data.description;

            fragment.appendChild(span);

            lastIndex = offset + match.length;
        });

        fragment.appendChild(
            document.createTextNode(text.slice(lastIndex))
        );

        node.parentNode.replaceChild(fragment, node);
    }
}

const keywords = {
    Chargy: {
        color: "#00FFFF",
        description: "The player. Can store and deliver charge."
    },
    charge: {
        color: "#00FFFF",
        description: "A mysterious energy that powers phones, and amplifies a users abilities."
    },
    battery: {
        color: "#00FF88",
        description: "Stores charge."
    },
    Powery: {
        color: "#FF00FF",
        description: "A engineer who helps chargy throughout the game."
    },
    phone: {
        color: "#00FF88",
        description: "You beat levels by charging these. They teleport chargy to other levels."
    },
    phones: {
        color: "#00FF88",
        description: "You beat levels by charging these. They teleport chargy to other levels."
    },
    "secret phone": {
        color: "#772a8a",
        description: "A phone that serves as a optional challenge in a level. They are always visible, however there is always either a knowledge, skill, or physical barrier that the player must overcome to reach them."
    },
    goobers: {
        color: "#00FF00",
        description: "The main inhabitants of goober world. They are very friendly, but will attack if provoked."
    },
    "grass goobers": {
        color: "#00FF00",
        description: "Goobers native to the grassy areas of goober world."
    },
    "trey":{
        color: "#FF8800",
        description: "My brother! He helped me a lot with the game, more specifically with the sprites. Many of the enemy concepts and art would not exist without his help. He also helped with some of the level design, and gave me a lot of feedback on the game in general."
    },
    symbolism: {
        color: "#8800FF",
        description: "Using objects, sounds, colors, and more to represent specific ideas or qualities."
    },
    "Goober World": {
        color: "#00FF00",
        description: "The main planet of the game. A planet that has existed for a very long time, and where civilizations have risen and fallen. Currently, the main inhabitants of the planet are the goobers."
    },
    "spacestation": {
        color: "#6600FF",
        description: "A research lab and a hub zone where you can access all the levels and learn more about the game's world"
    },
    Blender: {
        color: "#FF6600",
        description: "A free and open-source 3D creation suite. It's absolutly amazing, if you have a computer with a decent GPU, genuanlly consider learning how to use it. It'll be worth the $0 you have to pay."
    },
    python: {
        color: "#0000FF",
        description: "A interpreted programming language known for its readability and versatility. I highly recommend learning it if you're interested in programming or game development."
    },
    "the rainbow roads": {
        class: "rainbowRoads",
        description: "Seemingly endless roads that span across the universe. Around them is powerful energy fields that bend space and time. Many civilizations that have advanced enough to reach them have used them as a means of interstellar travel."
    }
};

colorCodeKeywords(keywords);