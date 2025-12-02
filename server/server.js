const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 引入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/accounts');

// 引入认证中间件
const { protect, admin } = require('./middleware/auth');

// 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, admin, userRoutes); // 仅管理员可访问
app.use('/api/accounts', protect, accountRoutes); // 需要登录才能访问

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

// 连接数据库
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}) .then(async () => {
  console.log('数据库连接成功');
  
  // 引入User模型
  const User = require('./models/User');
  
  // 创建默认管理员用户
  const adminUser = await User.findOne({ username: 'admin' });
  if (!adminUser) {
    const newAdmin = new User({
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    });
    await newAdmin.save();
    console.log('默认管理员用户创建成功: 用户名 admin, 密码 admin123');
  } else {
    console.log('默认管理员用户已存在');
  }
  
  // 启动服务器
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}) .catch((error) => {
  console.error('数据库连接失败:', error);
  process.exit(1);
});
