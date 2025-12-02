const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加用户
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    const newUser = new User({
      username,
      password,
      role: role || 'user'
    });
    
    await newUser.save();
    
    // 返回用户信息，不包含密码
    const user = await User.findById(newUser._id).select('-password');
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户密码
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 验证当前密码
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: '当前密码错误' });
    }
    
    // 更新密码
    user.password = newPassword;
    await user.save();
    
    res.json({ message: '密码更新成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除用户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不允许删除自己
    if (req.user && req.user._id.toString() === id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }
    
    await User.findByIdAndDelete(id);
    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
