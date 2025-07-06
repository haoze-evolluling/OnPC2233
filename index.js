console.log('hello Bili');

const {app, BrowserWindow} = require('electron');

app.on ('ready', () => {
    let win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true
    })
    win.loadURL('http://www.bilibili.com')
})
