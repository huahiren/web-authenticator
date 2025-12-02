const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  
  // 从请求头获取令牌
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 将用户信息添加到请求对象
      req.user = decoded;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: '令牌无效，授权失败' });
    }
  }
  
  if (!token) {
    res.status(401).json({ message: '无令牌，授权失败' });
  }
};

// 管理员权限验证
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: '需要管理员权限' });
  }
};

module.exports = { protect, admin };
