/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Modules to control application life and create native browser window

const { app, BrowserWindow, globalShortcut, dialog, ipcMain, Menu } = require("electron");
const fs = require("fs");
const path = require("path");

app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("in-process-gpu");

if (require("electron-squirrel-startup")) app.quit();

process.env.ELECTRON_NO_ATTACH_CONSOLE = true;

process.env.CONFIG_HOST = "admin.cloud-starter-kit.com";
process.env.ADMIN_HOST = "admin.cloud-starter-kit.com";
process.env.FILE_HOST = "kits.cloud-starter-kit.com";

// process.env.CONFIG_HOST = "admin.cskingrammicro.com.au";
// process.env.ADMIN_HOST = "admin.cskingrammicro.com.au";
// process.env.FILE_HOST = "d2cfn5jr5y9smy.cloudfront.net";

const HOSTS = {
  CONFIG_HOST: process.env.CONFIG_HOST,
  ADMIN_HOST: process.env.ADMIN_HOST,
  FILE_HOST: process.env.FILE_HOST,
};

let mainWindow = null;

function createWindow() {
  // Create the browser window.
  let webPrefs = {
    nodeIntegration: true,
    devTools: true,
    preload: path.resolve(app.getAppPath(), "src", "scripts", "preload.min.js"),
  };
  if (app.isPackaged) {
    // webPrefs.devTools = true;
    webPrefs.devTools = false;
  }
  webPrefs.devTools = true;
  mainWindow = new BrowserWindow({
    width: !app.isPackaged ? 1900 : 1600,
    height: !app.isPackaged ? 900 : 950,
    webPreferences: webPrefs,
  });

  // and load the index.html of the app.
  mainWindow
    .loadFile(path.resolve(app.getAppPath(), "src", "index.html"))
    .then(() => {
      mainWindow.webContents.send("getHosts", HOSTS);
    })
    .then(() => {
      mainWindow.show();
    });

  // Open the DevTools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  //if (process.platform !== 'darwin')
  app.quit();
});

app.on("ready", () => {
  // Register a shortcut listener for Ctrl + Shift + I
  globalShortcut.register("Control+Shift+I", () => {
    // When the user presses Ctrl + Shift + I, this function will get called
    // You can modify this function to do other things, but if you just want
    // to disable the shortcut, you can just return false
    return false;
  });
});

ipcMain.on("save-file-to-desktop", (event, fileName, fileData) => {
  dialog
    .showSaveDialog(mainWindow, {
      title: "Save File",
      message: "Save File to Desktop",
      defaultPath: fileName,
      properties: [],
    })
    .then((result) => {
      console.log(result.canceled);
      if (result.filePath) {
        fs.writeFile(result.filePath, fileData, (err) => console.log(err));
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

//copy paste support
ipcMain.on("show-context-menu", (event) => {
  const template = [
    {
      label: "Copy",
      role: "copy",
      click: () => {
        console.log("Copy clicked!");
      },
    },
    {
      label: "Paste",
      role: "paste",
      click: () => {
        console.log("Paste clicked!");
      },
    },
    { type: "separator" },
    {
      label: "About the Cloud Starter Kit",
      role: "help",
      click: async () => {
        const { shell } = require("electron");
        await shell.openExternal(`https://${process.env.FILE_HOST}/about`);
      },
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});

const isMac = process.platform === "darwin";

const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: "File",
    submenu: [isMac ? { role: "close" } : { role: "quit" }],
  },
  // { role: 'editMenu' }
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
            },
          ]
        : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: "View",
    submenu: [{ role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }],
  },
  // { role: 'windowMenu' }
  {
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }] : [{ role: "close" }]),
    ],
  },
  {
    role: "help",
    submenu: [
      {
        label: "Cloud Starter Kit Help",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal(`https://${process.env.FILE_HOST}/help`);
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

ipcMain.on("restart-app", (event) => {
  app.relaunch();
  app.exit();
});
