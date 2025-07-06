console.log('hello Bili');

const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');

// 读取屏蔽列表
function loadBlockList() {
  try {
    const blockListPath = path.join(__dirname, '屏蔽列表.md');
    const content = fs.readFileSync(blockListPath, 'utf8');
    
    // 提取所有URL和域名（忽略注释和空行）
    const blockPatterns = content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.trim());
    
    console.log('已加载屏蔽规则:', blockPatterns.length, '条');
    return blockPatterns;
  } catch (error) {
    console.error('加载屏蔽列表失败:', error);
    return [];
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 加载屏蔽列表
  const blockPatterns = loadBlockList();
  
  // 设置请求过滤器
  if (blockPatterns.length > 0) {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      const url = details.url;
      
      // 检查URL是否匹配任何屏蔽模式
      const shouldBlock = blockPatterns.some(pattern => {
        return url.includes(pattern);
      });
      
      if (shouldBlock) {
        console.log('已屏蔽:', url);
        callback({ cancel: true });
      } else {
        callback({ cancel: false });
      }
    });
    
    console.log('网络请求过滤器已启用');
  }

  win.loadURL('http://www.bilibili.com');
  
  // 打开开发者工具（调试用，可以注释掉）
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
