/**
 * 应用入口
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 动态添加Bootstrap图标库
    const iconLink = document.createElement('link');
    iconLink.rel = 'stylesheet';
    iconLink.href = 'https://cdn.staticfile.org/bootstrap-icons/1.10.0/font/bootstrap-icons.min.css';
    document.head.appendChild(iconLink);
    
    // 检查是否已登录
    if (auth.token) {
        // 显示登录中状态
        auth.showLoginLoading();
        
        console.log('检测到本地存储的token，正在验证...');
        const isValid = await auth.verifySession();
        
        if (isValid) {
            console.log('token验证成功，显示主页面');
            auth.showMainPage();
        } else {
            // 会话无效，清除token
            console.log('token验证失败，返回登录页面');
            localStorage.removeItem('token');
            auth.hideLoginLoading();
            auth.showLoginPage();
        }
    }
}); 