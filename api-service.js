// API服务层，用于处理与后端的通信
// 注意：config.js必须在api-service.js之前加载
// 因为config.js会在全局作用域中定义config变量

// 动态获取API_BASE_URL的函数，确保每次都能获取最新配置
function getApiBaseUrl() {
  return window.config && window.config.API_BASE_URL ? window.config.API_BASE_URL : 'http://localhost:3000/api';
}

// 定义ApiService类并挂载到全局window对象
class ApiService {
  // 获取认证令牌
  static getToken() {
    const token = localStorage.getItem('authToken');
    return token || null;
  }

  // 设置认证令牌
  static setToken(token) {
    if (token && typeof token === 'string' && token.includes('.')) {
      localStorage.setItem('authToken', token);
    }
  }

  // 移除认证令牌
  static removeToken() {
    localStorage.removeItem('authToken');
  }

  // 清除无效令牌
  static clearToken() {
    this.removeToken();
  }

  // 登出
  static logout() {
    this.removeToken();
  }

  // 通用请求方法
  static async request(endpoint, method = 'GET', body = null) {
    const API_BASE_URL = getApiBaseUrl();
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // 添加认证令牌到请求头
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log('API请求URL:', url);
      console.log('API请求选项:', options);
      
      const response = await fetch(url, options);
      
      console.log('API响应状态:', response.status);
      console.log('API响应状态文本:', response.statusText);
      
      // 检查响应状态码
      if (!response.ok) {
        // 确定默认错误消息
        let defaultErrorMessage;
        if (response.status === 401) {
          console.log('API请求返回401未授权状态');
          defaultErrorMessage = '无令牌，授权失败';
        } else {
          defaultErrorMessage = `请求失败: ${response.status} ${response.statusText}`;
        }
        
        // 尝试解析错误响应为JSON
        let errorData;
        try {
          errorData = await response.json();
          console.log('API错误响应数据:', errorData);
        } catch (jsonError) {
          // 如果响应不是JSON，使用默认错误消息
          console.error('API请求失败，非JSON响应:', response.status, response.statusText);
          console.error('JSON解析错误:', jsonError);
          return { error: defaultErrorMessage };
        }
        
        console.error('API请求失败:', errorData.message);
        return { error: errorData.message || defaultErrorMessage };
      }
      
      // 尝试解析响应为JSON
      try {
        const data = await response.json();
        console.log('API响应数据:', data);
        return data;
      } catch (jsonError) {
        // 如果响应不是JSON格式，处理这种情况
        console.error('API响应不是有效的JSON格式:', jsonError);
        return { error: '响应不是有效的JSON格式' };
      }
    } catch (error) {
      // 网络错误或其他异常
      console.error('API请求异常:', error);
      return { error: error.message };
    }
  }

  // ================== 认证相关 ==================

  // 登录
  static async login(username, password) {
    const data = await this.request('/auth/login', 'POST', { username, password });
    if (data && data.error) {
      // 如果登录失败，返回错误信息
      return { error: data.error };
    }
    if (data && data.token) {
      this.setToken(data.token);
      return data.user;
    }
    // 如果没有错误信息也没有令牌，返回一个默认错误
    return { error: '登录失败，请检查用户名和密码' };
  }

  // 验证令牌
  static async verifyToken() {
    const token = this.getToken();
    if (!token) {
      return { error: '无令牌' };
    }

    const data = await this.request('/auth/verify-token', 'POST', { token });
    
    // 检查响应是否包含错误
    if (data && data.error) {
      // 如果请求失败，说明令牌无效或已过期，清除令牌并返回错误
      this.clearToken();
      return { error: data.error };
    }
    
    return data.user;
  }

  // 获取当前用户信息
  static async getCurrentUser() {
    // 先检查是否有令牌，如果没有直接返回null
    const token = this.getToken();
    if (!token) {
      return null;
    }
    
    const data = await this.request('/auth/me', 'GET');
    
    // 检查响应是否包含错误
    if (data && data.error) {
      // 如果请求失败，说明令牌无效或已过期，清除令牌并返回null
      this.clearToken();
      return null;
    }
    
    if (data && data.user) {
      // 确保返回的用户对象包含id字段，兼容_id和id
      const user = data.user;
      return {
        ...user,
        id: user.id || user._id
      };
    }
    
    return null;
  }

  // ================== 用户相关 ==================

  // 获取所有用户（仅管理员）
  static async getUsers() {
    const data = await this.request('/users');
    
    // 如果返回的是错误对象，返回空数组
    if (data && data.error) {
      console.error('获取用户列表失败:', data.error);
      return [];
    }
    
    // 确保每个用户对象都包含id字段，兼容_id和id
    return data.map(user => ({
      ...user,
      id: user.id || user._id
    }));
  }

  // 添加用户（仅管理员）
  static async addUser(username, password, role = 'user') {
    const data = await this.request('/users', 'POST', { username, password, role });
    return data;
  }

  // 更新用户密码
  static async updatePassword(userId, currentPassword, newPassword) {
    const data = await this.request(`/users/${userId}/password`, 'PUT', {
      currentPassword,
      newPassword
    });
    return data;
  }

  // 删除用户（仅管理员）
  static async deleteUser(userId) {
    const data = await this.request(`/users/${userId}`, 'DELETE');
    return data;
  }

  // ================== 账户相关 ==================

  // 获取用户的所有账户
  static async getAccounts() {
    const data = await this.request('/accounts');
    // 确保每个账户对象都包含id字段，兼容_id和id
    return data.map(account => ({
      ...account,
      id: account.id || account._id
    }));
  }

  // 添加账户
  static async addAccount(name, secret, issuer = '') {
    const data = await this.request('/accounts', 'POST', { name, secret, issuer });
    return data;
  }

  // 获取单个账户详情
  static async getAccount(accountId) {
    const data = await this.request(`/accounts/${accountId}`);
    // 确保返回的账户对象包含id字段，兼容_id和id
    return {
      ...data,
      id: data.id || data._id
    };
  }
  
  // 获取账户密钥
  static async getAccountSecret(accountId) {
    const data = await this.request(`/accounts/${accountId}/secret`, 'GET');
    return data;
  }

  // 更新账户
  static async updateAccount(accountId, updates) {
    const data = await this.request(`/accounts/${accountId}`, 'PUT', updates);
    return data;
  }

  // 删除账户
  static async deleteAccount(accountId) {
    const data = await this.request(`/accounts/${accountId}`, 'DELETE');
    return data;
  }

  // 共享账户给其他用户
  static async shareAccount(id, shareUserId) {
    const data = await this.request(`/accounts/${id}/share`, 'POST', { shareUserId });
    return data;
  }

  // 取消共享账户
  static async unshareAccount(id, userId) {
    const data = await this.request(`/accounts/${id}/share/${userId}`, 'DELETE');
    return data;
  }
}

// 将ApiService挂载到全局window对象上
window.ApiService = ApiService;
