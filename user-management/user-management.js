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

// 渲染用户列表
async function renderUsers() {
    try {
        const users = await ApiService.getUsers();
        const currentUser = await ApiService.getCurrentUser();
        const usersListEl = document.getElementById('users-list');
        
        usersListEl.innerHTML = '';
        
        users.forEach(user => {
            const userEl = document.createElement('div');
            userEl.className = 'user-item';
            
            // 生成删除按钮，当前用户不能删除自己
            const deleteBtn = user.id !== currentUser.id ? 
                `<button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}">删除</button>` : '';
            
            userEl.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div class="user-role ${user.role}">${user.role === 'admin' ? '管理员' : '普通用户'}</div>
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
        showToast('获取用户列表失败: ' + error.message, 'error');
    }
}

// 处理删除用户
async function handleDeleteUser(e) {
    e.preventDefault();
    const userId = e.target.dataset.userId;
    const userEl = e.target.closest('.user-item');
    const username = userEl.querySelector('.user-name').textContent;
    
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
        showToast('删除用户失败: ' + error.message, 'error');
    }
}

// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查用户是否已登录
        const currentUser = await ApiService.getCurrentUser();
        
        // 只有管理员可以访问用户管理页面
        if (currentUser.role !== 'admin') {
            showToast('您没有权限访问该页面', 'error');
            window.location.href = '../index.html';
            return;
        }
        
        // 渲染用户列表
        await renderUsers();
        
        // 添加用户表单提交
        const addUserForm = document.getElementById('add-user-form');
        if (addUserForm) {
            addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('new-username').value.trim();
                const password = document.getElementById('new-password').value;
                const role = document.getElementById('user-role').value;
                
                try {
                    await ApiService.addUser(username, password, role);
                    // 清空表单
                    document.getElementById('new-username').value = '';
                    document.getElementById('new-password').value = '';
                    renderUsers();
                    showToast('用户添加成功！', 'success');
                } catch (error) {
                    console.error('添加用户失败:', error);
                    showToast('添加用户失败: ' + error.message, 'error');
                }
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