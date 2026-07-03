// historyTracker.js - 统一的浏览记录管理
(function() {
    // 获取当前登录用户名
    function getCurrentUsername() {
        return localStorage.getItem('current_username');
    }

    // 加载当前用户的浏览记录
    function loadHistory() {
        const username = getCurrentUsername();
        if (!username) return [];
        const key = `browsing_history_${username}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    // 保存当前用户的浏览记录
    function saveHistory(history) {
        const username = getCurrentUsername();
        if (!username) return;
        const key = `browsing_history_${username}`;
        // 限制最多保留 50 条
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem(key, JSON.stringify(history));
    }

    // 添加一条记录（去重：若已存在相同 name 且 type 相同的记录，则先删除旧的再插入到最前面）
    function recordHistory(item) {
        if (!getCurrentUsername()) return; // 未登录不记录
        let history = loadHistory();
        // 去重：找到相同 name 且相同 type（可选）的记录索引
        const index = history.findIndex(h => h.name === item.name && h.type === item.type);
        if (index !== -1) history.splice(index, 1);
        // 添加到数组最前面
        history.unshift({
            name: item.name,
            img: item.img || '',
            type: item.type || '浏览',
            date: new Date().toISOString(),
            link: item.link || '',
            id: item.id
        });
        saveHistory(history);
    }

    // 清空全部浏览记录
    function clearAllHistory() {
        if (!getCurrentUsername()) return;
        saveHistory([]);
    }

    // 删除单条记录（按索引）
    function deleteHistoryItem(index) {
        let history = loadHistory();
        if (index >= 0 && index < history.length) {
            history.splice(index, 1);
            saveHistory(history);
        }
    }

    // 将函数暴露到全局
    window.HistoryTracker = {
        record: recordHistory,
        clearAll: clearAllHistory,
        deleteItem: deleteHistoryItem,
        getAll: loadHistory
    };
})();