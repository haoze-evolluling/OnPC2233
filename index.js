console.log('start BiliBili');

const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');

// 设置控制台编码为UTF-8以支持中文输出
if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('chcp 65001');
  } catch (error) {
    console.warn('无法设置控制台编码为UTF-8:', error.message);
  }
}



function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });



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

  // 读取并解析拦截规则
  const filterRules = loadFilterRules();
  
  // 设置webRequest拦截器
  setupWebRequestFilter(session.defaultSession, filterRules);
  
  // 注入CSS样式隐藏广告元素
  setupCSSInjection(win, filterRules);
  
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

// 加载过滤规则
function loadFilterRules() {
  try {
    const rulesPath = path.join(__dirname, 'list.txt');
    const content = fs.readFileSync(rulesPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('!'));
    
    const cssRules = [];
    const urlFilters = [];
    const blockedDomains = [];
    
    lines.forEach(line => {
      line = line.trim();
      
      // 处理元素隐藏规则 (##)
      if (line.includes('##') && !line.includes('#?#')) {
        const parts = line.split('##');
        const selector = parts[1];
        if (selector) {
          cssRules.push(selector);
        }
      }
      
      // 处理扩展CSS规则 (#?#)
      else if (line.includes('#?#')) {
        const parts = line.split('#?#');
        const selector = parts[1];
        if (selector && selector.includes(':has(')) {
          // 简化的:has选择器处理
          const baseSelector = selector.split(':has(')[0];
          cssRules.push(baseSelector);
        }
      }
      
      // 处理URL过滤规则
      else if (line.includes('##a[')) {
        const hrefMatch = line.match(/href\*?="([^"]+)"|href\^="([^"]+)"|href\$="([^"]+)"/);
        if (hrefMatch) {
          const filter = hrefMatch[1] || hrefMatch[2] || hrefMatch[3];
          if (filter) {
            urlFilters.push(filter);
          }
        }
      }
      
      // 处理域名过滤
      else if (line.startsWith('||')) {
        const domain = line.replace('||', '').split('^')[0].split('$')[0];
        blockedDomains.push(domain);
      }
    });
    
    console.log(`加载了 ${cssRules.length} 条CSS规则, ${urlFilters.length} 条URL规则, ${blockedDomains.length} 个域名`);
    return { cssRules, urlFilters, blockedDomains };
  } catch (error) {
    console.error('加载过滤规则失败:', error);
    return { cssRules: [], urlFilters: [], blockedDomains: [] };
  }
}

// 设置webRequest拦截器
function setupWebRequestFilter(session, rules) {
  if (!rules.urlFilters.length && !rules.blockedDomains.length) return;
  
  // 拦截广告相关的网络请求
  session.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    
    // 检查域名拦截
    const shouldBlockDomain = rules.blockedDomains.some(domain => {
      return url.includes(domain);
    });
    
    // 检查URL模式拦截
    const shouldBlockUrl = rules.urlFilters.some(filter => {
      if (filter.includes('*')) {
        const pattern = filter.replace(/\*/g, '.*');
        return new RegExp(pattern, 'i').test(url);
      }
      return url.toLowerCase().includes(filter.toLowerCase());
    });
    
    if (shouldBlockDomain || shouldBlockUrl) {
      console.log('拦截广告请求:', url);
      callback({ cancel: true });
    } else {
      callback({});
    }
  });
}

// 注入CSS样式隐藏广告元素
function setupCSSInjection(window, rules) {
  if (!rules.cssRules.length) return;
  
  const css = rules.cssRules.map(selector => `${selector} { display: none !important; }`).join('\n');
  
  window.webContents.on('dom-ready', () => {
    window.webContents.insertCSS(css);
    console.log('已注入广告拦截CSS样式');
  });
  
  // 动态监听DOM变化，持续隐藏新出现的广告
  window.webContents.on('dom-ready', () => {
    window.webContents.executeJavaScript(`
      const observer = new MutationObserver(() => {
        const style = document.createElement('style');
        style.textContent = \`${css}\`;
        style.id = 'ad-blocker-style';
        
        const existingStyle = document.getElementById('ad-blocker-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        document.head.appendChild(style);
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    `);
  });
}
