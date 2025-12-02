// API服务层，用于处理与后端的通信

const API_BASE_URL = 'http://localhost:3000/api';

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
    const url = `${API_BASE_URL}${endpoint}`;
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
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '请求失败');
      }

      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  // ================== 认证相关 ==================

  // 登录
  static async login(username, password) {
    const data = await this.request('/auth/login', 'POST', { username, password });
    if (data && data.token) {
      this.setToken(data.token);
      return data.user;
    }
    throw new Error('登录失败：无效的响应格式');
  }

  // 验证令牌
  static async verifyToken() {
    const token = this.getToken();
    if (!token) {
      throw new Error('无令牌');
    }

    const data = await this.request('/auth/verify-token', 'POST', { token });
    return data.user;
  }

  // 获取当前用户信息
  static async getCurrentUser() {
    const data = await this.request('/auth/me', 'GET');
    if (data && data.user) {
      // 确保返回的用户对象包含id字段，兼容_id和id
      const user = data.user;
      return {
        ...user,
        id: user.id || user._id
      };
    }
    throw new Error('获取用户信息失败');
  }

  // ================== 用户相关 ==================

  // 获取所有用户（仅管理员）
  static async getUsers() {
    const data = await this.request('/users');
    return data;
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
    return data;
  }

  // 添加账户
  static async addAccount(name, secret, issuer = '') {
    const data = await this.request('/accounts', 'POST', { name, secret, issuer });
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
