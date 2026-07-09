/**
 * 组件加载器 components.js
 * 原生 ES6，无第三方依赖
 * 通过 fetch 动态加载 HTML 组件片段并插入页面指定容器
 * 支持 {{key}} 占位符替换
 *
 * 使用方式：
 *   1. 在页面 <head> 引入 <link rel="stylesheet" href="static/css/common.css">
 *   2. 在需要页脚的位置添加 <div id="footerMount"></div>
 *   3. 在 </body> 前引入 <script src="static/js/components.js"></script>
 *
 *   页面无需额外 JS 调用，脚本会自动检测 #footerMount 并加载页脚。
 */

class ComponentLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 加载 HTML 组件并插入到指定容器
   * @param {string} url   - 组件 HTML 文件路径
   * @param {string} selector - 目标容器 CSS 选择器
   * @param {Object} data  - 占位符替换数据，如 { year: 2026 }
   * @returns {Promise<void>}
   */
  async load(url, selector, data = {}) {
    const container = document.querySelector(selector);
    if (!container) {
      console.warn(`[ComponentLoader] 未找到容器: ${selector}`);
      return;
    }

    try {
      let html = this.cache.get(url);
      if (!html) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        html = await response.text();
        this.cache.set(url, html);
      }

      // 占位符替换
      let result = html;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }

      container.innerHTML = result;

      // 触发 i18n 更新
      if (window.i18n && typeof window.i18n.updateAll === 'function') {
        window.i18n.updateAll();
      } else if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('lang:changed'));
      }
    } catch (err) {
      console.error(`[ComponentLoader] 加载组件失败: ${url}`, err);
      this.renderError(container);
    }
  }

  /**
   * 加载失败时渲染降级提示
   */
  renderError(container) {
    const year = new Date().getFullYear();
    container.innerHTML = `
      <div class="footer-error">
        <p>© ${year} 华夏非遗保护工程 | 传承文明 利在千秋</p>
        <p style="margin-top:8px;">
          页脚加载失败，
          <a onclick="location.reload()">点击刷新</a>
        </p>
      </div>`;
  }
}

// 全局单例
const componentLoader = new ComponentLoader();

(function() {
    function initComponents() {
        const footerMount = document.getElementById('footerMount');
        if (footerMount) {
            componentLoader.load('/templates/components/footer.html', '#footerMount', {
                year: new Date().getFullYear()
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }
})();
