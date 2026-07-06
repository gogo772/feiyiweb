(function() {
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function tt(key, params) {
        return (window.i18n && window.i18n.t) ? window.i18n.t(key, params) : key;
    }

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

    function isUserPage() {
        return window.location.pathname.includes('user.html');
    }

    async function fetchUserInfo() {
        try {
            const response = await fetch('/api/user', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('current_username', data.username);
                    localStorage.setItem('current_nickname', data.nickname);
                    localStorage.setItem('current_avatar', data.avatar);
                    return data;
                }
            }
        } catch (err) {
            console.error('获取用户信息失败:', err);
        }
        return null;
    }

    function updateAuthArea() {
        const authArea = document.getElementById('authArea');
        if (!authArea) return;

        const currentUser = localStorage.getItem('current_username');
        const nickname = localStorage.getItem('current_nickname') || currentUser;

        if (currentUser) {
            authArea.innerHTML = `
                <div class="lang-switch-btn" id="langSwitchBtn" data-i18n="langSwitch">${escapeHtml(tt('langSwitch'))}</div>
                <div class="user-menu-container">
                    <span class="user-welcome" id="userWelcomeBtn">
                        <i class="fas fa-user"></i> ${escapeHtml(nickname)}
                        <i class="fas fa-chevron-down"></i>
                    </span>
                    <div class="user-dropdown-menu" id="userDropdownMenu">
                        <a href="user.html" class="dropdown-item">
                            <i class="fas fa-user-circle"></i> ${escapeHtml(tt('personalCenter'))}
                        </a>
                        <button id="logoutBtn" class="dropdown-item logout-btn">
                            <i class="fas fa-sign-out-alt"></i> ${escapeHtml(tt('logout'))}
                        </button>
                    </div>
                </div>
            `;

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.onclick = () => {
                    showConfirm(tt('confirmLogout'), () => {
                        handleLogout();
                    });
                };
            }

            const userMenuContainer = document.querySelector('.user-menu-container');
            const userDropdownMenu = document.getElementById('userDropdownMenu');
            if (userMenuContainer && userDropdownMenu) {
                userMenuContainer.addEventListener('mouseenter', () => {
                    userDropdownMenu.classList.add('show');
                });
                userMenuContainer.addEventListener('mouseleave', () => {
                    userDropdownMenu.classList.remove('show');
                });
            }
        } else {
            authArea.innerHTML = `
                <div class="lang-switch-btn" id="langSwitchBtn" data-i18n="langSwitch">${escapeHtml(tt('langSwitch'))}</div>
                <button id="showLoginBtn" class="login-btn" style="background: #b22234;">${escapeHtml(tt('loginRegister'))}</button>
            `;
            const loginBtn = document.getElementById('showLoginBtn');
            if (loginBtn) loginBtn.onclick = () => showLoginModal();
        }
        document.dispatchEvent(new CustomEvent('auth:updated'));
    }

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
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * w, Math.random() * h);
            ctx.lineTo(Math.random() * w, Math.random() * h);
            ctx.strokeStyle = `rgba(100, 70, 40, ${Math.random() * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        for (let i = 0; i < 60; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
        }
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

    function shakeElement(element) {
        if (!element) return;
        element.classList.add('shake');
        setTimeout(() => element.classList.remove('shake'), 500);
    }

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
            modal.innerHTML = `
                <div class="auth-container">
                    <span class="auth-close">&times;</span>
                    <h2 id="authModalTitle">${escapeHtml(tt('login'))}</h2>
                    <label data-i18n-role="username-label" class="form-label">${escapeHtml(tt('username'))}</label>
                    <div class="input-group">
                        <input type="text" id="authUsername" autocomplete="off">
                    </div>
                    <label data-i18n-role="password-label" class="form-label">${escapeHtml(tt('password'))}</label>
                    <div class="input-group">
                        <input type="password" id="authPassword" autocomplete="off">
                    </div>
                    <label data-i18n-role="captcha-label" class="form-label">${escapeHtml(tt('captcha'))}</label>
                    <div class="captcha-row">
                        <div class="input-group">
                            <input type="text" id="authCaptcha" autocomplete="off">
                        </div>
                        <canvas id="captchaCanvas" class="captcha-canvas" width="130" height="54"></canvas>
                    </div>
                    <button type="submit" id="authSubmitBtn">${escapeHtml(tt('login'))}</button>
                    <div class="auth-switch-mode" id="authSwitchBtn">${escapeHtml(tt('noAccount'))}</div>
                </div>
            `;
            document.body.appendChild(modal);

            const closeBtn = modal.querySelector('.auth-close');
            closeBtn.onclick = () => closeAuthModal();
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAuthModal();
            });

            const switchBtn = modal.querySelector('#authSwitchBtn');
            switchBtn.onclick = () => {
                const newMode = currentModalMode === 'login' ? 'register' : 'login';
                showLoginModal(newMode);
            };

            const submitBtn = modal.querySelector('#authSubmitBtn');
            submitBtn.addEventListener('click', (e) => {
                createRipple(e);
                if (currentModalMode === 'login') handleLogin();
                else handleRegister();
            });

            const usernameInput = modal.querySelector('#authUsername');
            const passwordInput = modal.querySelector('#authPassword');
            const captchaInput = modal.querySelector('#authCaptcha');
            usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
            passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
            captchaInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });

            const canvas = modal.querySelector('#captchaCanvas');
            canvas.onclick = () => refreshCaptcha('captchaCanvas');
        }

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

    function shakeInvalidInput(inputId) {
        const input = document.getElementById(inputId);
        if (input) shakeElement(input);
    }

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

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('current_username', data.username);
                localStorage.setItem('current_nickname', data.nickname);
                localStorage.setItem('current_avatar', data.avatar);
                updateAuthArea();
                closeAuthModal();
                showToast(tt('loginSuccess', { nickname: data.nickname || username }));
                if (window.location.pathname.includes('user.html')) {
                    window.location.reload();
                }
            } else {
                showToast(data.error || tt('usernameOrPasswordError'));
                shakeInvalidInput('authUsername');
                shakeInvalidInput('authPassword');
            }
        } catch (err) {
            console.error('登录失败:', err);
            showToast(tt('networkError'));
        }
    }

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

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem('current_username', username);
                localStorage.setItem('current_nickname', username);
                localStorage.setItem('current_avatar', '/static/img/placeholder.svg');
                updateAuthArea();
                closeAuthModal();
                showToast(tt('registerSuccess'));
                if (window.location.pathname.includes('user.html')) {
                    window.location.reload();
                }
            } else {
                showToast(data.error || tt('registerFailed'));
                if (data.error === '用户名已存在') {
                    shakeInvalidInput('authUsername');
                }
            }
        } catch (err) {
            console.error('注册失败:', err);
            showToast(tt('networkError'));
        }
    }

    async function handleLogout() {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('退出失败:', err);
        }
        localStorage.removeItem('current_username');
        localStorage.removeItem('current_nickname');
        localStorage.removeItem('current_avatar');
        updateAuthArea();
        showToast(tt('logoutSuccess'));
        if (window.location.pathname.includes('user.html')) {
            window.location.href = 'index.html';
        }
    }

    window.authLogout = function() {
        showConfirm(tt('confirmLogout'), () => {
            handleLogout();
        });
    };

    document.addEventListener('lang:changed', () => {
        const modal = document.getElementById('authModal');
        if (modal) applyModalI18n(modal, currentModalMode);
        updateAuthArea();
    });

    async function initAuth() {
        await fetchUserInfo();
        updateAuthArea();
        document.addEventListener('navbar:mounted', updateAuthArea);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();