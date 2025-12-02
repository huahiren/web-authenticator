// API服务已通过HTML script标签引入，全局可用

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

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户是否已登录
        const currentUser = await ApiService.getCurrentUser();
        // 更新当前用户显示
        const currentUserEl = document.getElementById('current-user');
        if (currentUserEl) {
            currentUserEl.textContent = `当前用户: ${currentUser.username}`;
        }
        
        // 绑定退出登录事件
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
        // 如果未登录，跳转到登录页面
        window.location.href = 'login/login.html';
    }
});