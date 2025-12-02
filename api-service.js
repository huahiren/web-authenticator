// API服务层，用于处理与后端的通信
import config from './config.js';

const API_BASE_URL = config.API_BASE_URL;

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
      
      // 检查响应状态码
      if (!response.ok) {
        // 尝试解析响应为JSON
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // 如果响应不是JSON，使用状态文本作为错误信息
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
        throw new Error(errorData.message || `请求失败: ${response.status} ${response.statusText}`);
      }
      
      // 尝试解析响应为JSON
      try {
        const data = await response.json();
        return data;
      } catch (jsonError) {
        throw new Error('响应不是有效的JSON格式');
      }
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
