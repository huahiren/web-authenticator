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
            
            try {
                // 调用登录API
                console.log('准备登录，用户名:', username);
                const user = await ApiService.login(username, password);
                console.log('登录成功，准备跳转');
                // 所有用户登录后都跳转到首页
                const targetUrl = '../index.html';
                console.log('跳转到:', window.location.origin + window.location.pathname.replace('login/login.html', targetUrl.replace('../', '')));
                window.location.href = targetUrl;
            } catch (error) {
                console.error('登录失败:', error);
                loginError.textContent = error.message || '登录失败，请检查用户名和密码';
                loginError.style.color = 'red';
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
        try {
            // 尝试获取当前用户信息
            const user = await ApiService.getCurrentUser();
            if (user) {
                // 如果已经登录，直接跳转到主页面，使用绝对URL确保跳转正确
                const targetUrl = '../index.html';
                const fullUrl = window.location.origin + window.location.pathname.replace('login/login.html', targetUrl.replace('../', ''));
                window.location.href = fullUrl;
            }
        } catch (error) {
            // 如果获取失败，说明未登录或token过期，继续显示登录页面
            console.log('用户未登录或token过期，显示登录页面');
        }
    }
    
    // 页面加载时检查登录状态
    checkLoginStatus();
});