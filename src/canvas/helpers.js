export default function resizeCanvas(canvas){
    const dh = window.visualViewport.height ?? window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.height = dh;

}