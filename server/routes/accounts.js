const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Account = require('../models/Account');
const { admin } = require('../middleware/auth');
const { generateTOTP, getRemainingTime } = require('../utils/totp');

// 获取用户的所有账户（包括自己创建的和共享的）
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({
      $or: [
        { userId: req.user.userId },
        { sharedWith: req.user.userId }
      ]
    });
    
    // 为每个账户添加当前用户的备注名和TOTP码
    const accountsWithUserRemarks = accounts.map(account => {
      const accountObj = account.toObject();
      // 添加id字段，方便前端使用
      accountObj.id = accountObj._id;
      // 将Map转换为普通对象以便正确访问
      const userRemarks = account.userRemarks instanceof Map ? Object.fromEntries(account.userRemarks) : accountObj.userRemarks;
      // 从转换后的对象中获取当前用户的备注，默认返回空字符串
      accountObj.remark = userRemarks?.[req.user.userId.toString()] || '';
      // 确保userRemarks是普通对象格式返回
      accountObj.userRemarks = userRemarks;
      
      // 生成TOTP码和剩余时间
      accountObj.totp = generateTOTP(accountObj.secret);
      accountObj.remainingTime = getRemainingTime();
      
      // 移除secret字段，不返回给前端
      delete accountObj.secret;
      
      return accountObj;
    });

    res.json(accountsWithUserRemarks);
  } catch (error) {
    console.error('获取用户所有账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个账户详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('获取单个账户详情请求:', id);
    
    const account = await Account.findById(id);
    console.log('查询到的账户:', account);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户或已共享给当前用户
    const userId = req.user.userId;
    const accountUserId = account.userId;
    const sharedWith = account.sharedWith || [];
    
    console.log('当前用户ID:', userId);
    console.log('账户所属用户ID:', accountUserId);
    console.log('共享给的用户列表:', sharedWith);
    
    // 确保所有需要调用toString()的对象都存在
    if (accountUserId && userId && accountUserId.toString() !== userId.toString() && !sharedWith.includes(userId)) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 将Map转换为普通对象以便正确访问
    const userRemarks = account.userRemarks instanceof Map ? Object.fromEntries(account.userRemarks) : {};
    // 从转换后的对象中获取当前用户的备注，默认返回空字符串
    const remark = userRemarks?.[userId.toString()] || '';
    
    // 转换为普通对象并添加备注
    const accountObj = account.toObject();
    // 添加id字段，方便前端使用
    accountObj.id = accountObj._id;
    accountObj.remark = remark;
    accountObj.userRemarks = userRemarks;
    
    // 生成TOTP码和剩余时间
    accountObj.totp = generateTOTP(accountObj.secret);
    accountObj.remainingTime = getRemainingTime();
    
    // 移除secret字段，不返回给前端
    delete accountObj.secret;
    
    res.json(accountObj);
  } catch (error) {
    console.error('获取单个账户详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加账户（仅管理员）
router.post('/', admin, async (req, res) => {
  try {
    const { name, secret, issuer, remark } = req.body;
    
    if (!name || !secret) {
      return res.status(400).json({ message: '请输入账户名称和密钥' });
    }
    
    // 初始化userRemarks Map
    const userRemarks = new Map();
    userRemarks.set(req.user.userId.toString(), remark || '');
    
    const newAccount = new Account({
      userId: req.user.userId,
      name,
      secret,
      issuer,
      userRemarks
    });
    
    await newAccount.save();
    // 转换为普通对象并添加当前用户的备注
    const accountObj = newAccount.toObject();
    accountObj.remark = accountObj.userRemarks?.[req.user.userId] || '';
    // 移除secret字段，不返回给前端
    delete accountObj.secret;
    res.status(201).json(accountObj);
  } catch (error) {
    console.error('添加账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新账户
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, secret, issuer, remark } = req.body;
    
    let account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户或已共享给当前用户
    const isOwner = account.userId && req.user.userId && account.userId.toString() === req.user.userId.toString();
    const isShared = Array.isArray(account.sharedWith) && account.sharedWith.some(sharedId => sharedId.toString() === req.user.userId.toString());
    
    if (!isOwner && !isShared) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 只有账户所有者可以更新账户的基本信息
    if (isOwner) {
      account.name = name || account.name;
      account.secret = secret || account.secret;
      account.issuer = issuer || account.issuer;
    }
    
    // 所有有权访问账户的用户都可以更新自己的备注名
    if (remark !== undefined) {
      if (!account.userRemarks) {
        account.userRemarks = new Map();
      }
      account.userRemarks.set(req.user.userId.toString(), remark);
    }
    
    await account.save();
    
    // 将Map转换为普通对象以便正确访问
    const userRemarks = Object.fromEntries(account.userRemarks);
    // 获取当前用户的备注
    const updatedRemark = userRemarks?.[req.user.userId.toString()] || '';
    
    // 转换为普通对象并添加备注
    const accountObj = account.toObject();
    accountObj.remark = updatedRemark;
    accountObj.userRemarks = userRemarks;
    // 移除secret字段，不返回给前端
    delete accountObj.secret;
    
    res.json(accountObj);
  } catch (error) {
    console.error('更新账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除账户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId && req.user.userId && account.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    await Account.findByIdAndDelete(id);
    res.json({ message: '账户删除成功' });
  } catch (error) {
    console.error('删除账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 共享账户给其他用户
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    let { shareUserId } = req.body;
    
    // 验证shareUserId
    if (!shareUserId || shareUserId === 'undefined' || shareUserId === 'null') {
      return res.status(400).json({ message: '请提供有效的用户ID' });
    }
    
    // 检查shareUserId是否为有效的ObjectId
    if (!mongoose.Types.ObjectId.isValid(shareUserId)) {
      return res.status(400).json({ message: '无效的用户ID格式' });
    }
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId && req.user.userId && account.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 检查是否已经共享给该用户
    const sharedWith = account.sharedWith || [];
    if (sharedWith.some(id => id && id.toString() === shareUserId)) {
      return res.status(400).json({ message: '该账户已经共享给此用户' });
    }
    
    // 添加共享用户
    account.sharedWith = sharedWith;
    account.sharedWith.push(shareUserId);
    await account.save();
    
    res.json({ message: '账户共享成功', account });
  } catch (error) {
    console.error('共享账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 取消共享账户
router.delete('/:id/share/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    // 检查userId是否为有效的ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '无效的用户ID格式' });
    }
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId && req.user.userId && account.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 从共享列表中移除用户
    const sharedWith = account.sharedWith || [];
    account.sharedWith = sharedWith.filter(sharedId => {
      return sharedId && sharedId.toString() !== userId;
    });
    await account.save();
    
    res.json({ message: '取消共享成功', account });
  } catch (error) {
    console.error('取消共享账户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取账户密钥（普通用户可访问自己的账户）
router.get('/:id/secret', async (req, res) => {
  try {
    const { id } = req.params;
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户或已共享给当前用户
    const userId = req.user.userId;
    const accountUserId = account.userId;
    const sharedWith = account.sharedWith || [];
    
    // 确保所有需要调用toString()的对象都存在
    if (accountUserId && userId && accountUserId.toString() !== userId.toString() && !sharedWith.includes(userId)) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 返回账户信息和密钥
    res.json({
      id: account._id,
      name: account.name,
      secret: account.secret,
      issuer: account.issuer,
      currentTOTP: generateTOTP(account.secret)
    });
  } catch (error) {
    console.error('获取账户密钥错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
