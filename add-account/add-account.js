// API服务已通过HTML script标签引入，全局可用

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
    // 账户名不需要转义，直接使用原始字符串
    return `otpauth://totp/${issuer ? issuer + ':' : ''}${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
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
    
    if (window.stream) {
        window.stream.getTracks().forEach(track => track.stop());
        window.stream = null;
    }
    
    const video = document.getElementById('video');
    if (video) {
        video.srcObject = null;
    }
    
    const startScanBtn = document.getElementById('start-scan');
    const stopScanBtn = document.getElementById('stop-scan');
    if (startScanBtn) {
        startScanBtn.disabled = false;
    }
    if (stopScanBtn) {
        stopScanBtn.disabled = true;
    }
}

// 重置图片扫描
function resetImageScan() {
    const scanImageInput = document.getElementById('scan-image-input');
    const scanImagePreview = document.getElementById('image-preview');
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
    const scanAnalyzeImageBtn = document.getElementById('analyze-image');
    if (scanAnalyzeImageBtn) {
        scanAnalyzeImageBtn.disabled = true;
    }
    const scanResetImageBtn = document.getElementById('reset-image');
    if (scanResetImageBtn) {
        scanResetImageBtn.disabled = true;
    }
}

// 处理扫描结果的通用函数
async function processScanResult(result) {
    try {
        console.log('原始扫描结果:', result);
        
        // 解析OTP URI
        const otpInfo = parseOTPURI(result);
        console.log('解析后的OTP信息:', otpInfo);
        
        // 关闭模态框
        const scanModal = document.getElementById('qr-scan-modal');
        if (scanModal) {
            scanModal.style.display = 'none';
        }
        stopScan();
        resetImageScan();
        
        // 填充到添加账户表单
        const accountNameInput = document.getElementById('account-name');
        const secretKeyInput = document.getElementById('account-secret');
        const issuerInput = document.getElementById('account-issuer');
        
        if (accountNameInput) accountNameInput.value = otpInfo.name;
        if (secretKeyInput) secretKeyInput.value = otpInfo.secret;
        if (issuerInput) issuerInput.value = otpInfo.issuer;
        
        // 显示添加账户区域
        const addAccountSection = document.getElementById('add-account-section');
        if (addAccountSection) {
            addAccountSection.style.display = 'block';
        }
        
        // 滚动到添加账户区域
        if (addAccountSection) {
            addAccountSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        showToast('二维码扫描成功', 'success');
    } catch (error) {
        console.error('解析OTP URI失败:', error);
        showToast('无效的二维码，请扫描Google身份验证器二维码', 'error');
    }
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户是否已登录
        await ApiService.getCurrentUser();
        
        // 生成随机密钥按钮事件
        const generateKeyBtn = document.getElementById('generate-secret');
        const secretKeyInput = document.getElementById('account-secret');
        
        if (generateKeyBtn && secretKeyInput) {
            generateKeyBtn.addEventListener('click', () => {
                secretKeyInput.value = generateRandomKey(32);
            });
        }
        
        // 添加账户表单提交事件
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
                    // 清空表单
                    addAccountForm.reset();
                } catch (error) {
                    console.error('添加账户失败:', error);
                    showToast('添加账户失败: ' + error.message, 'error');
                }
            });
        }
        
        // 移除扫码功能，因为缺少必要的DOM元素和库
        const scanQrBtn = document.getElementById('scan-qr-btn');
        if (scanQrBtn) {
            scanQrBtn.addEventListener('click', () => {
                showToast('扫码功能暂不可用，请手动输入密钥', 'warning');
            });
        }
        
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