console.log('hello Bili');

const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');

// 读取屏蔽列表
function loadBlockList() {
  try {
    const blockListPath = path.join(__dirname, 'defence.txt');
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

  // 拦截new-window事件，在当前窗口打开链接
  win.webContents.setWindowOpenHandler((details) => {
    // 拦截新窗口打开请求
    console.log('拦截到新窗口请求:', details.url);
    
    // 如果是b站内部链接，则在当前窗口打开
    if (details.url.includes('bilibili.com')) {
      win.loadURL(details.url);
      return { action: 'deny' }; // 阻止新窗口打开
    }
    
    return { action: 'allow' }; // 允许其他链接在新窗口打开
  });
  
  // 拦截导航事件，确保所有导航都在当前窗口进行
  win.webContents.on('will-navigate', (event, url) => {
    console.log('拦截到页面导航:', url);
  });

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
