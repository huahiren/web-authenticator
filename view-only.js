// 只读视图版本的Google Authenticator

// Base32解码函数
function base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    str = str.toUpperCase().replace(/=+$/, '');
    let bits = '';
    let result = '';
    
    for (let i = 0; i < str.length; i++) {
        const index = alphabet.indexOf(str[i]);
        if (index === -1) throw new Error('Invalid base32 character: ' + str[i]);
        bits += index.toString(2).padStart(5, '0');
    }
    
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        result += String.fromCharCode(parseInt(bits.substr(i, 8), 2));
    }
    
    return result;
}

// HMAC-SHA1计算
function hmacSHA1(key, data) {
    const crypto = window.crypto || window.msCrypto;
    
    if (!crypto || !crypto.subtle) {
        console.error('Web Crypto API not supported');
        return null;
    }
    
    // 将字符串转换为ArrayBuffer
    function str2ab(str) {
        const buf = new ArrayBuffer(str.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
    
    // 生成HMAC密钥
    const importKey = async () => {
        try {
            return await crypto.subtle.importKey(
                'raw',
                str2ab(key),
                { name: 'HMAC', hash: 'SHA-1' },
                false,
                ['sign']
            );
        } catch (error) {
            console.error('Error importing key:', error);
            return null;
        }
    };
    
    // 计算HMAC
    const computeHMAC = async () => {
        try {
            const cryptoKey = await importKey();
            if (!cryptoKey) return null;
            
            const signature = await crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                str2ab(data)
            );
            
            return new Uint8Array(signature);
        } catch (error) {
            console.error('Error computing HMAC:', error);
            return null;
        }
    };
    
    return computeHMAC();
}

// 生成TOTP密码
async function generateTOTP(secret, digits = 6, period = 30) {
    try {
        // 解码Base32密钥
        const key = base32Decode(secret);
        
        // 获取当前时间步长
        const now = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(now / period);
        
        // 将时间步长转换为8字节的缓冲区
        let buffer = new ArrayBuffer(8);
        let dataView = new DataView(buffer);
        dataView.setUint32(4, timeStep, false);
        
        // 计算HMAC-SHA1
        const hmac = await hmacSHA1(key, new TextDecoder().decode(buffer));
        if (!hmac) return null;
        
        // 提取动态截断值
        const offset = hmac[hmac.length - 1] & 0xf;
        const binary = (
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff)
        );
        
        // 生成TOTP码
        const otp = binary % Math.pow(10, digits);
        return otp.toString().padStart(digits, '0');
    } catch (error) {
        console.error('Error generating TOTP:', error);
        return null;
    }
}

// 获取剩余倒计时时间（秒）
function getRemainingTime(period = 30) {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
}

// 从本地存储获取账户列表
function getAccountsFromStorage() {
    const accounts = localStorage.getItem('googleAuthenticatorAccounts');
    return accounts ? JSON.parse(accounts) : [];
}

// 渲染账户列表
async function renderAccounts() {
    const totpList = document.getElementById('totp-list');
    const accounts = getAccountsFromStorage();
    
    if (accounts.length === 0) {
        totpList.innerHTML = '<p class="no-accounts">暂无账户，请先在管理页面添加账户</p>';
        return;
    }
    
    let html = '';
    
    for (const account of accounts) {
        const otp = await generateTOTP(account.secret);
        const timeLeft = getRemainingTime();
        
        html += `
            <div class="account-item">
                <div class="account-info">
                    <h3>${account.name}</h3>
                    <p>${account.issuer || '无发行者'}</p>
                </div>
                <div class="totp-container">
                    <div class="totp-code">${otp || '生成失败'}</div>
                    <div class="countdown-container">
                        <div class="countdown-bar" style="width: ${(timeLeft / 30) * 100}%"></div>
                        <div class="countdown-text">${timeLeft}s</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    totpList.innerHTML = html;
}

// 初始化
async function init() {
    // 初始渲染账户列表
    await renderAccounts();
    
    // 每秒更新一次
    setInterval(async () => {
        await renderAccounts();
    }, 1000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
