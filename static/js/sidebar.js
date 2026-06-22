// ==================== 动态侧边栏（公告｜公众号｜DeepSeek｜回顶） ====================
(function() {
    // ---------- 配置项 ----------
    const wechatQrUrl = 'img/qrcode.jpg';            // 微信公众号二维码图片路径
    const siteName = '华夏非遗 · 薪火相传';

    // 公告通知中的演出数据（可自行修改或从已有数据中获取）
    const noticePerformances = [
        { id: 0, name: '京剧《贵妃醉酒》', time: '2025-05-01 19:30', place: '国家大剧院', price: 380 },
        { id: 1, name: '昆曲《牡丹亭》', time: '2025-05-15 19:00', place: '上海大剧院', price: 280 },
        { id: 2, name: '高甲戏《连升三级》', time: '2025-06-10 19:30', place: '福建泉州梨园古典剧院', price: 180 },
        { id: 3, name: '皮影戏《西游记》专场', time: '2025-05-20 15:00', place: '北京皮影剧团', price: 120 },
        { id: 4, name: '非遗综合展演', time: '2025-07-01 19:00', place: '广州大剧院', price: 260 }
    ];

    // ---------- 动态添加样式（毛玻璃侧边栏 + 悬浮展开 + 二维码浮层等） ----------
    const style = document.createElement('style');
    style.textContent = `
    /* 侧边栏内自定义图标图片样式 —— 自动适配大小 */
    .sidebar-icon {
        width: 28px;
        height: 28px;
        object-fit: contain;
        display: block;
        transition: all 0.2s ease;
    }

    /* 当侧边栏悬浮展开时，图标略微缩小，保持视觉平衡 */
    .dynamic-sidebar:hover .sidebar-icon {
        width: 24px;
        height: 24px;
    }

    /* 移动端适配 */
    @media (max-width: 640px) {
        .sidebar-icon {
            width: 24px;
            height: 24px;
        }
        .dynamic-sidebar:hover .sidebar-icon {
            width: 20px;
            height: 20px;
        }
    }

    /* 确保图标在按钮内垂直居中 */
    .sidebar-btn .btn-emoji {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* 预留右侧空间，避免侧边栏遮挡内容（自动添加） */
    body {
        padding-right: 75px !important;
        transition: padding-right 0.2s;
    }
    @media (max-width: 640px) {
        body {
            padding-right: 65px !important;
        }
    }

    /* 侧边栏主容器 */
    .dynamic-sidebar {
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%) translateX(38px);
        width: 68px;
        backdrop-filter: blur(14px);
        border-radius: 28px 0 0 28px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 18px 8px;
        z-index: 1000;
        box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.25);
        border-right: none;
        transition: all 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        cursor: default;
        font-family: 'Segoe UI', 'Noto Sans CJK SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif;
    }
    .dynamic-sidebar:hover {
        transform: translateY(-50%) translateX(0);
        width: 180px;
        background: rgba(22, 26, 36, 0.85);
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 32px -12px rgba(0,0,0,0.3);
    }

    /* 侧边栏按钮通用样式 */
    .sidebar-btn {
        width: 52px;
        min-height: 64px;
        background: rgba(255,255,255,0.72);
        backdrop-filter: blur(4px);
        border: none;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        color: #1f2a36;
        font-size: 0.7rem;
        font-weight: 500;
        transition: all 0.2s ease;
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
    /* ========== 增强字体样式 & 完美居中 ========== */
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
        background: rgba(255,255,255,0.94);
        transform: translateX(-2px) scale(1.02);
        color: #b12222;
    }
    .sidebar-btn:active {
        transform: scale(0.96);
    }
    /* 激活高亮（可选） */
    .sidebar-btn.active {
        background: linear-gradient(135deg, #e34040, #c92a2a);
        color: white;
        box-shadow: 0 8px 16px -4px rgba(201,42,42,0.4);
    }
    .sidebar-btn.active .btn-label {
        color: white;
    }

    /* 悬浮展开后，显示额外文字或二维码区域 */
    .dynamic-sidebar:hover .sidebar-btn {
        width: 92%;
        flex-direction: row;
        justify-content: flex-start;
        padding-left: 12px;
        gap: 12px;
        min-height: 52px;
    }
    .dynamic-sidebar:hover .sidebar-btn .btn-label {
        font-size: 0.8rem;
        max-width: 100px;
        text-align: left;
        letter-spacing: 0.5px;
    }
    .dynamic-sidebar:hover .sidebar-btn .btn-emoji {
        font-size: 1.4rem;
    }

    /* 微信二维码专用悬浮块（默认隐藏，悬浮时显示） */
    .wechat-qr-hover {
        position: absolute;
        left: -120px;
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
    .wechat-qr-hover img {
        width: 100%;
        border-radius: 8px;
    }
    .wechat-qr-hover p {
        font-size: 12px;
        margin: 6px 0 0;
        color: #333;
    }
    .sidebar-btn.wechat-btn {
        position: relative;
    }
    .sidebar-btn.wechat-btn:hover .wechat-qr-hover {
        opacity: 1;
        visibility: visible;
    }

    /* 通知弹窗遮罩 */
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
    .notice-list {
        max-height: 400px;
        overflow-y: auto;
    }
    .notice-item {
        padding: 12px 0;
        border-bottom: 1px solid #f0e4d0;
        cursor: pointer;
        transition: 0.2s;
    }
    .notice-item:hover {
        background: #fef3e4;
        padding-left: 10px;
    }
    .notice-item strong {
        display: block;
        font-size: 1rem;
        color: #5a2e1a;
    }
    .notice-item .detail {
        font-size: 0.8rem;
        color: #888;
        margin-top: 5px;
    }
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

    /* 右侧边缘指示光效 */
    .dynamic-sidebar::before {
        content: '';
        position: absolute;
        left: -2px;
        top: 20%;
        height: 60%;
        width: 4px;
        background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,150,150,0.5), rgba(255,255,255,0.2));
        border-radius: 4px;
        pointer-events: none;
    }
    .dynamic-sidebar:hover::before {
        opacity: 0;
    }
    .dynamic-sidebar::after {
        content: '';
        position: absolute;
        right: 4px;
        top: 50%;
        width: 4px;
        height: 28px;
        background: rgba(255,245,210,0.7);
        border-radius: 4px;
        transform: translateY(-50%);
        transition: 0.2s;
        pointer-events: none;
    }
    .dynamic-sidebar:hover::after {
        opacity: 0;
        width: 0;
    }

    @media (max-width: 640px) {
        .dynamic-sidebar {
            width: 62px;
            padding: 12px 6px;
            gap: 8px;
        }
        .dynamic-sidebar:hover {
            width: 160px;
        }
        .sidebar-btn {
            width: 48px;
            min-height: 56px;
        }
        .sidebar-btn .btn-label {
            font-size: 0.68rem;
            letter-spacing: 0.5px;
        }
    }
    `;

    document.head.appendChild(style);

    // ---------- 创建侧边栏 DOM ----------
    const sidebar = document.createElement('div');
    sidebar.className = 'dynamic-sidebar';
   sidebar.innerHTML = `
    <button class="sidebar-btn" id="noticeBtn">
        <div class="btn-emoji">📢</div>
        <span class="btn-label">公告通知</span>
    </button>
    <!-- 微信公众号：自定义图片 -->
    <button class="sidebar-btn wechat-btn" id="wechatBtn">
        <div class="btn-emoji">
            <img src="img/02.jpg" alt="公众号" class="sidebar-icon">
        </div>
        <span class="btn-label">公众号</span>
        <div class="wechat-qr-hover">
            <img src="img/11111.jpg" alt="二维码">
            <p>扫码关注</p>
        </div>
    </button>
    <!-- DeepSeek 助手：自定义图片 -->
    <button class="sidebar-btn" id="deepseekSidebarBtn">
        <div class="btn-emoji">
            <img src="img/头像01.jpg" alt="AI助手" class="sidebar-icon">
        </div>
        <span class="btn-label">菲菲助手</span>
    </button>
    <button class="sidebar-btn" id="goTopBtn">
        <div class="btn-emoji">⬆️</div>
        <span class="btn-label">回顶部</span>
    </button>
`;
    document.body.appendChild(sidebar);

    // ---------- 通知弹窗内容 ----------
    function showNoticeModal() {
        // 创建模态框
        let modal = document.querySelector('.notice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'notice-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>✨ 近期重要演出</h3>
                    <div class="notice-list" id="noticeList"></div>
                    <button class="close-modal">关闭</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }
        // 填充演出列表
        const listContainer = modal.querySelector('#noticeList');
        listContainer.innerHTML = noticePerformances.map(perf => `
            <div class="notice-item" data-id="${perf.id}" data-name="${perf.name.replace(/['"]/g, '')}">
                <strong>🎭 ${perf.name}</strong>
                <div class="detail">📅 ${perf.time} &nbsp;|&nbsp; 📍 ${perf.place} &nbsp;|&nbsp; 💰 ¥${perf.price}</div>
            </div>
        `).join('');
        // 绑定点击事件，跳转到演出详情（product.html）
        listContainer.querySelectorAll('.notice-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const id = item.dataset.id;
                const name = item.dataset.name;
                window.location.href = `product.html?id=${id}&type=performance`;
            });
        });
        modal.style.display = 'flex';
    }

    // 绑定通知按钮
    document.getElementById('noticeBtn').addEventListener('click', showNoticeModal);

    // ---------- DeepSeek 助手：复用原有聊天窗口 ----------
    function initDeepSeek() {
        const chatWindow = document.getElementById('aiChatWindow');
        if (!chatWindow) {
            console.warn('未找到 #aiChatWindow，请确保页面中存在该元素');
            return;
        }
        const deepseekBtn = document.getElementById('deepseekSidebarBtn');
        const closeChat = document.getElementById('closeChat');
        if (deepseekBtn) {
            deepseekBtn.addEventListener('click', () => {
                chatWindow.style.display = 'flex';
            });
        }
        if (closeChat) {
            closeChat.addEventListener('click', () => {
                chatWindow.style.display = 'none';
            });
        }
        // 尝试移除原有的顶部 DeepSeek 按钮（如果有）
        const oldDeepseekBtn = document.querySelector('.top-bar .deepseek-btn');
        if (oldDeepseekBtn) oldDeepseekBtn.style.display = 'none';
    }

    // ---------- 返回顶部 ----------
    function initGoTop() {
        const goTop = document.getElementById('goTopBtn');
        if (goTop) {
            goTop.addEventListener('click', () => {
                // 方法1：瞬间滚动（推荐，无视滚动捕捉）
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;

                // 额外保险：滚动后 100ms 再次强制归零（防止捕捉干扰）
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                }, 150);
            });
        }
    }

    // ---------- 移除原有的悬浮窗预览绑定（避免冲突，可选）----------
    // 原页面有 historyPreview 悬浮窗，保留但无关紧要

    // ---------- 等待页面加载完成后执行 ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initDeepSeek();
            initGoTop();
        });
    } else {
        initDeepSeek();
        initGoTop();
    }

    // 添加一个小彩蛋：首次加载时侧边栏脉冲两次，提醒用户
    setTimeout(() => {
        const sb = document.querySelector('.dynamic-sidebar');
        if (sb) {
            sb.style.boxShadow = '0 0 0 2px rgba(217, 43, 43, 0.4), 0 12px 28px -8px rgba(0,0,0,0.2)';
            setTimeout(() => { sb.style.boxShadow = ''; }, 500);
        }
    }, 500);
})();