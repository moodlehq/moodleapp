
// dialog isn't used, but not requiring it throws an error.
const {app, BrowserWindow, ipcMain, shell, dialog, Menu} = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow,
    appName = 'Moodle Desktop', // Default value.
    isReady = false,
    configRead = false;

function createWindow() {
    // Create the browser window.
    var width = 800,
        height = 600;

    const screen = require('electron').screen;
    if (screen) {
        const display = screen.getPrimaryDisplay();
        if (display && display.workArea) {
            width = display.workArea.width || width;
            height = display.workArea.height || height;
        }
    }

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        minWidth: 400,
        minHeight: 400,
        textAreasAreResizable: false,
        plugins: true,
        show: false // Don't show it until it's ready to prevent showing a blank screen.
    });

    // And load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object.
        mainWindow = null
    });

    mainWindow.on('focus', () => {
        mainWindow.webContents.send('mmAppFocused'); // Send an event to the main window.
    });
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    isReady = true;

    createWindow();

    if (configRead) {
        setAppMenu();
    }
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.exit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// Read the config.json file.
fs.readFile(path.join(__dirname, 'config.json'), 'utf8', (err, data) => {
    configRead = true;

    var ssoScheme = 'moodlemobile'; // Default value.

    if (!err) {
        try {
            data = JSON.parse(data);
            ssoScheme = data.customurlscheme;
            appName = data.desktopappname;
        } catch(ex) {}
    }

    // Set default protocol (custom URL scheme).
    app.setAsDefaultProtocolClient(ssoScheme);

    if (isReady) {
        setAppMenu();
    }
});

// Make sure that only a single instance of the app is running.
var shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
    // Another instance was launched. If it was launched with a URL, it should be in the second param.
    if (argv && argv[1]) {
        appLaunched(argv[1]);
    } else {
        focusApp();
    }
});

// For some reason, shouldQuit is always true in signed Mac apps so we should ingore it.
if (shouldQuit && os.platform().indexOf('darwin') == -1) {
    // It's not the main instance of the app, kill it.
    app.exit();
    return;
}

// Listen for open-url events (Mac OS only).
app.on('open-url', (event, url) => {
    event.preventDefault();
    appLaunched(url);
});

function appLaunched(url) {
    // App was launched again with a URL. Focus the main window and send an event to treat the URL.
    if (mainWindow) {
        focusApp();
        mainWindow.webContents.send('mmAppLaunched', url); // Send an event to the main window.
    }
}

function focusApp() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    }
}

// Listen for events sent by the renderer processes (windows).
ipcMain.on('openItem', (event, path) => {
    var result;

    // Add file:// protocol if it isn't there.
    if (path.indexOf('file://') == -1) {
        path = 'file://' + path;
    }

    if (os.platform().indexOf('darwin') > -1) {
        // Use openExternal in MacOS because openItem doesn't work in sandboxed apps.
        // https://github.com/electron/electron/issues/9005
        result = shell.openExternal(path);
    } else {
        result = shell.openItem(path);
    }

    if (!result) {
        // Cannot open file, probably no app to handle it. Open the folder.
        result = shell.showItemInFolder(path.replace('file://', ''));
    }

    event.returnValue = result;
});

ipcMain.on('closeSecondaryWindows', () => {
    var windows = BrowserWindow.getAllWindows();
    for (var i = 0; i < windows.length; i++) {
        if (!mainWindow || windows[i].id != mainWindow.id) {
            windows[i].close();
        }
    }
});

ipcMain.on('focusApp', focusApp);

// Configure the app's menu.
function setAppMenu() {
    let menuTemplate = [
        {
            label: appName,
            role: 'window',
            submenu: [
                {
                    label: 'Quit',
                    accelerator: 'CmdorCtrl+Q',
                    role: 'close'
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Cut',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: 'Copy',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: 'Paste',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                },
                {
                    label: 'Select All',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall'
                }
            ]
        },
        {
            label: 'Help',
            role: 'help',
            submenu: [
                {
                    label: 'Docs',
                    accelerator: 'CmdOrCtrl+H',
                    click() {
                        shell.openExternal('https://docs.moodle.org/en/Moodle_Mobile');
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}
