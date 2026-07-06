export default function resizeCanvas(canvas){
    // get body height
    const body = document.body;
    const html = document.documentElement;
    const dh = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = dh * dpr;
}