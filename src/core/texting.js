export default class Texting {
    constructor(world) {
        this.world = world;
    }
    async preload(datakey){
        // load the json data into this.data
        const response = await fetch(`${datakey}`);
        this.data = await response.json();
        this.messageElement = document.getElementById("message");
        if (!this.messageElement) console.warn("No message element found for texting system");
    }
    async playMessage(key){
        const messages = this.data[key];
        if (!messages) return;
        // clear previous message
        this.messageElement.innerHTML = "";
        for (const message of messages) {
            await this.showMessage(message.who, message.text, message.timeout??1500);
        }
        // clear all (start by removing visible class to start fade out animation)
        const children = Array.from(this.messageElement.children);
        for (const child of children) {
            child.classList.remove("visible");
        }
        // wait for animation to finish before removing elements
        await new Promise(resolve => setTimeout(resolve, 500));
        this.messageElement.innerHTML = "";
    }
    async showMessage(who, text, timeout = 1500){
        // grid columns: left (.leftMessage), center (.centerMessage), right (.rightMessage)
        const side = "leftMessage";
        const person = document.createElement("span");
        person.classList.add(side);
        person.innerHTML = who;
        this.messageElement.appendChild(person);
        await fadeIn(person);
        const message = document.createElement("span");
        message.classList.add("centerMessage");
        message.innerHTML = text;
        this.messageElement.appendChild(message);
        await fadeIn(message);
        // wait for timeout seconds
        await new Promise(resolve => setTimeout(resolve, timeout));
        // add <br> after the message for spacing
        const br = document.createElement("br");
        this.messageElement.appendChild(br);
    }
}
function isRight(who){
    return ["Chargy"].includes(who);
}
function fadeIn(element) {
    return new Promise(resolve => {
        void element.offsetWidth;

        element.addEventListener("transitionend", resolve, {
            once: true
        });

        element.classList.add("visible");
    });
}