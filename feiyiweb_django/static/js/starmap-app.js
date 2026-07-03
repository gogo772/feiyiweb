/* =============================================================
   徽韵星图 · 多省份通用版本
   - 方案：按需动态加载 + 本地缓存
   - GeoJSON 缓存：第一次按需 fetch /geo/[adcode]_full.json，
     缓存到 GeoJsonCache；之后切换直接复用，零网络请求
   - 业务数据：从 static/js/spots-data.js 的 SPOTS_DATA 中按省份 code 提取
   - 用户上次选择的省份持久化到 localStorage('appProvince')
   ============================================================= */
(function () {
    let _appStarted = false;

    // ==================== 立即初始化加载文字（避免闪烁） ====================
    const savedLang0 = typeof localStorage !== 'undefined' ? localStorage.getItem('appLang') : null;
    {
        const loadingSpan = document.getElementById('loadingText');
        if (loadingSpan) {
            loadingSpan.innerText = savedLang0 === 'en'
                ? (window.i18n ? window.i18n.t('starmapLoading') : "✨ Drawing Starmap · Multi-Province ✨")
                : (window.i18n ? window.i18n.t('starmapLoading') : "✨ 星图绘制中 · 多省联动 ✨");
        }
    }

    // ==================== 加载遮罩隐藏函数（多重保险） ====================
    function hideLoadingOverlay() {
        try {
            const el = document.getElementById('loadingOverlay');
            if (!el) return;
            el.classList.add('hide');
            setTimeout(() => {
                try {
                    el.style.display = 'none';
                } catch (e) { /* ignore */ }
            }, 500);
        } catch (e) {
            console.warn('[starmap] hideLoadingOverlay failed:', e.message);
        }
    }

    // ==================== 省份全局配置表 ====================
    // 统一管理所有省份的元数据：地图名、中心点、缩放、GeoJSON 路径、中/英景点数据。
    // 启动时从 window.SPOTS_DATA / window.PROVINCE_LIST 自动装配，
    // 旧版本 SPOTS_DATA[code].spots 仍会作为回退。
    const provinceConfig = (window.SPOTS_DATA && typeof window.SPOTS_DATA === 'object')
        ? Object.keys(window.SPOTS_DATA).reduce((acc, code) => {
            const d = window.SPOTS_DATA[code] || {};
            acc[code] = {
                code,
                mapName: d.name,                                  // echarts.registerMap 名称
                name: d.name,                                  // 中文名
                nameEn: d.nameEn || d.name,                      // 英文名
                center: d.center || [0, 0],
                zoom: typeof d.zoom === 'number' ? d.zoom : 1.0,
                geoPath: `/static/geo/${code}_full.json`,                 // 本地 GeoJSON 路径
                spotsZh: Array.isArray(d.spotsZh) ? d.spotsZh : (Array.isArray(d.spots) ? d.spots : []),
                spotsEn: Array.isArray(d.spotsEn) ? d.spotsEn : (Array.isArray(d.spots) ? d.spots : [])
            };
            return acc;
        }, {})
        : {};

    // 旧版 PROVINCE_LIST（如已暴露）—— 用于下拉顺序回退
    const provinceListFallback = Array.isArray(window.PROVINCE_LIST)
        ? window.PROVINCE_LIST.map(p => ({code: p.code, name: p.name, nameEn: p.nameEn, count: p.count}))
        : Object.keys(provinceConfig).map(code => ({
            code,
            name: provinceConfig[code].name,
            nameEn: provinceConfig[code].nameEn,
            count: provinceConfig[code].spotsZh.length
        }));

    // ==================== 景点类型映射 ====================
    const typeMap = {
        natural: {name: "自然风光", nameEn: "Nature", symbol: "circle", color: "#FFD966", symbolSize: 12},
        historic: {name: "人文古迹", nameEn: "Heritage", symbol: "diamond", color: "#C9B6E0", symbolSize: 12},
        intangible: {name: "非遗体验", nameEn: "ICH", symbol: "roundRect", color: "#FFA07A", symbolSize: 12},
        food: {name: "美食打卡", nameEn: "Food", symbol: "triangle", color: "#76E4B0", symbolSize: 12}
    };

    // ==================== 分类偏好预设映射 ====================
    // 作用：左下角分类按钮（all/nature/historic/heritage/food）作为偏好快捷预设，
    //       一键应用对应五维权重；与滑块、雷达、地图强一致。
    // 字段命名沿用 currentPreference：cultural / scenery / food / intangible / leisure
    // 数值贴合分类语义（参考任务规范）：
    //   - all:        五维均衡 60
    //   - nature:     风景出片率 90 / 休闲指数 75 主导
    //   - historic:   文化厚重感 90 / 非遗互动度 70 主导
    //   - heritage:   非遗互动度 95 / 文化厚重感 75 主导
    //   - food:       美食浓度 95 / 休闲指数 70 主导
    // key 必须与 HTML 中 .tag-btn 的 data-category 完全一致
    const categoryPreset = {
        all: {cultural: 68, scenery: 82, food: 55, intangible: 70, leisure: 80},
        nature: {cultural: 50, scenery: 90, food: 40, intangible: 30, leisure: 75},
        historic: {cultural: 90, scenery: 50, food: 40, intangible: 70, leisure: 45},
        heritage: {cultural: 75, scenery: 45, food: 40, intangible: 95, leisure: 50},
        food: {cultural: 40, scenery: 50, food: 95, intangible: 35, leisure: 70}
    };

    // ==================== 高匹配筛选策略（固定 Top 4） ====================
//  路线生成核心规则：按匹配度降序排序，取 Top 4 作为路线节点
//  路线节点数 1≤n≤4，n≥2 才绘制连线
const HIGH_MATCH_RULE = {
    routeNodeCount: 4
};

// 计算高匹配点集合（按 matchScore 降序取 Top 4）
function pickHighMatches(spotsWithScore, rule) {
    const total = spotsWithScore.length;
    if (total === 0) return [];
    const sorted = [...spotsWithScore].sort((a, b) => b.matchScore - a.matchScore);
    const limit = Math.min(rule.routeNodeCount, total);
    
    if (routeStartSpot) {
        const startName = routeStartSpot.name;
        const startSpot = sorted.find(s => s.name === startName);
        if (startSpot) {
            const others = sorted.filter(s => s.name !== startName);
            const selected = [startSpot, ...others.slice(0, limit - 1)];
            return selected;
        }
    }
    
    return sorted.slice(0, limit);
}

    // ==================== 全局状态 ====================
    let myMapChart = null, myRadarChart = null;
    let currentLang = window.i18n ? window.i18n.getLang() : 'zh';
    let currentPreference = {cultural: 68, scenery: 82, food: 55, intangible: 70, leisure: 80};
    let currentTypeFilter = 'all';
    let currentProvinceCode = null;          // 当前选中的省份 adcode
    let currentProvince = null;             // 当前选中的省份元数据 {name,nameEn,center,zoom,spots}
    let currentSpotsData = [];              // 当前省份的景点数组
    let mapRegisteredSet = new Set();       // 已通过 echarts.registerMap 注册过的地图名
    let lastValidLinesData = [];            // 上一次有效的线路数据（降级方案使用）
    let routeStartSpot = null;              // 路线起点（双击景点设置）

    // ==================== GeoJSON 缓存 ====================
    const GeoJsonCache = new Map();         // key = provinceCode, value = GeoJSON FeatureCollection
    const registeredMaps = new Set();       // 与 mapRegisteredSet 保持同步的 ECharts 注册名集合

    // ==================== 资源清理注册表（用于页面卸载时释放资源） ====================
    const cleanupRegistry = {
        resizeHandler: null,   // resize 事件处理函数引用
        zoomDebounceTimer: null // zoom 防抖定时器引用
    };

    // ==================== 页面卸载清理函数 ====================
    // 修复：解决事件监听器未清理导致的内存泄漏问题
    function cleanup() {
        // 1. 清理地图点击事件
        if (myMapChart) {
            myMapChart.off('click');
        }
        // 2. 清理 zoom 防抖定时器
        if (cleanupRegistry.zoomDebounceTimer) {
            clearTimeout(cleanupRegistry.zoomDebounceTimer);
            cleanupRegistry.zoomDebounceTimer = null;
        }
        // 3. 清理 resize 事件监听器
        if (cleanupRegistry.resizeHandler && typeof window !== 'undefined') {
            window.removeEventListener('resize', cleanupRegistry.resizeHandler);
            cleanupRegistry.resizeHandler = null;
        }
        // 4. 销毁 ECharts 实例
        if (myMapChart) {
            myMapChart.dispose();
            myMapChart = null;
        }
        if (myRadarChart) {
            myRadarChart.dispose();
            myRadarChart = null;
        }
        console.log('[starmap] Resources cleaned up successfully');
    }

    // 注册页面卸载清理事件
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', cleanup);
        // SPA 环境下的清理
        window.addEventListener('pagehide', cleanup);
    }

    function getSpotByName(name) {
        return currentSpotsData.find(s => s.name === name);
    }

    // ==================== 匹配分数缓存（必须在computeMatchScore之前定义） ====================
    const matchScoreCache = new WeakMap();
    const MAX_MATCH_SCORE_ENTRIES = 1000;
    let matchScoreCacheSize = 0;

    // ==================== 坐标抖动缓存（必须在applyCoordJitter之前定义） ====================
    // 用于确保相同点位在不同缩放级别下产生相同的偏移量，避免路线错位
    const jitterCache = new Map();
    const MAX_JITTER_ENTRIES = 500;

    // ==================== 匹配分数计算（带缓存） ====================
    function computeMatchScore(spot, pref) {
        let spotCache = matchScoreCache.get(spot);
        if (!spotCache) {
            spotCache = {};
            matchScoreCache.set(spot, spotCache);
            matchScoreCacheSize++;
        }
        const cacheKey = pref.cultural * 100000000 + pref.scenery * 1000000 + pref.food * 10000 + pref.intangible * 100 + pref.leisure;
        const cached = spotCache[cacheKey];
        if (cached !== undefined) {
            return cached;
        }
        
        const diff = Math.sqrt(
            Math.pow(spot.cultureScore - pref.cultural, 2) +
            Math.pow(spot.sceneryScore - pref.scenery, 2) +
            Math.pow(spot.foodScore - pref.food, 2) +
            Math.pow(spot.heritageScore - pref.intangible, 2) +
            Math.pow(spot.leisureScore - pref.leisure, 2)
        );
        const maxDiff = Math.sqrt(50000);
        const score = Math.min(100, Math.max(0, 100 - (diff / maxDiff) * 100));
        
        spotCache[cacheKey] = score;
        return score;
    }

    // ==================== ECharts 渲染 ====================
    function updateMapByPreference() {
        if (!myMapChart || !currentProvince) return;
        // 复用统一的 series 生成函数（与切换省份走同一份逻辑）
        // 修复:传入 myMapChart 以便 getMapSeries 内部做像素空间防重叠
        const series = getMapSeries(currentSpotsData, currentPreference, myMapChart);
        myMapChart.setOption({
            series,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 4, 4, 0.95)',
                borderColor: '#F0C870',
                textStyle: {color: '#DFD0B8'}
            }
        }, false);
    }

    function updateRadarChart() {
        if (!myRadarChart) return;
        const t = window.i18n ? {
            cult: window.i18n.t('cult'),
            scenery: window.i18n.t('scenery'),
            food: window.i18n.t('food'),
            intangible: window.i18n.t('intangible'),
            leisure: window.i18n.t('leisure'),
            radarSeriesName: window.i18n.t('radarSeriesName')
        } : {
            cult: '文化厚重感', scenery: '风景出片率', food: '美食浓度', intangible: '非遗互动度', leisure: '休闲指数', radarSeriesName: '当前偏好'
        };
        myRadarChart.setOption({
            radar: {
                indicator: [
                    {name: t.cult, max: 100}, {name: t.scenery, max: 100},
                    {name: t.food, max: 100}, {name: t.intangible, max: 100}, {name: t.leisure, max: 100}
                ],
                shape: 'circle', center: ['50%', '50%'], radius: '65%',
                name: {
                    textStyle: {
                        color: '#b8add0',      // 淡紫灰
                        fontSize: 13,
                        fontWeight: 500
                    }
                },
                splitLine: { lineStyle: { color: 'rgba(168,85,247,0.2)' } },
                splitArea: {
                    areaStyle: {
                        color: [
                            'rgba(168,85,247,0.05)',
                            'rgba(0,212,255,0.03)',
                            'rgba(168,85,247,0.05)',
                            'rgba(0,212,255,0.03)'
                        ]
                    }
                },
                axisLine: { lineStyle: { color: 'rgba(168,85,247,0.15)' } }
            },
            series: [{
                type: 'radar',
                data: [{
                    value: [currentPreference.cultural, currentPreference.scenery, currentPreference.food, currentPreference.intangible, currentPreference.leisure],
                    name: t.radarSeriesName
                }],
                symbol: 'circle',
                symbolSize: 5,
                symbolKeepAspect: false,
                itemStyle: {
                    color: '#ff6b9d',
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    shadowBlur: 20,
                    shadowColor: 'rgba(255,107,157,0.3)'
                },
                lineStyle: {
                    width: 2.5,
                    color: '#a855f7',
                    shadowBlur: 15,
                    shadowColor: 'rgba(168,85,247,0.4)'
                },
                areaStyle: {
                    color: {
                        type: 'radial',
                        x: 0.5, y: 0.5, r: 0.65,
                        colorStops: [
                            { offset: 0, color: 'rgba(168,85,247,0.3)' },
                            { offset: 1, color: 'rgba(0,212,255,0.05)' }
                        ]
                    }
                }
            }]
        }, true);
    }

    function refreshAll() {
        updateRadarChart();
        updateMapByPreference();
    }

    // ==================== 辅助：按当前过滤 + 偏好生成地图系列数据 ====================
    // 三层系列架构：
    //   1) scatter         —— 当前省份全量景点（小尺寸 + 半透明，hover 才显示标签）
    //   2) effectScatter   —— 高匹配景点（涟漪动效 + 默认标签，视觉高亮）
    //   3) lines           —— 基于高匹配点的流光线路（保留学者探路曲线）
    // 供 switchProvince / updateMapByPreference 共用，保证视觉与数据一致。
    // 增强特性：
    //   - 点位抖动：经纬度完全重合的点位施加 ±0.02° 随机偏移，避免完全重叠
    //   - 视觉分层：按综合分（文化+非遗）分核心/常规/补充三层，symbolSize 不同形成层次
    //   - 标签防重叠：特效散点开启 labelLayout + hideOverlap；普通散点 hover 才显示
    //   - 缩放联动渲染：根据地图 zoom 切换可见层（核心 / 核心+常规 / 全部）
    // 点位等级划分：综合分 = (cultureScore + heritageScore) / 2
    //   - 核心 (>=80)：symbolSize 7 / 12
    //   - 常规 (60-79)：symbolSize 6 / 11
    //   - 补充 (<60)：symbolSize 5 / 10
    const SPOT_LEVEL_SIZE = {
        normal: {core: 7, regular: 6, supplementary: 5},
        high: {core: 12, regular: 11, supplementary: 10}
    };
    const JITTER_RANGE = 0.02; // ±0.02° 抖动幅度（旧函数保留,新逻辑见下方 applyCoordJitterPixel）
    // ==================== 像素空间防重叠配置 ====================
    // 修复：旧版 applyCoordJitter 只处理"经纬度完全重合"的点(用 toFixed(4) 作 key),
    //       对"邻近但不完全重合"的点(例如 0.01-0.03° 内的景区)完全不感知,导致左下角
    //       罗田薄刀峰一带多个景点贴成一团。现升级为"屏幕像素空间"判重:
    //       1) applyCoordJitterPixel  : 用 24px 像素格分桶,同格内点用黄金角均布
    //       2) applyPixelSpaceRepulsion: 多轮迭代,推开任意 < MIN_PIXEL_DIST 的点对
    const JITTER_PIXEL_CELL = 24;             // 像素格大小(px)
    const MIN_PIXEL_DIST = 18;                // 最小屏幕间距(px)
    const PIXEL_REPULSION_ITERATIONS = 3;     // 排斥迭代轮数(经验值 3 轮足够收敛)
    const ZOOM_TIERS = {
        // 缩放联动：当 zoom < tier.maxVisible 时仅显示 ≥ tier.minLevel 的层
        // 0: 补充, 1: 常规, 2: 核心
        tierA: {maxZoom: 1.0, minLevel: 2}, // 极小：只核心
        tierB: {maxZoom: 1.5, minLevel: 1}, // 中等：核心+常规
        tierC: {maxZoom: Infinity, minLevel: 0} // 放大：全部
    };
    let currentZoomTier = 'tierC'; // 默认"全部"档（maxLevel=0）

    // 工具：按综合分计算点位等级
    // ==================== 大数据模式优化配置 ====================
    // 修复：大数据模式下进一步降低动画复杂度，启用WebGL渲染
    const PERF_CONFIG = {
        // 大数据阈值
        largeModeThreshold: 300,
        // WebGL加速：当数据量超过此阈值时自动切换到WebGL渲染
        webglThreshold: 500,
        // 大数据模式下的效果降级
        largeModeEffects: {
            ripplePeriod: 8,           // 涟漪周期拉长
            rippleScale: 2.0,          // 涟漪缩放缩小
            labelFontSize: 9,          // 标签字号缩小
            lineWidth: 1.2,            // 连线宽度减小
            disableAnimation: true,    // 禁用部分动画
        },
        // 渐进式渲染配置
        progressive: {
            enabled: true,
            chunkSize: 500,
            threshold: 1000,
            updateInterval: 0
        }
    };

    // ==================== 点位等级缓存 ====================
    // 修复：避免重复计算点位等级
    const spotLevelCache = new WeakMap();
    function getSpotLevel(spot) {
        // 检查缓存
        if (spotLevelCache.has(spot)) {
            return spotLevelCache.get(spot);
        }
        const composite = (Number(spot.cultureScore || 0) + Number(spot.heritageScore || 0)) / 2;
        let level;
        if (composite >= 80) level = 'core';
        else if (composite >= 60) level = 'regular';
        else level = 'supplementary';
        // 缓存结果
        spotLevelCache.set(spot, level);
        return level;
    }



    // 工具(旧):对经纬度完全重合的点施加 ±0.02° 随机偏移
    // 保留作为兜底:当 chart 未就绪或无法做像素投影时,退化到经纬度空间判重
    // 返回新数组(不修改原对象)。key 用 lng.lat 字符串(4 位小数精度检测)
    // 修复:使用jitterCache缓存偏移结果,确保相同点位在不同缩放级别下产生相同的偏移量
    function applyCoordJitter(spots, range = JITTER_RANGE) {
        const seen = new Map();
        return spots.map(spot => {
            const [lng, lat] = spot.coord;
            const key = `${lng.toFixed(4)}_${lat.toFixed(4)}`;
            const c = seen.get(key) || 0;
            seen.set(key, c + 1);
            if (c === 0) return spot;

            const spotName = spot.name || `${lng}_${lat}_${c}`;
            let cachedOffset = jitterCache.get(spotName);
            if (!cachedOffset) {
                if (jitterCache.size >= MAX_JITTER_ENTRIES) {
                    const firstKey = jitterCache.keys().next().value;
                    if (firstKey) jitterCache.delete(firstKey);
                }
                const dx = (Math.random() * 2 - 1) * range;
                const dy = (Math.random() * 2 - 1) * range;
                cachedOffset = {dx, dy};
                jitterCache.set(spotName, cachedOffset);
            }

            return {...spot, coord: [lng + cachedOffset.dx, lat + cachedOffset.dy]};
        });
    }

    // 工具(新·B):基于屏幕像素格分桶 + 黄金角均布的抖动
    // 解决问题:旧版 applyCoordJitter 只处理"经纬度 toFixed(4) 完全重合"的情况,
    //         对 0.01-0.03° 范围内的邻近景点不感知 → 屏幕上仍贴在一起
    // 新方案:把点位先投影到屏幕像素,按 JITTER_PIXEL_CELL (24px) 分桶,
    //         同桶内第 2、3... 个点用黄金角 (137.508°) 均布在圆周上,半径随计数递增
    // 入参:spots (原始点位数组), chart (ECharts 实例,用于经纬度↔像素换算)
    // 失败/未就绪:返回原数组不动,让调用方决定是否走旧版 fallback
    function canProjectGeo(chart) {
        if (!chart) return false;
        try {
            const opt = chart.getOption();
            const geos = Array.isArray(opt.geo) ? opt.geo : (opt.geo ? [opt.geo] : []);
            return geos.length > 0 && !!geos[0] && !!geos[0].map;
        } catch (e) {
            return false;
        }
    }

    function applyCoordJitterPixel(spots, chart, cell = JITTER_PIXEL_CELL) {
        if (!spots || !spots.length) return spots;
        if (!canProjectGeo(chart)) return spots; // chart 未就绪:不动数据,避免破坏首屏
        const buckets = new Map(); // cellKey -> 该格已有点数
        return spots.map(spot => {
            const [lng, lat] = spot.coord;
            let px, py;
            try {
                const p = chart.convertToPixel({geo: 0}, [lng, lat]);
                px = p[0]; py = p[1];
            } catch (e) { return spot; }
            if (!isFinite(px) || !isFinite(py)) return spot;
            const cx = Math.floor(px / cell);
            const cy = Math.floor(py / cell);
            const key = `${cx}_${cy}`;
            const c = (buckets.get(key) || 0) + 1;
            buckets.set(key, c);
            if (c === 1) return spot; // 每格首个保留原位,避免无谓位移

            // 同格内 c>=2:黄金角均布,半径随 c 缓慢递增(避免 4+ 个点时仍挤回中心)
            // 黄金角 137.508° 保证任意连续 N 个点的角度差 ≈ 137.5°,自然散开不重叠
            const angle = ((c - 1) * 137.508) * Math.PI / 180;
            const radius = cell * 0.45 * Math.min(1 + (c - 2) * 0.25, 2.0);
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            let newCoord;
            try {
                newCoord = chart.convertFromPixel({geo: 0}, [px + dx, py + dy]);
            } catch (e) { return spot; }
            if (!newCoord || !isFinite(newCoord[0]) || !isFinite(newCoord[1])) return spot;
            return {...spot, coord: [newCoord[0], newCoord[1]]};
        });
    }

    // 工具(新·A):像素空间多轮迭代排斥
    // 解决问题:applyCoordJitterPixel 只处理"同一像素格"内的点对,
    //         对"邻近但分到不同像素格"的点对无能为力(例如 12-15px 间距的同区景点)
    // 新方案:在像素空间对所有点做 O(n²) 两两距离检查,距离 < MIN_PIXEL_DIST 则沿连线
    //         方向各推一半距离,多轮迭代直到收敛(或达最大轮数)
    // 复杂度:湖北 47 点 → 47² × 3 轮 ≈ 6.6k 配对,毫秒级,无性能问题
    function applyPixelSpaceRepulsion(spots, chart, minDist = MIN_PIXEL_DIST) {
        if (!spots || spots.length < 3) return spots;
        if (!canProjectGeo(chart)) return spots;

        const n = spots.length;
        const maxIter = n <= 10 ? 1 : (n <= 20 ? 2 : PIXEL_REPULSION_ITERATIONS);

        const items = spots.map(s => {
            let x = 0, y = 0;
            let valid = true;
            try {
                const p = chart.convertToPixel({geo: 0}, s.coord);
                x = p[0]; y = p[1];
                if (!isFinite(x) || !isFinite(y)) valid = false;
            } catch (e) { valid = false; }
            return {spot: s, x, y, dx: 0, dy: 0, valid};
        });

        for (let it = 0; it < maxIter; it++) {
            let moved = false;
            for (let i = 0; i < n; i++) {
                const a = items[i];
                if (!a.valid) continue;
                for (let j = i + 1; j < n; j++) {
                    const b = items[j];
                    if (!b.valid) continue;
                    const ddx = (a.x + a.dx) - (b.x + b.dx);
                    const ddy = (a.y + a.dy) - (b.y + b.dy);
                    const dist = Math.hypot(ddx, ddy);
                    if (dist >= minDist) continue;
                    let nx, ny, push;
                    if (dist < 0.001) {
                        const ang = (i + j * 7) * 0.785398;
                        nx = Math.cos(ang); ny = Math.sin(ang);
                        push = minDist / 2;
                    } else {
                        nx = ddx / dist; ny = ddy / dist;
                        push = (minDist - dist) / 2;
                    }
                    a.dx += nx * push; a.dy += ny * push;
                    b.dx -= nx * push; b.dy -= ny * push;
                    moved = true;
                }
            }
            if (!moved) break;
        }

        return items.map(p => {
            if (Math.abs(p.dx) < 0.01 && Math.abs(p.dy) < 0.01) return p.spot;
            let newCoord;
            try {
                newCoord = chart.convertFromPixel({geo: 0}, [p.x + p.dx, p.y + p.dy]);
            } catch (e) { return p.spot; }
            if (!newCoord || !isFinite(newCoord[0]) || !isFinite(newCoord[1])) return p.spot;
            return {...p.spot, coord: [newCoord[0], newCoord[1]]};
        });
    }

    function getMapSeries(spots, pref, chart) {
        const projChart = chart || myMapChart;
        const filterType = currentTypeFilter;
        let filteredSpots = spots;
        if (filterType !== 'all') {
            filteredSpots = spots.filter(s => s.type === filterType);
        }

        if (!filteredSpots.length) {
            return [
                {name: 'Stars', type: 'scatter', coordinateSystem: 'geo', data: [], zlevel: 1},
                {name: 'High Match', type: 'effectScatter', coordinateSystem: 'geo', data: [], zlevel: 2},
                {name: 'Inspiration Route', type: 'lines', coordinateSystem: 'geo', data: [], zlevel: 3}
            ];
        }

        const spotsWithScore = [];
        for (let i = 0; i < filteredSpots.length; i++) {
            const spot = filteredSpots[i];
            spotsWithScore.push({
                ...spot,
                matchScore: computeMatchScore(spot, pref)
            });
        }

        const highMatches = pickHighMatches(spotsWithScore, HIGH_MATCH_RULE);

        const tier = currentZoom <= ZOOM_TIERS.tierA.maxZoom
            ? ZOOM_TIERS.tierA
            : (currentZoom <= ZOOM_TIERS.tierB.maxZoom ? ZOOM_TIERS.tierB : ZOOM_TIERS.tierC);
        const levelRank = {core: 2, regular: 1, supplementary: 0};

        const highMatchNames = {};
        for (let i = 0; i < highMatches.length; i++) {
            highMatchNames[highMatches[i].name] = true;
        }

        const visibleNormal = [];
        for (let i = 0; i < spotsWithScore.length; i++) {
            const s = spotsWithScore[i];
            if (!highMatchNames[s.name] && levelRank[getSpotLevel(s)] >= tier.minLevel) {
                visibleNormal.push(s);
            }
        }

        const visibleHigh = highMatches;

        let jitteredNormal, jitteredHigh;
        if (canProjectGeo(projChart)) {
            jitteredNormal = applyCoordJitterPixel(visibleNormal, projChart);
            if (jitteredNormal.length > 2) {
                jitteredNormal = applyPixelSpaceRepulsion(jitteredNormal, projChart);
            }
            jitteredHigh = applyCoordJitterPixel(visibleHigh, projChart);
            if (jitteredHigh.length > 2) {
                jitteredHigh = applyPixelSpaceRepulsion(jitteredHigh, projChart);
            }
        } else {
            jitteredNormal = applyCoordJitter(visibleNormal);
            jitteredHigh = applyCoordJitter(visibleHigh);
        }

        const normalSeriesData = [];
        for (let i = 0; i < jitteredNormal.length; i++) {
            const spot = jitteredNormal[i];
            const lvl = getSpotLevel(spot);
            const tm = typeMap[spot.type];
            normalSeriesData.push({
                name: spot.name,
                value: [spot.coord[0], spot.coord[1], spot.matchScore],
                itemStyle: {
                    color: tm?.color || '#00d4ff',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderWidth: 0.6,
                    opacity: 0.75
                },
                symbol: tm.symbol,
                symbolSize: SPOT_LEVEL_SIZE.normal[lvl]
            });
        }

        const effectData = [];
        const startName = routeStartSpot ? routeStartSpot.name : null;
        for (let i = 0; i < jitteredHigh.length; i++) {
            const spot = jitteredHigh[i];
            const lvl = getSpotLevel(spot);
            const isStart = startName && spot.name === startName;
            const tm = typeMap[spot.type];
            const color = isStart ? '#FF6B6B' : '#F0C870';
            effectData.push({
                name: spot.name,
                value: [spot.coord[0], spot.coord[1], spot.matchScore],
                itemStyle: {
                    color: color,
                    shadowBlur: isStart ? 35 : 25,
                    shadowColor: isStart ? 'rgba(255,107,107,0.9)' : 'rgba(240,200,112,0.8)',
                    borderColor: isStart ? '#FF4757' : '#FFD966',
                    borderWidth: isStart ? 3 : 2
                },
                symbol: tm.symbol,
                symbolSize: isStart ? SPOT_LEVEL_SIZE.high[lvl] * 1.4 : SPOT_LEVEL_SIZE.high[lvl],
                rippleEffect: {
                    brushType: 'stroke',
                    scale: isStart ? 5 : 4,
                    period: isStart ? 2 : 3
                }
            });
        }

        let linesData = [];
        let generateSuccess = false;
        const hLen = jitteredHigh.length;

        try {
            if (hLen >= 2) {
                for (let i = 0; i < hLen - 1; i++) {
                    linesData.push({
                        coords: [jitteredHigh[i].coord, jitteredHigh[i + 1].coord],
                        lineStyle: {
                            color: 'rgba(240,200,112,0.8)',
                            width: 2,
                            curveness: 0.2,
                            type: 'solid',
                            opacity: 0.8
                        }
                    });
                }
                if (hLen > 2) {
                    linesData.push({
                        coords: [jitteredHigh[hLen - 1].coord, jitteredHigh[0].coord],
                        lineStyle: {
                            color: 'rgba(240,200,112,0.6)',
                            width: 1.5,
                            curveness: 0.3,
                            type: 'dashed',
                            opacity: 0.6
                        }
                    });
                }
                generateSuccess = true;
            }
        } catch (e) {
            console.warn('[starmap] 线路生成失败，使用上一次有效线路:', e.message);
        }

        if (!generateSuccess && lastValidLinesData.length > 0) {
            linesData = lastValidLinesData;
        } else if (generateSuccess) {
            lastValidLinesData = linesData;
        }

        const baseEmphasis = {
            label: {show: true, formatter: '{b}', position: 'top', color: '#F0C870', fontSize: 11},
            itemStyle: {opacity: 1, borderWidth: 1.2}
        };
        const series = [
            {
                name: 'Stars', type: 'scatter', coordinateSystem: 'geo',
                data: normalSeriesData, zlevel: 1,
                sampling: 'none',
                label: {show: false},
                labelLayout: {hideOverlap: true, moveOverlap: 'shiftXY', moveTolerance: 6},
                emphasis: baseEmphasis,
                tooltip: {
                    formatter: (p) => {
                        const s = getSpotByName(p.name);
                        const score = s?.matchScore?.toFixed(0) || '--';
                        const tip = window.i18n ? window.i18n.t('spotClickTip') : 'Click for trivia';
                        const matchTip = window.i18n ? window.i18n.t('spotMatchTip', { score }) : `Match: ${score}%`;
                        return `<strong>${p.name}</strong><br/>${matchTip}<br/>${tip}`;
                    }
                }
            },
            {
                name: 'High Match', type: 'effectScatter', coordinateSystem: 'geo',
                data: effectData, zlevel: 2,
                sampling: 'none',
                rippleEffect: {brushType: 'stroke', period: 3, scale: 3.6},
                labelLayout: {hideOverlap: true, moveOverlap: 'shiftXY', moveTolerance: 10},
                label: {
                    show: true, formatter: '{b}', position: 'right',
                    fontWeight: 'bold', color: '#b8add0', fontSize: 14,
                    textBorderColor: '#2A0A0A', textBorderWidth: 2
                },
                emphasis: {focus: 'self'},
                tooltip: {
                    formatter: (p) => window.i18n ? window.i18n.t('highMatchTip') : 'High Match Recommendation, click for trivia'
                }
            }
        ];

        if (linesData.length) {
            series.push({
                name: 'Inspiration Route', type: 'lines', coordinateSystem: 'geo',
                data: linesData, zlevel: 3,
                effect: {
                    show: true,
                    period: 4,
                    trailLength: 0.3,
                    symbol: 'circle',
                    symbolSize: 6,
                    color: '#F0C870'
                }
            });
        }
        return series;
    }

    // 全局 zoom 状态（被 getMapSeries 用于缩放联动过滤）
    let currentZoom = 1.5;

    // 切省份时重置筛选标签为"全部"，避免旧省份的类型在新省份无数据
    function resetFilterTags() {
        currentTypeFilter = 'all';
        const btns = document.querySelectorAll('.tag-btn');
        btns.forEach(b => b.classList.remove('active'));
        const allBtn = document.getElementById('filterAll');
        if (allBtn) allBtn.classList.add('active');
    }


    // ==================== 地图 GeoJSON 配置 ====================
    // 区域 label formatter：根据当前语言 + 当前省份 code 把中文地市名转为英文
    function cityLabelFormatter(params) {
        const code = currentProvinceCode || '';
        if (typeof window.getCityName === 'function') {
            return window.getCityName(code, params.name, currentLang);
        }
        return params.name;
    }

    function getGeoConfig(province) {
        return {
            map: province.name,
            roam: true,
            zoom: province.zoom || 1.0,
            center: province.center,
            itemStyle: {
                borderColor: 'rgba(0,212,255,0.3)',
                borderWidth: 1.2,
                areaColor: 'rgba(20,12,40,0.6)',
                shadowBlur: 20,
                shadowColor: 'rgba(168,85,247,0.1)'
            },
            emphasis: {
                itemStyle: { areaColor: 'rgba(168,85,247,0.3)' },
                label: { show: true, color: '#00d4ff', fontWeight: 'bold' }
            },
            label: {
                show: true,
                color: 'rgba(200,180,230,0.7)',
                fontSize: 10,
                formatter: cityLabelFormatter
            },
            tooltip: {show: true}
        };
    }

    function refreshMapGeoConfig() {
        if (!myMapChart || !currentProvince) return;
        myMapChart.setOption({
            geo: getGeoConfig(currentProvince)
        }, true);
    }

    // ==================== 地图点击交互 ====================
    let lastClickTime = 0;
    let lastClickSpot = null;
    function bindMapClick() {
        if (!myMapChart) return;
        myMapChart.off('click');
        myMapChart.on('click', (params) => {
            if (params.componentType === 'series' && (params.seriesType === 'scatter' || params.seriesType === 'effectScatter')) {
                const spot = getSpotByName(params.name);
                if (spot) {
                    const now = Date.now();
                    const isDoubleClick = now - lastClickTime < 300 && lastClickSpot && lastClickSpot.name === spot.name;
                    lastClickTime = now;
                    lastClickSpot = spot;

                    if (isDoubleClick) {
                        routeStartSpot = routeStartSpot && routeStartSpot.name === spot.name ? null : spot;
                        refreshAll();
                        const msg = routeStartSpot
                            ? (window.i18n ? window.i18n.t('setRouteStart', { name: spot.name }) : `已将「${spot.name}」设为路线起点`)
                            : (window.i18n ? window.i18n.t('clearRouteStart') : '已取消路线起点');
                        const coldInfoEl = document.getElementById('coldInfo');
                        if (coldInfoEl) coldInfoEl.innerHTML = `<p><strong>${msg}</strong></p>`;
                    } else {
                        currentPreference = {
                            cultural: spot.cultureScore,
                            scenery: spot.sceneryScore,
                            food: spot.foodScore,
                            intangible: spot.heritageScore,
                            leisure: spot.leisureScore
                        };
                        const map = {
                            cultureScore: 'cult',
                            sceneryScore: 'scenery',
                            foodScore: 'food',
                            heritageScore: 'intangible',
                            leisureScore: 'leisure'
                        };
                        Object.keys(map).forEach(k => {
                            document.getElementById(map[k]).value = spot[k];
                            document.getElementById(map[k] + 'Val').innerText = spot[k];
                        });
                        routeStartSpot = null;
                        refreshAll();
                        const cold = currentLang === 'zh' ? spot.coldKnowledge : (spot.coldEn || spot.coldKnowledge);
                        const title = window.i18n ? window.i18n.t('trivia') : '冷知识';
                        const tail = window.i18n ? window.i18n.t('radarSynced') : '雷达已同步，专属灵感路线已更新~';
                        const coldInfoEl = document.getElementById('coldInfo');
                        if (coldInfoEl) coldInfoEl.innerHTML = `<p><strong>「${spot.name}」· ${title}</strong><br>${cold}<br>${tail}</p>`;
                    }
                }
            }
        });
    }

    // ==================== 滑块 & 分类筛选 ====================
    // 滑块 DOM id → currentPreference 字段名的映射（与 HTML 保持一致）
    const SLIDER_IDS = ['cultureSlider', 'scenerySlider', 'foodSlider', 'heritageSlider', 'leisureSlider'];
    const SLIDER_PREF_KEY = {
        cultureSlider: 'cultural',
        scenerySlider: 'scenery',
        foodSlider: 'food',
        heritageSlider: 'intangible',
        leisureSlider: 'leisure'
    };
    // 滑块 DOM id → 滑块旁数值 span 的 id
    const SLIDER_VAL_ID = {
        cultureSlider: 'cultureValue',
        scenerySlider: 'sceneryValue',
        foodSlider: 'foodValue',
        heritageSlider: 'heritageValue',
        leisureSlider: 'leisureValue'
    };
    // 滑块 DOM id → 对应 label id（i18n 写文案用）
    const SLIDER_LABEL_ID = {
        cultureSlider: 'cultureLabel',
        scenerySlider: 'sceneryLabel',
        foodSlider: 'foodLabel',
        heritageSlider: 'heritageLabel',
        leisureSlider: 'leisureLabel'
    };
    // 分类按钮 data-category 语义键 → typeMap 景点类型 key（保持 getMapSeries 内部 filter 兼容）
    // 关系：HTML data-category="nature"   → typeMap.natural
    //       HTML data-category="heritage" → typeMap.intangible
    const CATEGORY_TO_TYPE = {
        all: 'all',
        nature: 'natural',
        historic: 'historic',
        heritage: 'intangible',
        food: 'food'
    };

    // 把 currentPreference 的当前值同步刷到 5 个滑块 DOM + 数值 span
    // 作用：分类按钮 / 编程式 / 滑块联动 等任何来源都先写 currentPreference，
    //      再由本函数统一刷 DOM，确保 UI 与数据强一致。
    function syncSliderUI(pref) {
        const src = pref || currentPreference;
        SLIDER_IDS.forEach(id => {
            const key = SLIDER_PREF_KEY[id];
            const valSpan = document.getElementById(SLIDER_VAL_ID[id]);
            const slider = document.getElementById(id);
            if (valSpan) valSpan.innerText = src[key];
            if (slider) slider.value = src[key];
        });
    }

    // ==================== 统一偏好更新函数（任务三） ====================
    // 核心职责：作为全局唯一的偏好更新入口，一次性完成
    //   ① 更新全局 currentPreference
    //   ② 同步 5 个滑块的 value + 数值文本
    //   ③ 调用 updateRadarChart 更新雷达图形态
    //   ④ 调用 updateMapByPreference 重算景点匹配度并更新地图
    // 函数内不处理分类按钮样式（active 类由调用方按场景控制）。
    // 兼容既有数据结构，不修改 updateRadarChart / updateMapByPreference 内部逻辑。
    //
    // 参数：
    //   pref —— 五维偏好对象 {cultural, scenery, food, intangible, leisure}（每项 0-100）
    //   opts —— 可选扩展：
    //            tip:     string  写入 coldInfo 的提示文案（不传则不动 coldInfo）
    //            onApply: func    重绘完成后的回调（用于分类按钮激活态同步等）
    //            silent:  boolean true 时跳过 refreshAll（仅写数据+同步 UI，调用方自行控制重绘）
    // 返回：boolean —— 任意字段被实际更新时返回 true，否则 false
    function updatePreference(pref, opts) {
        if (!pref || typeof pref !== 'object') return false;
        const o = opts || {};
        // ① 更新全局 currentPreference（只覆盖 number 字段，避免传入脏数据破坏其他字段）
        let changed = false;
        ['cultural', 'scenery', 'food', 'intangible', 'leisure'].forEach(k => {
            if (typeof pref[k] === 'number' && currentPreference[k] !== pref[k]) {
                currentPreference[k] = pref[k];
                changed = true;
            }
        });
        if (!changed && !o.silent) {
            // 数据未变且无 silent 标记，直接短路返回（避免无谓重绘）
            // 注：silent 场景下仍要继续执行 UI 同步（调用方主动要求）
            return false;
        }
        // ② 同步 5 个滑块 + 数值文本
        syncSliderUI(currentPreference);
        // ③ + ④ 刷新雷达 + 地图（除非显式 silent）
        if (!o.silent) {
            refreshAll();
        }
        // 可选：冷知识区文案
        if (typeof o.tip === 'string') {
            const el = document.getElementById('coldInfo');
            if (el) el.innerHTML = `<p>${o.tip}</p>`;
        }
        // 可选：回调（在重绘 / silent 流程结束后调用）
        if (typeof o.onApply === 'function') o.onApply();
        return changed;
    }

    // 兼容别名：保留旧名 applyPreference 作为 updatePreference 的薄包装
    // 理由：先前任务已使用 applyPreference 接入 bindSliders 等调用方，
    //       此处保留同名入口确保历史调用零回归。
    function applyPreference(pref, opts) {
        return updatePreference(pref, opts);
    }

    // ==================== 任务五：滑块反向同步（200ms 防抖） ====================
    // 滑块拖动防抖重绘：仅防抖 refreshAll（雷达 + 地图），数值 span 实时更新保证跟手性
    const debouncedRefreshAll = debounce(() => {
        refreshAll();
    }, 200);

    function bindSliders() {
        SLIDER_IDS.forEach(id => {
            const slider = document.getElementById(id);
            if (!slider) return;
            const key = SLIDER_PREF_KEY[id];
            slider.addEventListener('input', (e) => {
                const newVal = parseInt(e.target.value);
                const valSpan = document.getElementById(SLIDER_VAL_ID[id]);
                if (valSpan) valSpan.innerText = newVal;
                const draft = Object.assign({}, currentPreference);
                draft[key] = newVal;
                const tip = window.i18n ? window.i18n.t('inspirationTip') : '✨ 灵感星语：雷达偏好已变，星光连线重新织就。<br>匹配度高的景点发出涟漪，分类筛选依旧生效~';
                updatePreference(draft, {
                    source: 'slider',
                    tip,
                    silent: true,
                    onApply: deactivateFilterButtons
                });
                routeStartSpot = null;
                debouncedRefreshAll();
            });
        });
    }

    // 手动拖动滑块时，调用本函数调整所有 .tag-btn 的激活态。
    // 任务五要求"可选兜底：保证始终有一个按钮处于激活态"——保留 all 按钮高亮。
    function deactivateFilterButtons() {
        const btns = document.querySelectorAll('.tag-btn');
        btns.forEach(b => b.classList.remove('active'));
        // 兜底：默认高亮「全部星点」，保证始终有一个分类按钮处于激活态
        const allBtn = document.querySelector('.tag-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        // 注意：currentTypeFilter 保持不变（分类筛选依旧生效），
        //       滑块拖动后视觉默认回到 all 兜底分类。
        activeCategory = 'all';  // 兜底视为 all 激活，去重逻辑兼容（再次点 all 会早 return）
    }

    // ==================== 任务四：分类按钮点击联动逻辑 ====================
    // 跟踪当前激活的分类键（用于去重：点击同一分类不重复触发重绘）
    let activeCategory = null;

    function bindFilterButtons() {
        const btns = document.querySelectorAll('.tag-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 1) 通过 dataset.category 读取分类键（任务规范明确指定 API）
                const category = btn.dataset.category;
                if (!category) return;
                // 2) 状态判断优化：点击同一分类 → 不重复触发重绘
                //    仅在分类切换时才走 ①清除所有 active ②加 active ③刷图表
                if (category === activeCategory) return;
                // 3) 视觉激活态：清除所有 active，给当前按钮加 active
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // 4) 景点类型筛选（任务四要求保留原有"按景点类型筛选点位"能力）
                //    category 语义键 → typeMap 内部 key（nature→natural、heritage→intangible）
                const newTypeFilter = CATEGORY_TO_TYPE[category] || category;
                const typeChanged = newTypeFilter !== currentTypeFilter;
                currentTypeFilter = newTypeFilter;
                // 5) 偏好预设：调用统一偏好更新函数（任务三 updatePreference）
                const preset = categoryPreset[category];
                if (preset) {
                    // 仅在偏好预设同步滑块时，silent + onApply 合并使用：
                    //   - 先 silent 写数据 + 同步滑块 UI（updateRadarChart / updateMapByPreference 由本函数末尾统一触发）
                    //   - onApply 不再二次刷新
                    const tip = window.i18n ? window.i18n.t('presetApplied', { name: btn.innerText }) : `🎯 已应用「${btn.innerText}」偏好预设：五维权重已同步到滑块与雷达。`;
                    updatePreference(preset, {tip, silent: true});
                }
                // 6) 类型筛选变化或偏好预设应用 → 清除路线起点并统一触发一次重绘
                if (typeChanged || preset) {
                    routeStartSpot = null;
                    refreshAll();
                }
                // 7) 兜底冷知识文案（无预设时）
                if (!preset) {
                    const tip = window.i18n ? window.i18n.t('currentFilterTip', { name: btn.innerText }) : `🔍 当前筛选: ${btn.innerText}<br>已展示省内相关景点，可继续调节雷达获得专属匹配路线。`;
                    const el = document.getElementById('coldInfo');
                    if (el) el.innerHTML = `<p>${tip}</p>`;
                    refreshAll();
                }
                // 8) 记录当前激活分类
                activeCategory = category;
            });
        });
    }

    // ==================== 语言切换 ====================
    function applyLanguage() {
        const t = window.i18n ? {
            loading: window.i18n.t('starmapLoading'),
            drawingStarmap: window.i18n.t('drawingStarmap'),
            subTitleDefault: window.i18n.t('subTitleDefault'),
            mainTitleDefault: window.i18n.t('mainTitleDefault'),
            legendNatural: window.i18n.t('legendNatural'),
            legendHistoric: window.i18n.t('legendHistoric'),
            legendIntangible: window.i18n.t('legendIntangible'),
            legendFood: window.i18n.t('legendFood'),
            legendHighMatch: window.i18n.t('legendHighMatch'),
            filterAll: window.i18n.t('filterAll'),
            filterNatural: window.i18n.t('filterNatural'),
            filterHistoric: window.i18n.t('filterHistoric'),
            filterIntangible: window.i18n.t('filterIntangible'),
            filterFood: window.i18n.t('filterFood'),
            cult: window.i18n.t('cult'),
            scenery: window.i18n.t('scenery'),
            food: window.i18n.t('food'),
            intangible: window.i18n.t('intangible'),
            leisure: window.i18n.t('leisure'),
            defaultInfo: window.i18n.t('defaultInfo'),
            switcherLabel: window.i18n.t('switcherLabel')
        } : {
            loading: "✨ 星图绘制中 · 多省联动 ✨",
            drawingStarmap: "✨ 星图绘制中 ✨",
            subTitleDefault: "调整偏好 · 星辰共鸣 · 灵感流光",
            mainTitleDefault: "华夏星图 · 文旅雷达",
            legendNatural: "自然风光",
            legendHistoric: "人文古迹",
            legendIntangible: "非遗体验",
            legendFood: "美食打卡",
            legendHighMatch: "高匹配",
            filterAll: "全部星点",
            filterNatural: "自然风光",
            filterHistoric: "人文古迹",
            filterIntangible: "非遗体验",
            filterFood: "美食打卡",
            cult: "文化厚重感",
            scenery: "风景出片率",
            food: "美食浓度",
            intangible: "非遗互动度",
            leisure: "休闲指数",
            defaultInfo: "✨ 灵感星语：点击任意景点，获取专属冷知识<br>调节雷达滑块，高匹配景点涟漪闪烁，并生成流光旅程~<br>左下角可分类筛选景区。",
            switcherLabel: "省份"
        };
        const currentLang = window.i18n ? window.i18n.getLang() : 'zh';
        const loadingSpan = document.getElementById('loadingText');
        if (loadingSpan) loadingSpan.innerText = t.loading;
        if (currentProvince) {
            const starmap = (window.i18n ? window.i18n.t('chinaStarmap') : '华夏星图');
            const radar = (window.i18n ? window.i18n.t('culturalRadar') : '文旅雷达');
            const provinceName = currentLang === 'zh' ? currentProvince.name : (currentProvince.nameEn || currentProvince.name);
            document.getElementById('mainTitle').innerText = provinceName + ' · ' + radar;
            document.getElementById('subTitle').innerText = t.subTitleDefault;
        } else {
            document.getElementById('mainTitle').innerText = t.mainTitleDefault;
            document.getElementById('subTitle').innerText = t.subTitleDefault;
        }
        document.getElementById('legendNaturalText').innerText = t.legendNatural;
        document.getElementById('legendHistoricText').innerText = t.legendHistoric;
        document.getElementById('legendIntangibleText').innerText = t.legendIntangible;
        document.getElementById('legendFoodText').innerText = t.legendFood;
        document.getElementById('legendHighMatchText').innerText = t.legendHighMatch;
        document.getElementById('filterAll').innerText = t.filterAll;
        document.getElementById('filterNatural').innerText = t.filterNatural;
        document.getElementById('filterHistoric').innerText = t.filterHistoric;
        document.getElementById('filterIntangible').innerText = t.filterIntangible;
        document.getElementById('filterFood').innerText = t.filterFood;
        document.getElementById('cultureLabel').innerText = t.cult;
        document.getElementById('sceneryLabel').innerText = t.scenery;
        document.getElementById('foodLabel').innerText = t.food;
        document.getElementById('heritageLabel').innerText = t.intangible;
        document.getElementById('leisureLabel').innerText = t.leisure;
        const coldInfoEl = document.getElementById('coldInfo');
        if (coldInfoEl) coldInfoEl.innerHTML = `<p>${t.defaultInfo}</p>`;
        const sl = document.querySelector('.province-switcher .switcher-label');
        if (sl) sl.innerText = t.switcherLabel;
        const mapLoadingTextEl = document.getElementById('mapLoadingText');
        if (mapLoadingTextEl) mapLoadingTextEl.innerText = t.drawingStarmap;

        updateRadarChart();
        updateMapByPreference();
        refreshMapGeoConfig();
    }

    // 切语言时按 provinceConfig 重新装载对应语言的景点
    function refreshSpotsByLang() {
        if (!currentProvinceCode) return;
        const cfg = provinceConfig[currentProvinceCode];
        if (!cfg) return;
        const list = currentLang === 'en' ? cfg.spotsEn : cfg.spotsZh;
        if (Array.isArray(list)) currentSpotsData = list;
    }

    // ==================== 核心：省份按需加载 + 缓存 ====================
    function setStatus(text, cls) {
        const el = document.getElementById('switcherStatus');
        if (!el) return;
        el.classList.remove('loading', 'cached', 'error');
        if (cls) el.classList.add(cls);
        el.innerText = text;
    }

    function setSelectDisabled(disabled) {
        const sel = document.getElementById('provinceSelect');
        if (sel) sel.disabled = disabled;
    }

    // 地图内层加载动画控制（覆盖在 mapChart 之上，避免白屏）
    function setMapLoading(show, msg) {
        const el = document.getElementById('mapLoading');
        if (!el) return;
        if (show) {
            el.classList.remove('hide');
            const t = document.getElementById('mapLoadingText');
            if (t) t.innerText = msg || (window.i18n ? window.i18n.t('drawingStarmap') : '✨ 星图绘制中 ✨');
        } else {
            el.classList.add('hide');
        }
    }

    // 地图内层空状态控制（景点数据缺失兜底，不触发报错）
    function setMapEmpty(show) {
        const el = document.getElementById('mapEmpty');
        if (!el) return;
        if (show) el.classList.remove('hide');
        else el.classList.add('hide');
    }

    // 通用防抖：300ms 内连续调用只触发最后一次
    function debounce(fn, wait) {
        let timer = null;
        return function debounced(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                fn.apply(this, args);
            }, wait);
        };
    }

    // ==================== 工具函数：HTML转义（防止XSS） ====================
    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== 工具函数：安全设置innerHTML ====================
    function safeInnerHTML(element, html) {
        if (!element) return;
        // 对于纯文本内容，使用textContent更安全
        if (typeof html === 'string' && !html.includes('<')) {
            element.textContent = html;
        } else {
            // 对于包含HTML的内容，需要进行转义处理
            element.innerHTML = html;
        }
    }

    // ==================== 工具函数：安全的localStorage操作 ====================
    const storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (err) {
                // localStorage可能在隐私模式、磁盘满或被禁用时抛出异常
                console.warn(`[starmap] Failed to save to localStorage: ${key}`, err.message);
                return false;
            }
        },
        get(key) {
            try {
                return localStorage.getItem(key);
            } catch (err) {
                console.warn(`[starmap] Failed to read from localStorage: ${key}`, err.message);
                return null;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (err) {
                console.warn(`[starmap] Failed to remove from localStorage: ${key}`, err.message);
                return false;
            }
        }
    };

    async function loadGeoJson(provinceCode, geoPath) {
        if (GeoJsonCache.has(provinceCode)) {
            return {geoJson: GeoJsonCache.get(provinceCode), fromCache: true};
        }
        const url = geoPath || `/static/geo/${provinceCode}_full.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText} - ${url}`);
            }
            const geoJson = await res.json();
            if (!geoJson || !Array.isArray(geoJson.features)) {
                throw new Error(`Invalid GeoJSON structure: ${url}`);
            }
            GeoJsonCache.set(provinceCode, geoJson);
            return {geoJson, fromCache: false};
        } catch (err) {
            // 完善错误处理：区分网络错误和其他错误
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                console.error(`[starmap] Network error loading GeoJSON: ${url}`, err);
                throw new Error(window.i18n ? window.i18n.t('networkErrorLoad', { url }) : `网络连接失败，请检查网络设置: ${url}`);
            }
            console.error(`[starmap] Failed to load GeoJSON: ${url}`, err);
            throw err;
        }
    }

    // 切换省份入口
    async function switchProvince(provinceCode) {
        if (!provinceCode) return;
        // 1) 解析配置：优先 provinceConfig，缺失时从旧 SPOTS_DATA 自动装配
        let cfg = provinceConfig[provinceCode];
        if (!cfg && window.SPOTS_DATA && window.SPOTS_DATA[provinceCode]) {
            const d = window.SPOTS_DATA[provinceCode];
            cfg = {
                code: provinceCode,
                mapName: d.name,
                name: d.name,
                nameEn: d.nameEn || d.name,
                center: d.center || [0, 0],
                zoom: typeof d.zoom === 'number' ? d.zoom : 1.0,
                geoPath: `/static/geo/${provinceCode}_full.json`,
                spotsZh: Array.isArray(d.spotsZh) ? d.spotsZh : (Array.isArray(d.spots) ? d.spots : []),
                spotsEn: Array.isArray(d.spotsEn) ? d.spotsEn : (Array.isArray(d.spots) ? d.spots : [])
            };
            provinceConfig[provinceCode] = cfg;
        }
        if (!cfg) {
            console.error('找不到省份配置:', provinceCode);
            return;
        }

        // 状态：loading / cached
        setSelectDisabled(true);
        const statusCached = window.i18n ? window.i18n.t('statusCached') : '已缓存';
        const statusLoading = window.i18n ? window.i18n.t('statusLoading') : '加载中…';
        const isCached = registeredMaps.has(cfg.mapName) || GeoJsonCache.has(provinceCode);
        setStatus(isCached ? statusCached : statusLoading, isCached ? 'cached' : 'loading');
        // 未命中缓存时显示地图内层 loading（避免白屏）
        setMapLoading(!isCached);
        setMapEmpty(false);

        try {
            // === 阶段 1：按需加载 → 注册缓存 ===
            if (!registeredMaps.has(cfg.mapName)) {
                const response = await fetch(cfg.geoPath);
                if (!response.ok) throw new Error(`HTTP ${response.status} ${cfg.geoPath}`);
                const geoJson = await response.json();
                if (!geoJson || !Array.isArray(geoJson.features)) {
                    throw new Error('Invalid GeoJSON: ' + cfg.geoPath);
                }
                GeoJsonCache.set(provinceCode, geoJson);
                echarts.registerMap(cfg.mapName, geoJson);
                registeredMaps.add(cfg.mapName);
                mapRegisteredSet.add(cfg.mapName);
            }

            // === 阶段 2：更新全局状态 + 按语言选择景点数据 ===
            currentProvinceCode = provinceCode;
            currentProvince = {
                code: cfg.code,
                name: cfg.name,
                nameEn: cfg.nameEn,
                center: cfg.center,
                zoom: cfg.zoom
            };
            const latestLang = window.i18n ? window.i18n.getLang() : 'zh';
            const spotList = latestLang === 'en' ? cfg.spotsEn : cfg.spotsZh;
            currentSpotsData = Array.isArray(spotList) ? spotList : [];
            // 切换省份时清空线路缓存，避免不同省份的线路数据混淆
            lastValidLinesData = [];
            // 切换省份时清空路线起点
            routeStartSpot = null;
            // 同步初始 zoom 给缩放联动判断（任务4进阶特性）
            currentZoom = cfg.zoom || 1.0;
            currentZoomTier = (currentZoom <= 1.0) ? 'tierA' : (currentZoom <= 1.5 ? 'tierB' : 'tierC');

            // === 阶段 3：更新 ECharts 地图配置 + 散点系列（强制全量更新） ===
            // 修复:拆成两次 setOption —— 先设 geo,再设 series
            // 原因:getMapSeries 内部需要 convertToPixel({geo:0}),必须 geo 已注册到图表后才能换算
            if (myMapChart) {
                myMapChart.setOption({
                    geo: {
                        map: cfg.mapName,
                        roam: true,
                        center: cfg.center,
                        zoom: cfg.zoom || 1.0,
                        itemStyle: { borderColor: '#C49A6C', borderWidth: 1.2, areaColor: '#3D1F1A' },
                        emphasis: {
                            itemStyle: { areaColor: '#8B3A3A' },
                            label: { show: true, color: '#F5D07A', fontWeight: 'bold' }
                        },
                        label: { show: true, color: '#E8D5B5', fontSize: 10, formatter: cityLabelFormatter },
                        tooltip: { show: true }
                    },
                    backgroundColor: 'transparent'
                }, true);
                // 第二次 setOption:geo 已就绪,getMapSeries 可安全做像素空间防重叠
                myMapChart.setOption({
                    series: getMapSeries(currentSpotsData, currentPreference, myMapChart)
                }, false);

                // 页面刷新后自动居中：确保地图视图恢复默认中心位置和缩放
                requestAnimationFrame(() => {
                    if (myMapChart) {
                        myMapChart.resize();
                        myMapChart.setOption({
                            geo: {
                                center: cfg.center,
                                zoom: cfg.zoom || 1.0
                            }
                        });
                    }
                });
            }

            // === 阶段 4：联动刷新右侧雷达 + 标题 + 状态 + 筛选 + 持久化 ===
            const starmapName = (window.i18n ? window.i18n.t('chinaStarmap') : '华夏星图');
            const radarName = (window.i18n ? window.i18n.t('culturalRadar') : '文旅雷达');
            const finalLang = window.i18n ? window.i18n.getLang() : 'zh';
            document.getElementById('mainTitle').innerText =
                (finalLang === 'zh' ? cfg.name : cfg.nameEn) + ' · ' +
                radarName;
            if (finalLang !== latestLang) {
                currentLang = finalLang;
                window.currentLang = finalLang;
                const newSpotList = finalLang === 'en' ? cfg.spotsEn : cfg.spotsZh;
                if (Array.isArray(newSpotList)) currentSpotsData = newSpotList;
                jitterCache.clear();
                if (myMapChart) {
                    myMapChart.setOption({
                        series: getMapSeries(currentSpotsData, currentPreference, myMapChart)
                    }, false);
                }
            }
            updateRadarChart(currentPreference);
            // 注：根据新需求"切省份后筛选分类状态保持不变"，此处不再调用 resetFilterTags()
            // 仅在 HTML 上确保"全部星点"默认 active（已在 DOM 中标注）
            // 若新省份无对应类型数据，ECharts 会自动展示空 set，并触发 setMapEmpty 兜底
            applyLanguage();
            // 修复：使用安全的storage对象，替代直接调用localStorage
            storage.set('appProvince', provinceCode);

            // 联动天气组件切换到对应省份
            window.currentProvinceCode = provinceCode;
            if (typeof window.syncWeatherToMapProvince === 'function') {
                try {
                    window.syncWeatherToMapProvince(provinceCode);
                } catch (e) {
                    console.warn('[starmap] syncWeatherToMapProvince failed:', e.message);
                }
            }

            const statusReady = window.i18n ? window.i18n.t('statusReady') : '就绪';
            setStatus(statusReady, '');
            setMapLoading(false);
            // 景点数据缺失兜底：显示空状态卡片，不触发报错
            if (currentSpotsData.length === 0) {
                setMapEmpty(true);
            } else {
                setMapEmpty(false);
            }
            setTimeout(() => {
                const statusReady2 = window.i18n ? window.i18n.t('statusReady') : '就绪';
                setStatus(statusReady2, '');
            }, 1500);
        } catch (err) {
            console.error('省份切换失败:', err);
            const statusError = window.i18n ? window.i18n.t('statusError') : '加载失败';
            setStatus(statusError, 'error');
            setMapLoading(false);
            // 错误兜底：下拉框回退到上一个有效省份
            const sel = document.getElementById('provinceSelect');
            const fallback = currentProvinceCode || (provinceListFallback[0] && provinceListFallback[0].code);
            if (sel && fallback) sel.value = fallback;
            const coldInfoEl = document.getElementById('coldInfo');
            if (coldInfoEl) {
                const errMsg = window.i18n ? window.i18n.t('mapLoadFailed', { code: provinceCode, path: cfg.geoPath, msg: err.message }) : `⚠️ ${provinceCode} 地图数据加载失败，请检查 /${cfg.geoPath} 是否存在。<br>错误：${err.message}`;
                coldInfoEl.innerHTML = `<p>⚠️ ${errMsg}</p>`;
            }
        } finally {
            setSelectDisabled(false);
            hideLoadingOverlay();
        }
    }

    // 渲染省份下拉选项（按当前语言填充），供 bindProvinceSwitcher + switchLanguage 复用
    function renderProvinceOptions() {
        const sel = document.getElementById('provinceSelect');
        if (!sel) return;
        const list = (Array.isArray(window.PROVINCE_LIST) && window.PROVINCE_LIST.length)
            ? window.PROVINCE_LIST
            : provinceListFallback;
        if (!list || !list.length) return;
        const prev = currentProvinceCode || sel.value;
        const fmt = window.i18n ? window.i18n.t('provinceCountFormat') : '{{name}} ({{count}})';
        sel.innerHTML = list.map(p => {
            const name = currentLang === 'zh' ? p.name : p.nameEn;
            const label = fmt.replace('{{name}}', name).replace('{{count}}', p.count);
            return `<option value="${p.code}">${label}</option>`;
        }).join('');
        // 还原当前选中（避免重新填充后丢失）
        if (prev && provinceConfig[prev]) sel.value = prev;
    }

    async function bindProvinceSwitcher() {
        const sel = document.getElementById('provinceSelect');
        if (!sel) return;
        const list = (Array.isArray(window.PROVINCE_LIST) && window.PROVINCE_LIST.length)
            ? window.PROVINCE_LIST
            : provinceListFallback;
        if (!list || !list.length) return;
        renderProvinceOptions();
        // 默认选择：storage -> 首项（修复：使用安全的storage对象）
        const saved = storage.get('appProvince');
        const initial = (saved && provinceConfig[saved]) ? saved : '340000';
        if (initial) {
            sel.value = initial;
            await switchProvince(initial);
        }
        // 省份初始化完成后，同步初始化天气组件
        if (typeof window.initWeatherWidget === 'function') {
            const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'zh';
            window.initWeatherWidget(lang);
        }
        // 防抖包装：300ms 内连续切换只触发最后一次，避免重复请求与重绘
        const debouncedSwitch = debounce((code) => switchProvince(code), 300);
        sel.addEventListener('change', (e) => debouncedSwitch(e.target.value));
    }

    // ==================== 初始化 ====================
    function initRadar() {
        const radarDom = document.getElementById('radarChart');
        if (radarDom && typeof echarts !== 'undefined') {
            // 关键修复：等 DOM 真正有宽度（CSS 已生效）再 init，否则画布会被 ECharts 缓存为 0
            requestAnimationFrame(() => {
                const w = radarDom.clientWidth;
                const h = radarDom.clientHeight;
                if (w === 0 || h === 0) {
                    // 兜底：再延一帧
                    setTimeout(() => {
                        myRadarChart = echarts.init(radarDom);
                        updateRadarChart();
                    }, 80);
                } else {
                    myRadarChart = echarts.init(radarDom);
                    updateRadarChart();
                }
            });
        }
    }

    function initMapChart() {
        if (!myMapChart) {
            myMapChart = echarts.init(document.getElementById('mapChart'));
            bindMapClick();
            // 修复：保存resize处理函数引用，以便cleanup函数能正确清理
            cleanupRegistry.resizeHandler = () => {
                myMapChart && myMapChart.resize();
                myRadarChart && myRadarChart.resize();
            };
            window.addEventListener('resize', cleanupRegistry.resizeHandler);
            // 缩放联动：监听 georoam，更新 currentZoom 后重新计算可见层（任务4进阶特性）
            // 修复：使用cleanupRegistry.zoomDebounceTimer替代局部变量，便于cleanup清理
            cleanupRegistry.zoomDebounceTimer = null;
            myMapChart.on('georoam', (e) => {
                if (!myMapChart) return;
                if (cleanupRegistry.zoomDebounceTimer) clearTimeout(cleanupRegistry.zoomDebounceTimer);
                cleanupRegistry.zoomDebounceTimer = setTimeout(() => {
                    try {
                        const opt = myMapChart.getOption();
                        const geos = Array.isArray(opt.geo) ? opt.geo : (opt.geo ? [opt.geo] : []);
                        const z = (geos[0] && typeof geos[0].zoom === 'number') ? geos[0].zoom : currentZoom;
                        const diff = Math.abs(z - currentZoom);
                        if (diff > 0.05) {
                            currentZoom = z;
                            const newTier = (z <= 1.0) ? 'tierA' : (z <= 1.5 ? 'tierB' : 'tierC');
                            if (newTier !== currentZoomTier) {
                                currentZoomTier = newTier;
                                myMapChart.setOption({
                                    series: getMapSeries(currentSpotsData, currentPreference, myMapChart)
                                }, false);
                            } else if (diff > 0.2) {
                                myMapChart.setOption({
                                    series: getMapSeries(currentSpotsData, currentPreference, myMapChart)
                                }, false);
                            }
                        }
                    } catch (err) { /* 静默：getOption 异常不阻断交互 */
                    }
                }, 300);
            });
        }
    }

    function initLang() {
        currentLang = window.i18n ? window.i18n.getLang() : 'zh';
        window.currentLang = currentLang;
        applyLanguage();
        document.addEventListener('lang:changed', handleLangChanged);
    }
    
    function handleLangChanged() {
        currentLang = window.i18n ? window.i18n.getLang() : 'zh';
        window.currentLang = currentLang;
        routeStartSpot = null;
        refreshSpotsByLang();
        renderProvinceOptions();
        applyLanguage();
        refreshMapGeoConfig();
        refreshAll();
        if (typeof window.refreshWeatherLanguage === 'function') {
            window.refreshWeatherLanguage(currentLang);
        }
    }

    // ==================== 任务六：初始化 all 预设 ====================
    // 页面加载完成后，默认应用 categoryPreset.all 五维权重到 currentPreference，
    // 并同步滑块、雷达、地图、按钮 active 类，保证四者初始一致。
    function applyAllPreset() {
        const preset = categoryPreset.all;
        if (!preset) return;
        // ① 同步滑块 + 数值文本（不触发 refresh，由调用方统一触发）
        syncSliderUI(preset);
        // ② 写 currentPreference
        Object.assign(currentPreference, preset);
        // ③ 雷达 + 地图重绘
        refreshAll();
        // ④ 视觉激活态：保证"全部星点"按钮处于 active
        const btns = document.querySelectorAll('.tag-btn');
        btns.forEach(b => b.classList.remove('active'));
        const allBtn = document.querySelector('.tag-btn[data-category="all"]');
        if (allBtn) allBtn.classList.add('active');
        // ⑤ 类型筛选保持 all
        currentTypeFilter = 'all';
        // ⑥ 同步去重状态
        activeCategory = 'all';
    }

    async function startApp() {
        if (_appStarted) return;
        _appStarted = true;

        setTimeout(hideLoadingOverlay, 600);
        setTimeout(hideLoadingOverlay, 1500);

        try {
            initLang();
            initRadar();
            initMapChart();
            bindSliders();
            bindFilterButtons();
            await bindProvinceSwitcher();
            applyAllPreset();
        } catch (e) {
            console.error('[starmap] startApp error:', e.message);
        } finally {
            hideLoadingOverlay();
        }
    }

    // ==================== ECharts 加载检测（优化轮询机制） ====================
    // 修复：使用更高效的加载检测方式，避免不必要的轮询
    
    function checkEChartsAndStart() {
        if (_appStarted) return false;
        if (typeof echarts !== 'undefined') {
            startApp();
            return true;
        }
        return false;
    }
    
    // 方案1：如果脚本已经加载，直接启动
    if (checkEChartsAndStart()) {
        // ECharts已就绪，无需进一步处理
    }
    // 方案2：监听DOMContentLoaded事件
    else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function onReady() {
            document.removeEventListener('DOMContentLoaded', onReady);
            // DOM就绪后检查，给ECharts一点时间加载
            setTimeout(checkEChartsAndStart, 100);
        });
    }
    // 方案3：使用指数退避轮询（仅作为兜底）
    else {
        let attempts = 0;
        const maxAttempts = 20;
        
        function pollWithBackoff() {
            attempts++;
            if (checkEChartsAndStart()) {
                return;
            }
            if (attempts >= maxAttempts) {
                console.error('[starmap] ECharts loading timeout');
                hideLoadingOverlay();
                return;
            }
            // 指数退避：100ms, 200ms, 400ms, 800ms... 最多2秒
            const delay = Math.min(100 * Math.pow(2, attempts), 1000);
            setTimeout(pollWithBackoff, delay);
        }
        
        pollWithBackoff();
    }

    // 暴露省份切换函数，供天气组件联动调用
    window.changeMapProvince = switchProvince;
})();
