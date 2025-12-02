const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const { admin } = require('../middleware/auth');

// 获取用户的所有账户（包括自己创建的和共享的）
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({
      $or: [
        { userId: req.user.userId },
        { sharedWith: req.user.userId }
      ]
    });
    res.json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加账户
router.post('/', async (req, res) => {
  try {
    const { name, secret, issuer } = req.body;
    
    if (!name || !secret) {
      return res.status(400).json({ message: '请输入账户名称和密钥' });
    }
    
    const newAccount = new Account({
      userId: req.user.userId,
      name,
      secret,
      issuer
    });
    
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新账户
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, secret, issuer } = req.body;
    
    let account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    account.name = name || account.name;
    account.secret = secret || account.secret;
    account.issuer = issuer || account.issuer;
    
    await account.save();
    res.json(account);
  } catch (error) {
    console.error(error);
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
    if (account.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    await Account.findByIdAndDelete(id);
    res.json({ message: '账户删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 共享账户给其他用户
router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { shareUserId } = req.body;
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 检查是否已经共享给该用户
    if (account.sharedWith.includes(shareUserId)) {
      return res.status(400).json({ message: '该账户已经共享给此用户' });
    }
    
    // 添加共享用户
    account.sharedWith.push(shareUserId);
    await account.save();
    
    res.json({ message: '账户共享成功', account });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 取消共享账户
router.delete('/:id/share/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const account = await Account.findById(id);
    
    if (!account) {
      return res.status(404).json({ message: '账户不存在' });
    }
    
    // 检查账户是否属于当前用户
    if (account.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: '无权访问此账户' });
    }
    
    // 从共享列表中移除用户
    account.sharedWith = account.sharedWith.filter(id => id.toString() !== userId);
    await account.save();
    
    res.json({ message: '取消共享成功', account });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
