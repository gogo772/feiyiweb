// ==================== 可复用侧边栏公共组件 ====================
// 用法：
//   1. 基础用法（自动初始化，使用默认配置）：
//      <script src="static/js/sidebar.js"></script>
//
//   2. 自定义配置：
//      <script src="static/js/sidebar.js"></script>
//      <script>
//        Sidebar.init({
//          position: 'right',
//          showNotice: true,
//          showWechat: true,
//          showDeepseek: true,
//          showGoTop: true,
//          wechatQrUrl: 'static/img/11111.jpg',
//          wechatIcon: 'static/img/02.jpg',
//          deepseekIcon: 'static/img/头像01.jpg',
//          notices: [...],
//          customButtons: [...],
//          theme: {...}
//        });
//      </script>
//
//   3. 通过 data-* 属性配置（在 script 标签上）：
//      <script src="static/js/sidebar.js" data-show-notice="true" data-position="right"></script>


(function(global) {
    'use strict';

    // ========== 默认配置 ==========
    const DEFAULTS = {
        position: 'right',
        top: '50%',
        showNotice: true,
        showWechat: false,
        showDeepseek: true,
        showGoTop: true,
        autoInit: true,
        siteName: '华夏非遗 · 薪火相传',
        wechatQrUrl: '/static/img/11111.jpg',
        wechatIcon: '/static/img/02.jpg',
        deepseekIcon: '/static/img/头像01.jpg',
        pulseAnimation: true,
        bodyPadding: true,
        notices: [
            { id: 0, name: '京剧《贵妃醉酒》', time: '2025-05-01 19:30', place: '北京长安大戏院', price: 380 },
            { id: 1, name: '昆曲《牡丹亭》', time: '2025-05-15 19:00', place: '上海大剧院', price: 280 },
            { id: 2, name: '高甲戏《连升三级》', time: '2025-06-10 19:30', place: '广州粤剧院', price: 180 },
            { id: 3, name: '黄梅戏《天仙配》', time: '2025-05-20 15:00', place: '南京紫金大戏院', price: 120 },
            { id: 4, name: '越剧《梁祝》', time: '2025-07-01 19:00', place: '成都锦江剧场', price: 260 }
        ],
        customButtons: [],
        theme: {
            sidebarBg: 'rgba(22, 26, 36, 0.85)',
            buttonBg: 'rgba(255,255,255,0.72)',
            buttonHoverBg: 'rgba(255,255,255,0.94)',
            buttonActiveBg: 'linear-gradient(135deg, #e34040, #c92a2a)',
            textColor: '#1f2a36',
            textHoverColor: '#b12222',
            borderRadius: '24px'
        },
        i18n: {
            notice: '公告',
            wechat: '公众号',
            deepseek: '助手',
            goTop: '顶部',
            noticeTitle: '✨ 近期重要演出',
            close: '关闭',
            scanFollow: '扫码关注'
        }
    };

    // ========== 组件状态 ==========
    let instance = null;
    let initialized = false;
    let config = {};

    // ========== i18n 集成 ==========
    const I18N_KEYS = {
        notice: 'sidebarNotice',
        wechat: 'sidebarWechat',
        deepseek: 'sidebarDeepseek',
        goTop: 'sidebarGoTop',
        noticeTitle: 'sidebarNoticeTitle',
        close: 'sidebarClose',
        scanFollow: 'sidebarScanFollow'
    };

    function getI18nText(key, fallback) {
        if (global.i18n && typeof global.i18n.t === 'function') {
            const translated = global.i18n.t(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return fallback;
    }

    function resolveI18n(cfg) {
        const resolved = {};
        for (const [key, fallback] of Object.entries(cfg.i18n)) {
            const i18nKey = I18N_KEYS[key] || key;
            resolved[key] = getI18nText(i18nKey, fallback);
        }
        return { ...cfg, i18n: resolved };
    }

    const NOTICE_I18N_KEY_MAP = {
        name: 'perf_name',
        place: 'perf_addr'
    };

    function getNoticeText(perf, key) {
        const i18nPrefix = NOTICE_I18N_KEY_MAP[key] || `perf_${key}`;
        const i18nKey = `${i18nPrefix}_${perf.id}`;
        const translated = getI18nText(i18nKey, perf[key]);
        return translated;
    }

    function updateNoticeList(cfg) {
        const listContainer = document.querySelector('#noticeList');
        if (!listContainer) return;

        const currency = getI18nText('currencySymbol', '¥');
        listContainer.innerHTML = cfg.notices.map(perf => {
            const name = getNoticeText(perf, 'name');
            const place = getNoticeText(perf, 'place');
            return `
                <div class="notice-item" data-id="${perf.id}" data-name="${name.replace(/['"]/g, '')}">
                    <strong>🎭 ${name}</strong>
                    <div class="detail">📅 ${perf.time} &nbsp;|&nbsp; 📍 ${place} &nbsp;|&nbsp; 💰 ${currency}${perf.price}</div>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.notice-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                window.location.href = `product.html?id=${id}&type=performance`;
            });
        });
    }

    function updateSidebarTexts() {
        if (!initialized) return;

        const cfg = resolveI18n(config);
        const i18n = cfg.i18n;

        const noticeLabel = document.querySelector('#sidebarNoticeBtn .btn-label');
        if (noticeLabel) noticeLabel.textContent = i18n.notice;

        const wechatLabel = document.querySelector('#sidebarWechatBtn .btn-label');
        if (wechatLabel) wechatLabel.textContent = i18n.wechat;

        const wechatImg = document.querySelector('#sidebarWechatBtn .sidebar-icon');
        if (wechatImg) wechatImg.alt = i18n.wechat;

        const wechatScan = document.querySelector('#sidebarWechatBtn .wechat-qr-hover p');
        if (wechatScan) wechatScan.textContent = i18n.scanFollow;

        const deepseekLabel = document.querySelector('#sidebarDeepseekBtn .btn-label');
        if (deepseekLabel) deepseekLabel.textContent = i18n.deepseek;

        const goTopLabel = document.querySelector('#sidebarGoTopBtn .btn-label');
        if (goTopLabel) goTopLabel.textContent = i18n.goTop;

        const noticeTitle = document.querySelector('.notice-modal h3');
        if (noticeTitle) noticeTitle.textContent = i18n.noticeTitle;

        const closeBtn = document.querySelector('.notice-modal .close-modal');
        if (closeBtn) closeBtn.textContent = i18n.close;

        updateNoticeList(cfg);
    }

    function initI18nListener() {
        document.addEventListener('lang:changed', () => {
            updateSidebarTexts();
        });
    }

    // ========== 样式注入 ==========
    function injectStyles(cfg) {
        if (document.getElementById('sidebar-component-styles')) return;

        const style = document.createElement('style');
        style.id = 'sidebar-component-styles';
        style.textContent = `
    .sidebar-icon {
        width: 28px;
        height: 28px;
        object-fit: cover;
        display: block;
        border-radius: 50%;
        transition: all 0.2s ease;
        border: 1.5px solid rgba(255, 217, 102, 0.55);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
        background: rgba(0, 0, 0, 0.15);
    }
    .dynamic-sidebar:hover .sidebar-icon {
        width: 30px;
        height: 30px;
    }
    .sidebar-btn .btn-emoji img.sidebar-icon {
        object-fit: cover;
    }
    @media (max-width: 640px) {
        .sidebar-icon { width: 24px; height: 24px; }
        .dynamic-sidebar:hover .sidebar-icon { width: 26px; height: 26px; }
    }
    .sidebar-btn .btn-emoji {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    body.sidebar-enabled {
        padding-right: 75px !important;
        transition: padding-right 0.2s;
    }
    body.sidebar-enabled.sidebar-left {
        padding-right: 0 !important;
        padding-left: 75px !important;
    }
    @media (max-width: 640px) {
        body.sidebar-enabled { padding-right: 65px !important; }
        body.sidebar-enabled.sidebar-left { padding-right: 0 !important; padding-left: 65px !important; }
    }
    .dynamic-sidebar {
        position: fixed;
        top: ${cfg.top};
        right: ${cfg.position === 'right' ? '0' : 'auto'};
        left: ${cfg.position === 'left' ? '0' : 'auto'};
        transform: translateY(-50%) translateX(${cfg.position === 'right' ? '38px' : '-38px'});
        width: 68px;
        backdrop-filter: blur(14px);
        border-radius: ${cfg.position === 'right' ? '28px 0 0 28px' : '0 28px 28px 0'};
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 18px 8px;
        z-index: 1000;
        box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.25);
        border-${cfg.position === 'right' ? 'right' : 'left'}: none;
        transition: all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        cursor: default;
        font-family: 'Segoe UI', 'Noto Sans CJK SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }
    .dynamic-sidebar:hover {
        transform: translateY(-50%) translateX(0);
        width: 220px;
        background: ${cfg.theme.sidebarBg};
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 32px -12px rgba(0,0,0,0.3);
    }
    .sidebar-btn {
        width: 50px;
        min-height: 56px;
        background: ${cfg.theme.buttonBg};
        backdrop-filter: blur(4px);
        border: none;
        border-radius: ${cfg.theme.borderRadius};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
        color: ${cfg.theme.textColor};
        font-size: 0.7rem;
        font-weight: 500;
        transition: all 0.25s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.02);
        font-family: inherit;
        letter-spacing: 0.3px;
        border: 0.5px solid rgba(255,255,255,0.6);
    }
    .sidebar-btn .btn-emoji {
        font-size: 1.65rem;
        line-height: 1;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.1));
    }
    .sidebar-btn .btn-label {
        font-size: 0.72rem;
        font-weight: 600;
        text-align: center;
        line-height: 1.3;
        letter-spacing: 0.8px;
        max-width: 56px;
        word-break: keep-all;
        color: #2c3e3f;
        font-family: inherit;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        display: block;
        margin: 0 auto;
    }
    .sidebar-btn:hover:not(.active) {
        background: ${cfg.theme.buttonHoverBg};
        transform: translateX(${cfg.position === 'right' ? '-2px' : '2px'}) scale(1.02);
        color: ${cfg.theme.textHoverColor};
    }
    .sidebar-btn:active { transform: scale(0.96); }
    .sidebar-btn.active {
        background: ${cfg.theme.buttonActiveBg};
        color: white;
        box-shadow: 0 8px 16px -4px rgba(201,42,42,0.4);
    }
    .sidebar-btn.active .btn-label { color: white; }
    .dynamic-sidebar:hover .sidebar-btn {
        width: 75%;
        flex-direction: row;
        justify-content: center;
        padding-${cfg.position === 'right' ? 'left' : 'right'}: 12px;
        padding-${cfg.position === 'right' ? 'right' : 'left'}: 12px;
        gap: 10px;
        min-height: 48px;
        border-radius: 40px;
    }
    .dynamic-sidebar:hover .sidebar-btn .btn-label {
        font-size: 0.78rem;
        max-width: none;
        flex: 1;
        text-align: center;
        letter-spacing: 0.3px;
        margin: 0;
        white-space: nowrap;
        overflow: visible;
    }
    .dynamic-sidebar:hover .sidebar-btn .btn-emoji { font-size: 1.4rem; }
    .wechat-qr-hover {
        position: absolute;
        ${cfg.position === 'right' ? 'left' : 'right'}: -120px;
        top: 50%;
        transform: translateY(-50%);
        width: 110px;
        background: white;
        border-radius: 16px;
        padding: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        text-align: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s;
        pointer-events: none;
        z-index: 1001;
    }
    .wechat-qr-hover img { width: 100%; border-radius: 8px; }
    .wechat-qr-hover p { font-size: 12px; margin: 6px 0 0; color: #333; }
    .sidebar-btn.wechat-btn { position: relative; }
    .sidebar-btn.wechat-btn:hover .wechat-qr-hover { opacity: 1; visibility: visible; }
    .notice-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
        z-index: 2000;
        display: none;
        align-items: center;
        justify-content: center;
    }
    .notice-modal .modal-content {
        background: #fffef7;
        max-width: 500px;
        width: 90%;
        border-radius: 32px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        animation: fadeInUp 0.3s;
    }
    .notice-modal h3 {
        font-size: 1.6rem;
        color: #8b3c1c;
        margin-bottom: 16px;
        border-left: 5px solid #c41e3a;
        padding-left: 15px;
    }
    .notice-list { max-height: 400px; overflow-y: auto; }
    .notice-item {
        padding: 12px 0;
        border-bottom: 1px solid #f0e4d0;
        cursor: pointer;
        transition: 0.2s;
    }
    .notice-item:hover { background: #fef3e4; padding-left: 10px; }
    .notice-item strong { display: block; font-size: 1rem; color: #5a2e1a; }
    .notice-item .detail { font-size: 0.8rem; color: #888; margin-top: 5px; }
    .close-modal {
        background: #8b3c1c;
        color: white;
        border: none;
        margin-top: 20px;
        padding: 10px 20px;
        border-radius: 40px;
        cursor: pointer;
        width: 100%;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px);}
        to { opacity: 1; transform: translateY(0);}
    }
    .dynamic-sidebar::before {
        content: '';
        position: absolute;
        ${cfg.position === 'right' ? 'left' : 'right'}: -2px;
        top: 20%;
        height: 60%;
        width: 4px;
        background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,150,150,0.5), rgba(255,255,255,0.2));
        border-radius: 4px;
        pointer-events: none;
    }
    .dynamic-sidebar:hover::before { opacity: 0; }
    .dynamic-sidebar::after {
        content: '';
        position: absolute;
        ${cfg.position === 'right' ? 'right' : 'left'}: 4px;
        top: 50%;
        width: 4px;
        height: 28px;
        background: rgba(255,245,210,0.7);
        border-radius: 4px;
        transform: translateY(-50%);
        transition: 0.2s;
        pointer-events: none;
    }
    .dynamic-sidebar:hover::after { opacity: 0; width: 0; }
    @media (max-width: 640px) {
        .dynamic-sidebar { width: 62px; padding: 12px 6px; gap: 8px; }
        .dynamic-sidebar:hover { width: 160px; }
        .sidebar-btn { width: 48px; min-height: 56px; }
        .sidebar-btn .btn-label { font-size: 0.68rem; letter-spacing: 0.5px; }
    }
    `;
        document.head.appendChild(style);
    }

    // ========== 构建按钮 HTML ==========
    function buildButtons(cfg) {
        const buttons = [];

        if (cfg.showNotice) {
            buttons.push(`
    <button class="sidebar-btn" id="sidebarNoticeBtn">
        <div class="btn-emoji">📢</div>
        <span class="btn-label">${cfg.i18n.notice}</span>
    </button>`);
        }


        if (cfg.showWechat) {
            buttons.push(`
    <button class="sidebar-btn wechat-btn" id="sidebarWechatBtn">
        <div class="btn-emoji">
            <img src="${cfg.wechatIcon}" alt="${cfg.i18n.wechat}" class="sidebar-icon">
        </div>
        <span class="btn-label">${cfg.i18n.wechat}</span>
        <div class="wechat-qr-hover">
            <img src="${cfg.wechatQrUrl}" alt="二维码">
            <p>${cfg.i18n.scanFollow}</p>
        </div>
    </button>`);
        }

        if (cfg.showDeepseek) {
            buttons.push(`
    <button class="sidebar-btn" id="sidebarDeepseekBtn">
        <div class="btn-emoji">
            <img src="${cfg.deepseekIcon}" alt="AI助手" class="sidebar-icon">
        </div>
        <span class="btn-label">${cfg.i18n.deepseek}</span>
    </button>`);
        }

        if (cfg.customButtons && cfg.customButtons.length > 0) {
            cfg.customButtons.forEach(btn => {
                buttons.push(`
    <button class="sidebar-btn ${btn.className || ''}" id="${btn.id || ''}" data-action="${btn.action || ''}">
        <div class="btn-emoji">${btn.icon || ''}</div>
        <span class="btn-label">${btn.label || ''}</span>
    </button>`);
            });
        }

        if (cfg.showGoTop) {
            buttons.push(`
    <button class="sidebar-btn" id="sidebarGoTopBtn">
        <div class="btn-emoji">⬆️</div>
        <span class="btn-label">${cfg.i18n.goTop}</span>
    </button>`);
        }

        return buttons.join('\n');
    }

    // ========== 创建侧边栏 DOM ==========
    function createSidebar(cfg) {
        const sidebar = document.createElement('div');
        sidebar.className = 'dynamic-sidebar';
        sidebar.id = 'dynamicSidebar';
        sidebar.innerHTML = buildButtons(cfg);
        document.body.appendChild(sidebar);
        return sidebar;
    }

    // ========== 公告弹窗 ==========
    function showNoticeModal(cfg) {
        let modal = document.querySelector('.notice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'notice-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${cfg.i18n.noticeTitle}</h3>
                    <div class="notice-list" id="noticeList"></div>
                    <button class="close-modal">${cfg.i18n.close}</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }
        updateNoticeList(cfg);
        modal.style.display = 'flex';
    }

    // ========== 绑定事件 ==========
    function bindEvents(cfg) {
        if (cfg.showNotice) {
            const noticeBtn = document.getElementById('sidebarNoticeBtn');
            if (noticeBtn) {
                noticeBtn.addEventListener('click', () => showNoticeModal(cfg));
            }
        }

        if (cfg.showDeepseek) {
            const deepseekBtn = document.getElementById('sidebarDeepseekBtn');
            const chatWindow = document.getElementById('aiChatWindow');
            const closeChat = document.getElementById('closeChat');
            if (deepseekBtn && chatWindow) {
                deepseekBtn.addEventListener('click', () => {
                    chatWindow.style.display = 'flex';
                });
            }
            if (closeChat) {
                closeChat.addEventListener('click', () => {
                    chatWindow.style.display = 'none';
                });
            }
            const oldDeepseekBtn = document.querySelector('.top-bar .deepseek-btn');
            if (oldDeepseekBtn) oldDeepseekBtn.style.display = 'none';
        }

        if (cfg.showGoTop) {
            const goTopBtn = document.getElementById('sidebarGoTopBtn');
            if (goTopBtn) {
                goTopBtn.addEventListener('click', () => {
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    setTimeout(() => {
                        window.scrollTo(0, 0);
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                    }, 150);
                });
            }
        }

        if (cfg.customButtons && cfg.customButtons.length > 0) {
            cfg.customButtons.forEach(btn => {
                if (btn.id && btn.onClick && typeof btn.onClick === 'function') {
                    const el = document.getElementById(btn.id);
                    if (el) {
                        el.addEventListener('click', btn.onClick);
                    }
                }
            });
        }
    }

    // ========== 脉冲动画 ==========
    function playPulseAnimation() {
        setTimeout(() => {
            const sb = document.querySelector('.dynamic-sidebar');
            if (sb) {
                sb.style.boxShadow = '0 0 0 2px rgba(217, 43, 43, 0.4), 0 12px 28px -8px rgba(0,0,0,0.2)';
                setTimeout(() => { sb.style.boxShadow = ''; }, 500);
            }
        }, 500);
    }

    // ========== 从 script 标签读取 data-* 配置 ==========
    function readScriptDataConfig() {
        const scripts = document.querySelectorAll('script[src*="sidebar.js"]');
        if (scripts.length === 0) return {};
        const script = scripts[scripts.length - 1];
        const dataCfg = {};
        const boolAttrs = ['show-notice', 'show-wechat', 'show-deepseek', 'show-go-top', 'auto-init', 'pulse-animation', 'body-padding'];
        boolAttrs.forEach(attr => {
            const val = script.getAttribute(`data-${attr}`);
            if (val !== null) {
                const key = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                dataCfg[key] = val === 'true';
            }
        });
        const strAttrs = ['position', 'top', 'wechat-qr-url', 'wechat-icon', 'deepseek-icon'];
        strAttrs.forEach(attr => {
            const val = script.getAttribute(`data-${attr}`);
            if (val !== null) {
                const key = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                dataCfg[key] = val;
            }
        });
        return dataCfg;
    }

    // ========== 深度合并配置 ==========
    function deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // ========== 公共 API ==========
    const Sidebar = {
        init(options = {}) {
            if (initialized) {
                console.warn('[Sidebar] 已经初始化，如需重新配置请先调用 Sidebar.destroy()');
                return this;
            }

            const scriptDataCfg = readScriptDataConfig();
            config = deepMerge(deepMerge(DEFAULTS, scriptDataCfg), options);
            config = resolveI18n(config);

            injectStyles(config);

            if (config.bodyPadding) {
                document.body.classList.add('sidebar-enabled');
                if (config.position === 'left') {
                    document.body.classList.add('sidebar-left');
                }
            }

            instance = createSidebar(config);

            const init = () => {
                bindEvents(config);
                initI18nListener();
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }

            if (config.pulseAnimation) {
                playPulseAnimation();
            }

            initialized = true;
            return this;
        },

        destroy() {
            if (!initialized) return this;
            const sb = document.getElementById('dynamicSidebar');
            if (sb) sb.remove();
            const modal = document.querySelector('.notice-modal');
            if (modal) modal.remove();
            const styles = document.getElementById('sidebar-component-styles');
            if (styles) styles.remove();
            document.body.classList.remove('sidebar-enabled', 'sidebar-left');
            instance = null;
            initialized = false;
            config = {};
            return this;
        },

        setOption(key, value) {
            if (!initialized) {
                console.warn('[Sidebar] 请先调用 Sidebar.init()');
                return this;
            }
            if (typeof key === 'object') {
                config = deepMerge(config, key);
            } else {
                config[key] = value;
            }
            this.destroy();
            this.init(config);
            return this;
        },

        getConfig() {
            return { ...config };
        },

        showNotice() {
            if (initialized) showNoticeModal(config);
            return this;
        },

        scrollToTop() {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            return this;
        },

        isInitialized() {
            return initialized;
        }
    };

    // ========== 自动初始化 ==========
    if (global.Sidebar === undefined) {
        global.Sidebar = Sidebar;

        const autoInit = () => {
            const scriptCfg = readScriptDataConfig();
            const shouldAutoInit = scriptCfg.autoInit !== false && DEFAULTS.autoInit;
            if (shouldAutoInit) {
                Sidebar.init();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit);
        } else {
            autoInit();
        }
    }

})(window);
