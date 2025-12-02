// 登录页面的JavaScript逻辑
// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', async () => {
    // DOM元素
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-message');
    
    // 登录表单提交事件
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = usernameInput.value;
            const password = passwordInput.value;
            
            // 调用登录API
            console.log('准备登录，用户名:', username);
            const result = await ApiService.login(username, password);
            
            if (result && result.error) {
                // 登录失败，显示错误信息
                console.error('登录失败:', result.error);
                loginError.textContent = result.error || '登录失败，请检查用户名和密码';
                loginError.style.color = 'red';
            } else {
                // 登录成功，跳转到首页
                console.log('登录成功，准备跳转');
                const targetUrl = '../index.html';
                console.log('跳转到:', window.location.origin + window.location.pathname.replace('login/login.html', targetUrl.replace('../', '')));
                window.location.href = targetUrl;
            }
        });
    }
    
    // 登录函数已合并到表单提交事件中，不再需要单独定义
    // async function login(username, password) {
    //     try {
    //         // 调用登录API
    //         const user = await ApiService.login(username, password);
    //         
    //         // 登录成功后跳转到主页面
    //         window.location.href = '../index.html';
    //     } catch (error) {
    //         console.error('登录失败:', error);
    //         throw error;
    //     }
    // }
    
    // 检查是否已经登录
    async function checkLoginStatus() {
        // 尝试获取当前用户信息
        const user = await ApiService.getCurrentUser();
        if (user) {
            // 如果已经登录，直接跳转到主页面，使用绝对URL确保跳转正确
            const targetUrl = '../index.html';
            const fullUrl = window.location.origin + window.location.pathname.replace('login/login.html', targetUrl.replace('../', ''));
            window.location.href = fullUrl;
        } else {
            // 用户未登录，继续显示登录页面
            console.log('用户未登录，显示登录页面');
        }
    }
    
    // 页面加载时检查登录状态
    checkLoginStatus();
});