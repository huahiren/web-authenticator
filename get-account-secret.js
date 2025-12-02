// 获取账户密钥的脚本
const http = require('http');

// 登录信息
const loginInfo = {
    username: 'admin',
    password: 'admin123'
};

// 登录函数
function login() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.token) {
                        resolve(result.token);
                    } else {
                        reject(new Error('Login failed: ' + result.message));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(JSON.stringify(loginInfo));
        req.end();
    });
}

// 获取账户列表函数
function getAccounts(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/accounts',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const accounts = JSON.parse(data);
                    resolve(accounts);
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

// 主函数
async function main() {
    try {
        console.log('正在登录...');
        const token = await login();
        console.log('登录成功，token:', token);
        
        console.log('\n正在获取账户列表...');
        const accounts = await getAccounts(token);
        console.log('获取到', accounts.length, '个账户');
        
        console.log('\n=== 账户列表 ===');
        accounts.forEach((account, index) => {
            console.log(`${index + 1}. ${account.name}: ${account.username}`);
            console.log(`   Secret: ${account.secret}`);
            console.log(`   当前TOTP: ${account.totp}`);
            console.log('---');
        });
        
        // 查找目标账户
        const targetAccount = accounts.find(acc => 
            acc.name === '7xNetworks' && acc.username === 'cms.support6@watsons'
        );
        
        if (targetAccount) {
            console.log('\n=== 目标账户信息 ===');
            console.log('名称:', targetAccount.name);
            console.log('用户名:', targetAccount.username);
            console.log('密钥:', targetAccount.secret);
            console.log('当前TOTP:', targetAccount.totp);
        } else {
            console.log('\n未找到目标账户');
        }
        
    } catch (error) {
        console.error('操作失败:', error);
    }
}

// 运行主函数
main();
