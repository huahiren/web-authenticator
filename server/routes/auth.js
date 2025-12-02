const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('登录请求:', { username, password: '****' });
    
    if (!username || !password) {
      console.log('登录失败: 用户名或密码为空');
      return res.status(400).json({ message: '请输入用户名和密码' });
    }
    
    const user = await User.findOne({ username });
    console.log('查找用户结果:', user ? '找到用户' : '未找到用户');
    
    if (!user) {
      console.log('登录失败: 用户不存在');
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const passwordMatch = await user.matchPassword(password);
    console.log('密码匹配结果:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('登录失败: 密码不匹配');
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    console.log('登录成功: 用户', username);
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 验证令牌
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ message: '无令牌，授权失败' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: '令牌无效' });
  }
});

// 获取当前用户信息
router.get('/me', protect, async (req, res) => {
  try {
    // 从数据库获取完整用户信息
    const user = await User.findById(req.user.userId).select('-password');
    
    // 确保返回的用户对象包含id、username和role字段
    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
