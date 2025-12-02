# 部署指南

## 项目结构

- **前端**：HTML/CSS/JavaScript静态文件
- **后端**：Node.js + Express + MongoDB

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