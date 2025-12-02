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

// 获取剩余倒计时时间（秒）
// 这个函数现在主要用于页面上的倒计时更新，后端会返回初始剩余时间
function getRemainingTime(period = 30) {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
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

// 退出登录
async function logout() {
    try {
        await ApiService.logout();
        window.location.href = 'login/login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
        showToast('退出登录失败: ' + error.message, 'error');
    }
}

// Tab切换逻辑
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新内容显示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tab) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// 绑定点击复制TOTP码事件
function bindCopyTotpEvents() {
    const totpCodes = document.querySelectorAll('.totp-code');
    totpCodes.forEach(codeElement => {
        codeElement.addEventListener('click', async () => {
            const totpCode = codeElement.textContent;
            if (totpCode && totpCode !== '生成中...' && totpCode !== '生成失败') {
                try {
                    await navigator.clipboard.writeText(totpCode);
                    // 显示复制成功提示
                    showToast('动态密钥已复制到剪贴板', 'success');
                } catch (error) {
                    console.error('复制失败:', error);
                    showToast('复制失败，请手动复制', 'error');
                }
            }
        });
    });
}

// 渲染账户列表
async function renderAccounts() {
    try {
        console.log('renderAccounts函数被调用');
        const accounts = await ApiService.getAccounts();
        console.log('获取到的账户列表:', accounts);
        const currentUser = await ApiService.getCurrentUser();
        console.log('当前用户:', currentUser);
        const accountsList = document.getElementById('accounts-list');
        console.log('accountsList元素:', accountsList);
        
        if (accounts.length === 0) {
            accountsList.innerHTML = '<p class="no-accounts">暂无账户，请先添加账户</p>';
            return;
        }
        
        let html = '';
        for (const account of accounts) {
            // 解码账户名，确保显示原始字符串
            const decodedName = decodeURIComponent(account.name);
            const decodedIssuer = account.issuer ? decodeURIComponent(account.issuer) : '无发行者';
            
            // 根据用户角色决定显示哪些操作按钮
            let actionButtons = '';
            if (currentUser.role === 'admin') {
                actionButtons = `
                    <div class="account-actions">
                        <button class="btn btn-secondary show-qr-btn" data-account-id="${account._id}">显示二维码</button>
                        <button class="btn btn-secondary share-account-btn" data-account-id="${account._id}">共享</button>
                        <button class="btn btn-danger delete-account-btn" data-account-id="${account._id}">删除</button>
                    </div>
                `;
            } else {
                // 普通用户不显示操作按钮组，编辑备注按钮已移到备注名后面
                actionButtons = '';
            }
            
            // 显示备注名
            const decodedRemark = account.remark ? decodeURIComponent(account.remark) : '(无备注)';
            const remarkClass = account.remark ? '' : 'empty-remark';
            
            html += `
                <div class="account-item" data-account-id="${account._id}">
                    <div class="account-info">
                        <h3>${decodedName}</h3>
                        <p>${decodedIssuer}</p>
                        <div class="account-remark">
                            <span class="remark-label">备注名:</span>
                            <span class="remark-value ${remarkClass}">${decodedRemark}</span>
                            <button class="btn btn-secondary edit-remark-btn" data-account-id="${account._id}">编辑备注</button>
                        </div>
                    </div>
                    <div class="totp-container">
                        <div class="totp-code" id="totp-${account._id}" title="点击复制密钥">生成中...</div>
                        <div class="countdown-container">
                            <div class="countdown-bar" id="countdown-${account.id || account._id}"></div>
                            <div class="countdown-text" id="countdown-text-${account.id || account._id}"></div>
                        </div>
                    </div>
                    ${actionButtons}
                </div>
            `;
        }
        
        accountsList.innerHTML = html;
        
        // 绑定事件
        bindAccountActions();
        
        // 绑定点击复制TOTP码事件
        bindCopyTotpEvents();
        
        // 更新所有账户的TOTP码
        updateAllTOTPs();
        
        // 每秒更新一次
        setInterval(updateAllTOTPs, 1000);
        
    } catch (error) {
        console.error('渲染账户列表失败:', error);
        showToast('获取账户列表失败: ' + error.message, 'error');
        // 确保账户列表区域显示错误信息
        accountsList.innerHTML = '<p class="error-message">获取账户列表失败，请刷新页面重试</p>';
        // 添加更好的错误处理
        if (error.message.includes('令牌') || error.message.includes('授权')) {
            // 令牌无效或授权失败，清除令牌并重定向到登录页面
            ApiService.logout();
            window.location.href = 'login.html';
        }
    }
}

// 更新所有账户的TOTP码
async function updateAllTOTPs() {
    try {
        const accounts = await ApiService.getAccounts();
        
        for (const account of accounts) {
            await updateTOTP(account);
        }
    } catch (error) {
        console.error('更新TOTP码失败:', error);
        // 只在控制台记录错误，不影响页面显示
    }
}

// 更新单个账户的TOTP码
async function updateTOTP(account) {
    try {
        // 使用后端返回的TOTP码，如果没有则重新获取
        let totp = account.totp;
        
        // 如果账户没有totp字段，或者需要重新获取（如倒计时结束），则重新请求
        if (!totp) {
            const updatedAccount = await ApiService.getAccount(account.id);
            totp = updatedAccount.totp;
        }
        
        // 获取剩余时间
        const timeLeft = getRemainingTime();
        
        // 更新DOM
        const totpElement = document.getElementById(`totp-${account.id || account._id}`);
        const countdownElement = document.getElementById(`countdown-${account.id || account._id}`);
        const countdownTextElement = document.getElementById(`countdown-text-${account.id || account._id}`);
        
        if (totpElement) {
            totpElement.textContent = totp;
        }
        
        if (countdownElement) {
            countdownElement.style.width = `${(timeLeft / 30) * 100}%`;
        }
        
        if (countdownTextElement) {
            countdownTextElement.textContent = `${timeLeft}s`;
        }
        
    } catch (error) {
        console.error(`更新账户 ${account.id} 的TOTP码失败:`, error);
        
        // 更新DOM显示错误
        const totpElement = document.getElementById(`totp-${account.id}`);
        if (totpElement) {
            totpElement.textContent = '生成失败';
        }
    }
}

// 打开修改备注名模态框
function openEditRemarkModal(accountId) {
    // 获取当前账户信息
    ApiService.getAccount(accountId)
        .then(account => {
            // 填充当前备注名
            const remarkInput = document.getElementById('remark-input');
            remarkInput.value = account.remark ? decodeURIComponent(account.remark) : '';
            
            // 显示模态框
            const modal = document.getElementById('edit-remark-modal');
            modal.style.display = 'block';
            
            let currentAccountId = accountId;
            
            // 取消按钮事件
            document.getElementById('cancel-remark-btn').onclick = () => {
                modal.style.display = 'none';
            };
            
            // 确认按钮事件
            document.getElementById('confirm-remark-btn').onclick = () => {
                const remark = remarkInput.value;
                
                // 调用API更新备注名
                ApiService.updateAccount(currentAccountId, { remark })
                    .then(() => {
                        // 关闭模态框
                        modal.style.display = 'none';
                        // 重新渲染账户列表
                        renderAccounts();
                        showToast('备注名更新成功', 'success');
                    })
                    .catch(error => {
                        console.error('更新备注名失败:', error);
                        showToast('更新备注名失败: ' + error.message, 'error');
                    });
            };
        })
        .catch(error => {
            console.error('获取账户信息失败:', error);
            showToast('获取账户信息失败: ' + error.message, 'error');
        });
}

// 绑定账户操作事件
function bindAccountActions() {
    console.log('bindAccountActions函数被调用');
    
    // 显示二维码按钮
    const showQrBtns = document.querySelectorAll('.show-qr-btn');
    console.log('找到的显示二维码按钮数量:', showQrBtns.length);
    
    showQrBtns.forEach(btn => {
        console.log('为按钮添加点击事件监听器:', btn);
        btn.addEventListener('click', async (e) => {
            console.log('显示二维码按钮被点击');
            // 同时支持data-account-id和data-id属性
            const accountId = e.target.dataset.accountId || e.target.dataset.id;
            
            if (!accountId) {
                console.error('获取账户ID失败');
                showToast('获取账户ID失败', 'error');
                return;
            }
            try {
                console.log('正在获取账户详情...');
                const account = await ApiService.getAccount(accountId);
                console.log('获取账户详情成功:', account);
                console.log('调用window.showAccountQRCode函数...');
                window.showAccountQRCode(account);
            } catch (error) {
                console.error('获取账户详情失败:', error);
                showToast('获取账户详情失败: ' + error.message, 'error');
            }
        });
    });
    
    // 编辑备注按钮
    const editRemarkBtns = document.querySelectorAll('.edit-remark-btn');
    editRemarkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const accountId = e.target.dataset.accountId;
            openEditRemarkModal(accountId);
        });
    });
    
    // 共享账户按钮
    const shareBtns = document.querySelectorAll('.share-account-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const accountId = e.target.dataset.accountId;
            await openShareModal(accountId);
        });
    });
    
    // 删除账户按钮
    const deleteBtns = document.querySelectorAll('.delete-account-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const accountId = e.target.dataset.accountId;
            if (confirm('确定要删除这个账户吗？')) {
                try {
                    await ApiService.deleteAccount(accountId);
                    showToast('账户删除成功', 'success');
                    await renderAccounts();
                } catch (error) {
                    console.error('删除账户失败:', error);
                    showToast('删除账户失败: ' + error.message, 'error');
                }
            }
        });
    });
}

// 共享账户模态框相关变量
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
        
        // 验证shareUserId是否有效
        if (!shareUserId || shareUserId === 'undefined' || shareUserId === 'null') {
            showToast('请选择有效的用户', 'error');
            return;
        }
        
        try {
            await ApiService.shareAccount(currentShareAccountId, shareUserId);
            showToast('账户共享成功', 'success');
            closeShareModal();
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

// 设置显示二维码模态框事件
function setupShowQRModal() {
    const modal = document.getElementById('show-qr-modal');
    const closeBtn = modal.querySelector('.close');
    
    // 关闭按钮事件
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 生成随机密钥
function generateRandomKey(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
}

// 获取单个账户详情
async function getAccount(accountId) {
    try {
        const data = await ApiService.request(`/accounts/${accountId}`, 'GET');
        return data;
    } catch (error) {
        console.error('获取账户详情失败:', error);
        throw error;
    }
}

// 解析OTP URI
function parseOTPURI(uri) {
    try {
        // 简单的OTP URI解析逻辑
        const url = new URL(uri);
        const pathname = url.pathname.slice(1);
        const [type, label] = pathname.split('/');
        
        const params = new URLSearchParams(url.search);
        
        return {
            type,
            name: decodeURIComponent(label || ''),
            secret: params.get('secret') || '',
            issuer: params.get('issuer') || '',
            algorithm: params.get('algorithm') || 'SHA1',
            digits: parseInt(params.get('digits') || '6'),
            period: parseInt(params.get('period') || '30')
        };
    } catch (error) {
        console.error('解析OTP URI失败:', error);
        throw new Error('无效的OTP URI格式');
    }
}

// 设置添加账户功能
function setupAddAccount() {
    // 生成随机密钥按钮
    const generateSecretBtn = document.getElementById('generate-secret');
    const secretInput = document.getElementById('account-secret');
    
    if (generateSecretBtn && secretInput) {
        generateSecretBtn.addEventListener('click', () => {
            secretInput.value = generateRandomKey(32);
        });
    }
    
    // 添加账户表单
    const addAccountForm = document.getElementById('add-account-form');
    if (addAccountForm) {
        addAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const accountName = document.getElementById('account-name').value;
            const secret = document.getElementById('account-secret').value;
            const issuer = document.getElementById('account-issuer').value;
            
            try {
                await ApiService.addAccount(accountName, secret, issuer);
                showToast('账户添加成功', 'success');
                addAccountForm.reset();
                renderAccounts();
            } catch (error) {
                console.error('添加账户失败:', error);
                showToast('添加账户失败: ' + error.message, 'error');
            }
        });
    }
    
    // 扫描二维码按钮
        const scanQrBtn = document.getElementById('scan-qr-btn');
        const qrScanModal = document.getElementById('qr-scan-modal');
        const scanCloseBtn = qrScanModal.querySelector('.close');
        const scanTabBtns = qrScanModal.querySelectorAll('.tab-btn');
        const scanTabContents = qrScanModal.querySelectorAll('.scan-tab-content');
        const startScanBtn = document.getElementById('start-scan');
        const stopScanBtn = document.getElementById('stop-scan');
        const scanPreview = document.getElementById('scan-preview');
        
        // 图片扫描相关元素
        const imageDropZone = document.getElementById('image-drop-zone');
        const imagePreview = document.getElementById('image-preview');
        const imageInput = document.getElementById('image-input');
        const selectImageBtn = document.getElementById('select-image-btn');
        const decodeImageBtn = document.getElementById('decode-image');
        const resetImageBtn = document.getElementById('reset-image');
        
        let stream = null;
        let qrScanner = null;
        let selectedImageFile = null;
        
        // 显示扫描二维码模态框
        if (scanQrBtn) {
            scanQrBtn.addEventListener('click', () => {
                qrScanModal.style.display = 'block';
            });
        }
        
        // 关闭扫描二维码模态框
        if (scanCloseBtn) {
            scanCloseBtn.addEventListener('click', () => {
                qrScanModal.style.display = 'none';
                stopScan(); // 停止扫描
                resetImageScan(); // 重置图片扫描
            });
        }
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === qrScanModal) {
                qrScanModal.style.display = 'none';
                stopScan(); // 停止扫描
                resetImageScan(); // 重置图片扫描
            }
        });
        
        // 切换扫描标签
        scanTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.scanTab;
                
                // 移除所有激活状态
                scanTabBtns.forEach(b => b.classList.remove('active'));
                scanTabContents.forEach(content => content.classList.remove('active'));
                
                // 激活当前标签
                btn.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
                
                // 如果切换到摄像头，停止当前扫描
                if (targetTab === 'camera') {
                    stopScan();
                }
            });
        });
        
        // 开始扫描
        if (startScanBtn) {
            startScanBtn.addEventListener('click', async () => {
                try {
                    // 获取摄像头权限
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    scanPreview.srcObject = stream;
                    scanPreview.play();
                    
                    startScanBtn.disabled = true;
                    stopScanBtn.disabled = false;
                    
                    // 开始解析二维码
                    startQRScanner();
                } catch (error) {
                    console.error('获取摄像头权限失败:', error);
                    showToast('获取摄像头权限失败，请检查设备设置', 'error');
                }
            });
        }
        
        // 停止扫描
        if (stopScanBtn) {
            stopScanBtn.addEventListener('click', stopScan);
        }
        
        // 图片扫描 - 选择图片按钮点击事件
        if (selectImageBtn && imageInput) {
            selectImageBtn.addEventListener('click', () => {
                imageInput.click();
            });
        }
        
        // 图片扫描 - 文件选择事件
        if (imageInput) {
            imageInput.addEventListener('change', async (e) => {
                selectedImageFile = e.target.files[0];
                if (!selectedImageFile) return;
                
                // 显示图片预览
                const image = await loadImage(selectedImageFile);
                imagePreview.innerHTML = '';
                imagePreview.appendChild(image);
                imagePreview.style.display = 'block';
                
                // 隐藏占位符
                const imagePlaceholder = imageDropZone.querySelector('.image-placeholder');
                if (imagePlaceholder) {
                    imagePlaceholder.style.display = 'none';
                }
            });
        }
        
        // 图片扫描 - 解析图片按钮点击事件
        if (decodeImageBtn) {
            decodeImageBtn.addEventListener('click', async () => {
                if (!selectedImageFile) {
                    showToast('请先选择图片', 'warning');
                    return;
                }
                
                try {
                    const image = await loadImage(selectedImageFile);
                    
                    // 解析二维码
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    // 使用jsQR库解析二维码
                    if (window.jsQR) {
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        if (code) {
                            handleQRCodeResult(code.data);
                            showToast('二维码扫描成功', 'success');
                        } else {
                            showToast('未检测到二维码', 'warning');
                        }
                    } else {
                        showToast('二维码解析库未加载', 'error');
                    }
                } catch (error) {
                    console.error('图片扫描失败:', error);
                    showToast('图片扫描失败', 'error');
                }
            });
        }
        
        // 图片扫描 - 重置按钮点击事件
        if (resetImageBtn) {
            resetImageBtn.addEventListener('click', () => {
                resetImageScan();
            });
        }
        
        // 图片扫描 - 拖放功能
        if (imageDropZone) {
            imageDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                imageDropZone.classList.add('highlight');
            });
            
            imageDropZone.addEventListener('dragleave', () => {
                imageDropZone.classList.remove('highlight');
            });
            
            imageDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                imageDropZone.classList.remove('highlight');
                
                selectedImageFile = e.dataTransfer.files[0];
                if (selectedImageFile && selectedImageFile.type.startsWith('image/')) {
                    // 显示图片预览
                    loadImage(selectedImageFile).then(image => {
                        imagePreview.innerHTML = '';
                        imagePreview.appendChild(image);
                        imagePreview.style.display = 'block';
                        
                        // 隐藏占位符
                        const imagePlaceholder = imageDropZone.querySelector('.image-placeholder');
                        if (imagePlaceholder) {
                            imagePlaceholder.style.display = 'none';
                        }
                    });
                } else {
                    showToast('请选择图片文件', 'warning');
                }
            });
        }
        
        // 辅助函数：加载图片
        function loadImage(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        // 辅助函数：开始QR扫描
        function startQRScanner() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            function tick() {
                if (scanPreview.readyState === scanPreview.HAVE_ENOUGH_DATA) {
                    canvas.width = scanPreview.videoWidth;
                    canvas.height = scanPreview.videoHeight;
                    ctx.drawImage(scanPreview, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    if (window.jsQR) {
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        if (code) {
                            handleQRCodeResult(code.data);
                            stopScan();
                            showToast('二维码扫描成功', 'success');
                            return;
                        }
                    }
                }
                qrScanner = requestAnimationFrame(tick);
            }
            tick();
        }
        
        // 辅助函数：停止扫描
        function stopScan() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            if (qrScanner) {
                cancelAnimationFrame(qrScanner);
                qrScanner = null;
            }
            scanPreview.srcObject = null;
            startScanBtn.disabled = false;
            stopScanBtn.disabled = true;
        }
        
        // 辅助函数：重置图片扫描
        function resetImageScan() {
            selectedImageFile = null;
            imagePreview.innerHTML = '';
            imagePreview.style.display = 'none';
            imageInput.value = '';
            
            // 显示占位符
            const imagePlaceholder = imageDropZone.querySelector('.image-placeholder');
            if (imagePlaceholder) {
                imagePlaceholder.style.display = 'block';
            }
        }
        
        // 辅助函数：处理二维码结果
        function handleQRCodeResult(data) {
            try {
                // 解析OTP URI
                const url = new URL(data);
                const params = url.searchParams;
                
                // 填充表单
                document.getElementById('account-name').value = url.pathname.substring(1) || '';
                document.getElementById('account-issuer').value = params.get('issuer') || '';
                document.getElementById('account-secret').value = params.get('secret') || '';
                document.getElementById('account-algorithm').value = params.get('algorithm') || 'SHA1';
                document.getElementById('account-digits').value = params.get('digits') || '6';
                document.getElementById('account-period').value = params.get('period') || '30';
                
                // 解析成功后自动关闭模态框
                qrScanModal.style.display = 'none';
                stopScan(); // 停止扫描
                resetImageScan(); // 重置图片扫描
            } catch (error) {
                console.error('解析二维码结果失败:', error);
                showToast('无效的二维码格式', 'error');
            }
        }
}

// 设置用户管理功能
async function setupUserManagement() {
    try {
        const currentUser = await ApiService.getCurrentUser();
        const userManagementTab = document.querySelector('.tab-btn[data-tab="user-management"]');
        const userManagementContent = document.getElementById('user-management');
        
        // 只有管理员可以看到用户管理功能
        if (currentUser.role !== 'admin') {
            if (userManagementTab) {
                userManagementTab.style.display = 'none';
            }
            if (userManagementContent) {
                userManagementContent.style.display = 'none';
            }
            return;
        }
        
        // 渲染用户列表
        await renderUsers();
        
        // 添加用户表单
        const addUserForm = document.getElementById('add-user-form');
        if (addUserForm) {
            addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('new-username').value;
                const password = document.getElementById('new-password').value;
                const role = document.getElementById('user-role').value;
                
                try {
                    await ApiService.addUser(username, password, role);
                    showToast('用户添加成功', 'success');
                    addUserForm.reset();
                    await renderUsers();
                } catch (error) {
                    console.error('添加用户失败:', error);
                    showToast('添加用户失败: ' + error.message, 'error');
                }
            });
        }
    } catch (error) {
        console.error('设置用户管理功能失败:', error);
    }
}

// 渲染用户列表
async function renderUsers() {
    try {
        const users = await ApiService.getUsers();
        const usersList = document.getElementById('users-list');
        
        let html = '<h3>用户列表</h3>';
        html += '<ul class="users-list">';
        for (const user of users) {
            html += `
                <li class="user-item">
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        <span class="user-role">${user.role === 'admin' ? '管理员' : '普通用户'}</span>
                    </div>
                    <button class="btn btn-danger delete-user-btn" data-user-id="${user.id}">删除</button>
                </li>
            `;
        }
        html += '</ul>';
        
        usersList.innerHTML = html;
        
        // 绑定删除用户事件
        const deleteUserBtns = document.querySelectorAll('.delete-user-btn');
        deleteUserBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userId;
                if (confirm('确定要删除这个用户吗？')) {
                    try {
                        await ApiService.deleteUser(userId);
                        showToast('用户删除成功', 'success');
                        await renderUsers();
                    } catch (error) {
                        console.error('删除用户失败:', error);
                        showToast('删除用户失败: ' + error.message, 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('渲染用户列表失败:', error);
        showToast('获取用户列表失败: ' + error.message, 'error');
    }
}

// 生成OTP URI函数
window.generateOTPURI = function generateOTPURI(account, secret, issuer = '') {
    // 账户名不需要转义，直接使用原始字符串
    return `otpauth://totp/${issuer ? issuer + ':' : ''}${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
}

// 显示账户二维码函数
// 显示账户二维码函数
window.showAccountQRCode = async function showAccountQRCode(account) {
    console.log('showAccountQRCode函数被调用，账户信息:', account);
    
    // 使用简单直接的方式创建一个新的弹窗，不依赖现有的模态框结构
    console.log('创建新的弹窗来显示二维码...');
    
    // 移除现有的弹窗（如果存在）
    const existingPopup = document.getElementById('simple-qr-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // 创建弹窗容器
    const popup = document.createElement('div');
    popup.id = 'simple-qr-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: auto;
    `;
    
    // 创建弹窗内容
    const popupContent = document.createElement('div');
    popupContent.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 500px;
        width: 90%;
        text-align: center;
        position: relative;
    `;
    
    // 创建标题
    const title = document.createElement('h3');
    title.textContent = '账户二维码';
    title.style.cssText = `
        margin-top: 0;
        margin-bottom: 20px;
    `;
    popupContent.appendChild(title);
    
    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
        line-height: 1;
        padding: 0;
    `;
    closeBtn.onclick = function() {
        popup.remove();
    };
    popupContent.appendChild(closeBtn);
    
    // 创建加载状态
    const loading = document.createElement('div');
    loading.textContent = '正在获取账户密钥...';
    loading.style.cssText = `
        margin: 40px 0;
        font-size: 16px;
        color: #666;
    `;
    popupContent.appendChild(loading);
    
    // 添加到弹窗容器
    popup.appendChild(popupContent);
    
    // 添加到页面
    document.body.appendChild(popup);
    
    try {
        // 获取账户密钥
        console.log('获取账户密钥...');
        const accountWithSecret = await ApiService.getAccountSecret(account.id);
        console.log('获取到的账户密钥:', accountWithSecret);
        
        // 移除加载状态
        loading.remove();
        
        // 生成OTP URI
        console.log('生成OTP URI...');
        const uri = window.generateOTPURI(accountWithSecret.name, accountWithSecret.secret, accountWithSecret.issuer);
        console.log('生成的OTP URI:', uri);
        
        // 创建二维码容器
        const qrContainer = document.createElement('div');
        qrContainer.style.cssText = `
            margin: 0 auto;
            width: 220px;
            height: 220px;
            background-color: white;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // 使用qrcodejs生成二维码
        const qrElement = document.createElement('div');
        qrElement.id = 'qrcode';
        // 不需要额外的样式，QRCode库会自动设置尺寸
        qrContainer.appendChild(qrElement);
        
        // 生成二维码
        new QRCode(qrElement, {
            text: uri,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        popupContent.appendChild(qrContainer);
        
        // 添加OTP URI显示区域
        const uriDisplay = document.createElement('div');
        uriDisplay.innerHTML = `
            <div style="margin-top: 15px; margin-bottom: 10px; font-weight: bold;">OTP URI:</div>
            <textarea style="width: 100%; height: 80px; font-family: monospace; font-size: 12px; resize: vertical; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${uri}</textarea>
            <div style="margin-top: 10px; font-size: 14px; color: #666;">请复制此URI到您的认证器应用中</div>
        `;
        popupContent.appendChild(uriDisplay);
    } catch (error) {
        console.error('生成二维码时出错:', error);
        loading.textContent = '获取账户密钥失败，请重试';
        loading.style.color = 'red';
    }
    
    // 添加点击外部关闭功能
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            popup.remove();
        }
    });
    
    // 显示成功信息
    console.log('简单弹窗已创建并显示');
    console.log('弹窗元素:', popup);
    
    // 添加一个明显的提示
    console.log('二维码弹窗已显示，请查看页面中央的白色弹窗');
};

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded事件被触发');
        // 检查用户是否已登录
        const currentUser = await ApiService.getCurrentUser();
        console.log('获取到的当前用户:', currentUser);
        
        // 更新当前用户显示
        const currentUserEl = document.getElementById('current-user');
        console.log('currentUserEl元素:', currentUserEl);
        if (currentUserEl) {
            currentUserEl.textContent = `当前用户: ${currentUser.username}`;
        }
        
        // 绑定退出登录事件
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // 显示主页面
        const appPageEl = document.getElementById('app-page');
        if (appPageEl) {
            appPageEl.style.display = 'block';
        }
        
        // 设置Tab导航
        setupTabNavigation();
        
        // 设置模态框事件
        setupShareModal();
        setupShowQRModal();
        
        // 初始化各个模块
        await renderAccounts();
        
        // 只有管理员可以看到添加账户功能
        if (currentUser.role === 'admin') {
            // 显示添加账户Tab按钮
            const addAccountTabBtn = document.querySelector('.tab-btn[data-tab="add-account"]');
            if (addAccountTabBtn) {
                addAccountTabBtn.style.display = 'inline-block';
            }
            // 初始化添加账户功能
            setupAddAccount();
        } else {
            // 隐藏添加账户Tab按钮
            const addAccountTabBtn = document.querySelector('.tab-btn[data-tab="add-account"]');
            if (addAccountTabBtn) {
                addAccountTabBtn.style.display = 'none';
            }
            
            // 隐藏添加账户Tab内容
            const addAccountTabContent = document.getElementById('add-account');
            if (addAccountTabContent) {
                addAccountTabContent.style.display = 'none';
            }
        }
        
        await setupUserManagement();
        
    } catch (error) {
        console.error('初始化失败:', error);
        // 未登录或其他错误，跳转到登录页面
        window.location.href = 'login/login.html';
    }
});