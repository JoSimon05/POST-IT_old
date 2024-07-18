
const { ipcRenderer } = require("electron")
const linkify = require("linkifyjs")

document.addEventListener("DOMContentLoaded", () => {

    const textField = document.getElementById("text-field")
    const fakeCorner = document.getElementById("fake-corner")

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

    const secColorsArray = [
        "225, 163, 44",   // darker orange (-30)
        "225, 225, 70",   // darker yellow (-30)
        "155, 205, 41",   // darker green (-30)
        "108, 192, 225",   // darker blue (-30)
        "176, 99, 225",   // darker violet (-30)
        "225, 117, 187"   // darker pink (-30)
    ]


    // never lose focus on input
    textField.addEventListener("blur", () => textField.focus())


    // execute on any input
    textField.addEventListener("input", () => {

        textField.style.height = "1px"
        textField.style.height = `${textField.scrollHeight + 2}px`

        if (textField.value.length > 50) {

            const linkFromText = linkify.find(textField.value)
            const isLink = linkFromText.length != 0 ? true : false
            const linkToOpen = isLink ? linkFromText[0].value : null // only one link!
            const isValidLink = linkToOpen != null ? linkToOpen.startsWith("https://") || linkToOpen.startsWith("http://") : null

            // set characters limit (if not link)
            if (!isValidLink) {

                // save last text and restore it
                lastText = textField.value

                textField.style.textAlign = "center"
                textField.style.caretColor = "transparent"
                textField.placeholder = "\nMax 50 characters!"
                textField.value = ""

                textField.disabled = true

                // overwrite current timeout
                if (timeoutID) clearTimeout(timeoutID)

                timeoutID = setTimeout(() => {

                    textField.style.textAlign = "left"
                    textField.value = lastText.slice(0, 50)
                    textField.style.caretColor = "auto"
                    textField.placeholder = defaultPlaceholder
                    lastText = null

                    textField.style.height = `${textField.scrollHeight + 2}px`

                    textField.disabled = false
                    textField.focus()

                }, 1000)
            }
        }
    })


    // execute when KEY is pressed
    textField.addEventListener("keydown", e => {

        // execute if KEY is "ENTER"
        if (e.key === "Enter") {
            e.preventDefault()

            // hide input if empty
            if (textField.value == "" && lastText == null) {
                ipcRenderer.send("hideInput") // IPC: send "hideInput" event

            } else {

                // prevent if blank/spaced text
                if (!/\S/.test(textField.value)) {
                    textField.value = ""

                } else {

                    // IPC: send "createNote" event
                    ipcRenderer.send("createNote", textField.value)
                }
            }
        }

        // execute if KEY is "ESC"
        if (e.key === "Escape") {
            ipcRenderer.send("hideInput") // IPC: send "hideInput" event
        }
    })



    // IPC: clear input text field
    ipcRenderer.on("clearInput", () => {
        textField.value = ""
        textField.style.height = "50px"
    })


    // IPC: prevent if too many notes
    ipcRenderer.on("tooManyNotes", (e, noteText) => {

        // save last text and restore it
        lastText = noteText

        textField.style.height = "95px"
        textField.style.textAlign = "center"
        textField.style.caretColor = "transparent"
        textField.placeholder = "\nToo many opened Notes!"
        textField.value = ""

        textField.disabled = true

        // overwrite current timeout
        if (timeoutID) clearTimeout(timeoutID)

        timeoutID = setTimeout(() => {

            textField.style.textAlign = "left"
            textField.value = lastText
            textField.style.caretColor = "auto"
            textField.placeholder = defaultPlaceholder
            lastText = null

            textField.style.height = "1px"
            textField.style.height = `${textField.scrollHeight + 2}px`

            textField.disabled = false
            textField.focus()

        }, 1000)
    })


    // IPC: change input color
    ipcRenderer.on("displayColor", (e, colorIndex) => {
        document.body.style.background = `linear-gradient(-45deg, transparent 12.5%, rgba(${colorsArray[colorIndex]}, 1) 0%)`
        fakeCorner.style.background = `linear-gradient(-45deg, transparent 50%, rgba(${secColorsArray[colorIndex]}, 1) 50%)`
    })
})
