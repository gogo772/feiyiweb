# 华夏非遗 - Chinese Intangible Cultural Heritage Platform

> 守护千年文脉，让非遗活在当下，走向世界

一个致力于传承和推广中国非物质文化遗产的综合性 Web 平台。

## 🎯 项目概述

华夏非遗平台旨在通过数字化手段，将中国丰富的非物质文化遗产资源进行整合、展示和传播，让更多人了解、体验和爱上中华优秀传统文化。

## ✨ 核心功能

### 首页展示
- **3D圆环轮播**：沉浸式展示热门非遗项目
- **统计数据**：收录非遗项目、国家级名录、知识图谱节点等关键数据
- **非遗推荐**：滑动卡片轮播展示精选非遗内容
- **动态时间轴**：展示最新非遗演出和活动信息，支持 HOT 标签高亮

### 知识图谱
- 可视化展示非遗项目之间的关联关系
- 基于 5D 偏好（文化、风景、美食、非遗、休闲）进行智能匹配
- 动态路线计算与展示

### 星图系统
- 基于地理位置的非遗分布可视化
- 省份切换与数据加载
- 匹配分数计算与路线规划

### AI 助手
- 智能问答系统，解答非遗相关问题
- 支持中英文交互

### 多语言支持
- 完整的中英文切换功能
- 全局内容动态更新

## 🛠️ 技术栈

### 后端
- **框架**: Django 5.x
- **数据库**: SQLite
- **API**: RESTful

### 前端
- **语言**: HTML5, CSS3, JavaScript (ES6+)
- **图表库**: ECharts, D3.js v7
- **图标**: Font Awesome
- **国际化**: 自定义 i18n 系统

### 项目结构

```
feiyiweb/
├── feiyiweb_django/              # Django 项目根目录
│   ├── accounts/                 # 用户账户模块
│   ├── chat/                     # AI 聊天模块
│   ├── commerce/                 # 商务/商品模块
│   ├── media/                    # 媒体资源模块
│   ├── feiyiweb_django/          # 项目配置
│   ├── static/                   # 静态资源
│   │   ├── css/                  # 样式文件
│   │   ├── js/                   # JavaScript 文件
│   │   ├── data/                 # 非遗数据
│   │   ├── geo/                  # 地理数据
│   │   ├── img/                  # 图片资源
│   │   └── lib/                  # 第三方库
│   ├── templates/                # HTML 模板
│   └── manage.py                 # Django 管理脚本
└── README.md                     # 项目说明文档
```

## 🚀 快速开始

### 环境要求
- Python 3.10+
- pip 包管理工具

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/feiyiweb.git
cd feiyiweb
```

> 提示：请将 `yourusername` 替换为实际的 GitHub 用户名或组织名称。

2. **创建虚拟环境**
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **数据库迁移**
```bash
cd feiyiweb_django
python manage.py migrate
```

5. **配置环境变量**

创建 `.env` 文件（位于 `feiyiweb_django/` 目录下）：

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SECRET_KEY` | Django 安全密钥，用于加密会话等 | `django-insecure-...` |
| `DEBUG` | 调试模式，开发环境设为 `True` | `False` |
| `ALLOWED_HOSTS` | 允许访问的主机列表，逗号分隔 | `localhost,127.0.0.1` |

> 注意：生产环境中请将 `DEBUG` 设置为 `False`，并使用复杂的 `SECRET_KEY`。

6. **导入数据**
```bash
python manage.py import_data
python manage.py import_heritage
```

7. **启动开发服务器**
```bash
python manage.py runserver
```

8. **访问网站**
打开浏览器访问 `http://localhost:8000`

## 📁 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 主页面，展示非遗推荐和动态 |
| `/starmap.html` | 星图 | 非遗地理分布可视化 |
| `/knowledge-graph.html` | 知识图谱 | 非遗关联关系图 |
| `/performances.html` | 演出 | 非遗演出信息 |
| `/travel.html` | 旅行 | 非遗旅游推荐 |
| `/merchandise.html` | 商品 | 非遗文创产品 |
| `/product?id=X&type=Y` | 详情页 | 产品详情 |
| `/user.html` | 用户中心 | 用户个人信息 |
| `/history.html` | 浏览历史 | 用户浏览记录 |
| `/whereami.html` | 当前位置 | 定位功能 |
| `/admin/` | 管理后台 | Django 管理员页面 |

## 📊 数据说明

### 非遗数据类型
- 传统音乐 (Traditional_music)
- 传统舞蹈 (Traditional_dance)
- 传统戏剧 (Traditional_drama)
- 曲艺 (Quyi)
- 传统体育 (Traditional_sports)
- 传统技艺 (Traditional_skills)
- 传统美术 (Traditional_art)
- 传统医药 (Traditional_medicine)
- 民俗 (Folkways)
- 民间文学 (Folk_literature)

### 地理数据
包含全国多个省份的地理边界数据，用于星图可视化。

## 🔧 开发规范

### 文件加载顺序
- `i18n.js` 必须在 `navbar.js` 之前加载
- `starmap-app.js` 必须在 `spots-data.js` 和 `city-name-map.js` 之后加载

### 国际化规范
- 静态文本使用 `data-i18n` 属性
- 动态文本使用 `window.i18n?.t(key)` 或 fallback 字符串
- 语言切换触发 `lang:changed` 事件

### 路由计算规则
- 路由节点数量：1 ≤ n ≤ 4
- 仅当 n ≥ 2 时绘制路线
- 路由计算完全在前端完成

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

*守护千年文脉 · 传承中华文化*