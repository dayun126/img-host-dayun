# 个人图床系统

基于Cloudflare Pages和GitHub的个人图床系统，支持图片管理、上传、删除等功能，并利用Cloudflare的全球CDN加速图片访问。

## 功能特点

- **密码保护**：管理员密码验证，保护图床安全
- **图片管理**：支持文件夹展示、搜索、分页浏览
- **多格式支持**：支持JPEG、PNG、GIF、WebP、AVIF等多种图片格式
- **文件夹管理**：支持创建文件夹，分类存储图片
- **上传功能**：支持批量上传图片，自动检测文件名冲突
- **删除功能**：支持删除不需要的图片
- **缓存管理**：自动清理CDN缓存，确保内容更新及时可见
- **全球加速**：利用Cloudflare CDN实现全球加速

## 技术栈

- **前端**：HTML, CSS, JavaScript, Bootstrap 5
- **后端**：Cloudflare Workers (JavaScript)
- **存储**：GitHub 仓库
- **部署**：Cloudflare Pages
- **API**：GitHub API, Cloudflare API

## 项目结构

```
/（根目录）
│
├── frontend/              # 部署到 Pages 的内容（图片+前端）
│   ├── index.html         # 前端入口页面
│   ├── 404.html           # 自定义404页面
│   ├── css/               # 样式文件
│   │   └── main.css       # 主样式表
│   ├── js/                # JavaScript 文件
│   │   ├── app.js         # 主应用逻辑
│   │   ├── auth.js        # 认证相关逻辑
│   │   ├── gallery.js     # 图片展示逻辑
│   │   ├── upload.js      # 上传处理逻辑
│   │   └── config.js      # 配置文件
│
└── api/                   # 后端 Worker 脚本（部署到 Workers）
    ├── worker.js          # Worker 主入口
    ├── auth.js            # 认证相关函数
    ├── github.js          # GitHub API 交互函数
    ├── cache.js           # 缓存管理函数
    ├── utils.js           # 工具函数
    └── wrangler.toml      # cloudflare workers 部署
```

## 部署指南

### 1. 准备工作

1. Fork仓库，建议改成私有项目
2. 获取GitHub个人访问令牌（需要repo权限）
3. 注册Cloudflare账号
4. 获取Cloudflare API令牌、Zone ID、账户ID

### 2. 部署前端（Cloudflare Pages）

1. 登录Cloudflare Dashboard
2. 进入Pages服务
3. 创建新项目，连接到GitHub仓库，注意项目名称要改为img-host
4. 配置构建设置：
   - 构建命令：留空
   - 构建输出目录：`frontend`
5. 部署项目

### 3. 部署后端（Cloudflare Workers）

1. cd api && npx wrangler deploy
2. 进入网页端workers设置
3. 配置环境变量（密钥类型）：
   - `GITHUB_TOKEN`: GitHub访问令牌
   - `GITHUB_REPO`: 仓库地址（格式：owner/repo）
   - `CF_API_TOKEN`: Cloudflare API令牌
   - `CF_ZONE_ID`: Cloudflare Zone ID
   - `ADMIN_PASSWORD`: 管理员密码（用于图床主页登录）
   - `CF_ACCOUNT_ID`:Cloudflare 账户ID

### 4. 配置前端

1. 修改 `frontend/js/config.js` 文件并重新部署：
   ```javascript
   const config = {
       // 后端API基础URL，改为你的Worker URL
       apiBaseUrl: 'https://your-worker-name.your-account.workers.dev',
       
       // 图片URL，改为你的Pages URL
       imageBaseUrl: 'https://your-image-domain.pages.dev',
   };
   ```

### 5. 配置自定义域名（可选）

1. 前后端都需要配置自定义域名，才能获得cloudflare提供的全球cdn加速
2. 如果你配置了自定义域名，注意config.js的URL要设置为你的自定义域名

## 使用指南

1. 访问图床主页
2. 输入管理员密码登录
3. 在主页面可以：
   - 浏览图片
   - 复制图片链接
   - 搜索图片
   - 上传/删除图片
   - 更新资源（触发部署）
   - 清理缓存（清理图床域名下的所有资源）

## 特殊目录说明

系统会忽略以下目录，不将其作为图片目录处理：
- `css/` - 存放样式文件
- `js/` - 存放JavaScript文件

## 注意事项

1. 避免上传敏感内容
2. 定期检查访问日志
3. 可选设置cloudflare防火墙来实现防盗链
4. 为避免上传/删除大量图片的时候，cloudflare频繁部署，需要关闭自动部署，在上传/删除图片完成后，请点击更新资源按钮触发部署
5. 可以在cloudflare控制台Cache Rules，为图床自定义域名设置边缘缓存1年，注意部署后可能需要点击清理缓存来获取新资源
6. 大批量添加或删除资源建议使用git

## 性能优化

1. 图片格式选择：
   - 对于照片类图片，推荐使用JPEG或WebP格式
   - 对于带透明度的图片，推荐使用PNG或WebP格式
   - 对于动图，推荐使用GIF或WebP格式
2. 合理设置缓存策略，减少不必要的缓存清理

## 许可证

MIT License

## 作者

dayun 大沄

## 致谢

- Cloudflare提供的Pages和Workers服务
- GitHub提供的存储服务
- Bootstrap提供的UI框架 
