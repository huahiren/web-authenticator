// 只读视图版本的Google Authenticator

// Base32解码函数
function base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    
    // 移除空格并转换为大写
    base32 = base32.replace(/\s+/g, '').toUpperCase();
    
    // 将Base32字符转换为二进制字符串
    for (let i = 0; i < base32.length; i++) {
        const index = alphabet.indexOf(base32.charAt(i));
        if (index === -1) {
            throw new Error(`Invalid base32 character: ${base32.charAt(i)}`);
        }
        bits += index.toString(2).padStart(5, '0');
    }
    
    // 将二进制字符串转换为Uint8Array
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
}

// HMAC-SHA1函数
async function hmacSHA1(key, message) {
    // 使用Web Crypto API实现HMAC-SHA1
    try {
        const crypto = window.crypto || window.msCrypto;
        
        if (!crypto || !crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }
        
        // 确保key是Uint8Array
        if (typeof key === 'string') {
            const encoder = new TextEncoder();
            key = encoder.encode(key);
        }
        
        // 确保message是Uint8Array
        if (!(message instanceof Uint8Array)) {
            throw new Error('Message must be a Uint8Array');
        }
        
        const importedKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: { name: 'SHA-1' } },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            importedKey,
            message
        );
        
        return new Uint8Array(signature);
    } catch (error) {
        console.error('HMAC-SHA1 error:', error);
        return null;
    }
}

// 生成TOTP密码
async function generateTOTP(secret, digits = 6, period = 30) {
    try {
        // 解码Base32密钥
        const key = base32Decode(secret);
        
        // 获取当前时间步长
        const now = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(now / period);
        
        // 将时间步长转换为8字节的缓冲区（大端序）
        let buffer = new ArrayBuffer(8);
        let dataView = new DataView(buffer);
        // 正确处理8字节时间步长（大端序）
        // 使用BigInt确保正确处理大数值
        let bigTimeStep = BigInt(timeStep);
        for (let i = 0; i < 8; i++) {
            dataView.setUint8(7 - i, Number((bigTimeStep >> BigInt(i * 8)) & 0xFFn));
        }
        
        // 计算HMAC-SHA1
        const hmac = await hmacSHA1(key, new Uint8Array(buffer));
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
        // 生成TOTP
        const otp = generateTOTP(account.secret);
        const timeLeft = getRemainingTime();
        
        // 解码账户名和发行者
        const decodedName = decodeURIComponent(account.name);
        const decodedIssuer = account.issuer ? decodeURIComponent(account.issuer) : '无发行者';
        
        html += `
            <div class="account-item">
                <div class="account-info">
                    <h3>${decodedName}</h3>
                    <p>${decodedIssuer}</p>
                </div>
                <div class="totp-container">
                    <div class="totp-code" title="点击复制密钥">${otp || '生成失败'}</div>
                    <div class="countdown-container">
                        <div class="countdown-bar" style="width: ${(timeLeft / 30) * 100}%"></div>
                        <div class="countdown-text">${timeLeft}s</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    totpList.innerHTML = html;
    
    // 添加点击复制TOTP码事件
    const totpCodeElements = document.querySelectorAll('.totp-code');
    totpCodeElements.forEach(element => {
        element.addEventListener('click', async () => {
            const totpCode = element.textContent;
            if (totpCode && totpCode !== '生成中...' && totpCode !== '生成失败') {
                try {
                    await navigator.clipboard.writeText(totpCode);
                    // 简单的提示，因为view-only.js可能没有showToast函数
                    alert('动态密钥已复制到剪贴板');
                } catch (error) {
                    console.error('复制失败:', error);
                    alert('复制失败，请手动复制');
                }
            }
        });
    });
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
