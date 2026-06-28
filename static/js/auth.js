// auth.js - 增强版登录/注册模态框（P0 安全加固版：bcrypt 哈希存储）
// 修改日期：2026-06-22
// 修复项：密码改为 bcrypt 哈希后存储；登录时对比哈希值；兼容旧版明文密码自动迁移
// i18n 集成：所有可见文本通过 window.i18n.t() 渲染，并监听 lang:changed 实时更新
(function() {
    // ---------- 初始化用户存储 ----------
    function initUserStorage() {
        if (!localStorage.getItem('nonprofit_users')) {
            localStorage.setItem('nonprofit_users', JSON.stringify({}));
        }
    }

    // ---------- 工具函数 ----------
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // 获取 i18n 文本（兼容 i18n.js 尚未加载的极端情况）
    function tt(key, params) {
        return (window.i18n && window.i18n.t) ? window.i18n.t(key, params) : key;
    }

    // 自定义 toast 提示
    function showToast(message, duration = 2500) {
        let toast = document.querySelector('.global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'global-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: #fff;
                padding: 10px 20px;
                border-radius: 40px;
                font-size: 14px;
                z-index: 10000;
                backdrop-filter: blur(8px);
                pointer-events: none;
                transition: opacity 0.3s;
                opacity: 0;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
        }, duration);
    }

    // 自定义确认弹窗
    function showConfirm(message, onConfirm, onCancel) {
        const existingModal = document.querySelector('.custom-confirm');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'custom-confirm';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(4px);
        `;
        modal.innerHTML = `
            <div style="background: #2c241e; border-radius: 24px; padding: 24px; width: 300px; text-align: center; border: 1px solid #c9a96e; box-shadow: 0 20px 30px rgba(0,0,0,0.3);">
                <p style="color: #ffefcf; font-size: 1rem; margin-bottom: 24px;">${escapeHtml(message)}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="confirmOk" style="background: #b22234; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;">${escapeHtml(tt('confirm'))}</button>
                    <button id="confirmCancel" style="background: #666; color: white; border: none; padding: 8px 20px; border-radius: 40px; cursor: pointer;">${escapeHtml(tt('cancel'))}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const okBtn = modal.querySelector('#confirmOk');
        const cancelBtn = modal.querySelector('#confirmCancel');
        const close = () => modal.remove();
        okBtn.onclick = () => { close(); if (onConfirm) onConfirm(); };
        cancelBtn.onclick = () => { close(); if (onCancel) onCancel(); };
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { close(); if (onCancel) onCancel(); }
        });
    }

    // 判断是否在个人中心页面
    function isUserPage() {
        return window.location.pathname.includes('user.html');
    }

    // ---------- 更新导航栏 authArea ----------
    function updateAuthArea() {
        const authArea = document.getElementById('authArea');
        if (!authArea) return;

        const currentUser = localStorage.getItem('current_username');
        if (currentUser) {
            const users = JSON.parse(localStorage.getItem('nonprofit_users') || '{}');
            const user = users[currentUser];
            const nickname = user?.nickname || currentUser;

            let actionButton = '';
            if (isUserPage()) {
                actionButton = `<button id="logoutBtn" class="login-btn" style="background: #666; padding: 6px 16px; border: none; cursor: pointer;">${escapeHtml(tt('logout'))}</button>`;
            } else {
                actionButton = `<a href="user.html" class="login-btn" style="background: #2c5f2d; padding: 6px 16px;">${escapeHtml(tt('personalCenter'))}</a>`;
            }

            authArea.innerHTML = `
                <div class="lang-switch-btn" id="langSwitchBtn" data-i18n="langSwitch">${escapeHtml(tt('langSwitch'))}</div>
                <span class="user-welcome" style="color: #ffecb3; font-size: 0.9rem; background: rgba(0,0,0,0.4); padding: 6px 16px; border-radius: 40px;">
                    <i class="fas fa-user"></i> ${escapeHtml(nickname)}
                </span>
                ${actionButton}
            `;

            if (isUserPage()) {
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.onclick = () => {
                        showConfirm(tt('confirmLogout'), () => {
                            localStorage.removeItem('current_username');
                            updateAuthArea();
                            showToast(tt('logoutSuccess'));
                            if (window.location.pathname.includes('user.html')) {
                                window.location.href = 'index.html';
                            }
                        });
                    };
                }
            }
        } else {
            authArea.innerHTML = `
                <div class="lang-switch-btn" id="langSwitchBtn" data-i18n="langSwitch">${escapeHtml(tt('langSwitch'))}</div>
                <button id="showLoginBtn" class="login-btn" style="background: #b22234; padding: 6px 18px;">${escapeHtml(tt('loginRegister'))}</button>
            `;
            const loginBtn = document.getElementById('showLoginBtn');
            if (loginBtn) loginBtn.onclick = () => showLoginModal();
        }
        document.dispatchEvent(new CustomEvent('auth:updated'));
    }

    // ---------- 图形验证码生成器 ----------
    let currentCaptcha = '';

    function generateCaptcha() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let captcha = '';
        for (let i = 0; i < 4; i++) {
            captcha += chars[Math.floor(Math.random() * chars.length)];
        }
        currentCaptcha = captcha;
        return captcha;
    }

    function drawCaptcha(canvas) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#f5f0e6';
        ctx.fillRect(0, 0, w, h);
        // 干扰线
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * w, Math.random() * h);
            ctx.lineTo(Math.random() * w, Math.random() * h);
            ctx.strokeStyle = `rgba(100, 70, 40, ${Math.random() * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        // 干扰点
        for (let i = 0; i < 60; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
        // 绘制验证码文字
        const captchaText = generateCaptcha();
        ctx.font = 'bold 28px "Segoe UI", "Microsoft YaHei"';
        ctx.fillStyle = '#5a2e1a';
        for (let i = 0; i < captchaText.length; i++) {
            const x = 15 + i * 28;
            const y = 32 + (Math.random() * 6 - 3);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((Math.random() - 0.5) * 0.3);
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }
        return captchaText;
    }

    function refreshCaptcha(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            drawCaptcha(canvas);
        }
    }

    // ---------- 微交互：按钮涟漪效果 ----------
    function createRipple(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;
        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${event.clientX - rect.left - radius}px`;
        ripple.style.top = `${event.clientY - rect.top - radius}px`;
        button.style.position = 'relative';
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // 输入框抖动效果
    function shakeElement(element) {
        if (!element) return;
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    }

    // ---------- 模态框管理 ----------
    let currentModalMode = 'login';

    function applyModalI18n(modal, mode) {
        const titleEl = modal.querySelector('#authModalTitle');
        const submitBtn = modal.querySelector('#authSubmitBtn');
        const switchBtn = modal.querySelector('#authSwitchBtn');
        const usernameLabel = modal.querySelector('[data-i18n-role="username-label"]');
        const passwordLabel = modal.querySelector('[data-i18n-role="password-label"]');
        const captchaLabel = modal.querySelector('[data-i18n-role="captcha-label"]');
        if (usernameLabel) usernameLabel.textContent = tt('username');
        if (passwordLabel) passwordLabel.textContent = tt('password');
        if (captchaLabel) captchaLabel.textContent = tt('captcha');
        if (titleEl) titleEl.innerText = mode === 'login' ? tt('login') : tt('register');
        if (submitBtn) submitBtn.innerText = mode === 'login' ? tt('login') : tt('register');
        if (switchBtn) switchBtn.innerText = mode === 'login' ? tt('noAccount') : tt('hasAccount');
    }

    function showLoginModal(mode = 'login') {
        currentModalMode = mode;
        let modal = document.getElementById('authModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'authModal';
            modal.className = 'auth-modal';
            // 构建带浮动标签的DOM结构（标签文本会在 applyModalI18n 中刷新）
            modal.innerHTML = `
                <div class="auth-container">
                    <span class="auth-close">&times;</span>
                    <h2 id="authModalTitle">${escapeHtml(tt('login'))}</h2>
                    <div class="input-group">
                        <input type="text" id="authUsername" placeholder=" " autocomplete="off">
                        <label data-i18n-role="username-label">${escapeHtml(tt('username'))}</label>
                    </div>
                    <div class="input-group">
                        <input type="password" id="authPassword" placeholder=" " autocomplete="off">
                        <label data-i18n-role="password-label">${escapeHtml(tt('password'))}</label>
                    </div>
                    <div class="captcha-row">
                        <div class="input-group">
                            <input type="text" id="authCaptcha" placeholder=" " autocomplete="off">
                            <label data-i18n-role="captcha-label">${escapeHtml(tt('captcha'))}</label>
                        </div>
                        <canvas id="captchaCanvas" class="captcha-canvas" width="130" height="54"></canvas>
                    </div>
                    <button type="submit" id="authSubmitBtn">${escapeHtml(tt('login'))}</button>
                    <div class="auth-switch-mode" id="authSwitchBtn">${escapeHtml(tt('noAccount'))}</div>
                </div>
            `;
            document.body.appendChild(modal);

            // 绑定关闭事件
            const closeBtn = modal.querySelector('.auth-close');
            closeBtn.onclick = () => closeAuthModal();
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAuthModal();
            });

            // 绑定切换模式
            const switchBtn = modal.querySelector('#authSwitchBtn');
            switchBtn.onclick = () => {
                const newMode = currentModalMode === 'login' ? 'register' : 'login';
                showLoginModal(newMode);
            };

            // 绑定提交按钮及涟漪效果
            const submitBtn = modal.querySelector('#authSubmitBtn');
            submitBtn.addEventListener('click', (e) => {
                createRipple(e);
                if (currentModalMode === 'login') handleLogin();
                else handleRegister();
            });

            // 绑定回车
            const usernameInput = modal.querySelector('#authUsername');
            const passwordInput = modal.querySelector('#authPassword');
            const captchaInput = modal.querySelector('#authCaptcha');
            usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
            passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
            captchaInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });

            // 验证码刷新：点击canvas即可刷新
            const canvas = modal.querySelector('#captchaCanvas');
            canvas.onclick = () => refreshCaptcha('captchaCanvas');
        }

        // 重置表单
        const usernameInput = document.getElementById('authUsername');
        const passwordInput = document.getElementById('authPassword');
        const captchaInput = document.getElementById('authCaptcha');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (captchaInput) captchaInput.value = '';
        refreshCaptcha('captchaCanvas');

        applyModalI18n(modal, mode);
        modal.classList.add('show');
    }

    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) modal.classList.remove('show');
    }

    window.showLoginModal = showLoginModal;
    window.closeAuthModal = closeAuthModal;

    function verifyCaptcha(inputCode) {
        return inputCode && inputCode.toLowerCase() === currentCaptcha.toLowerCase();
    }

    // 抖动辅助函数
    function shakeInvalidInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) shakeElement(input);
    }

    // ---------- 密码校验辅助函数 ----------
    async function verifyPassword(inputPassword, storedPassword, username) {
        // 新版：bcrypt 哈希
        if (storedPassword && (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$'))) {
            return await PasswordUtils.comparePassword(inputPassword, storedPassword);
        }
        // 旧版：明文密码 → 校验成功后自动迁移为哈希
        const isMatch = (storedPassword === inputPassword);
        if (isMatch) {
            const newHash = await PasswordUtils.hashPassword(inputPassword);
            const users = JSON.parse(localStorage.getItem('nonprofit_users') || '{}');
            if (users[username]) {
                users[username].password = newHash;
                localStorage.setItem('nonprofit_users', JSON.stringify(users));
                console.log('[Security] User "' + username + '" plain-text password upgraded to bcrypt hash');
            }
        }
        return isMatch;
    }

    // ---------- 登录逻辑（bcrypt 哈希校验）----------
    async function handleLogin() {
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const captcha = document.getElementById('authCaptcha').value.trim();

        if (!username || !password) {
            showToast(tt('pleaseFillUsernamePassword'));
            if (!username) shakeInvalidInput('authUsername');
            if (!password) shakeInvalidInput('authPassword');
            return;
        }
        if (!captcha) {
            showToast(tt('pleaseFillCaptcha'));
            shakeInvalidInput('authCaptcha');
            return;
        }
        if (!verifyCaptcha(captcha)) {
            showToast(tt('captchaError'));
            shakeInvalidInput('authCaptcha');
            refreshCaptcha('captchaCanvas');
            document.getElementById('authCaptcha').value = '';
            return;
        }

        const users = JSON.parse(localStorage.getItem('nonprofit_users') || '{}');
        const user = users[username];
        if (!user) {
            showToast(tt('usernameOrPasswordError'));
            shakeInvalidInput('authUsername');
            shakeInvalidInput('authPassword');
            return;
        }

        let isMatch = false;
        try {
            isMatch = await verifyPassword(password, user.password, username);
        } catch (err) {
            console.error('[Security] Password verification failed:', err);
            showToast(tt('securityError'));
            return;
        }

        if (!isMatch) {
            showToast(tt('usernameOrPasswordError'));
            shakeInvalidInput('authUsername');
            shakeInvalidInput('authPassword');
            return;
        }

        localStorage.setItem('current_username', username);
        updateAuthArea();
        closeAuthModal();
        showToast(tt('loginSuccess', { nickname: user.nickname || username }));
        if (window.location.pathname.includes('user.html')) {
            window.location.reload();
        }
    }

    // ---------- 注册逻辑（bcrypt 哈希存储）----------
    async function handleRegister() {
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const captcha = document.getElementById('authCaptcha').value.trim();

        if (!username || !password) {
            showToast(tt('pleaseFillUsernamePassword'));
            if (!username) shakeInvalidInput('authUsername');
            if (!password) shakeInvalidInput('authPassword');
            return;
        }
        if (!captcha) {
            showToast(tt('pleaseFillCaptcha'));
            shakeInvalidInput('authCaptcha');
            return;
        }
        if (!verifyCaptcha(captcha)) {
            showToast(tt('captchaError'));
            shakeInvalidInput('authCaptcha');
            refreshCaptcha('captchaCanvas');
            document.getElementById('authCaptcha').value = '';
            return;
        }

        const users = JSON.parse(localStorage.getItem('nonprofit_users') || '{}');
        if (users[username]) {
            showToast(tt('usernameExists'));
            shakeInvalidInput('authUsername');
            return;
        }

        // 使用 bcrypt 对密码哈希后存储（彻底移除明文存储逻辑）
        let passwordHash;
        try {
            passwordHash = await PasswordUtils.hashPassword(password);
        } catch (err) {
            console.error('[Security] Password hash failed:', err);
            showToast(tt('securityError'));
            return;
        }

        users[username] = {
            username: username,
            password: passwordHash,   // ← 不再明文存储密码
            nickname: username,
            avatar: 'static/img/placeholder.svg',
            phone: '',
            email: '',
            privacy: { showPhone: false, showEmail: false }
        };
        localStorage.setItem('nonprofit_users', JSON.stringify(users));
        localStorage.setItem('current_username', username);
        updateAuthArea();
        closeAuthModal();
        showToast(tt('registerSuccess'));
        if (window.location.pathname.includes('user.html')) {
            window.location.reload();
        }
    }

    window.authLogout = function() {
        showConfirm(tt('confirmLogout'), () => {
            localStorage.removeItem('current_username');
            updateAuthArea();
            showToast(tt('logoutSuccess'));
            if (window.location.pathname.includes('user.html')) {
                window.location.href = 'index.html';
            }
        });
    };

    // 监听语言切换：刷新已打开的模态框与导航栏区域
    document.addEventListener('lang:changed', () => {
        const modal = document.getElementById('authModal');
        if (modal) applyModalI18n(modal, currentModalMode);
        updateAuthArea();
    });

    function initAuth() {
        initUserStorage();
        updateAuthArea();
        // 公共导航栏（navbar.js）渲染完成后，重新填充 #authArea
        document.addEventListener('navbar:mounted', updateAuthArea);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();
