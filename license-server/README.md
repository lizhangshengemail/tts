# TikTok扩展授权验证服务器

## 快速启动

### 1. 安装依赖
```bash
cd license-server
npm install
```

### 2. 启动服务器
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动

### 3. 访问管理后台
打开浏览器访问: `http://localhost:3000/admin.html`

## API接口

### 授权验证
- **POST** `/api/auth/verify` - 验证授权码
- **POST** `/api/auth/validate` - 验证访问令牌

### 管理接口
- **POST** `/api/admin/generate` - 生成授权码
- **GET** `/api/admin/licenses` - 获取所有授权码

### 健康检查
- **GET** `/api/health` - 服务状态检查

## 使用流程

1. 启动授权服务器
2. 访问管理后台生成授权码
3. 用户在Chrome扩展中输入授权码进行验证
4. 验证成功后用户可以使用扩展功能

## 部署说明

### 本地测试
直接使用 `npm start` 启动即可

### 生产部署
建议部署到以下平台:
- **Vercel**: 免费，适合轻量使用
- **Railway**: 支持数据库
- **VPS服务器**: 完全控制

部署后需要修改Chrome扩展中的 `LICENSE_SERVER` 地址为实际的服务器地址。

## 安全说明

1. 生产环境建议添加管理员认证
2. 可以考虑添加IP白名单限制
3. 建议使用HTTPS部署
4. 数据库文件注意备份

## 数据库结构

- `license_codes` - 授权码表
- `user_devices` - 设备绑定表  
- `usage_logs` - 使用日志表