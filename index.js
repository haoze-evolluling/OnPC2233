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
    const rulesPath = path.join(__dirname, 'rules.json');
    const content = fs.readFileSync(rulesPath, 'utf-8');
    const rules = JSON.parse(content);
    
    console.log(`成功加载规则文件 v${rules.version}`);
    console.log(`CSS选择器: ${rules.rules.cssSelectors.length} 条`);
    console.log(`URL过滤: ${rules.rules.urlFilters.length} 条`);
    console.log(`域名拦截: ${rules.rules.blockedDomains.length} 个`);
    
    return rules.rules;
  } catch (error) {
    console.error('加载过滤规则失败:', error);
    return { cssSelectors: [], urlFilters: [], blockedDomains: [] };
  }
}

// 设置webRequest拦截器
function setupWebRequestFilter(session, rules) {
  if (!rules.urlFilters && !rules.blockedDomains) return;
  
  const urlFilters = rules.urlFilters || [];
  const blockedDomains = rules.blockedDomains || [];
  
  // 拦截广告相关的网络请求
  session.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const hostname = new URL(url).hostname;
    
    // 检查域名拦截
    const shouldBlockDomain = blockedDomains.some(item => {
      return hostname.includes(item.domain) || url.includes(item.domain);
    });
    
    // 检查URL模式拦截
    const shouldBlockUrl = urlFilters.some(filter => {
      const pattern = filter.pattern;
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '.*');
        return new RegExp(regexPattern, 'i').test(url);
      }
      return url.toLowerCase().includes(pattern.toLowerCase());
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
  const cssSelectors = rules.cssSelectors || [];
  if (!cssSelectors.length) return;
  
  // 生成CSS样式
  const cssRules = [];
  cssSelectors.forEach(rule => {
    if (rule.type === 'hide') {
      cssRules.push(`${rule.selector} { display: none !important; }`);
    } else if (rule.type === 'conditionalHide' && rule.condition) {
      // 对于条件隐藏规则，使用更复杂的CSS或JavaScript处理
      cssRules.push(`${rule.selector}:has(${rule.condition}) { display: none !important; }`);
    }
  });
  
  const css = cssRules.join('\n');
  
  window.webContents.on('dom-ready', () => {
    window.webContents.insertCSS(css);
    console.log('已注入广告拦截CSS样式');
  });
  
  // 动态监听DOM变化，持续隐藏新出现的广告
  window.webContents.on('dom-ready', () => {
    const jsCode = `
      (function() {
        const cssRules = ${JSON.stringify(cssSelectors.filter(r => r.type === 'conditionalHide'))};
        
        function applyConditionalRules() {
          cssRules.forEach(rule => {
            if (rule.condition) {
              try {
                const elements = document.querySelectorAll(rule.selector);
                elements.forEach(el => {
                  if (el.querySelector(rule.condition)) {
                    el.style.display = 'none';
                  }
                });
              } catch (e) {
                console.warn('应用条件规则失败:', rule.selector, e);
              }
            }
          });
        }
        
        // 立即应用一次
        applyConditionalRules();
        
        // 设置观察者
        const observer = new MutationObserver(() => {
          applyConditionalRules();
        });
        
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = \`${css}\`;
        style.id = 'ad-blocker-style';
        
        const existingStyle = document.getElementById('ad-blocker-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        document.head.appendChild(style);
      })();
    `;
    
    window.webContents.executeJavaScript(jsCode);
  });
}
