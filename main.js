
const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, Notification, nativeImage, nativeTheme, screen, shell, Tray } = require("electron")
const { autoUpdater } = require("electron-updater")
const { info, name, version } = require("./package.json")
const fs = require("fs")
const path = require("path")


// about environment
const isDev = !app.isPackaged


// about paths
const dataFile = "data.json"
const dataFolder = ".database"
const appFolder = path.join(app.getPath("appData"), name)

const dataFilePathDev = path.join(__dirname, dataFolder, dataFile)
const dataFilePath = path.join(appFolder, dataFolder, dataFile)

const dataFolderPathDev = path.join(__dirname, dataFolder)
const dataFolderPath = path.join(appFolder, dataFolder)

const checkDataFilePath = isDev ? dataFilePathDev : dataFilePath
const checkDataFolderPath = isDev ? dataFolderPathDev : dataFolderPath

// default data file structure
const defaultData = {
    firstLaunch: true,
    showAlerts: true,
    showMessages: true,
    autoLaunch: true,
    colorIndex: 1, // yellow (default on first launch)
    notes: []
}


// FUNCTION: check if all necessary files and folders exist in ".../AppData/Roaming/"
function checkDataFile() {

    const appFolderExists = fs.existsSync(appFolder)
    const dataFolderExists = fs.existsSync(checkDataFolderPath)
    const dataFileExists = fs.existsSync(checkDataFilePath)

    if (!isDev && !appFolderExists) fs.mkdirSync(appFolder)

    if (!dataFolderExists) {

        if (isDev) console.log(`'${dataFolder}' folder no longer exists`)

        fs.mkdirSync(checkDataFolderPath)

        if (isDev) console.log(`'${dataFolder}' folder restored`)
    }

    if (!dataFileExists) {

        if (isDev) console.log(`'${dataFile}' file no longer exists`)

        const defaultDataString = JSON.stringify(defaultData, null, 4)

        fs.writeFileSync(checkDataFilePath, defaultDataString)

        if (isDev) console.log(`'${dataFile}' file restored`)
    }
}

// FUNCTION: check and adjust data file structure
function checkDataStructure() {

    const dataForCheck = JSON.parse(fs.readFileSync(checkDataFilePath))
    const defaultKeys = Object.keys(defaultData)
    const currentKeys = Object.keys(dataForCheck)

    if (currentKeys.toString() != defaultKeys.toString()) {

        if (isDev) console.log(`'${dataFile}' file to update`)

        // save and restore last settings
        const lastShowAlerts = data.showAlerts
        const lastShowMessages = data.showMessages
        const lastAutoLaunch = data.autoLaunch
        const lastColorIndex = data.colorIndex
        const lastNotes = data.notes

        const lastData = {
            firstLaunch: false,
            showAlerts: lastShowAlerts ? lastShowAlerts : defaultData.showAlerts,
            showMessages: lastShowMessages ? lastShowMessages : defaultData.showMessages,
            autoLaunch: lastAutoLaunch ? lastAutoLaunch : defaultData.autoLaunch,
            colorIndex: lastColorIndex ? lastColorIndex : defaultData.colorIndex,
            notes: lastNotes ? lastNotes : defaultData.notes
        }

        data = lastData

        updateDataFile()

        if (isDev) console.log(`'${dataFile}' file updated`)
    }
}

// FUNCTION: update data file
function updateDataFile() {
    const updatedData = JSON.stringify(data, null, 4)
    fs.writeFileSync(checkDataFilePath, updatedData)
}

checkDataFile() // check data file/folder

let data = JSON.parse(fs.readFileSync(checkDataFilePath))

checkDataStructure() // check data file structure


// about app
const appName = info.displayName

// about icons
const inputIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "input.ico"))
const helpIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "help.ico"))
const noteIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "note.ico"))
const updateIconLow = nativeImage.createFromPath(path.join(__dirname, "icons", "update-low.ico"))
const updateIconHigh = nativeImage.createFromPath(path.join(__dirname, "icons", "update-high.ico"))
const alertIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "alert.ico"))
const clearIcon = nativeImage.createFromPath(path.join(__dirname, "icons", "clear.ico"))

// about colors
const colorsArray = ["orange", "yellow", "green", "blue", "violet", "pink"]
let colorIndex = data.colorIndex

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
let canShowInput = true

// about menus
let tray
let trayMenu
let inputMenu
let arePinned = false
let someNotes = data.notes.length > 0 ? true : false

// about positions
let screenOrigin
let screenWidth
let screenHeight

// about updates
let isUpdating = false


// app setup
app.setName(name)
app.setAppUserModelId(info.displayAppID)
app.setJumpList([]) // empty app jumplist

if (!isDev) {
    app.setLoginItemSettings({
        openAtLogin: true,
        enabled: data.autoLaunch
    })
}


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

            data.firstLaunch = false

            updateDataFile()
        }


        // build tray menu
        trayMenu = Menu.buildFromTemplate([

            {   // title
                label: `${appName} ${info.displayVersion}`,
                enabled: false,
            },

            { type: "separator" },

            {   // show input
                label: "Text input",
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
                        id: "checkUpdatesID",
                        visible: true,
                        enabled: !isDev,
                        click: () => checkForUpdatesFromMenu()
                    },

                    {   // install update
                        label: "Install update!",
                        id: "installUpdateID",
                        visible: false,
                        enabled: !isDev,
                        click: () => installUpdate()
                    },

                    {   // choose if show notifications
                        label: "Show notifications",
                        id: "showAlertsID",
                        type: "checkbox",
                        checked: data.showAlerts,
                        click: () => toggleShowAlerts()
                    },

                    {   // choose if show messages
                        label: "Show messages",
                        id: "showMessagesID",
                        type: "checkbox",
                        checked: data.showMessages,
                        click: () => toggleShowMessages()
                    },

                    {   // choose if run on startup
                        label: "Run on startup",
                        id: "autoLaunchID",
                        type: "checkbox",
                        checked: data.autoLaunch,
                        enabled: !isDev,
                        click: () => toggleAutoLaunch()
                    },

                    { type: "separator" },

                    {   // delete all notes
                        label: "Clear all Notes",
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


        // tray setup
        tray = new Tray(noteIcon)
        tray.setToolTip(appName)

        tray.on("click", () => {

            // check app auto-launch changes (by system)
            if (!isDev) {
                trayMenu.getMenuItemById("autoLaunchID").checked = app.getLoginItemSettings().launchItems[0].enabled
            }

            tray.popUpContextMenu(trayMenu)
        })

        tray.on("right-click", () => {

            // check app auto-launch changes (by system)
            if (!isDev) {
                trayMenu.getMenuItemById("autoLaunchID").checked = app.getLoginItemSettings().launchItems[0].enabled
            }

            tray.popUpContextMenu(trayMenu)
        })


        loadInputWindow() // load input


        // SHORTCUT: show/hide input
        globalShortcut.register(inputShoutcut, () => {

            if (canShowInput) {
                canShowInput = false

                showInputWindow()

                setTimeout(() => {
                    canShowInput = true
                }, 500)
            }
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

                } else unpinAllNotes()
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
        if (data.notes.length > 0) {

            // load and show restored notes
            data.notes.forEach(noteToRestore => {

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

                    // IPC: send "showMessages" event
                    noteToRestore.webContents.send("showMessages", data.showMessages)

                    // IPC: send "displayNote" event
                    noteToRestore.webContents.send("displayNote", {
                        id: updatedID,
                        text: restoredText,
                        colorIndex: restoredColor,
                        dragMessage: false
                    })

                    showSmoothly(noteToRestore)

                    const noteIndex = data.notes.findIndex(n => n.id === restoredID)
                    data.notes[noteIndex].id = updatedID

                    updateDataFile()
                })

                // manage note events
                noteEvents(noteToRestore)
            })

            // update tray
            tray.setToolTip(`${appName} (${data.notes.length})`)
        }


        // check if app is packaged/dev mode
        if (!isDev) {

            // auto-check for updates (packaged)
            checkForUpdatesOnStartup()

        } else {

            // log app details (dev mode)
            console.log(
                `\nsystem-theme: ${nativeTheme.shouldUseDarkColors ? "dark" : "light"}`,
                `\nselected-color: ${colorsArray[colorIndex]}`,
                `\nrestored-notes: ${data.notes.length}`
            )
        }
    })

    // execute before app quit
    app.on("before-quit", () => {

        // check auto-launch value and update data file
        if (!isDev) {

            checkDataFile()

            data.autoLaunch = app.getLoginItemSettings().launchItems[0].enabled

            updateDataFile()
        }

        globalShortcut.unregisterAll() // unregister all shortcuts
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

            title: "Text input",
            icon: inputIcon,

            width: 180,
            height: 180,

            center: true,

            frame: false,
            thickFrame: false,
            transparent: true,

            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            resizable: false,
            focusable: true,

            skipTaskbar: false,
            alwaysOnTop: true,
            show: false,

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

        const noteWindow = new BrowserWindow({

            icon: noteIcon,

            width: 180,
            height: 180,

            center: true,

            frame: false,
            thickFrame: false,
            transparent: true,

            maximizable: false,
            minimizable: false,
            fullscreenable: false,
            resizable: false,
            focusable: true,

            skipTaskbar: true,
            alwaysOnTop: false,
            show: false,

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

            skipTaskbar: false,
            alwaysOnTop: true,
            show: false,

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
            hideSmoothly(inputWin)
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
    }

    // FUNCTION: show input
    function showInputWindow() {

        if (!inputWin || inputWin.isDestroyed()) {

            loadInputWindow() // reload input if destroyed

            inputWin.on("ready-to-show", () => {
                inputWin.webContents.send("displayColor", colorIndex) // IPC: send "displayColor" event
                inputWin.webContents.send("showMessages", data.showMessages)  // IPC: send "showMessages" event
                showSmoothly(inputWin)
            })

        } else {

            if (!inputWin.isVisible()) {
                inputWin.webContents.send("displayColor", colorIndex) // IPC: send "displayColor" event
                inputWin.webContents.send("showMessages", data.showMessages)  // IPC: send "showMessages" event
                showSmoothly(inputWin)

            } else {
                hideSmoothly(inputWin)

                setTimeout(() => {
                    inputWin.webContents.send("clearInput") // IPC: send "clearInput" event
                }, 500)
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

            helpWin.on("ready-to-show", () => showSmoothly(helpWin))

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

        } else helpWin.focus() // focus if already opened
    }

    // FUNCTION: move all notes on top
    function showAllNotes() {

        data.notes.forEach(note => {

            const noteFromID = BrowserWindow.fromId(note.id + 1)
            noteFromID.focus()
        })
    }

    // FUNCTION: pin all notes
    function pinAllNotes() {

        data.notes.forEach(note => {

            const noteFromID = BrowserWindow.fromId(note.id + 1)

            noteFromID.webContents.send("pinNote") // IPC: send "pinNote" event
            noteFromID.setAlwaysOnTop(true, "status")
            noteFromID.focus()
        })

        arePinned = true

        // update tray menu
        trayMenu.getMenuItemById("pinNotesID").visible = false
        trayMenu.getMenuItemById("unpinNotesID").visible = true
        trayMenu.getMenuItemById("showNotesID").enabled = false
    }

    // FUNCTION: unpin all notes
    function unpinAllNotes() {

        data.notes.forEach(note => {

            const noteFromID = BrowserWindow.fromId(note.id + 1)

            noteFromID.webContents.send("unpinNote") // IPC: send "unpinNote" event
            noteFromID.setAlwaysOnTop(false)
            noteFromID.focus()
        })

        arePinned = false

        // update tray menu
        trayMenu.getMenuItemById("unpinNotesID").visible = false
        trayMenu.getMenuItemById("pinNotesID").visible = true
        trayMenu.getMenuItemById("showNotesID").enabled = true
    }


    // FUNCTION: check for updates automatically (on startup)
    function checkForUpdatesOnStartup() {

        // updater setup
        autoUpdater.autoDownload = false
        autoUpdater.autoInstallOnAppQuit = false

        // download update when available
        autoUpdater.on("update-available", () => {
            autoUpdater.downloadUpdate()
        })

        // show notification when update is downloaded
        autoUpdater.on("update-downloaded", (updateInfo) => {

            // update tray
            tray.setImage(updateIconLow)
            tray.setToolTip("Update available!")

            // update tray menu
            trayMenu.getMenuItemById("checkUpdatesID").visible = false
            trayMenu.getMenuItemById("installUpdateID").visible = true

            // build and show update message box
            dialog.showMessageBox({
                icon: updateIconHigh,
                message: `New update available!   ( ${info.displayVersion} )  ->  ( v${updateInfo.version} )`,
                noLink: true,
                buttons: ["Install", "Not now"],
                cancelId: 1,
                defaultId: 0

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

                } else installUpdate()
            })
        })

        // throw updater errors
        autoUpdater.on("error", (error) => {
            dialog.showErrorBox(`${appName} UPDATER ERROR`, error)
        })
        
        autoUpdater.checkForUpdates() // check for updates
    }

    // FUNCTION: check for updates manually (from tray menu)
    function checkForUpdatesFromMenu() {

        // show notification if no update is available
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
        
        autoUpdater.checkForUpdates() // check for updates
    }

    // FUNCTION: install update immediately
    function installUpdate() {

        checkDataFile()

        data.firstLaunch = true

        updateDataFile()

        isUpdating = true
        autoUpdater.quitAndInstall() // quit and install update
    }

    // FUNCTION: choose if show notifications
    function toggleShowAlerts() {

        checkDataFile()

        data.showAlerts = data.showAlerts ? false : true

        updateDataFile()
    }

    // FUNCTION: choose if show messages
    function toggleShowMessages() {

        checkDataFile()

        data.showMessages = data.showMessages ? false : true

        updateDataFile()

        // IPC: send "showMessages" event to all opened windows
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send("showMessages", data.showMessages)
        })
    }

    // FUNCTION: choose if run on startup
    function toggleAutoLaunch() {

        checkDataFile()

        data.autoLaunch = data.autoLaunch ? false : true

        // set auto-launch value
        app.setLoginItemSettings({
            openAtLogin: true,
            enabled: data.autoLaunch ? false : true
        })

        updateDataFile()
    }

    // FUNCTION: delete all notes
    function clearAllNotes() {

        // build and show clear message box
        dialog.showMessageBox({
            icon: clearIcon,
            message: "Do you want to delete all Notes on your desktop?",
            noLink: true,
            buttons: ["Yes", "No"],
            cancelId: 1,
            defaultId: 1

        }).then(message => {

            if (message.response === 0) {

                data.notes.forEach(note => {

                    const noteFromID = BrowserWindow.fromId(note.id + 1)
                    if (noteFromID) closeSmoothly(noteFromID)
                })

                arePinned = false
                someNotes = data.notes.length > 0 ? true : false

                checkDataFile()

                data.notes = []

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

        checkDataFile()

        data.colorIndex = colorIndex

        updateDataFile()
    }

    // FUNCTION: manage note events
    function noteEvents(win) {

        // save position of all notes (x, y)
        win.on("moved", () => {

            data.notes.forEach(note => {

                const noteFromID = BrowserWindow.fromId(note.id + 1)
                const [updatedPosX, updatedPosY] = noteFromID.getPosition()

                if (noteFromID) {

                    const noteIndex = data.notes.findIndex(n => n.id === note.id)

                    checkDataFile()

                    data.notes[noteIndex].x = updatedPosX
                    data.notes[noteIndex].y = updatedPosY

                    updateDataFile()
                }
            })
        })

        // hide drag message when moving
        win.on("will-move", () => {
            win.webContents.send("hideDragMessage") // IPC: send "hideDragMessage" event
        })

        // prevent note window from closing
        win.on("close", (e) => e.preventDefault())

        // prevent note system menu
        const WM_INITMENU = 0x0116;
        win.hookWindowMessage(WM_INITMENU, () => {

            data.notes.forEach(note => {

                const noteFromID = BrowserWindow.fromId(note.id + 1)

                noteFromID.setEnabled(false)
                noteFromID.setEnabled(true)
            })
        })
    }

    // FUNCTION: gradually show window
    function showSmoothly(win) {

        win.setOpacity(0)
        win.show()

        let opacity = 0

        const interval = setInterval(() => {

            if (opacity < 1) {
                opacity += 0.5
                win.setOpacity(opacity)

            } else clearInterval(interval)

        }, 5)
    }

    // FUNCTION: gradually hide window
    function hideSmoothly(win) {

        win.setOpacity(1)

        let opacity = 1

        const interval = setInterval(() => {

            if (opacity > 0) {
                opacity -= 0.1
                win.setOpacity(opacity)

            } else {
                clearInterval(interval)
                win.hide()
            }

        }, 5)
    }

    // FUNCTION: gradually close window
    function closeSmoothly(win) {

        win.setOpacity(1)

        let opacity = 1

        const interval = setInterval(() => {

            if (opacity > 0) {
                opacity -= 0.1
                win.setOpacity(opacity)

            } else {
                clearInterval(interval)
                win.close()
            }

        }, 5)
    }


    // IPC: hide and clear input
    ipcMain.on("hideInput", () => {
        hideSmoothly(inputWin)

        setTimeout(() => {
            inputWin.webContents.send("clearInput") // IPC: send "clearInput" event
        }, 1000)
    })

    // IPC: create note
    ipcMain.on("createNote", (e, noteText) => {

        if (data.notes.length == 10) {

            // prevent if too many notes
            inputWin.webContents.send("clearInput") // IPC: send "clearInput" event (prevent lag)
            inputWin.webContents.send("tooManyNotes", noteText) // IPC: send "tooManyNotes" event

        } else {

            // load note
            noteWin = buildNoteWindow()
            noteWin.loadFile("src/note/note.html")

            let [notePosX, notePosY] = noteWin.getPosition() // get centered position

            // execute when ready
            noteWin.on("ready-to-show", () => {

                // IPC: send "showMessages" event
                noteWin.webContents.send("showMessages", data.showMessages)

                // IPC: send "displayNote" event
                noteWin.webContents.send("displayNote", {   // only notes IDs
                    id: noteWin.id - 1,
                    text: noteText,
                    colorIndex: colorIndex,
                    dragMessage: true
                })

                showSmoothly(noteWin)

                // pin if already pinned
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

                checkDataFile()

                data.notes.push(noteData)

                updateDataFile()

                someNotes = data.notes.length > 0 ? true : false

                // update tray
                tray.setToolTip(`${appName} (${data.notes.length})`)

                // hide and clear input after 1s
                hideSmoothly(inputWin)

                setTimeout(() => {
                    inputWin.webContents.send("clearInput") // IPC: send "clearInput" event
                }, 1000)

                showAllNotes() // move all notes on top
            })

            noteEvents(noteWin) // manage note events

            // update tray menu
            trayMenu.getMenuItemById("showNotesID").enabled = true
            trayMenu.getMenuItemById("pinNotesID").enabled = true
            trayMenu.getMenuItemById("clearAllID").enabled = true
        }
    })

    // IPC: delete note
    ipcMain.on("deleteNote", (e, noteID) => {   // id -1

        const noteFromID = BrowserWindow.fromId(noteID + 1)
        if (noteFromID) closeSmoothly(noteFromID)

        const noteIndex = data.notes.findIndex(n => n.id === noteID + 1 - 1) // arrays start from 0!

        if (noteIndex !== -1) {

            checkDataFile()

            data.notes.splice(noteIndex, 1)

            updateDataFile()
        }

        someNotes = data.notes.length > 0 ? true : false

        // update tray
        tray.setToolTip(`${appName}${data.notes.length > 0 ? ` (${data.notes.length})` : ""}`)

        if (data.notes.length == 0) {
            arePinned = false

            // update tray menu
            trayMenu.getMenuItemById("unpinNotesID").visible = false
            trayMenu.getMenuItemById("pinNotesID").visible = true
            trayMenu.getMenuItemById("showNotesID").enabled = false
            trayMenu.getMenuItemById("pinNotesID").enabled = false
            trayMenu.getMenuItemById("clearAllID").enabled = false
        }
    })

    // IPC: close help window
    ipcMain.on("closeHelp", () => {
        closeSmoothly(helpWin)
    })

    // IPC: open link in default browser
    ipcMain.on("openLink", (e, data) => {

        const noteFromID = BrowserWindow.fromId(data.id + 1)

        noteFromID.webContents.setWindowOpenHandler(details => {
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

        shell.openExternal("https://example.com") // open example link
    })
}
