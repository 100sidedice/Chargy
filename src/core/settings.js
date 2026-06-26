const onMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const settingsMenu = document.getElementById("settings-menu");

// ok, now for the hard part, attaching all the buttons ):
window.settings = {
    "volume": {
        "musicVolume": 1,
        "sfxVolume": 1
    },
    "players":{
        "0":{
            "name": "Chargy",
            "controls":["Axis1", "Axis2"]
        }
    }
}
// Settings button
const settings = document.getElementById("settings");
settings.addEventListener("click", () => {
    settingsMenu.classList.toggle("hidden");
})
const closeSettings = document.getElementById("close-settings");
closeSettings.addEventListener("click", () => {
    settingsMenu.classList.toggle("hidden");
})

// volume sliders
const musicVolumeSlider = document.getElementById("audio-music");
const sfxVolumeSlider = document.getElementById("audio-sfx");
musicVolumeSlider.addEventListener("input", (e) => {
    const volume = parseFloat(e.target.value)/200;
    window.saver.setData("settings","musicVolume", volume);
    window.settings.volume.musicVolume = volume;
    window.musicMan.setVolume(volume);
});
sfxVolumeSlider.addEventListener("input", (e) => {
    const volume = parseFloat(e.target.value)/5;
    window.saver.setData("settings","sfxVolume", volume);
    window.settings.volume.sfxVolume = volume;
    window.soundMan.setVolume(volume);
});
// player
const playerButton = document.getElementById("player-count");
const swapPlayerButton = document.getElementById("swap-player");
const player1Input = document.getElementById("player-1-input");
const player2Input = document.getElementById("player-2-input");
playerButton.addEventListener("click", () => {
    const currentCount = Object.keys(window.settings.players).length;
    if (currentCount === 1) {
        window.settings.players["1"] = {
            "name": "Powery",
            "controls":["Axis3", "Axis4"] // wasd
        };
        if (window.settings.players["0"].controls[0] === "Axis3") {
            window.settings.players["1"].controls = ["Axis1", "Axis2"]; // if player 1 is using wasd, player 2 should use arrow keys
        }
        // if name of player 1 is powery, change player 2 to chargy
        if (window.settings.players["0"].name === "Powery") {
            window.settings.players["1"].name = "Chargy";
        }
        playerButton.textContent = "Players: 2";
        player2Input.classList.toggle("hidden");
    }
    if (currentCount === 2) {
        delete window.settings.players["1"];
        playerButton.textContent = "Players: 1";
        // hide player 2 input
        player2Input.classList.add("hidden");
    }
    window.saver.setData("settings","players", window.settings.players);
})
swapPlayerButton.addEventListener("click", () => {
    const currentCount = Object.keys(window.settings.players).length;
    if (currentCount === 2) {
        // swap names & controls between players
        const player1 = window.settings.players["0"];
        const player2 = window.settings.players["1"];
        const tempName = player1.name;
        const tempControls = player1.controls;
        player1.name = player2.name;
        player1.controls = player2.controls;
        player2.name = tempName;
        player2.controls = tempControls;
    }
    if (currentCount === 1) {
        // swap name between powery and chargy
        const player1 = window.settings.players["0"];
        if (player1.name === "Chargy") {
            player1.name = "Powery";
        } else {
            player1.name = "Chargy";
        }
    }
    window.saver.setData("settings","players", window.settings.players);
})
player1Input.addEventListener("click", () => {
    // swap contols between axis1/axis2 and axis3/axis4
    if (window.settings.players["0"].controls[0] === "Axis1") {
        window.settings.players["0"].controls = ["Axis3", "Axis4"];
    } else {
        window.settings.players["0"].controls = ["Axis1", "Axis2"];
    }
    let text = "Arrow Keys";
    if (window.settings.players["0"].controls[0] === "Axis3") {
        text = "WASD";
    }
    player1Input.textContent = `Player 1: ${text}`;
    window.saver.setData("settings","players", window.settings.players);
})
player2Input.addEventListener("click", () => {
    // swap contols between axis1/axis2 and axis3/axis4
    if (window.settings.players["1"].controls[0] === "Axis1") {
        window.settings.players["1"].controls = ["Axis3", "Axis4"];
    } else {
        window.settings.players["1"].controls = ["Axis1", "Axis2"];
    }
    let text = "Arrow Keys";
    if (window.settings.players["1"].controls[0] === "Axis3") {
        text = "WASD";
    }
    player2Input.textContent = `Player 2: ${text}`;
    window.saver.setData("settings","players", window.settings.players);
})
// Level settings
const resetLevelButton = document.getElementById("reset-level");
resetLevelButton.addEventListener("click", () => {
    // throw an event to reset the level
    const event = new Event("resetLevel");
    window.dispatchEvent(event);
})
const exitLevelButton = document.getElementById("exit-level");
exitLevelButton.addEventListener("click", () => {
    // throw an event to exit the level
    const event = new Event("exitLevel");
    window.dispatchEvent(event);
})