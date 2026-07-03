/* =============================================================
   公共导航栏脚本 navbar.js
   - 自动渲染 .top-bar DOM
   - 自动高亮当前页
   - 依赖 auth.js 提供 updateAuthArea()（在 auth.js 之后引入即可）
   - 依赖 i18n.js 提供翻译功能
   使用：在 body 顶部预留 <div id="navbarMount"></div> 占位，
        或在已有 .top-bar 容器上添加 data-navbar="auto"
   ============================================================= */
(function () {
    const NAV_ITEMS = [
        { key: 'index',        href: 'index.html',           i18nKey: 'navHome' },
        { key: 'performances', href: 'performances.html',    i18nKey: 'navPerformances' },
        { key: 'merchandise',  href: 'merchandise.html',     i18nKey: 'navMerchandise' },
        { key: 'knowledge',    href: 'knowledge-graph.html', i18nKey: 'navKnowledge' },
        { key: 'travel',       href: 'starmap.html',         i18nKey: 'navTravel' },
        { key: 'whereami',     href: 'whereami.html',        i18nKey: 'navWhereami' }
    ];

    function resolveHref(href) {
        const path = window.location.pathname;
        const inSubDir = path.split('/').filter(Boolean).length > 1 && !/index\.html$|[^/]+\.html$/.test(path);
        return href;
    }

    function getCurrentKey() {
        const file = (window.location.pathname.split('/').pop() || '').split('.')[0] || 'index';
        const map = {
            'history': 'history',
            'orders':  'orders',
            'user':    'user',
            'product': 'product',
            'knowledge-graph': 'knowledge',
            'starmap':  'travel',
            'travel':   'travel'
        };
        return map[file] || file;
    }

    function buildBarHTML(currentKey) {
        const itemsHTML = NAV_ITEMS.map(it => {
            const cls = 'nav-item' + (it.key === currentKey ? ' active' : '');
            return `<a href="${resolveHref(it.href)}" class="${cls}" data-page="${it.key}" data-i18n="${it.i18nKey}">${window.i18n?.t(it.i18nKey) || ''}</a>`;
        }).join('');

        return `
            <div class="logo">
                <img src="static/img/favicon_io/android-chrome-192x192.png" alt="China ICH" class="logo-img">
                <span data-i18n="siteTitle">${window.i18n?.t('siteTitle') || ''}</span>
            </div>
            <div class="nav-links">${itemsHTML}</div>
            <div class="auth-area" id="authArea">
                <div class="lang-switch-btn" id="langSwitchBtn" data-i18n="langSwitch">${window.i18n?.t('langSwitch') || '中文/En'}</div>
            </div>
        `;
    }

    function bindLangSwitch() {
        const langBtn = document.getElementById('langSwitchBtn');
        if (langBtn) {
            langBtn.removeEventListener('click', handleLangSwitch);
            langBtn.addEventListener('click', handleLangSwitch);
        }
    }

    function handleLangSwitch() {
        if (window.i18n) {
            const current = window.i18n.getLang();
            window.i18n.setLang(current === 'zh' ? 'en' : 'zh');
        }
    }

    function mount() {
        let mount = document.getElementById('navbarMount');
        let target;
        if (mount) {
            target = document.createElement('div');
            target.className = 'top-bar';
            target.innerHTML = buildBarHTML(getCurrentKey());
            mount.replaceWith(target);
        } else {
            target = document.querySelector('.top-bar');
            if (target) {
                target.innerHTML = buildBarHTML(getCurrentKey());
            }
        }
        bindLangSwitch();
        document.dispatchEvent(new CustomEvent('navbar:mounted', { detail: { root: target } }));
    }

    document.addEventListener('lang:changed', mount);
    document.addEventListener('auth:updated', bindLangSwitch);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
