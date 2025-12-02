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

// 生成随机密钥
function generateRandomKey(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

// 生成OTP URI
function generateOTPURI(account, secret, issuer = '') {
    const encodedAccount = encodeURIComponent(account);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer ? encodedIssuer + ':' : ''}${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&digits=6&period=30`;
}

// 解析OTP URI
function parseOTPURI(uri) {
    console.log('开始解析OTP URI:', uri);
    
    // 确保URI是otpauth协议
    if (!uri.startsWith('otpauth://')) {
        throw new Error('无效的OTP URI协议');
    }
    
    const url = new URL(uri);
    const path = url.pathname.substring(1);
    let issuer = '';
    let name = '';
    
    // 获取查询参数中的issuer
    const queryIssuer = url.searchParams.get('issuer') || '';
    
    // 处理路径，支持不同格式
    if (path.includes(':')) {
        const parts = path.split(':');
        issuer = parts[0] || '';
        name = parts.slice(1).join(':') || ''; // 处理名称中包含冒号的情况
    } else {
        // 如果没有冒号，整个路径作为名称
        name = path;
    }
    
    // 如果查询参数中有issuer，优先使用查询参数中的issuer
    if (queryIssuer) {
        issuer = queryIssuer;
    }
    
    // 获取secret，确保不为空
    const secret = url.searchParams.get('secret') || '';
    
    // 确保secret不为空
    if (!secret) {
        throw new Error('二维码中缺少必要的secret参数');
    }
    
    // 确保name不为空
    const finalName = decodeURIComponent(name || issuer || '未命名账户');
    const finalIssuer = decodeURIComponent(issuer);
    
    console.log('解析结果:', {
        name: finalName,
        issuer: finalIssuer,
        secret: secret
    });
    
    return {
        name: finalName,
        issuer: finalIssuer,
        secret: secret
    };
}

// 页面加载完成后执行（仅在浏览器环境中）
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
    // 用户认证相关变量
    let currentUser = null;
    let accounts = [];
    let currentSecret = '';
    let scanner = null;
    let stream = null;
    
    // DOM元素
    // 登录相关
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-message');
    const loginPage = document.getElementById('login-page');
    const appPage = document.getElementById('app-page');
    
    // 应用相关
    const userInfo = document.getElementById('current-user');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('user-settings-btn');
    const accountNameInput = document.getElementById('account-name');
    const secretKeyInput = document.getElementById('account-secret');
    const issuerInput = document.getElementById('account-issuer');
    const generateKeyBtn = document.getElementById('generate-secret');
    const addAccountBtn = document.getElementById('add-account-form');
    const qrcodeEl = document.getElementById('qrcode-container');
    const accountsListEl = document.getElementById('accounts-list');
    
    // 二维码显示模态框相关
    const showQrModal = document.getElementById('show-qr-modal');
    const closeShowQrModalBtn = document.getElementById('close-show-qr-modal');
    const showQrContainer = document.getElementById('show-qr-container');
    
    // 功能区域相关
    const addAccountSection = document.getElementById('add-account-section');
    const qrcodeSection = document.getElementById('qrcode-section');
    
    // 用户管理相关（管理员专属）
    const userManagementSection = document.getElementById('user-management');
    const addUserForm = document.getElementById('add-user-form');
    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const userRoleSelect = document.getElementById('user-role');
    const addUserBtn = document.getElementById('add-user');
    const usersListEl = document.getElementById('users-list');
    
    // 用户设置相关
    const settingsModal = document.getElementById('user-settings-modal');
    const closeSettingsBtn = settingsModal ? settingsModal.querySelector('.close') : null;
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput2 = document.getElementById('new-password-setting');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordMessage = document.getElementById('password-message');
    
    // 二维码扫描相关元素
    const scanModal = document.getElementById('qr-scan-modal');
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const closeBtn = scanModal ? scanModal.querySelector('.close') : null;
    const video = scanModal ? document.getElementById('scan-preview') : null;
    const startScanBtn = document.getElementById('start-scan');
    const stopScanBtn = document.getElementById('stop-scan');
    
    // 图片扫描相关元素
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const scanImageInput = document.getElementById('image-input');
    const scanSelectImageBtn = document.getElementById('select-image-btn');
    const scanAnalyzeImageBtn = document.getElementById('decode-image');
    const scanResetImageBtn = document.getElementById('reset-image');
    const scanImagePreview = document.getElementById('image-preview');
    const scanImagePreviewContainer = document.getElementById('image-drop-zone');
    
    // 登录功能
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            try {
                await login(username, password);
            } catch (error) {
                loginError.textContent = error.message;
            }
        });
    }
    
    // 登录函数
    async function login(username, password) {
        try {
            const user = await ApiService.login(username, password);
            currentUser = user;
            showAppPage();
        } catch (error) {
            throw new Error('登录失败: ' + error.message);
        }
    }
    
    // 显示应用页面
    function showAppPage() {
        loginPage.style.display = 'none';
        appPage.style.display = 'block';
        userInfo.textContent = currentUser.username;
        
        // 根据用户角色控制tab显示
        const tabBtns = document.querySelectorAll('.tab-btn');
        const isAdmin = currentUser.role === 'admin';
        
        tabBtns.forEach(btn => {
            const tabName = btn.dataset.tab;
            if (tabName === 'my-accounts') {
                // 所有用户都能看到"我的账户"tab
                btn.style.display = 'block';
            } else if (isAdmin) {
                // 管理员可以看到所有tab
                btn.style.display = 'block';
            } else {
                // 普通用户只能看到"我的账户"tab
                btn.style.display = 'none';
                // 确保隐藏对应的tab内容
                const tabContent = document.getElementById(tabName);
                if (tabContent) {
                    tabContent.style.display = 'none';
                }
            }
        });
        
        // 初始化应用
        initApp();
    }
    
    // 显示登录页面
    function showLoginPage() {
        appPage.style.display = 'none';
        loginPage.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
        loginError.textContent = '';
        currentUser = null;
        accounts = [];
    }
    
    // 检查用户状态
    async function checkUserStatus() {
        try {
            // 使用ApiService.getCurrentUser()替代不存在的checkUserStatus方法
            const user = await ApiService.getCurrentUser();
            currentUser = user;
            showAppPage();
        } catch (error) {
            // 如果getCurrentUser失败，尝试使用verifyToken
            try {
                const user = await ApiService.verifyToken();
                currentUser = user;
                showAppPage();
            } catch (verifyError) {
                showLoginPage();
            }
        }
    }
    
    // 退出登录
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await ApiService.logout();
            showLoginPage();
        });
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
    
    // 设置按钮点击事件
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'block';
            }
        });
    }
    
    // 关闭设置模态框
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (settingsModal && e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (showQrModal && e.target === showQrModal) {
            showQrModal.style.display = 'none';
        }
    });
    
    // 显示账户二维码
    function showAccountQRCode(account) {
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
    
    // 关闭二维码显示模态框
    // 为二维码弹框的关闭按钮添加事件监听器
    const qrModalCloseBtn = showQrModal ? showQrModal.querySelector('.close') : null;
    if (qrModalCloseBtn) {
        qrModalCloseBtn.addEventListener('click', () => {
            if (showQrModal) {
                showQrModal.style.display = 'none';
            }
        });
    }
    
    // 点击二维码弹框外部关闭
    window.addEventListener('click', (e) => {
        if (showQrModal && e.target === showQrModal) {
            showQrModal.style.display = 'none';
        }
    });
    
    // 修改密码表单提交
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput2.value;
            const confirmPassword = confirmPasswordInput.value;
            
            if (newPassword !== confirmPassword) {
                passwordMessage.textContent = '新密码和确认密码不一致';
                return;
            }
            
            try {
                await ApiService.changePassword(currentPassword, newPassword);
                passwordMessage.textContent = '密码修改成功';
                passwordMessage.style.color = 'green';
                
                // 清空表单
                currentPasswordInput.value = '';
                newPasswordInput2.value = '';
                confirmPasswordInput.value = '';
                
                // 关闭模态框
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                }
            } catch (error) {
                passwordMessage.textContent = '密码修改失败: ' + error.message;
                passwordMessage.style.color = 'red';
            }
        });
    }
    
    // 添加用户表单提交
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = newUsernameInput.value.trim();
            const password = newPasswordInput.value;
            const role = userRoleSelect.value;
            
            try {
                await ApiService.addUser(username, password, role);
                newUsernameInput.value = '';
                newPasswordInput.value = '';
                renderUsers();
            } catch (error) {
                console.error('添加用户失败:', error);
            }
        });
    }
    
    // 渲染用户列表
    async function renderUsers() {
        try {
            const users = await ApiService.getUsers();
            const currentUser = await ApiService.getCurrentUser();
            usersListEl.innerHTML = '';
            
            users.forEach(user => {
                const userEl = document.createElement('div');
                userEl.className = 'user-item';
                
                // 生成删除按钮，当前用户不能删除自己
                const deleteBtn = user.id !== currentUser.id ? 
                    `<button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}">删除</button>` : '';
                
                userEl.innerHTML = `
                    <div class="user-info">
                        <span>${user.username} (${user.role})</span>
                        ${user.id === currentUser.id ? '<span class="current-user-badge">（当前用户）</span>' : ''}
                    </div>
                    <div class="user-actions">
                        ${deleteBtn}
                    </div>
                `;
                usersListEl.appendChild(userEl);
            });
            
            // 添加删除按钮事件监听
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteUser);
            });
        } catch (error) {
            console.error('获取用户列表失败:', error);
        }
    }
    
    // 处理删除用户
    async function handleDeleteUser(e) {
        e.preventDefault();
        const userId = e.target.dataset.userId;
        const userEl = e.target.closest('.user-item');
        const username = userEl.querySelector('.user-info span').textContent.split(' (')[0];
        
        // 确认删除
        if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复。`)) {
            return;
        }
        
        try {
            await ApiService.deleteUser(userId);
            // 重新渲染用户列表
            renderUsers();
            showToast('用户删除成功！', 'success');
        } catch (error) {
            console.error('删除用户失败:', error);
            showToast('删除用户失败，请重试。', 'error');
        }
    }
    
    // 扫描二维码按钮点击事件
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', () => {
            if (scanModal) {
                scanModal.style.display = 'block';
            }
        });
    }
    
    // 关闭扫描模态框
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (scanModal) {
                scanModal.style.display = 'none';
            }
            stopScan();
            resetImageScan();
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (scanModal && e.target === scanModal) {
            scanModal.style.display = 'none';
            stopScan();
            resetImageScan();
        }
    });
    
    // 标签页切换
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // 移除所有按钮的active类
            tabBtns.forEach(b => b.classList.remove('active'));
            // 移除所有内容的active类
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加当前按钮的active类
            btn.classList.add('active');
            // 添加当前内容的active类
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // 开始扫描（使用浏览器内置的BarcodeDetector API或jsQR库）
    if (startScanBtn) {
        startScanBtn.addEventListener('click', async () => {
            try {
                const constraints = {
                    video: { facingMode: 'environment' }
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (video) {
                    video.srcObject = stream;
                    await video.play();
                    
                    // 检查浏览器是否支持BarcodeDetector
                    if (window.BarcodeDetector) {
                        const barcodeDetector = new BarcodeDetector({
                            formats: ['qr_code']
                        });
                        
                        // 使用BarcodeDetector持续扫描
                        window.scanInterval = setInterval(async () => {
                            try {
                                const barcodes = await barcodeDetector.detect(video);
                                if (barcodes.length > 0) {
                                    const result = barcodes[0].rawValue;
                                    if (result) {
                                        processScanResult(result);
                                    }
                                }
                            } catch (detectError) {
                                console.error('扫描检测错误:', detectError);
                            }
                        }, 1000);
                    } else if (typeof jsQR !== 'undefined') {
                        // 使用jsQR库进行回退扫描
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        const detectWithJsQR = () => {
                            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                                // 设置canvas尺寸与视频一致
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                
                                // 绘制视频帧到canvas
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                
                                // 获取图像数据
                                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                
                                // 使用jsQR扫描
                                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                    inversionAttempts: "dontInvert",
                                });
                                
                                if (code) {
                                    processScanResult(code.data);
                                    return;
                                }
                            }
                            // 继续扫描
                            window.scanRequestId = requestAnimationFrame(detectWithJsQR);
                        };
                        
                        detectWithJsQR();
                    } else {
                        alert('您的浏览器不支持二维码扫描功能，请使用手动输入方式');
                        stopScan();
                        return;
                    }
                    
                    startScanBtn.disabled = true;
                    stopScanBtn.disabled = false;
                }
            } catch (error) {
                console.error('启动摄像头失败:', error);
                alert('无法访问摄像头，请确保已授予摄像头权限');
            }
        });
    }
    
    // 处理扫描结果的通用函数
    async function processScanResult(result) {
        try {
            console.log('原始扫描结果:', result);
            
            // 解析OTP URI
            const otpInfo = parseOTPURI(result);
            console.log('解析后的OTP信息:', otpInfo);
            
            // 关闭模态框
            if (scanModal) {
                scanModal.style.display = 'none';
            }
            stopScan();
            resetImageScan();
            
            // 填充到添加账户表单
            if (accountNameInput) accountNameInput.value = otpInfo.name;
            if (secretKeyInput) secretKeyInput.value = otpInfo.secret;
            if (issuerInput) issuerInput.value = otpInfo.issuer;
            
            // 显示添加账户区域
            if (addAccountSection) {
                addAccountSection.style.display = 'block';
            }
            
            // 滚动到添加账户区域
            if (addAccountSection) {
                addAccountSection.scrollIntoView({ behavior: 'smooth' });
            }
            
            // 显示动态密钥
            showDynamicKey(otpInfo);
        } catch (error) {
            console.error('解析OTP URI失败:', error);
            alert('无效的二维码，请扫描Google身份验证器二维码');
        }
    }
    
    // 显示动态密钥
    async function showDynamicKey(otpInfo) {
        // 创建动态密钥显示区域
        let dynamicKeySection = document.getElementById('dynamic-key-section');
        if (!dynamicKeySection) {
            dynamicKeySection = document.createElement('section');
            dynamicKeySection.id = 'dynamic-key-section';
            dynamicKeySection.className = 'dynamic-key-section';
            
            const mainContent = document.querySelector('main');
            const verifySection = document.getElementById('verify-section');
            mainContent.insertBefore(dynamicKeySection, verifySection.nextSibling);
        }
        
        // 生成当前的动态密钥
        const currentOTP = await generateTOTP(otpInfo.secret);
        
        // 更新动态密钥显示
        dynamicKeySection.innerHTML = `
            <h2>动态密钥</h2>
            <div class="dynamic-key-container">
                <div class="account-info">
                    <h3>${otpInfo.name}</h3>
                    <p>${otpInfo.issuer || '未知发行者'}</p>
                </div>
                <div class="otp-code">${currentOTP}</div>
                <div class="otp-timer">
                    <div class="timer-bar" id="timer-bar"></div>
                    <span id="timer-text">30秒后刷新</span>
                </div>
                <div class="otp-actions">
                    <button id="add-account-btn" class="btn btn-primary">添加到账户列表</button>
                    <button id="close-dynamic-key" class="btn btn-secondary">关闭</button>
                </div>
            </div>
        `;
        
        // 显示动态密钥区域
        dynamicKeySection.style.display = 'block';
        
        // 设置定时器更新动态密钥
        updateDynamicKeyTimer(otpInfo.secret);
        
        // 添加到账户列表按钮事件
        document.getElementById('add-account-btn').addEventListener('click', async () => {
            try {
                // 直接调用API添加账户
                await ApiService.addAccount(otpInfo.name, otpInfo.secret, otpInfo.issuer);
                
                // 隐藏动态密钥区域
                dynamicKeySection.style.display = 'none';
                
                // 重新渲染账户列表
                await renderAccounts();
                
                // 显示成功提示
                showToast('账户添加成功！', 'success');
            } catch (error) {
                console.error('添加账户失败:', error);
                alert('添加账户失败: ' + error.message);
            }
        });
        
        // 关闭按钮事件
        document.getElementById('close-dynamic-key').addEventListener('click', () => {
            dynamicKeySection.style.display = 'none';
            // 清除定时器
            if (window.dynamicKeyTimer) {
                clearInterval(window.dynamicKeyTimer);
                delete window.dynamicKeyTimer;
            }
        });
    }
    
    // 更新动态密钥定时器
    function updateDynamicKeyTimer(secret) {
        // 清除之前的定时器
        if (window.dynamicKeyTimer) {
            clearInterval(window.dynamicKeyTimer);
        }
        
        // 更新动态密钥的函数
        async function updateKey() {
            const otpCode = await generateTOTP(secret);
            const otpCodeElement = document.querySelector('.otp-code');
            if (otpCodeElement) {
                otpCodeElement.textContent = otpCode;
            }
        }
        
        // 初始化定时器
        const timerBar = document.getElementById('timer-bar');
        const timerText = document.getElementById('timer-text');
        let remainingSeconds = 30;
        
        // 立即更新一次
        updateKey();
        
        // 设置每秒更新
        window.dynamicKeyTimer = setInterval(async () => {
            remainingSeconds--;
            
            // 更新进度条
            if (timerBar) {
                const progress = (remainingSeconds / 30) * 100;
                timerBar.style.width = `${progress}%`;
            }
            
            // 更新文本
            if (timerText) {
                timerText.textContent = `${remainingSeconds}秒后刷新`;
            }
            
            // 30秒后重新生成密钥
            if (remainingSeconds <= 0) {
                await updateKey();
                remainingSeconds = 30;
            }
        }, 1000);
    }
    
    // 停止扫描按钮事件
    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', () => {
            stopScan();
        });
    }
    
    // 停止扫描
    function stopScan() {
        // 清除扫描间隔（用于BarcodeDetector）
        if (window.scanInterval) {
            clearInterval(window.scanInterval);
            delete window.scanInterval;
        }
        
        // 清除动画帧请求（用于jsQR）
        if (window.scanRequestId) {
            cancelAnimationFrame(window.scanRequestId);
            delete window.scanRequestId;
        }
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        if (video) {
            video.srcObject = null;
        }
        
        if (startScanBtn) {
            startScanBtn.disabled = false;
        }
        if (stopScanBtn) {
            stopScanBtn.disabled = true;
        }
    }
    
    // 重置图片扫描
    function resetImageScan() {
        if (scanImageInput) {
            scanImageInput.value = '';
        }
        if (scanImagePreview) {
            scanImagePreview.src = '';
            scanImagePreview.style.display = 'none';
        }
        const placeholder = document.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        if (scanAnalyzeImageBtn) {
            scanAnalyzeImageBtn.disabled = true;
        }
        if (scanResetImageBtn) {
            scanResetImageBtn.disabled = true;
        }
    }
    
    // 图片扫描 - 选择图片按钮点击事件
    if (scanSelectImageBtn) {
        scanSelectImageBtn.addEventListener('click', () => {
            if (scanImageInput) {
                scanImageInput.click();
            }
        });
    }
    
    // 图片扫描 - 图片选择事件
    if (scanImageInput) {
        scanImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                previewImage(file);
            }
        });
    }
    
    // 图片扫描 - 重置按钮点击事件
    if (scanResetImageBtn) {
        scanResetImageBtn.addEventListener('click', () => {
            resetImageScan();
        });
    }
    
    // 图片扫描 - 拖拽相关事件
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        if (scanImagePreviewContainer) {
            scanImagePreviewContainer.classList.add('highlight');
        }
    }
    
    function unhighlight() {
        if (scanImagePreviewContainer) {
            scanImagePreviewContainer.classList.remove('highlight');
        }
    }
    
    function handleDrop(e) {
        preventDefaults(e);
        unhighlight();
        
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            previewImage(files[0]);
        }
    }
    
    // 添加拖拽事件监听器
    if (scanImagePreviewContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            scanImagePreviewContainer.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            scanImagePreviewContainer.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            scanImagePreviewContainer.addEventListener(eventName, unhighlight, false);
        });
        
        scanImagePreviewContainer.addEventListener('drop', handleDrop, false);
    }
    
    // 图片扫描 - 预览图片
    function previewImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (scanImagePreview) {
                scanImagePreview.src = e.target.result;
                scanImagePreview.style.display = 'block';
            }
            const placeholder = document.querySelector('.image-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            if (scanAnalyzeImageBtn) {
                scanAnalyzeImageBtn.disabled = false;
            }
            if (scanResetImageBtn) {
                scanResetImageBtn.disabled = false;
            }
        };
        reader.readAsDataURL(file);
    }
    
    // 图片扫描 - 分析图片二维码
    if (scanAnalyzeImageBtn) {
        scanAnalyzeImageBtn.addEventListener('click', () => {
            analyzeImage();
        });
    }
    
    // 图片扫描 - 分析图片函数（使用浏览器内置的BarcodeDetector API或jsQR库）
    async function analyzeImage() {
        try {
            if (!scanImagePreview) {
                console.error('scanImagePreview元素不存在');
                return;
            }
            
            if (!scanImagePreview.src) {
                alert('请先选择一张图片');
                return;
            }
            
            // 检查浏览器是否支持BarcodeDetector
            if (window.BarcodeDetector) {
                const barcodeDetector = new BarcodeDetector({
                    formats: ['qr_code']
                });
                
                const barcodes = await barcodeDetector.detect(scanImagePreview);
                if (barcodes.length > 0) {
                    const result = barcodes[0].rawValue;
                    if (result) {
                        processScanResult(result);
                    }
                } else {
                    alert('未检测到二维码，请确保图片包含清晰的二维码');
                }
            } else if (typeof jsQR !== 'undefined') {
                // 使用jsQR库进行回退扫描
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 创建新图片元素以确保我们可以重新绘制它
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    try {
                        // 设置canvas尺寸与图片一致
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        // 绘制图片到canvas
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        
                        // 获取图像数据
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // 使用jsQR扫描
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        if (code) {
                            processScanResult(code.data);
                        } else {
                            alert('未检测到二维码，请确保图片包含清晰的二维码');
                        }
                    } catch (error) {
                        console.error('jsQR解析二维码失败:', error);
                        alert('无法解析图片中的二维码，请确保图片清晰且包含有效的Google身份验证器二维码');
                    }
                };
                
                img.onerror = () => {
                    console.error('图片加载失败');
                    alert('无法加载图片，请重新选择');
                };
                
                img.src = scanImagePreview.src;
            } else {
                alert('您的浏览器不支持二维码扫描功能，请手动输入二维码信息');
            }
        } catch (error) {
            console.error('解析二维码失败:', error);
            alert('无法解析图片中的二维码，请确保图片清晰且包含有效的Google身份验证器二维码');
        }
    }
    
    // 生成随机密钥
    if (generateKeyBtn) {
        generateKeyBtn.addEventListener('click', () => {
            secretKeyInput.value = generateRandomKey();
        });
    }
    
    // 添加账户
    if (addAccountBtn) {
        addAccountBtn.addEventListener('submit', async (e) => {
            e.preventDefault();
            const accountName = accountNameInput.value.trim();
            const secretKey = secretKeyInput.value.trim();
            const issuer = issuerInput.value.trim();
            
            if (!accountName || !secretKey) {
                alert('请填写账户名和密钥');
                return;
            }
            
            try {
                await ApiService.addAccount(accountName, secretKey, issuer);
                // 清空表单
                accountNameInput.value = '';
                secretKeyInput.value = '';
                issuerInput.value = '';
                
                // 更新账户列表
                await initApp();
            } catch (error) {
                console.error('添加账户失败:', error);
                alert('添加账户失败: ' + error.message);
            }
        });
    }
    

    
    // 获取剩余倒计时时间（秒）
    function getRemainingTime(period = 30) {
        const now = Math.floor(Date.now() / 1000);
        return period - (now % period);
    }
    
    // 共享账户
    async function shareAccount(accountId) {
        try {
            const users = await ApiService.getUsers();
            
            if (users.length === 0) {
                alert('没有可共享的普通用户');
                return;
            }
            
            // 创建用户选择列表
            const userOptions = users.filter(user => user.role === 'user')
                .map(user => `${user.username} (ID: ${user._id})`)
                .join('\n');
            
            const selectedUsername = prompt(`请选择要共享给的用户:\n${userOptions}\n\n输入用户名:`);
            
            if (!selectedUsername) return;
            
            // 查找匹配的用户
            const user = users.find(u => 
                u.username === selectedUsername.trim()
            );
            
            if (!user) {
                alert('未找到匹配的用户');
                return;
            }
            
            await ApiService.shareAccount(accountId, user._id);
            alert('账户共享成功');
            await renderAccounts();
        } catch (error) {
            console.error('共享账户失败:', error);
            alert('共享账户失败: ' + error.message);
        }
    }
    
    // 渲染账户列表
    async function renderAccounts() {
        try {
            accounts = await ApiService.getAccounts();
            if (accountsListEl) {
                accountsListEl.innerHTML = '';
                
                for (const account of accounts) {
                    // 生成当前账户的TOTP
                    const otp = await generateTOTP(account.secret);
                    const timeLeft = getRemainingTime();
                    
                    const accountEl = document.createElement('div');
                    accountEl.className = 'account-item';
                    
                    // 检查是否是当前用户创建的账户（只有创建者可以共享）
                    const isOwner = account.userId === currentUser.id;
                    
                    // 构建账户操作按钮
                    let actionButtons = '';
                    if (isOwner) {
                        // 管理员或创建者可以删除、共享和查看二维码
                        actionButtons = `
                            <div class="account-actions">
                                <button class="btn btn-secondary show-qr-btn" data-id="${account._id}">显示二维码</button>
                                <button class="btn btn-secondary share-account" data-id="${account._id}">共享</button>
                                <button class="btn btn-secondary delete-account" data-id="${account._id}">删除</button>
                            </div>
                        `;
                    } else {
                        // 共享账户只能查看，不能删除或共享
                        actionButtons = '';
                    }
                    
                    accountEl.innerHTML = `
                        <div class="account-info">
                            <h3>${account.name}</h3>
                            <p>${account.issuer || '无发行者'}</p>
                            ${isOwner ? '<span class="account-owner">（所有者）</span>' : '<span class="account-shared">（共享）</span>'}
                        </div>
                        <div class="totp-container">
                            <div class="totp-code">${otp || '生成失败'}</div>
                            <div class="countdown-container">
                                <div class="countdown-bar" style="width: ${(timeLeft / 30) * 100}%"></div>
                                <div class="countdown-text">${timeLeft}s</div>
                            </div>
                        </div>
                        ${actionButtons}
                    `;
                    
                    // 添加删除按钮事件监听
                    const deleteBtn = accountEl.querySelector('.delete-account');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async () => {
                            if (confirm('确定要删除这个账户吗？')) {
                                try {
                                    await ApiService.deleteAccount(account._id);
                                    await renderAccounts();
                                } catch (error) {
                                    console.error('删除账户失败:', error);
                                    alert('删除账户失败: ' + error.message);
                                }
                            }
                        });
                    }
                    
                    // 添加共享按钮事件监听
                    const shareBtn = accountEl.querySelector('.share-account');
                    if (shareBtn) {
                        shareBtn.addEventListener('click', async () => {
                            await shareAccount(account._id);
                        });
                    }
                    
                    // 添加显示二维码按钮事件监听
                    const showQrBtn = accountEl.querySelector('.show-qr-btn');
                    if (showQrBtn) {
                        showQrBtn.addEventListener('click', () => {
                            showAccountQRCode(account);
                        });
                    }
                    
                    accountsListEl.appendChild(accountEl);
                }
            }
        } catch (error) {
            console.error('渲染账户列表失败:', error);
        }
    }
    
    // 更新TOTP码和倒计时
    async function updateTOTP() {
        // 更新账户列表中的验证码
        await renderAccounts();
    }
    
    // 更新倒计时
    function updateCountdown() {
        const now = Date.now();
        const remaining = 30 - Math.floor((now / 1000) % 30);
        
        // 时间到了重新生成密码
        if (remaining === 30) {
            updateTOTP();
        }
    }
    
    // Tab切换功能
    function setupTabSwitching() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有active类
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 获取目标tab id
                const targetTab = btn.getAttribute('data-tab');
                
                // 添加active类
                btn.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    // 初始化应用
    async function initApp() {
        try {
            // 获取账户列表
            accounts = await ApiService.getAccounts();
            
            // 初始更新
            await updateTOTP();
            updateCountdown();
            
            // 每秒更新倒计时
            setInterval(updateCountdown, 1000);
            
            // 每30秒更新密码
            setInterval(() => {
                updateTOTP();
            }, 30000);
                
            // 渲染账户列表
            await renderAccounts();
            
            // 每秒更新账户列表中的动态密钥
            setInterval(async () => {
                await renderAccounts();
            }, 1000);
            
            // 如果是管理员，渲染用户列表
            if (currentUser.role === 'admin') {
                renderUsers();
            }
            
            // 设置标签页切换
            setupTabSwitching();
        } catch (error) {
            console.error('初始化应用失败:', error);
        }
    }
    
    // 初始化应用
    checkUserStatus();
});
}