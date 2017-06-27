
const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

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
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object.
        mainWindow = null
    });
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// Open the app when a link with "moodlemobile://" is clicked.
app.setAsDefaultProtocolClient('moodlemobile');

// Make sure that only a single instance of the app is running.
var shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
    // Another instance was launched. If it was launched with a URL, it should be in the second param.
    if (argv && argv[1]) {
        appLaunched(argv[1]);
    }
});

if (shouldQuit) {
    // It's not the main instance of the app, kill it.
    app.quit();
} else {
    // Listen for open-url events (Mac OS only).
    app.on('open-url', (event, url) => {
        event.preventDefault();
        appLaunched(url);
    });
}

function appLaunched(url) {
    // App was launched again with a URL. Focus the main window and send an event to treat the URL.
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.webContents.send('mmAppLaunched', url); // Send an event to the main window.
    }
}

// Listen for events sent by the renderer processes (windows).
ipcMain.on('openItem', (event, path) => {
    shell.openItem(path);
});

ipcMain.on('closeSecondaryWindows', () => {
    var windows = BrowserWindow.getAllWindows();
    for (var i = 0; i < windows.length; i++) {
        if (!mainWindow || windows[i].id != mainWindow.id) {
            windows[i].close();
        }
    }
});
