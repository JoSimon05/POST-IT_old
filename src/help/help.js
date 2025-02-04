
const { clipboard, ipcRenderer, webFrame } = require("electron")

webFrame.setZoomFactor(1)

document.addEventListener("DOMContentLoaded", () => {

    const copyExample = document.getElementById("copy-example")
    const copied = document.getElementById("copied")
    const linkExample = document.getElementById("link-example")
    const closeExample = document.getElementById("close-example")
    const corner = document.getElementById("corner-container")


    // prevent window zoom
    window.addEventListener("keydown", (e) => {

        if (e.key === "*" || e.key === "-") e.preventDefault()
    })


    // mouse events (text)
    copyExample.addEventListener("click", () => {

        // copy example text
        clipboard.writeText(copyExample.textContent)
        copied.innerText = "copied!"
    })


    // mouse events (link)
    linkExample.addEventListener("click", () => {
        ipcRenderer.send("openExampleLink") // IPC: send "openExampleLink" event
    })

    linkExample.addEventListener("contextmenu", (e) => {
        e.preventDefault()

        // copy example link
        clipboard.writeText("https://example.com/post-it/help/open-link-example")
    })


    // mouse events (corner)
    corner.addEventListener("mouseenter", () => {
        closeExample.style.color = "rgba(0, 0, 0, 0.5)"
    })

    corner.addEventListener("mouseleave", () => {
        closeExample.style.color = "rgba(0, 0, 0, 1)"
    })

    corner.addEventListener("click", () => {
        ipcRenderer.send("closeHelp") // IPC: send "closeHelp" event
    })
})

function log(text) {
    ipcRenderer.send("log", text)
}
