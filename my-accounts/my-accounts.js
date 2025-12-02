// API服务已通过HTML script标签引入，全局可用

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
    // 确保message是Uint8Array
    if (!(message instanceof Uint8Array)) {
        throw new Error('Message must be a Uint8Array');
    }
    
    // 确保key是Uint8Array
    if (typeof key === 'string') {
        const encoder = new TextEncoder();
        key = encoder.encode(key);
    }
    
    // 只使用Web Crypto API，现代浏览器都支持
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
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
            console.error('Web Crypto API HMAC-SHA1 error:', error);
            throw error;
        }
    } else {
        // Web Crypto API不可用时，抛出错误
        throw new Error('Web Crypto API is not available');
    }
}

// 生成TOTP
async function generateTOTP(secret, digits = 6, period = 30) {
    // 将Base32密钥转换为二进制
    const decodedSecret = base32Decode(secret);
    
    // 获取当前时间步长
    const now = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / period);
    
    // 将时间步长转换为8字节的缓冲区（大端序）
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    // 正确处理8字节时间步长（大端序）
    // 使用BigInt确保正确处理大数值
    let bigTimeStep = BigInt(timeStep);
    for (let i = 0; i < 8; i++) {
        view.setUint8(7 - i, Number((bigTimeStep >> BigInt(i * 8)) & 0xFFn));
    }
    
    // 计算HMAC-SHA1
    const hmac = await hmacSHA1(decodedSecret, new Uint8Array(buffer));
    
    // 动态截断
    const offset = hmac[hmac.length - 1] & 0x0F;
    const code = ((hmac[offset] & 0x7F) << 24) |
                 ((hmac[offset + 1] & 0xFF) << 16) |
                 ((hmac[offset + 2] & 0xFF) << 8) |
                 (hmac[offset + 3] & 0xFF);
    
    // 取模得到指定长度的验证码
    const otp = code % Math.pow(10, digits);
    
    // 补前导零
    return otp.toString().padStart(digits, '0');
}

// 生成OTP URI
function generateOTPURI(account, secret, issuer = '') {
    const encodedAccount = encodeURIComponent(account);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer ? encodedIssuer + ':' : ''}${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&digits=6&period=30`;
}

// 显示提示信息
function showToast(message, type = 'success') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    
    // 根据类型设置背景色
    if (type === 'success') {
        toast.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#ffc107';
    } else {
        toast.style.backgroundColor = '#6c757d';
    }
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 显示账户二维码
function showAccountQRCode(account) {
    const showQrModal = document.getElementById('show-qr-modal');
    const showQrContainer = document.getElementById('show-qr-container');
    
    if (showQrModal && showQrContainer) {
        // 生成OTP URI
        const uri = generateOTPURI(account.name, account.secret, account.issuer);
        
        // 清空容器并生成新的二维码
        showQrContainer.innerHTML = '';
        new QRCode(showQrContainer, {
            text: uri,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // 显示模态框
        showQrModal.style.display = 'block';
    }
}

// 渲染账户列表
async function renderAccounts() {
    try {
        const accounts = await ApiService.getAccounts();
        const accountsListEl = document.getElementById('accounts-list');
        
        accountsListEl.innerHTML = '';
        
        for (const account of accounts) {
            const accountEl = document.createElement('div');
            accountEl.className = 'account-item';
            accountEl.dataset.accountId = account.id;
            
            // 生成TOTP
            const totp = await generateTOTP(account.secret);
            
            accountEl.innerHTML = `
                <div class="account-info">
                    <h3 class="account-name">${account.name}</h3>
                    ${account.issuer ? `<p class="account-issuer">${account.issuer}</p>` : ''}
                    <div class="totp-container">
                        <div class="totp-code">${totp}</div>
                        <div class="countdown-container">
                            <div class="countdown-bar"></div>
                            <div class="countdown-text">30秒后刷新</div>
                        </div>
                    </div>
                </div>
                <div class="account-actions">
                    <button class="btn btn-primary show-qr-btn">显示二维码</button>
                    <button class="btn btn-secondary copy-code-btn">复制</button>
                </div>
            `;
            
            accountsListEl.appendChild(accountEl);
        }
        
        // 为每个账户的按钮添加事件监听
        document.querySelectorAll('.show-qr-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accountEl = e.target.closest('.account-item');
                const accountId = accountEl.dataset.accountId;
                const account = accounts.find(acc => acc.id === accountId);
                showAccountQRCode(account);
            });
        });
        
        document.querySelectorAll('.copy-code-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const accountEl = e.target.closest('.account-item');
                const accountId = accountEl.dataset.accountId;
                const account = accounts.find(acc => acc.id === accountId);
                const totp = await generateTOTP(account.secret);
                
                // 复制到剪贴板
                navigator.clipboard.writeText(totp).then(() => {
                    showToast('代码已复制到剪贴板', 'success');
                }).catch(err => {
                    console.error('复制失败:', err);
                    showToast('复制失败', 'error');
                });
            });
        });
        
        // 设置TOTP更新定时器
        updateAllTOTPCodes(accounts);
    } catch (error) {
        console.error('获取账户列表失败:', error);
        showToast('获取账户列表失败', 'error');
    }
}

// 更新所有账户的TOTP代码
async function updateAllTOTPCodes(accounts) {
    const updateTOTP = async () => {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = 30 - (now % 30);
        
        for (const account of accounts) {
            const accountEl = document.querySelector(`[data-account-id="${account.id}"]`);
            if (accountEl) {
                const totpCodeEl = accountEl.querySelector('.totp-code');
                const countdownBarEl = accountEl.querySelector('.countdown-bar');
                const countdownTextEl = accountEl.querySelector('.countdown-text');
                
                if (totpCodeEl && countdownBarEl && countdownTextEl) {
                    if (timeRemaining === 30 || timeRemaining === 0) {
                        const totp = await generateTOTP(account.secret);
                        totpCodeEl.textContent = totp;
                    }
                    
                    const progress = (timeRemaining / 30) * 100;
                    countdownBarEl.style.width = `${progress}%`;
                    countdownTextEl.textContent = `${timeRemaining}秒后刷新`;
                }
            }
        }
        
        setTimeout(updateTOTP, 1000);
    };
    
    updateTOTP();
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户是否已登录
        await ApiService.getCurrentUser();
        
        // 渲染账户列表
        await renderAccounts();
        
        // 关闭二维码显示模态框
        const showQrModal = document.getElementById('show-qr-modal');
        const closeShowQrModalBtn = document.getElementById('close-show-qr-modal');
        
        if (closeShowQrModalBtn) {
            closeShowQrModalBtn.addEventListener('click', () => {
                if (showQrModal) {
                    showQrModal.style.display = 'none';
                }
            });
        }
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (showQrModal && e.target === showQrModal) {
                showQrModal.style.display = 'none';
            }
        });
        
        // 添加返回首页的链接
        const backToHome = document.createElement('a');
        backToHome.href = '../index.html';
        backToHome.className = 'back-to-home';
        backToHome.textContent = '返回首页';
        backToHome.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: #667eea;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.2s ease;
        `;
        backToHome.addEventListener('mouseenter', () => {
            backToHome.style.transform = 'translateY(-2px)';
            backToHome.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        });
        backToHome.addEventListener('mouseleave', () => {
            backToHome.style.transform = 'translateY(0)';
            backToHome.style.boxShadow = 'none';
        });
        
        document.body.appendChild(backToHome);
    } catch (error) {
        console.error('用户未登录或获取账户失败:', error);
        window.location.href = '../login/login.html';
    }
});