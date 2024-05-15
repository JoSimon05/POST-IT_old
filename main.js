
const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, Notification, nativeImage, nativeTheme, screen, shell, Tray } = require("electron")
const { autoUpdater } = require("electron-updater")
const { info, name, version } = require("./package.json")
const fs = require("fs")
const path = require("path")


// about paths
const dataFile = "data.json"
const dataFolder = ".database"
const appFolder = path.join(app.getPath("appData"), name)

const dataFilePath = path.join(appFolder, dataFolder, dataFile)
const dataFilePathDev = path.join(__dirname, dataFolder, dataFile)

const dataFolderPath = path.join(appFolder, dataFolder)
const dataFolderPathDev = path.join(__dirname, dataFolder)

const checkDataFilePath = app.isPackaged ? dataFilePath : dataFilePathDev
const checkDataFolderPath = app.isPackaged ? dataFolderPath : dataFolderPathDev

// default data file content
const defaultData = {
    firstLaunch: true,
    showAlerts: true,
    autoLaunch: true,
    lastColorIndex: 1, // yellow (default on first launch)
    notesArray: []
}


// FUNCTION: check if all necessary files and folders exist in ".../AppData/Roaming/"
function checkDataFile() {

    const appFolderExists = fs.existsSync(appFolder)
    const dataFolderExists = fs.existsSync(checkDataFolderPath)
    const dataFileExists = fs.existsSync(checkDataFilePath)
    
    if (app.isPackaged && !appFolderExists) fs.mkdirSync(appFolder)

    if (!dataFolderExists) {

        if (!app.isPackaged) console.log(`'${dataFolder}' folder no longer exists`)

        fs.mkdirSync(checkDataFolderPath)

        if (!app.isPackaged) console.log(`'${dataFolder}' folder restored`)
    }

    if (!dataFileExists) {

        if (!app.isPackaged) console.log(`'${dataFile}' file no longer exists`)

        const defaultDataString = JSON.stringify(defaultData, null, 4)

        fs.writeFileSync(checkDataFilePath, defaultDataString)

        if (!app.isPackaged) console.log(`'${dataFile}' file restored`)
    }
}

// FUNCTION: check and adjust data file structure
function checkDataStructure() {

    const dataForCheck = JSON.parse(fs.readFileSync(checkDataFilePath))
    const defaultKeys = Object.keys(defaultData)
    const currentKeys = Object.keys(dataForCheck)
    
    if (currentKeys.toString() != defaultKeys.toString()) {
    
        if (!app.isPackaged) console.log(`'${dataFile}' file to update`)
    
        // save and restore last settings
        //const lastShowAlerts = data.showAlerts   // (salva nelle nuove versioni)
        const lastAutoLaunch = data.autoLaunch
        const lastLastColorIndex = data.lastColorIndex
        const lastNotesArray = data.notesArray
    
        const lastData = {
            firstLaunch: false,
            showAlerts: true,
            autoLaunch: lastAutoLaunch,
            lastColorIndex: lastLastColorIndex,
            notesArray: lastNotesArray
        }
    
        // update data file
        data = lastData
        updateDataFile()
    
        if (!app.isPackaged) console.log(`'${dataFile}' file updated`)
    }
}

// FUNCTION: update data file
function updateDataFile() {
    const updatedData = JSON.stringify(data, null, 4)
    fs.writeFileSync(checkDataFilePath, updatedData)
}

checkDataFile() // check data file/folder

let data = JSON.parse(fs.readFileSync(checkDataFilePath))

checkDataStructure()


// about app
const appName = info.displayName

// about icons
const inputIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "input.ico")).resize({ width: 24, height: 24 })
const helpIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "help.ico")).resize({ width: 24, height: 24 })
const noteIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "note.ico"))
const noteIconWhite = nativeImage.createFromPath(path.join(__dirname, "icons", "note_white.ico")).resize({ width: 12, height: 12 })
const noteIconBlack = nativeImage.createFromPath(path.join(__dirname, "icons", "note_black.ico")).resize({ width: 12, height: 12 })
const updateIconLow = nativeImage.createFromPath(path.join(__dirname, "icons", "update_low.ico"))
const updateIconHigh = nativeImage.createFromPath(path.join(__dirname, "icons", "update_high.ico"))
const alertIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "alert.ico"))
const clearIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "clear.ico"))

// about colors
const colorsArray = ["orange", "yellow", "green", "blue", "violet", "pink"]
let colorIndex = data.lastColorIndex

// about color icons
const orangeIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "orange.ico")).resize({ width: 14, height: 14 })
const yellowIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "yellow.ico")).resize({ width: 14, height: 14 })
const greenIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "green.ico")).resize({ width: 14, height: 14 })
const blueIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "blue.ico")).resize({ width: 14, height: 14 })
const violetIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "violet.ico")).resize({ width: 14, height: 14 })
const pinkIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "colors", "pink.ico")).resize({ width: 14, height: 14 })

// about shortcuts
const inputShoutcut = "ALT+N"
const inputMenuShortcut = "SHIFT+F10" // system default
const inputColorShortcut = "ALT+C"
const helpShortcut = "ALT+H"
const showShortcut = "ALT+V"
const pinShortcut = "ALT+P"
const trayMenuShortcut = "SHIFT+ALT+N"

// about windows
let inputWin
let noteWin
let helpWin

// about menus
let tray
let trayMenu
let inputMenu
let arePinned = false
let someNotes = data.notesArray.length != 0 ? true : false

// about positions
let screenOrigin
let screenWidth
let screenHeight
let notePosX
let notePosY

// about updates
let isUpdating = false


// app setup
app.setName(name)
app.setAppUserModelId(info.displayAppID)
app.setJumpList([]) // empty app jumplist
app.setLoginItemSettings({
    openAtLogin: true,
    enabled: data.autoLaunch
})
//!app.disableHardwareAcceleration()


// check app instance
const instanceLock = app.requestSingleInstanceLock()

if (!instanceLock) {
    app.quit()

} else {

    // execute if app is already running
    app.on("second-instance", () => {
        showInputWindow()
    })

    // execute when app is ready
    app.whenReady().then(() => {   // app is ready!

        screenOrigin = screen.getPrimaryDisplay().nativeOrigin
        screenWidth = screen.getPrimaryDisplay().size.width
        screenHeight = screen.getPrimaryDisplay().size.height

        
        // show help on first launch
        if (data.firstLaunch) {

            showHelpWindow()

            // update data file (already checked)
            data.firstLaunch = false
            updateDataFile()
        }


        // build tray menu
        trayMenu = Menu.buildFromTemplate([

            {   // title (white icon)
                label: `${appName} ${info.displayVersion}`,
                id: "titleWhiteID",
                enabled: false,
                icon: noteIconWhite,
                visible: nativeTheme.shouldUseDarkColors ? true : false
            },

            {   // title (black icon)
                label: `${appName} ${info.displayVersion}`,
                id: "titleBlackID",
                enabled: false,
                icon: noteIconBlack,
                visible: nativeTheme.shouldUseDarkColors ? false : true
            },

            { type: "separator" },

            {   // show input
                label: "Open Input bar",
                accelerator: inputShoutcut,
                click: () => showInputWindow()
            },

            {   // show help
                label: "Help?",
                accelerator: helpShortcut,
                click: () => showHelpWindow()
            },

            { type: "separator" },

            {   // move all notes on top
                label: "Show Notes",
                id: "showNotesID",
                accelerator: showShortcut,
                enabled: someNotes && !arePinned,
                click: () => showAllNotes()
            },

            {   // pin all notes
                label: "Pin Notes",
                id: "pinNotesID",
                accelerator: pinShortcut,
                enabled: someNotes,
                visible: arePinned ? false : true,
                click: () => pinAllNotes()
            },

            {   // unpin all notes
                label: "Unpin Notes",
                id: "unpinNotesID",
                accelerator: pinShortcut,
                visible: false,
                click: () => unpinAllNotes()
            },

            { type: "separator" },

            {   // popup submenu for more options
                label: "More options...",
                submenu: [

                    {   // check for updates
                        label: "Check for updates...",
                        id: "checkUpdateID",
                        click: () => app.isPackaged ? checkForUpdatesFromMenu() : console.log("no updates")
                    },

                    {   // install update
                        label: "Install update!",
                        id: "downloadUpdateID",
                        visible: false,
                        click: () => app.isPackaged ? confirmUpdate() : console.log("no updates")
                    },

                    {   // choose if show notifications
                        label: "Show notifications",
                        id: "showAlertsID",
                        type: "checkbox",
                        checked: data.showAlerts,
                        click: () => toggleShowAlerts()
                    },

                    {   // choose if run on startup
                        label: "Run on startup",
                        id: "autoLaunchID",
                        type: "checkbox",
                        click: () => toggleAutoLaunch()
                    },

                    { type: "separator" },

                    {   // delete all notes
                        label: "Clear all",
                        id: "clearAllID",
                        enabled: someNotes,
                        click: () => clearAllNotes()
                    },
                ]
            },

            {   // quit app
                label: "Quit",
                role: "quit"
            }
        ])

        // build input menu
        inputMenu = Menu.buildFromTemplate([

            {   // open submenu for colors
                label: "Colors...",
                id: "colorSubmenuID",
                accelerator: inputColorShortcut,
                submenu: [
                    { label: "Orange", type: "radio", checked: colorIndex == 0 ? true : false, icon: orangeIcon, click: () => saveLastColor(0) },
                    { label: "Yellow", type: "radio", checked: colorIndex == 1 ? true : false, icon: yellowIcon, click: () => saveLastColor(1) },
                    { label: "Green", type: "radio", checked: colorIndex == 2 ? true : false, icon: greenIcon, click: () => saveLastColor(2) },
                    { label: "Blue", type: "radio", checked: colorIndex == 3 ? true : false, icon: blueIcon, click: () => saveLastColor(3) },
                    { label: "Violet", type: "radio", checked: colorIndex == 4 ? true : false, icon: violetIcon, click: () => saveLastColor(4) },
                    { label: "Pink", type: "radio", checked: colorIndex == 5 ? true : false, icon: pinkIcon, click: () => saveLastColor(5) }
                ]
            },

            { type: "separator" },

            {   // open emoji panel
                label: "Emoji",
                accelerator: "META+.",
                click: () => (app.isEmojiPanelSupported()) ? app.showEmojiPanel() : null
            },

            { type: "separator" },

            {   // cut text
                label: "Cut",
                role: "cut",
                accelerator: "CTRL+X"
            },

            {   // copy text
                label: "Copy",
                role: "copy",
                accelerator: "CTRL+C"
            },
            
            {   // paste text
                label: "Paste",
                role: "paste",
                accelerator: "CTRL+V"
            },

            { type: "separator" },

            {   // select all text
                label: "Select all",
                role: "selectAll",
                accelerator: "CTRL+A"
            }
        ])


        // toggle title icon theme (in tray menu)
        nativeTheme.on("updated", () => {

            if (nativeTheme.shouldUseDarkColors) {
                trayMenu.getMenuItemById("titleWhiteID").visible = true
                trayMenu.getMenuItemById("titleBlackID").visible = false

            } else {
                trayMenu.getMenuItemById("titleWhiteID").visible = false
                trayMenu.getMenuItemById("titleBlackID").visible = true
            }
        })


        // tray setup
        tray = new Tray(noteIcon)
        tray.setToolTip(appName)

        tray.on("click", () => {

            // check app auto-launch changes (by system)
            trayMenu.getMenuItemById("autoLaunchID").checked = app.getLoginItemSettings().launchItems[0].enabled
            tray.popUpContextMenu(trayMenu)
        })

        tray.on("right-click", () => {

            // check app auto-launch changes (by system)
            trayMenu.getMenuItemById("autoLaunchID").checked = app.getLoginItemSettings().launchItems[0].enabled
            tray.popUpContextMenu(trayMenu)
        })


        loadInputWindow() // load input


        // SHORTCUT: show/hide input
        globalShortcut.register(inputShoutcut, () => {
            showInputWindow()
        })

        // SHORTCUT: show help
        globalShortcut.register(helpShortcut, () => {
            showHelpWindow()
        })

        // SHORTCUT: move all notes on top
        globalShortcut.register(showShortcut, () => {
            if (someNotes && !arePinned) showAllNotes()
        })

        // SHORTCUT: pin/unpin all notes
        globalShortcut.register(pinShortcut, () => {

            if (someNotes) {

                if (!arePinned) {
                    pinAllNotes()

                } else {
                    unpinAllNotes()
                }
            }
        })

        // SHORTCUT: popup tray menu
        globalShortcut.register(trayMenuShortcut, () => {
            tray.popUpContextMenu(trayMenu, { x: screenWidth, y: screenHeight })
        })


        if (data.showAlerts) {

            // build launch notification
            const lauchNotif = new Notification({
                icon: noteIcon,
                title: `${appName} is running!`,
                body: `Press ${inputShoutcut} to create a Note`,
                silent: true
            })

            // show launch notification
            if (Notification.isSupported()) {

                lauchNotif.show()

                lauchNotif.on("close", () => lauchNotif.close())
                lauchNotif.on("click", () => lauchNotif.close())
            }
        }


        // restore unclosed notes
        if (data.notesArray.length != 0) {

            // load and show restored notes
            data.notesArray.forEach(noteToRestore => {

                const restoredID = noteToRestore.id
                const restoredText = noteToRestore.text
                const restoredColor = noteToRestore.index
                const restoredX = noteToRestore.x
                const restoredY = noteToRestore.y

                noteToRestore = buildNoteWindow()
                noteToRestore.loadFile("src/note/note.html")

                noteToRestore.setPosition(restoredX, restoredY)

                const updatedID = noteToRestore.id - 1

                // execute when ready
                noteToRestore.on("ready-to-show", () => {

                    // IPC: send "displayNote" event
                    noteToRestore.webContents.send("displayNote", {
                        id: updatedID,
                        text: restoredText,
                        colorIndex: restoredColor
                    })

                    noteToRestore.show()

                    const noteIndex = data.notesArray.findIndex(n => n.id === restoredID)
                    
                    // update data file (already checked)
                    data.notesArray[noteIndex].id = updatedID
                    updateDataFile()
                })

                // manage note events
                noteEvents(noteToRestore)
            })

            // update tray
            tray.setToolTip(`${appName} (${data.notesArray.length})`)
        }


        // check if app is packaged/dev mode
        if (app.isPackaged) {

            // auto-check for updates (packaged)
            checkForUpdatesOnStartup()

        } else {

            // log app details (dev mode)
            console.log(
                `auto-launch: ${data.autoLaunch}`,
                `\nsystem-theme: ${nativeTheme.shouldUseDarkColors ? "dark" : "light"}`,
                `\nselected-color: ${colorsArray[colorIndex]}`,
                `\nrestored-notes: ${data.notesArray.length}`
            )
        }
    })


    // execute before app quit
    app.on("before-quit", () => {

        // check and update data file
        checkDataFile()
        data.autoLaunch = app.getLoginItemSettings().launchItems[0].enabled // check auto-launch value
        updateDataFile()

        globalShortcut.unregisterAll() // unregister all shortcuts

        // delete auto-launch registry key (dev mode)
        if (!app.isPackaged) {
            app.setLoginItemSettings({
                openAtLogin: false
            })
        }
    })


    // execute when all windows are closed/destroyed
    app.on("window-all-closed", () => {

        if (!isUpdating) {

            if (data.showAlerts) {

                // build alert notification
                const quitPreventNotif = new Notification({
                    icon: alertIcon,
                    title: `${appName} is still running!`,
                    body: 'Click "Quit" to close the application',
                    silent: false
                })

                // show alert notification
                if (Notification.isSupported()) {

                    quitPreventNotif.show()

                    quitPreventNotif.on("close", () => quitPreventNotif.close())
                    quitPreventNotif.on("click", () => quitPreventNotif.close())
                }
            }

            showInputWindow() // reload and show input
        }
    })



    // FUNCTION: build input
    function buildInputWindow() {

        const inputWindow = new BrowserWindow({

            title: "Type something or paste a link...",
            icon: inputIcon,

            width: 500,
            height: 60,

            center: true,

            frame: false,
            thickFrame: false,
            opacity: 1,

            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            resizable: false,
            focusable: true,

            alwaysOnTop: true,
            show: false,
            skipTaskbar: false,

            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                spellcheck: false
            }
        })

        return inputWindow
    }


    // FUNCTION: build note
    function buildNoteWindow() {

        // set random note spawn
        notePosX = Math.floor(Math.random() * (screenWidth - 180))
        notePosY = Math.floor(Math.random() * (screenHeight - 180))

        const noteWindow = new BrowserWindow({

            icon: noteIcon,

            width: 180,
            height: 180,

            x: notePosX,
            y: notePosY,

            frame: false,
            thickFrame: false,
            transparent: true,

            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            resizable: false,
            focusable: true,

            alwaysOnTop: false,
            show: false,
            skipTaskbar: true,

            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        return noteWindow
    }


    // FUNCTION: build help
    function buildHelpWindow() {

        const helpWindow = new BrowserWindow({

            title: "Help?",
            icon: helpIcon,

            width: 450,
            height: 450,

            center: true,

            frame: false,
            thickFrame: false,
            transparent: true,

            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            resizable: false,
            focusable: true,

            alwaysOnTop: true,
            show: false,
            skipTaskbar: false,

            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        return helpWindow
    }


    // FUNCTION: load input
    function loadInputWindow() {

        inputWin = buildInputWindow()
        inputWin.loadFile("src/input/input.html")
        inputWin.setAppDetails({ appId: "input.win" })


        // register shortcuts only when visible
        inputWin.on("show", () => {

            // SHORTCUT: prevent default window closing event
            globalShortcut.register("CTRL+W", () => null)

            // SHORTCUT: popup input menu
            globalShortcut.register(inputMenuShortcut, () => {

                if (!inputWin.isDestroyed()) {
                    inputMenu.popup({ x: screenOrigin.x, y: screenOrigin.y })
                }
            })

            // SHORTCUT: popup input submenu (colors)
            globalShortcut.register(inputColorShortcut, () => {

                if (!inputWin.isDestroyed()) {
                    inputMenu.getMenuItemById("colorSubmenuID").submenu.popup({
                        x: screenOrigin.x,
                        y: screenOrigin.y
                    })
                }
            })
        })

        // unregister shortcut when hidden
        inputWin.on("hide", () => {
            globalShortcut.unregister("CTRL+W")
            globalShortcut.unregister(inputMenuShortcut)
            globalShortcut.unregister(inputColorShortcut)
        })

        // close input when not focused
        inputWin.on("blur", () => {
            inputWin.hide()
        })

        // popup input menu
        inputWin.webContents.on("context-menu", () => {
            inputMenu.popup()
        })

        // prevent input system menu
        const WM_INITMENU = 0x0116;
        inputWin.hookWindowMessage(WM_INITMENU, () => {
            inputWin.setEnabled(false)
            inputWin.setEnabled(true)
        })
        ////inputWin.on("system-context-menu", (event) => {
        ////    event.preventDefault()
        ////})
    }


    // FUNCTION: show input
    function showInputWindow() {

        if (!inputWin || inputWin.isDestroyed()) {

            // reload input if destroyed
            loadInputWindow()

            inputWin.on("ready-to-show", () => {
                inputWin.webContents.send("displayColor", colorIndex) // IPC: send "displayColor" event
                inputWin.show()
            })

        } else {

            if (!inputWin.isVisible()) {
                inputWin.webContents.send("displayColor", colorIndex) // IPC: send "displayColor" event
                inputWin.show()

            } else {
                inputWin.hide()
                inputWin.webContents.send("clearInput") // IPC: send "clearInput" event
            }
        }
    }


    // FUNCTION: load and show help
    function showHelpWindow() {

        if (!helpWin || helpWin.isDestroyed()) {

            // load help
            helpWin = buildHelpWindow()
            helpWin.loadFile("src/help/help.html")
            helpWin.setAppDetails({ appId: "HELP.win" })

            helpWin.on("ready-to-show", () => helpWin.show())

            // register shortcut when visible/focused
            helpWin.on("show", () => {

                // SHORTCUT: prevent default window closing event
                globalShortcut.register("CTRL+W", () => null)
            })

            helpWin.on("focus", () => {

                // SHORTCUT: prevent default window closing event
                globalShortcut.register("CTRL+W", () => null)
            })

            // unregister shortcut when blurred/closed
            helpWin.on("blur", () => {
                globalShortcut.unregister("CTRL+W")
            })

            helpWin.on("closed", () => {
                globalShortcut.unregister("CTRL+W")
            })

            // prevent help system menu
            const WM_INITMENU = 0x0116;
            helpWin.hookWindowMessage(WM_INITMENU, () => {
                helpWin.setEnabled(false)
                helpWin.setEnabled(true)
            })
            ////helpWin.on("system-context-menu", (event) => {
            ////    event.preventDefault()
            ////})

        } else helpWin.focus() // focus if already opened
    }


    // FUNCTION: move all notes on top
    function showAllNotes() {

        data.notesArray.forEach(note => {

            const noteFromId = BrowserWindow.fromId(note.id + 1)
            noteFromId.show()
        })
    }


    // FUNCTION: pin all notes
    function pinAllNotes() {

        data.notesArray.forEach(note => {

            const noteFromId = BrowserWindow.fromId(note.id + 1)

            noteFromId.webContents.send("pinNote") // IPC: send "pinNote" event
            noteFromId.setAlwaysOnTop(true, "status")
            noteFromId.focus()
        })

        arePinned = true

        // update tray menu
        trayMenu.getMenuItemById("pinNotesID").visible = false
        trayMenu.getMenuItemById("unpinNotesID").visible = true
        trayMenu.getMenuItemById("showNotesID").enabled = false
    }


    // FUNCTION: unpin all notes
    function unpinAllNotes() {

        data.notesArray.forEach(note => {

            const noteFromId = BrowserWindow.fromId(note.id + 1)

            noteFromId.webContents.send("unpinNote") // IPC: send "unpinNote" event
            noteFromId.setAlwaysOnTop(false)
            noteFromId.focus()
        })

        arePinned = false

        // update tray menu
        trayMenu.getMenuItemById("unpinNotesID").visible = false
        trayMenu.getMenuItemById("pinNotesID").visible = true

        trayMenu.getMenuItemById("showNotesID").enabled = true
    }



    // FUNCTION: check for updates automatically (on startup)
    function checkForUpdatesOnStartup() {

        // auto-update setup
        autoUpdater.autoDownload = false
        autoUpdater.autoInstallOnAppQuit = false

        autoUpdater.checkForUpdates() // check for updates

        // execute if update is available
        autoUpdater.on("update-available", () => {

            // update tray
            tray.setImage(updateIconLow)
            tray.setToolTip("Update available!")

            autoUpdater.downloadUpdate() // download update (automatically)
        })

        // execute when update is downloaded
        autoUpdater.on("update-downloaded", (info) => {

            // update tray menu
            trayMenu.getMenuItemById("checkUpdateID").visible = false
            trayMenu.getMenuItemById("downloadUpdateID").visible = true

            // build and show update message box
            dialog.showMessageBox({
                icon: updateIconHigh,
                message: `New update available! (${info.version})`,
                buttons: ["Install", "Later..."],
                noLink: true,
                defaultId: 0,
                cancelId: 1

            }).then(message => {

                if (message.response !== 0 && data.showAlerts) {

                    // build update-alert notification
                    const updateHelpNotif = new Notification({
                        icon: updateIconHigh,
                        title: "Update is still available!",
                        body: 'Click "Install update!" to proceed with\nthe installation of the update',
                        silent: false
                    })

                    // show update-alert notification
                    if (Notification.isSupported()) {

                        updateHelpNotif.show()

                        updateHelpNotif.on("close", () => updateHelpNotif.close())
                        updateHelpNotif.on("click", () => updateHelpNotif.close())
                    }
                }

                if (message.response === 0) confirmUpdate() // wait for confirmation
            })
        })

        // throw errors
        autoUpdater.on("error", (error) => {
            dialog.showErrorBox(`${appName} UPDATER ERROR`, error)
        })
    }


    // FUNCTION: check for updates manually (from tray menu)
    function checkForUpdatesFromMenu() {

        autoUpdater.checkForUpdates() // check for updates

        // execute if no update is available
        autoUpdater.on("update-not-available", () => {

            if (data.showAlerts) {

                // build no-update notification
                const noUpdateNotif = new Notification({
                    icon: noteIcon,
                    title: `${appName} is up-to-date!`,
                    body: `You're running the latest version (${version})`,
                    silent: false
                })

                // show no-update notification
                if (Notification.isSupported()) {

                    noUpdateNotif.show()

                    noUpdateNotif.on("close", () => noUpdateNotif.close())
                    noUpdateNotif.on("click", () => noUpdateNotif.close())
                }
            }
        })
    }


    // FUNCTION: confirm update installation
    function confirmUpdate() {

        // build and show installation message box
        dialog.showMessageBox({
            icon: updateIconHigh,
            message: "Do you want to proceed with the installation?",
            buttons: ["Yes", "No"],
            noLink: true,
            defaultId: 0,
            cancelId: 1

        }).then(result => {

            if (result.response === 0) {

                // check and update data file
                checkDataFile()
                data.firstLaunch = true
                updateDataFile()

                isUpdating = true
                autoUpdater.quitAndInstall() // quit and install update
            }
        })
    }


    // FUNCTION: choose if show notifications
    function toggleShowAlerts() {

        if (data.showAlerts) {

            // check and update data file
            checkDataFile()
            data.showAlerts = false
            updateDataFile()

        } else {

            // check and update data file
            checkDataFile()
            data.showAlerts = true
            updateDataFile()
        }
    }


    // FUNCTION: choose if run on startup
    function toggleAutoLaunch() {

        if (data.autoLaunch) {

            // check and update data file
            checkDataFile()
            data.autoLaunch = false
            updateDataFile()

            // set auto-launch value
            app.setLoginItemSettings({
                openAtLogin: true,
                enabled: false
            })

        } else {

            // check and update data file
            checkDataFile()
            data.autoLaunch = true
            updateDataFile()

            // set auto-launch value
            app.setLoginItemSettings({
                openAtLogin: true,
                enabled: true
            })
        }
    }


    // FUNCTION: delete all notes
    function clearAllNotes() {

        // build and show clear message box
        dialog.showMessageBox({
            icon: clearIcon,
            message: "Do you want to delete all your Notes on desktop?",
            buttons: ["Yes", "No"],
            noLink: true,
            defaultId: 1,
            cancelId: 1

        }).then(result => {

            if (result.response === 0) {

                data.notesArray.forEach(note => {

                    const noteFromId = BrowserWindow.fromId(note.id + 1)

                    if (noteFromId) noteFromId.close()
                })

                arePinned = false

                // check and update data file
                checkDataFile()
                data.notesArray = []
                updateDataFile()

                // update tray
                tray.setToolTip(appName)

                // update tray menu
                trayMenu.getMenuItemById("unpinNotesID").visible = false
                trayMenu.getMenuItemById("pinNotesID").visible = true
                trayMenu.getMenuItemById("showNotesID").enabled = false
                trayMenu.getMenuItemById("pinNotesID").enabled = false
                trayMenu.getMenuItemById("clearAllID").enabled = false
            }
        })
    }


    // FUNCTION: save last color index
    function saveLastColor(index) {

        colorIndex = index
        inputWin.webContents.send("displayColor", colorIndex) // IPC: send "displayColor" event

        // check and update data file
        checkDataFile()
        data.lastColorIndex = colorIndex
        updateDataFile()
    }


    // FUNCTION: manage note events
    function noteEvents(win) {

        // save position of all notes (x, y)
        win.on("moved", () => {

            data.notesArray.forEach(note => {

                const noteFromId = BrowserWindow.fromId(note.id + 1)
                const [updatedPosX, updatedPosY] = noteFromId.getPosition()

                if (noteFromId) {

                    const noteIndex = data.notesArray.findIndex(n => n.id === note.id)

                    // check and update data file
                    checkDataFile()
                    data.notesArray[noteIndex].x = updatedPosX
                    data.notesArray[noteIndex].y = updatedPosY
                    updateDataFile()
                }
            })
        })

        // prevent note system menu
        const WM_INITMENU = 0x0116;
        win.hookWindowMessage(WM_INITMENU, () => {

            data.notesArray.forEach(note => {

                const noteFromId = BrowserWindow.fromId(note.id + 1)

                noteFromId.setEnabled(false)
                noteFromId.setEnabled(true)
            })
        })
        ////win.on("system-context-menu", (event) => {
        ////    event.preventDefault()
        ////})
    }



    // IPC: create note
    ipcMain.on("createNote", (event, noteText) => {

        if (data.notesArray.length == 10) {

            // prevent if too many notes
            inputWin.webContents.send("clearInput") // IPC: send "clearInput" event (prevent lag)
            inputWin.webContents.send("tooManyNotes", noteText) // IPC: send "tooManyNotes" event

        } else {

            // hide and clear input
            inputWin.hide()
            inputWin.webContents.send("clearInput") // IPC: send "clearInput" event

            // load note
            noteWin = buildNoteWindow()
            noteWin.loadFile("src/note/note.html")

            noteWin.setPosition(notePosX, notePosY)

            // execute when ready
            noteWin.on("ready-to-show", () => {

                // IPC: send "displayNote" event
                noteWin.webContents.send("displayNote", {   // only notes IDs
                    id: noteWin.id - 1,
                    text: noteText,
                    colorIndex: colorIndex
                })

                noteWin.show()

                // check and pin (if notes are pinned)
                if (arePinned) {
                    noteWin.webContents.send("pinNote") // IPC: send "pinNote" event
                    noteWin.setAlwaysOnTop(true, "status")
                }

                // save NOTEWINDOW data
                const noteData = {
                    id: noteWin.id - 1,
                    text: noteText,
                    color: colorsArray[colorIndex],
                    index: colorIndex,
                    x: notePosX,
                    y: notePosY
                }

                // check and update data file
                checkDataFile()
                data.notesArray.push(noteData)
                updateDataFile()

                // update tray
                tray.setToolTip(`${appName} (${data.notesArray.length})`)

                showAllNotes() // move all notes on top
            })

            // manage note events
            noteEvents(noteWin)

            // update tray menu
            trayMenu.getMenuItemById("showNotesID").enabled = true
            trayMenu.getMenuItemById("pinNotesID").enabled = true
            trayMenu.getMenuItemById("clearAllID").enabled = true
        }
    })


    // IPC: hide and clear input
    ipcMain.on("hideInput", () => {
        inputWin.hide()
        inputWin.webContents.send("clearInput") // IPC: send "clearInput" event
    })


    // IPC: delete note
    ipcMain.on("deleteNote", (event, noteID) => {   // id -1

        const noteFromId = BrowserWindow.fromId(noteID + 1)

        if (noteFromId) noteFromId.close()

        const noteIndex = data.notesArray.findIndex(n => n.id === noteID + 1 - 1) // arrays start from 0!

        if (noteIndex !== -1) {

            // check and update data file
            checkDataFile()
            data.notesArray.splice(noteIndex, 1)
            updateDataFile()
        }

        // update tray
        tray.setToolTip(`${appName}${data.notesArray.length != 0 ? ` (${data.notesArray.length})` : ""}`)

        if (data.notesArray.length == 0) {

            arePinned = false

            // update tray menu
            trayMenu.getMenuItemById("unpinNotesID").visible = false
            trayMenu.getMenuItemById("pinNotesID").visible = true
            trayMenu.getMenuItemById("showNotesID").enabled = false
            trayMenu.getMenuItemById("pinNotesID").enabled = false
            trayMenu.getMenuItemById("clearAllID").enabled = false
        }
    })


    // IPC: close HELPWINDOW
    ipcMain.on("closeHelp", () => {
        helpWin.close()
    })


    // IPC: open link in default browser
    ipcMain.on("openLink", (event, data) => {

        const noteFromId = BrowserWindow.fromId(data.id + 1)

        noteFromId.webContents.setWindowOpenHandler(details => {

            shell.openExternal(details.url)

            return { action: "deny" }
        })

        shell.openExternal(data.url) // open link
    })


    // IPC: open example link in default browser
    ipcMain.on("openExampleLink", () => {

        helpWin.webContents.setWindowOpenHandler(details => {

            shell.openExternal(details.url)

            return { action: "deny" }
        })

        shell.openExternal("https://example.com/post-it/help/open-link-example") // open example link
    })
}
