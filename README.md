# Web Authenticator

## 项目简介

Web Authenticator是一个基于Web的双因素认证（2FA）管理工具，用于生成和管理基于时间的一次性密码（TOTP）。它提供了一个安全、便捷的方式来管理您的所有TOTP账户，支持多种设备访问。

## 功能特性

- 🔐 **安全可靠**：使用JWT进行身份验证，所有数据加密存储
- 📱 **多设备支持**：Web界面，可在任何设备上访问
- ➕ **轻松添加**：支持扫描二维码或手动输入密钥添加TOTP账户
- 🔄 **实时更新**：TOTP码实时生成和更新
- 📋 **账户管理**：支持编辑、删除、导出和导入账户
- 🎨 **友好界面**：简洁直观的用户界面，易于使用
- 🔒 **隐私保护**：数据存储在您自己的服务器上，完全掌控

## 使用指南

### 1. 注册和登录

#### 1.1 注册新账户
1. 打开Web Authenticator应用
2. 点击"注册"按钮
3. 输入您的邮箱地址和密码
4. 点击"注册"完成账户创建

#### 1.2 登录
1. 打开Web Authenticator应用
2. 输入您的邮箱地址和密码
3. 点击"登录"进入应用

### 2. 添加TOTP账户

#### 2.1 扫描二维码添加
1. 登录应用后，点击"添加账户"按钮
2. 在弹出的对话框中，选择"扫描二维码"
3. 使用设备摄像头扫描TOTP二维码
4. 系统会自动识别并添加账户信息
5. 点击"保存"完成添加

#### 2.2 手动输入添加
1. 登录应用后，点击"添加账户"按钮
2. 在弹出的对话框中，选择"手动输入"
3. 填写以下信息：
   - **服务名称**：例如"Google"、"GitHub"
   - **账户名称**：您的用户名或邮箱
   - **密钥**：TOTP密钥（通常是一串字母和数字）
   - **算法**：选择算法（通常为SHA1）
   - **位数**：选择密码位数（通常为6位）
   - **周期**：选择更新周期（通常为30秒）
4. 点击"保存"完成添加

### 3. 查看和使用TOTP码

1. 登录应用后，在主页或"我的账户"页面可以看到所有已添加的TOTP账户
2. 每个账户会显示：
   - 服务名称和账户名称
   - 当前生成的TOTP码
   - 倒计时显示（直到下一个TOTP码生成）
3. 当您需要使用TOTP码时，直接点击TOTP码区域即可复制到剪贴板
4. 将复制的TOTP码粘贴到需要验证的网站或应用中

### 4. 编辑和管理账户

#### 4.1 编辑账户信息
1. 登录应用后，找到需要编辑的账户
2. 点击账户卡片或账户项
3. 在弹出的编辑对话框中，修改需要更新的信息
4. 点击"保存"完成编辑

#### 4.2 编辑备注
1. 登录应用后，找到需要添加备注的账户
2. 在账户项下方，点击"编辑备注"链接
3. 在弹出的对话框中，输入备注信息
4. 点击"保存"完成备注添加

#### 4.3 删除账户
1. 登录应用后，找到需要删除的账户
2. 点击账户卡片或账户项上的"删除"按钮
3. 在确认对话框中，点击"确认"完成删除

### 5. 导出和导入账户

#### 5.1 导出账户
1. 登录应用后，点击"设置"或"账户管理"菜单
2. 选择"导出账户"选项
3. 系统会生成一个加密的备份文件
4. 下载并保存备份文件到安全位置

#### 5.2 导入账户
1. 登录应用后，点击"设置"或"账户管理"菜单
2. 选择"导入账户"选项
3. 选择之前导出的备份文件
4. 输入备份密码（如果有）
5. 点击"导入"完成账户恢复

## 部署指南

## 安卓APP支持

Web Authenticator 也提供了安卓APP版本，基于WebView封装，提供原生应用体验。

### 1. 构建安卓APP

#### 1.1 准备开发环境
- 安装Android Studio
- 安装Java Development Kit (JDK) 17或更高版本
- 配置Android SDK

#### 1.2 构建APP
1. 打开Android Studio
2. 点击"Open"，选择项目根目录下的`android`文件夹
3. 等待项目同步完成
4. 连接安卓设备或启动模拟器
5. 点击"Run"按钮构建并运行APP

### 2. 使用安卓APP

#### 2.1 首次使用
1. 安装并打开Web Authenticator APP
2. 在欢迎界面点击"注册"或"登录"
3. 输入您的账户信息进行登录

#### 2.2 功能使用
- **添加账户**：点击"添加账户"按钮，扫描二维码或手动输入
- **查看TOTP码**：在主界面查看所有账户的TOTP码，点击即可复制
- **管理账户**：长按账户卡片进行编辑或删除

### 3. 安卓APP特性
- 📱 原生应用体验，无需浏览器
- 🔐 与Web版本共享同一套后端服务
- 🔄 实时更新TOTP码
- 📋 支持扫描二维码添加账户
- 🎨 响应式设计，适配不同屏幕尺寸

## 项目结构

- **前端**：HTML/CSS/JavaScript静态文件
- **后端**：Node.js + Express + MongoDB
- **安卓APP**：基于WebView的原生封装

## 部署步骤

### 1. 准备服务器环境

#### 1.1 安装依赖软件

**Ubuntu/Debian系统：**
```bash
# 更新系统包
apt update && apt upgrade -y

# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装MongoDB（如果使用本地MongoDB）
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# 安装Nginx（用于部署前端和反向代理）
apt install -y nginx

# 安装PM2（用于管理Node.js进程）
npm install -g pm2
```

**CentOS/RHEL系统：**
```bash
# 更新系统包
yum update -y

# 安装Node.js和npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 安装MongoDB（如果使用本地MongoDB）
yum install -y mongodb-org

# 安装Nginx（用于部署前端和反向代理）
yum install -y nginx

# 安装PM2（用于管理Node.js进程）
npm install -g pm2
```

### 2. 克隆代码

```bash
# 克隆代码到服务器
git clone https://github.com/huahiren/web-authenticator.git
cd web-authenticator
```

### 3. 配置和启动后端服务

#### 3.1 安装后端依赖

```bash
cd server
npm install
```

#### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（使用vi或nano）
vi .env
```

在`.env`文件中配置以下内容：
```
# 数据库连接信息
MONGO_URI=mongodb://<username>:<password>@<host>:<port>/<database>?authSource=admin
# 或使用本地MongoDB
# MONGO_URI=mongodb://localhost:27017/totp

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
```

#### 3.3 启动后端服务

```bash
# 使用PM2启动后端服务
pm run start

# 或使用PM2管理进程
pm install -g pm2
pm start

# 保存PM2进程列表，以便开机自启
pm save
pm startup
```

### 4. 部署前端静态文件

#### 4.1 配置前端API地址

编辑前端的`api-service.js`文件，将API_BASE_URL修改为后端服务的实际地址：

```bash
# 编辑api-service.js文件
vi api-service.js
```

修改第3行：
```javascript
// 将localhost:3000替换为你的服务器IP或域名
const API_BASE_URL = 'http://your-server-ip:3000/api';
```

#### 4.2 部署静态文件

**方法1：使用Nginx部署**

```bash
# 创建Nginx配置文件
vi /etc/nginx/sites-available/totp
```

添加以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP

    root /path/to/web-authenticator;  # 替换为项目根目录
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # 反向代理API请求到后端服务
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用该配置：
```bash
ln -s /etc/nginx/sites-available/totp /etc/nginx/sites-enabled/
# 测试Nginx配置
nginx -t
# 重启Nginx
systemctl restart nginx
```

**方法2：使用Node.js静态文件服务器**

```bash
# 安装http-server
npm install -g http-server

# 在项目根目录启动静态文件服务器
cd ..
http-server -p 8080
```

### 5. 配置防火墙

```bash
# 开放必要的端口
# 对于Ubuntu/Debian
ufw allow 80
ufw allow 443
ufw allow 3000

# 对于CentOS/RHEL
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

### 6. 测试部署

1. 打开浏览器访问：`http://your-server-ip` 或 `http://your-domain.com`
2. 确保前端页面能够正常加载
3. 测试登录、注册、添加TOTP账户等功能
4. 验证生成的TOTP值是否正确

## 维护和更新

### 更新代码

```bash
# 进入项目目录
cd /path/to/web-authenticator

# 拉取最新代码
git pull

# 重启后端服务
cd server
npm install  # 如果依赖有变化
pm restart

# 重启前端服务（如果使用http-server）
cd ..
# 停止旧的http-server进程
pkill -f http-server
# 启动新的http-server进程
http-server -p 8080
```

### 查看日志

```bash
# 查看后端日志
cd server
npm logs

# 或使用PM2查看日志
pm logs
```

## 安全建议

1. 使用HTTPS协议，配置SSL证书
2. 定期更新依赖包，修复安全漏洞
3. 限制MongoDB的访问权限，不要使用默认配置
4. 为JWT_SECRET设置复杂的随机字符串
5. 考虑使用Docker容器化部署，提高安全性和可维护性
6. 定期备份数据库

## 故障排查

1. **前端无法连接到后端**：
   - 检查`api-service.js`中的API_BASE_URL配置是否正确
   - 检查后端服务是否正在运行
   - 检查防火墙设置是否允许端口访问

2. **后端服务无法启动**：
   - 检查环境变量配置是否正确
   - 检查MongoDB连接是否正常
   - 查看日志文件，定位错误原因

3. **TOTP生成不正确**：
   - 检查服务器时间是否与客户端时间同步
   - 确保密钥格式正确
   - 检查生成算法是否符合RFC 6238标准

## 常见问题

### Q: 如何配置HTTPS？
A: 可以使用Let's Encrypt免费证书，或购买商业SSL证书。配置Nginx支持HTTPS。

### Q: 如何实现自动备份？
A: 可以使用crontab定时执行MongoDB备份命令，将备份文件保存到安全位置。

### Q: 如何扩展服务？
A: 可以考虑：
   - 使用负载均衡器分发请求
   - 部署多个后端实例
   - 使用MongoDB副本集提高可用性
   - 使用Redis缓存提高性能

### Q: 如何监控服务状态？
A: 可以使用：
   - PM2内置的监控功能
   - 第三方监控工具如Prometheus + Grafana
   - Nginx日志分析工具如ELK Stack

## 联系方式

如有部署问题，欢迎提交Issue或联系项目维护者。