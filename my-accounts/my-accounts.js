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
// TOTP生成逻辑已移至后端，前端不再需要此函数

// 生成OTP URI
// 全局函数，用于生成OTP URI
window.generateOTPURI = function generateOTPURI(account, secret, issuer = '') {
    // 账户名不需要转义，直接使用原始字符串
    return `otpauth://totp/${issuer ? issuer + ':' : ''}${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
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

// 绑定模态框关闭事件
function bindModalCloseEvents() {
    // 为所有模态框添加关闭事件
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        // 点击关闭按钮关闭模态框
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // 点击模态框外部关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// 显示账户二维码 - 全局作用域，覆盖script.js中的同名函数
window.showAccountQRCode = function showAccountQRCode(account) {
    console.log('my-accounts.js: 点击了显示二维码按钮，账户信息:', account);
    
    // 获取DOM元素
    const showQrModal = document.getElementById('show-qr-modal');
    const showQrContainer = document.getElementById('show-qr-container');
    
    console.log('my-accounts.js: 找到的模态框元素:', showQrModal);
    console.log('my-accounts.js: 找到的二维码容器元素:', showQrContainer);
    
    if (showQrModal && showQrContainer) {
        // 生成OTP URI
        console.log('my-accounts.js: 生成OTP URI...');
        const uri = window.generateOTPURI(account.name, account.secret, account.issuer);
        console.log('my-accounts.js: 生成的OTP URI:', uri);
        
        // 清空容器
        showQrContainer.innerHTML = '';
        
        // 添加一个备用的二维码生成方式
        if (typeof QRCode !== 'undefined') {
            console.log('my-accounts.js: QRCode库已加载，使用QRCode库生成二维码...');
            try {
                // 尝试使用QRCode库生成二维码
                new QRCode(showQrContainer, {
                    text: uri,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                // 显示模态框，添加延迟触发CSS动画
                console.log('my-accounts.js: 二维码生成成功，显示模态框');
                setTimeout(() => {
                    showQrModal.style.display = 'block';
                    showQrModal.style.zIndex = '2000';
                }, 10);
            } catch (error) {
                console.error('my-accounts.js: QRCode库使用失败:', error);
                // 失败时显示OTP URI和备用方式
                window.displayAlternativeQR(showQrContainer, uri);
                // 显示模态框，添加延迟触发CSS动画
                setTimeout(() => {
                    showQrModal.style.display = 'block';
                    showQrModal.style.zIndex = '2000';
                }, 10);
            }
        } else {
            console.warn('my-accounts.js: QRCode库未加载，使用备用方式显示');
            // 备用方式：显示OTP URI和纯文本二维码
            window.displayAlternativeQR(showQrContainer, uri);
            // 显示模态框，添加延迟触发CSS动画
            setTimeout(() => {
                showQrModal.style.display = 'block';
                showQrModal.style.zIndex = '2000';
            }, 10);
        }
    } else {
        console.error('my-accounts.js: 找不到二维码模态框元素');
        alert('找不到二维码模态框元素');
    }
}

// 显示备用二维码（OTP URI文本）
// 全局函数，用于显示备用二维码
window.displayAlternativeQR = function displayAlternativeQR(container, uri) {
    container.innerHTML = `
        <div class="alternative-qr">
            <h4>OTP URI:</h4>
            <div class="otp-uri-container">
                <input type="text" id="otp-uri-input" value="${uri}" readonly>
                <button id="copy-otp-uri-btn" class="btn btn-secondary">复制URI</button>
            </div>
            <p>您可以手动扫描此URI或复制到剪贴板</p>
        </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .alternative-qr {
            padding: 20px;
            text-align: center;
        }
        
        .otp-uri-container {
            display: flex;
            margin: 15px 0;
        }
        
        #otp-uri-input {
            flex: 1;
            padding: 10px;
            font-family: monospace;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px 0 0 4px;
            outline: none;
        }
        
        #copy-otp-uri-btn {
            padding: 10px 20px;
            border: 1px solid #007bff;
            background-color: #007bff;
            color: white;
            border-radius: 0 4px 4px 0;
            cursor: pointer;
        }
        
        #copy-otp-uri-btn:hover {
            background-color: #0056b3;
        }
    `;
    document.head.appendChild(style);
    
    // 绑定复制按钮事件
    const copyBtn = document.getElementById('copy-otp-uri-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const input = document.getElementById('otp-uri-input');
            input.select();
            document.execCommand('copy');
            showToast('OTP URI已复制到剪贴板', 'success');
        });
    }
}

// 渲染账户列表
async function renderAccounts() {
    try {
        const accounts = await ApiService.getAccounts();
        const currentUser = await ApiService.getCurrentUser();
        const accountsListEl = document.getElementById('accounts-list');
        
        accountsListEl.innerHTML = '';
        
        for (const account of accounts) {
            const accountEl = document.createElement('div');
            accountEl.className = 'account-item';
            accountEl.dataset.accountId = account._id;
            
            // 使用后端返回的TOTP码
            const totp = account.totp;
            
            // 解码账户名和发行者
            const decodedName = decodeURIComponent(account.name);
            const decodedIssuer = account.issuer ? decodeURIComponent(account.issuer) : '';
            
            // 根据用户角色决定显示哪些操作按钮
            let adminButtons = '';
            if (currentUser.role === 'admin') {
                adminButtons = `
                    <button class="show-qr-btn">显示二维码</button>
                    <button class="share-account-btn" data-account-id="${account._id}">共享</button>
                `;
            }
            
            // 解码备注名
            const decodedRemark = account.remark ? decodeURIComponent(account.remark) : '';
            
            // 确保备注名始终显示为文本，无论用户角色是什么
            accountEl.innerHTML = `
                <div class="account-info">
                    <h3 class="account-name">${decodedName}</h3>
                    ${decodedIssuer ? `<p class="account-issuer">${decodedIssuer}</p>` : ''}
                    <div class="account-remark">
                        <span class="remark-label">备注名:</span>
                        <span class="remark-value ${decodedRemark ? '' : 'empty-remark'}">${decodedRemark || '(无备注)'}</span>
                        <a class="edit-remark-btn" href="#" data-account-id="${account._id}">编辑备注</a>
                    </div>
                    <div class="totp-container">
                        <div class="totp-code" title="点击复制密钥">${totp}</div>
                        <div class="countdown-container">
                            <div class="countdown-bar"></div>
                            <div class="countdown-text">30秒后刷新</div>
                        </div>
                    </div>
                </div>
                <div class="account-actions">
                    ${adminButtons}
                    <button class="copy-code-btn">复制</button>
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
                const totp = account.totp;
                
                // 复制到剪贴板
                navigator.clipboard.writeText(totp).then(() => {
                    showToast('代码已复制到剪贴板', 'success');
                }).catch(err => {
                    console.error('复制失败:', err);
                    showToast('复制失败', 'error');
                });
            });
        });
        
        // 点击动态密钥框复制密钥
        document.querySelectorAll('.totp-code').forEach(codeElement => {
            codeElement.addEventListener('click', async (e) => {
                const totpCode = e.target.textContent;
                if (totpCode && totpCode !== '生成中...' && totpCode !== '生成失败') {
                    try {
                        await navigator.clipboard.writeText(totpCode);
                        showToast('动态密钥已复制到剪贴板', 'success');
                    } catch (error) {
                        console.error('复制失败:', error);
                        showToast('复制失败，请手动复制', 'error');
                    }
                }
            });
        });
        
        // 为共享按钮添加事件监听
        document.querySelectorAll('.share-account-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const accountId = e.target.dataset.accountId;
                await openShareModal(accountId);
            });
        });
        
        // 为编辑备注按钮添加事件监听
        document.querySelectorAll('.edit-remark-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); // 阻止a标签的默认导航行为
                const accountId = e.target.dataset.accountId;
                // 直接传递accountId给openEditRemarkModal函数
                openEditRemarkModal(accountId);
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
            const accountEl = document.querySelector(`[data-account-id="${account._id}"]`);
            if (accountEl) {
                const totpCodeEl = accountEl.querySelector('.totp-code');
                const countdownBarEl = accountEl.querySelector('.countdown-bar');
                const countdownTextEl = accountEl.querySelector('.countdown-text');
                
                if (totpCodeEl && countdownBarEl && countdownTextEl) {
                    if (timeRemaining === 30 || timeRemaining === 0) {
                        // 当需要刷新TOTP码时，重新从后端获取账户信息
                        const updatedAccount = await ApiService.getAccount(account._id);
                        totpCodeEl.textContent = updatedAccount.totp;
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

// 共享账户相关功能
let currentShareAccountId = null;

// 打开共享账户模态框
async function openShareModal(accountId) {
    currentShareAccountId = accountId;
    const modal = document.getElementById('share-account-modal');
    const userSelect = document.getElementById('share-user-select');
    const sharedUsersList = document.getElementById('shared-users-list');
    
    try {
        // 获取所有用户列表
        const users = await ApiService.getUsers();
        const currentUser = await ApiService.getCurrentUser();
        const account = await ApiService.getAccount(accountId);
        
        // 清空现有选项
        userSelect.innerHTML = '';
        
        // 处理已共享用户，获取完整用户信息
        let sharedUserIds = account.sharedWith || [];
        // 确保 sharedUserIds 是数组
        if (!Array.isArray(sharedUserIds)) {
            sharedUserIds = [];
        }
        // 去重用户ID
        const uniqueUserIds = [...new Set(sharedUserIds.map(id => id.toString()))];
        // 直接从users列表中查找对应的用户信息，不需要Promise.all
        const sharedUsers = uniqueUserIds
            .map(userId => {
                // 从users列表中查找对应的用户信息
                return users.find(user => (user.id || user._id).toString() === userId.toString());
            })
            .filter(Boolean); // 过滤掉未找到的用户
        
        // 添加用户选项，排除当前用户和管理员
        users.forEach(user => {
            if (user.id !== currentUser.id && user.role !== 'admin') {
                // 排除已经共享的用户
                const isAlreadyShared = sharedUserIds.includes(user.id || user._id);
                if (!isAlreadyShared) {
                    const option = document.createElement('option');
                    option.value = user.id || user._id;
                    option.textContent = `${user.username} (${user.role})`;
                    userSelect.appendChild(option);
                }
            }
        });
        
        // 显示已共享用户列表
        renderSharedUsers(sharedUsers);
        
        // 显示模态框
        modal.style.display = 'block';
    } catch (error) {
        console.error('获取用户列表失败:', error);
        showToast('获取用户列表失败: ' + error.message, 'error');
    }
}

// 渲染已共享用户列表
function renderSharedUsers(sharedUsers) {
    const sharedUsersList = document.getElementById('shared-users-list');
    
    if (sharedUsers.length === 0) {
        sharedUsersList.innerHTML = '<p style="text-align: center; color: #718096; margin: 20px 0;">暂无共享用户</p>';
        return;
    }
    
    sharedUsersList.innerHTML = sharedUsers.map(user => `
        <div class="shared-user-item">
            <div class="shared-user-info">
                <span class="shared-user-name">${user.username || user.name || '未知用户'}</span>
                <span class="shared-user-role">${user.role || 'user'}</span>
            </div>
            <button class="remove-shared-user-btn" data-user-id="${user.id || user._id}">移除</button>
        </div>
    `).join('');
    
    // 添加移除共享用户事件监听器
    document.querySelectorAll('.remove-shared-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            if (confirm('确定要取消共享该用户吗？')) {
                try {
                    await ApiService.unshareAccount(currentShareAccountId, userId);
                    showToast('取消共享成功', 'success');
                    // 重新渲染已共享用户列表
                    const account = await ApiService.getAccount(currentShareAccountId);
                    const users = await ApiService.getUsers();
                    // 处理已共享用户，获取完整用户信息
                    let sharedUserIds = account.sharedWith || [];
                    // 确保 sharedUserIds 是数组
                    if (!Array.isArray(sharedUserIds)) {
                        sharedUserIds = [];
                    }
                    // 去重用户ID
                    const uniqueUserIds = [...new Set(sharedUserIds.map(id => id.toString()))];
                    // 直接从users列表中查找对应的用户信息，不需要Promise.all
                    const updatedSharedUsers = uniqueUserIds
                        .map(id => {
                            return users.find(user => (user.id || user._id).toString() === id.toString());
                        })
                        .filter(Boolean);
                    renderSharedUsers(updatedSharedUsers);
                    
                    // 更新用户选择下拉框，重新添加已移除的用户
                    const userSelect = document.getElementById('share-user-select');
                    const currentUser = await ApiService.getCurrentUser();
                    
                    // 找到被移除的用户
                    const removedUser = users.find(u => u.id === userId || u._id === userId);
                    if (removedUser && removedUser.id !== currentUser.id && removedUser.role !== 'admin') {
                        const option = document.createElement('option');
                        option.value = removedUser.id || removedUser._id;
                        option.textContent = `${removedUser.username} (${removedUser.role})`;
                        userSelect.appendChild(option);
                    }
                } catch (error) {
                    console.error('取消共享失败:', error);
                    showToast('取消共享失败: ' + error.message, 'error');
                }
            }
        });
    });
}

// 关闭共享账户模态框
function closeShareModal() {
    const modal = document.getElementById('share-account-modal');
    modal.style.display = 'none';
    currentShareAccountId = null;
}

// 设置共享账户模态框事件
function setupShareModal() {
    const modal = document.getElementById('share-account-modal');
    if (!modal) {
        // 如果模态框不存在，创建它
        createShareModal();
        return;
    }
    
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-share-btn');
    const confirmBtn = document.getElementById('confirm-share-btn');
    
    // 关闭按钮事件
    closeBtn.addEventListener('click', closeShareModal);
    
    // 取消按钮事件
    cancelBtn.addEventListener('click', closeShareModal);
    
    // 确认共享按钮事件
    confirmBtn.addEventListener('click', async () => {
        if (!currentShareAccountId) return;
        
        const userSelect = document.getElementById('share-user-select');
        const shareUserId = userSelect.value;
        
        if (!shareUserId || shareUserId === 'undefined' || shareUserId === 'null') {
            showToast('请选择有效的用户', 'error');
            return;
        }
        
        try {
            await ApiService.shareAccount(currentShareAccountId, shareUserId);
            showToast('账户共享成功', 'success');
            
            // 刷新用户选择列表和已共享用户列表
            const account = await ApiService.getAccount(currentShareAccountId);
            const users = await ApiService.getUsers();
            const currentUser = await ApiService.getCurrentUser();
            
            // 清空并重新填充用户选择列表
            userSelect.innerHTML = '';
            users.forEach(user => {
                if (user.id !== currentUser.id && user.role !== 'admin') {
                    const isAlreadyShared = account.sharedWith && account.sharedWith.some(sharedUser => sharedUser.id === user.id || sharedUser._id === user.id);
                    if (!isAlreadyShared) {
                        const option = document.createElement('option');
                        option.value = user.id || user._id;
                        option.textContent = `${user.username} (${user.role})`;
                        userSelect.appendChild(option);
                    }
                }
            });
            
            // 重新渲染已共享用户列表
            renderSharedUsers(account.sharedWith || []);
        } catch (error) {
            console.error('共享账户失败:', error);
            showToast('共享账户失败: ' + error.message, 'error');
        }
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeShareModal();
        }
    });
}

// 创建共享账户模态框
function createShareModal() {
    const modalHTML = `
        <div id="share-account-modal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>共享账户</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="share-user-select">选择用户：</label>
                        <select id="share-user-select" class="form-control">
                            <option value="">-- 请选择用户 --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <h4>已共享用户</h4>
                        <div id="shared-users-list"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-share-btn" class="btn btn-secondary">取消</button>
                    <button id="confirm-share-btn" class="btn btn-primary">确认共享</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加模态框样式
    const style = document.createElement('style');
    style.textContent = `
        /* 模态框样式 */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 0;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            animation: modalSlideIn 0.3s ease-out;
        }
        
        /* 已共享用户列表样式 */
        .shared-user-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            margin-bottom: 8px;
            background-color: #f7fafc;
        }
        
        .shared-user-info {
            display: flex;
            gap: 10px;
        }
        
        .shared-user-name {
            font-weight: 500;
            color: #2d3748;
        }
        
        .shared-user-role {
            font-size: 12px;
            color: #718096;
            background-color: #e2e8f0;
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .remove-shared-user-btn {
            padding: 6px 12px;
            background-color: #e53e3e;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .remove-shared-user-btn:hover {
            background-color: #c53030;
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            padding: 16px 20px;
            background: #667eea;
            color: white;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
        }
        
        .close {
            color: white;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            line-height: 1;
        }
        
        .close:hover, .close:focus {
            color: #f0f0f0;
            text-decoration: none;
            cursor: pointer;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 16px 20px;
            background-color: #f8f9fa;
            border-radius: 0 0 8px 8px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #333;
        }
        
        .form-control {
            width: 100%;
            padding: 8px 12px;
            font-size: 14px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        
        .form-control:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }
    `;
    
    // 添加样式和模态框到页面
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 重新设置模态框事件
    setupShareModal();
}

// 打开修改备注名模态框
function openEditRemarkModal(accountId) {
    // 获取当前账户信息
    ApiService.getAccount(accountId)
        .then(account => {
            const modal = document.getElementById('edit-remark-modal');
            const remarkInput = document.getElementById('remark-input');
            const cancelBtn = document.getElementById('cancel-remark-btn');
            const confirmBtn = document.getElementById('confirm-remark-btn');
            
            // 填充当前备注名
            remarkInput.value = account.remark ? decodeURIComponent(account.remark) : '';
            
            // 显示模态框
            modal.style.display = 'block';
            
            // 为取消按钮添加事件监听
            cancelBtn.onclick = () => {
                modal.style.display = 'none';
            };
            
            // 为确认按钮添加事件监听
            confirmBtn.onclick = async () => {
                const remark = remarkInput.value.trim();
                
                try {
                    // 更新账户备注名
                    await ApiService.updateAccount(accountId, { remark });
                    showToast('备注名更新成功', 'success');
                    
                    // 关闭模态框
                    modal.style.display = 'none';
                    
                    // 重新渲染账户列表
                    await renderAccounts();
                } catch (error) {
                    console.error('更新备注名失败:', error);
                    showToast('更新备注名失败: ' + error.message, 'error');
                }
            };
        })
        .catch(error => {
            console.error('获取账户信息失败:', error);
            showToast('获取账户信息失败: ' + error.message, 'error');
        });
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 绑定模态框关闭事件
        bindModalCloseEvents();
        
        // 渲染账户列表
        await renderAccounts();
        
        // 设置共享账户模态框
        setupShareModal();
        
        // 设置TOTP更新定时器
        setInterval(() => {
            renderAccounts();
        }, 30000);
    } catch (error) {
        console.error('用户未登录或获取账户失败:', error);
        window.location.href = '../login/login.html';
    }
});