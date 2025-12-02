// 测试二维码显示功能修复
const axios = require('axios');

// 配置测试环境
const BASE_URL = 'http://localhost:3000/api';
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin123';

// 测试步骤
async function testQRCodeFix() {
    console.log('开始测试二维码显示功能修复...');
    
    try {
        // 1. 登录获取token
        console.log('1. 登录获取token...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: TEST_USERNAME,
            password: TEST_PASSWORD
        });
        const token = loginResponse.data.token;
        console.log('登录成功，获取到token:', token);
        
        // 2. 获取账户列表
        console.log('\n2. 获取账户列表...');
        const accountsResponse = await axios.get(`${BASE_URL}/accounts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const accounts = accountsResponse.data;
        console.log(`获取到 ${accounts.length} 个账户`);
        
        if (accounts.length === 0) {
            console.log('没有账户可测试，请先添加账户');
            return;
        }
        
        // 3. 测试获取第一个账户的secret
        console.log('\n3. 测试获取第一个账户的secret...');
        const firstAccount = accounts[0];
        console.log('测试账户:', firstAccount);
        
        const secretResponse = await axios.get(`${BASE_URL}/accounts/${firstAccount.id}/secret`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const accountWithSecret = secretResponse.data;
        console.log('获取到的账户secret:', accountWithSecret);
        
        // 验证结果
        if (accountWithSecret.secret) {
            console.log('\n✅ 测试成功！可以正确获取账户的secret');
            console.log('✅ 二维码显示功能应该可以正常工作了');
        } else {
            console.log('\n❌ 测试失败！无法获取账户的secret');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

// 运行测试
testQRCodeFix();
