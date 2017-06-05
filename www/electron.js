
const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow () {
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

    win = new BrowserWindow({
        width: width,
        height: height,
        minWidth: 400,
        minHeight: 400,
        textAreasAreResizable: false,
        plugins: true,
        show: false // Don't show it until it's ready to prevent showing a blank screen.
    });

    // And load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    win.once('ready-to-show', () => {
        win.show();
    });

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object.
        win = null
    });
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('openItem', (event, path) => {
    shell.openItem(path);
});
