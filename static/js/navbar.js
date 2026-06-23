/* =============================================================
   公共导航栏脚本 navbar.js
   - 自动渲染 .top-bar DOM
   - 自动高亮当前页
   - 依赖 auth.js 提供 updateAuthArea()（在 auth.js 之后引入即可）
   使用：在 body 顶部预留 <div id="navbarMount"></div> 占位，
        或在已有 .top-bar 容器上添加 data-navbar="auto"
   ============================================================= */
(function () {
    const NAV_ITEMS = [
        { key: 'index',        href: 'index.html',           label: '首页' },
        { key: 'performances', href: 'performances.html',    label: '票务演出' },
        { key: 'merchandise',  href: 'merchandise.html',     label: '文创周边' },
        { key: 'travel',       href: 'starmap.html',         label: '去旅游' },
        { key: 'knowledge',    href: 'knowledge-graph.html', label: '非遗图谱✨' },
        { key: 'whereami',     href: 'whereami.html',        label: '云旅游✨' }
    ];

    // 兼容子目录部署：如果当前页面 URL 含子路径，自动给 href 加前缀
    function resolveHref(href) {
        // 计算当前位置所在目录（仅在与 index.html 同级时返回空）
        const path = window.location.pathname;
        const inSubDir = path.split('/').filter(Boolean).length > 1 && !/index\.html$|[^/]+\.html$/.test(path);
        // 简单策略：若当前页面在根目录（大多数页面），href 不变
        return href;
    }

    function getCurrentKey() {
        const file = (window.location.pathname.split('/').pop() || '').split('.')[0] || 'index';
        // 特殊映射
        const map = {
            'history': 'history',     // 浏览记录（非导航项，但保留高亮能力）
            'orders':  'orders',
            'user':    'user',
            'product': 'product',
            'knowledge-graph': 'knowledge',
            'starmap':  'travel',     // 父页（皖韵星图）也归属「去旅游」板块
            'travel':   'travel'      // 子页（非遗线路列表）
        };
        return map[file] || file;
    }

    function buildBarHTML(currentKey) {
        const itemsHTML = NAV_ITEMS.map(it => {
            const cls = 'nav-item' + (it.key === currentKey ? ' active' : '');
            return `<a href="${resolveHref(it.href)}" class="${cls}" data-page="${it.key}">${it.label}</a>`;
        }).join('');

        return `
            <div class="logo">
                <img src="static/img/favicon_io/android-chrome-192x192.png" alt="华夏非遗" class="logo-img">
                华夏非遗 · 薪火相传
            </div>
            <div class="nav-links">${itemsHTML}</div>
            <div class="auth-area" id="authArea"></div>
        `;
    }

    function mount() {
        // 找到挂载点
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
        // 派发自定义事件，auth.js 可监听后重新渲染 #authArea
        // （navbar.js 本身不直接调用 updateAuthArea，避免依赖注入顺序）
        document.dispatchEvent(new CustomEvent('navbar:mounted', { detail: { root: target } }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
