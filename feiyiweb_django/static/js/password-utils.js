// password-utils.js — 密码安全哈希模块（P0 安全加固）
// 使用 bcryptjs 对密码进行哈希，替换明文存储
// bcryptjs 通过 CDN 按需加载，避免所有页面硬编码 script 标签
(function() {
    'use strict';

    const BCRYPT_CDN = 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js';
    const SALT_ROUNDS = 10;

    let bcryptReady = false;
    let loadPromise = null;

    /**
     * 动态加载 bcryptjs CDN（全局仅加载一次）
     * @returns {Promise<void>}
     */
    function ensureBcrypt() {
        // 已加载
        if (bcryptReady && window.dcodeIO && window.dcodeIO.bcrypt) {
            return Promise.resolve();
        }
        // 正在加载中，复用同一个 Promise
        if (loadPromise) {
            return loadPromise;
        }
        // 开始加载
        loadPromise = new Promise((resolve, reject) => {
            // 避免重复加载
            if (document.querySelector('script[data-bcryptjs]')) {
                bcryptReady = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = BCRYPT_CDN;
            script.setAttribute('data-bcryptjs', 'true');
            script.async = true;

            script.onload = () => {
                bcryptReady = true;
                console.log('[安全] bcryptjs 密码哈希库加载完成');
                resolve();
            };

            script.onerror = () => {
                loadPromise = null; // 允许重试
                console.error('[安全] bcryptjs 加载失败，密码功能不可用');
                reject(new Error('bcryptjs 加载失败'));
            };

            document.head.appendChild(script);
        });

        return loadPromise;
    }

    /**
     * 对密码进行 bcrypt 哈希
     * @param {string} password 明文密码
     * @returns {Promise<string>} bcrypt 哈希字符串（$2a$ 前缀）
     */
    async function hashPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('密码不能为空');
        }

        await ensureBcrypt();

        // bcryptjs 在浏览器中使用同步 API（异步 API 在 Node 环境）
        const salt = window.dcodeIO.bcrypt.genSaltSync(SALT_ROUNDS);
        const hash = window.dcodeIO.bcrypt.hashSync(password, salt);
        return hash;
    }

    /**
     * 校验密码是否匹配哈希
     * @param {string} password 明文密码（用户输入）
     * @param {string} hash 存储的 bcrypt 哈希
     * @returns {Promise<boolean>} 是否匹配
     */
    async function comparePassword(password, hash) {
        if (!password || !hash) return false;

        await ensureBcrypt();
        return window.dcodeIO.bcrypt.compareSync(password, hash);
    }

    /**
     * 将现有的明文密码升级为哈希（迁移用）
     * @param {string} userData JSON 字符串形式的用户数据
     * @returns {Promise<object>} 迁移后的用户对象
     */
    async function migratePlainPassword(userDataStr) {
        const user = JSON.parse(userDataStr || '{}');
        if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
            console.log(`[安全] 为用户 "${user.username}" 自动升级密码哈希`);
            user.password = await hashPassword(user.password);
        }
        return user;
    }

    // 暴露到全局
    window.PasswordUtils = {
        hashPassword,
        comparePassword,
        migratePlainPassword
    };
})();
