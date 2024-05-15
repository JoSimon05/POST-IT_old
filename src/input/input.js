
const { ipcRenderer } = require("electron")
const linkify = require("linkifyjs")

document.addEventListener("DOMContentLoaded", () => {

    const textField = document.getElementById("text-field")
    const textContainer = document.getElementById("container")
    let lastText = null
    let timeoutID

    const defaultPlaceholder = "Type something or paste a link..."
    textField.placeholder = defaultPlaceholder

    const colorsArray = [
        "255, 193, 74",   // orange
        "255, 255, 100",   // yellow
        "185, 235, 71",   // green
        "138, 222, 255",   // blue
        "206, 129, 255",   // violet
        "255, 147, 217"   // pink
    ]


    // execute when KEY is pressed
    textField.addEventListener("keydown", event => {

        // execute if KEY is "ENTER"
        if (event.key === "Enter") {
            event.preventDefault()

            // hide input if empty
            if (textField.value == "" && lastText == null) {
                ipcRenderer.send("hideInput") // IPC: send "hideInput" event

            } else {

                // prevent if blank/spaced text
                if (!/\S/.test(textField.value)) {
                    textField.value = ""

                } else {

                    const linkFromText = linkify.find(textField.value)
                    const isLink = linkFromText.length != 0 ? true : false
                    const linkToOpen = isLink ? linkFromText[0].value : null // only one link!
                    const isValidLink = linkToOpen != null ? linkToOpen.startsWith("https://") || linkToOpen.startsWith("http://") : null


                    // ignore characters limit (link)
                    if (isValidLink) {

                        // IPC: send "createNote" event
                        ipcRenderer.send("createNote", textField.value)
                        textField.value = ""

                    } else {

                        // block if over 50 characters (no link)
                        if (textField.value.length > 50) {
                            // save last text and restore it
                            lastText = textField.value

                            textField.style.caretColor = "transparent"
                            textField.placeholder = "Max 50 characters!"
                            textField.value = ""

                            // overwrite current timeout
                            if (timeoutID) clearTimeout(timeoutID)

                            timeoutID = setTimeout(() => {
                                textField.value = lastText
                                textField.style.caretColor = "auto"
                                textField.placeholder = defaultPlaceholder
                                lastText = null
                            }, 1000)

                        } else {
                            ipcRenderer.send("createNote", textField.value) // IPC: send "createNote" event
                        }
                    }
                }
            }
        }

        // execute if KEY is "ESC"
        if (event.key === "Escape") {
            ipcRenderer.send("hideInput") // IPC: send "hideInput" event
        }
    })



    // IPC: clear input text field
    ipcRenderer.on("clearInput", () => {
        textField.value = ""
    })


    // IPC: prevent if too many notes
    ipcRenderer.on("tooManyNotes", (event, noteText) => {

        // save last text and restore it
        lastText = noteText

        textField.style.caretColor = "transparent"
        textField.placeholder = "Too many opened Notes!"
        textField.value = ""

        // overwrite current timeout
        if (timeoutID) clearTimeout(timeoutID)

        timeoutID = setTimeout(() => {
            textField.value = lastText
            textField.style.caretColor = "auto"
            textField.placeholder = defaultPlaceholder
            lastText = null
        }, 1000)
    })


    // IPC: change input border color
    ipcRenderer.on("displayColor", (event, colorIndex) => {
        textContainer.style.borderColor = `rgba(${colorsArray[colorIndex]}, 1)`
    })
})
