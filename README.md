# B站广告拦截器

一个基于Electron的B站广告拦截工具，支持结构化的规则配置。

## 项目结构

```
├── index.js          # 主程序文件
├── rules.json        # 结构化过滤规则（新格式）
├── list.txt          # 传统过滤规则（旧格式，兼容）
├── package.json      # 项目配置
└── README.md         # 使用说明
```

## 使用说明

### 启动应用
```bash
npm install
electron .
```

### 规则配置

使用 `rules.json` 文件进行结构化配置，支持灵活的规则定义。

#### 规则类型

1. **CSS选择器规则** (`cssSelectors`)
   - `type: "hide"` - 直接隐藏元素
   - `type: "conditionalHide"` - 条件隐藏（基于子元素）

2. **URL过滤规则** (`urlFilters`)
   - 拦截匹配的URL请求

3. **域名拦截规则** (`blockedDomains`)
   - 拦截整个域名

#### 规则示例

```json
{
  "cssSelectors": [
    {
      "selector": ".adcard-content",
      "type": "hide",
      "domains": ["bilibili.com"],
      "description": "隐藏广告卡片"
    },
    {
      "selector": ".video-card",
      "type": "conditionalHide",
      "condition": ".ad-badge",
      "domains": ["bilibili.com"],
      "description": "隐藏包含广告标识的视频卡片"
    }
  ],
  "urlFilters": [
    {
      "pattern": ".doubleclick.net",
      "type": "block",
      "domains": ["bilibili.com"],
      "description": "拦截DoubleClick广告"
    }
  ],
  "blockedDomains": [
    {
      "domain": "ad.doubleclick.net",
      "description": "拦截DoubleClick广告域名"
    }
  ]
}
```



### 功能特性

- ✅ 结构化规则配置
- ✅ 向后兼容旧格式
- ✅ 动态规则更新
- ✅ 条件选择器支持
- ✅ 域名级拦截
- ✅ URL模式匹配
- ✅ 实时日志输出

### 开发扩展

#### 添加新规则

1. 编辑 `rules.json` 文件
2. 重启应用或实现热重载

#### 自定义规则

```javascript
// 在 index.js 中添加自定义规则处理
function addCustomRules(rules) {
  rules.cssSelectors.push({
    selector: '.custom-ad',
    type: 'hide',
    domains: ['bilibili.com'],
    description: '自定义广告隐藏'
  });
  return rules;
}
```

### 故障排除

#### 规则未生效
1. 检查控制台输出是否有加载错误
2. 确认规则格式正确
3. 检查浏览器开发者工具中的元素选择器

#### 性能优化
- 避免过于复杂的选择器
- 合理使用域名过滤减少CSS注入
- 定期清理无效规则

### 更新日志

- **v1.1.0** - 添加结构化规则支持
- **v1.0.0** - 基础广告拦截功能

## 许可证

MIT License