/**
 * 认证相关功能
 */
class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.loginForm = document.getElementById('login-form');
        this.loginError = document.getElementById('login-error');
        this.logoutBtn = document.getElementById('logout-btn');
        this.loginBtn = document.querySelector('#login-form button[type="submit"]');
        this.originalBtnText = this.loginBtn ? this.loginBtn.innerHTML : '登录';
        
        // 从配置文件获取API基础URL
        if (!window.imgHostConfig || !window.imgHostConfig.apiBaseUrl) {
            console.error('缺少API基础URL配置，请在config.js中设置apiBaseUrl');
        }
        this.apiBaseUrl = window.imgHostConfig?.apiBaseUrl || '';

        this.setupEventListeners();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    /**
     * 显示登录按钮加载状态
     */
    showLoginLoading() {
        if (this.loginBtn) {
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登录中...';
        }
    }

    /**
     * 隐藏登录按钮加载状态
     */
    hideLoginLoading() {
        if (this.loginBtn) {
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = this.originalBtnText;
        }
    }

    /**
     * 处理登录表单提交
     * @param {Event} e - 表单提交事件
     */
    async handleLogin(e) {
        e.preventDefault();
        
        // 显示登录中状态
        this.showLoginLoading();
        
        const password = document.getElementById('password').value;
        
        try {
            console.log('尝试登录，发送请求到:', `${this.apiBaseUrl}/login`);
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();
            console.log('登录响应:', data);

            if (response.ok && data.success) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.showMainPage();
            } else {
                this.showLoginError();
                // 恢复登录按钮状态
                this.hideLoginLoading();
            }
        } catch (error) {
            console.error('登录失败:', error);
            this.showLoginError();
            // 恢复登录按钮状态
            this.hideLoginLoading();
        }
    }

    /**
     * 处理退出登录
     */
    handleLogout() {
        localStorage.removeItem('token');
        this.token = null;
        this.showLoginPage();
        // 确保登录按钮恢复正常状态
        this.hideLoginLoading();
    }

    /**
     * 显示登录错误信息
     */
    showLoginError() {
        this.loginError.classList.remove('d-none');
        setTimeout(() => {
            this.loginError.classList.add('d-none');
        }, 3000);
    }

    /**
     * 显示主页面
     */
    showMainPage() {
        document.getElementById('login-page').classList.add('d-none');
        document.getElementById('main-page').classList.remove('d-none');
        // 触发页面加载事件
        window.dispatchEvent(new Event('auth:login'));
    }

    /**
     * 显示登录页面
     */
    showLoginPage() {
        document.getElementById('main-page').classList.add('d-none');
        document.getElementById('login-page').classList.remove('d-none');
        // 确保登录按钮恢复正常状态
        this.hideLoginLoading();
    }

    /**
     * 验证当前会话是否有效
     * @returns {Promise<boolean>} 会话是否有效
     */
    async verifySession() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/verify`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            const data = await response.json();
            return response.ok && data.success;
        } catch (error) {
            console.error('会话验证失败:', error);
            return false;
        }
    }

    /**
     * 获取认证头信息
     * @returns {Object} 包含Authorization头的对象
     */
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
        };
    }
    
    /**
     * 获取API基础URL
     * @returns {string} API基础URL
     */
    getApiBaseUrl() {
        return this.apiBaseUrl;
    }
}

// 导出Auth实例
const auth = new Auth(); 