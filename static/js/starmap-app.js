/* =============================================================
   徽韵星图 · 多省份通用版本
   - 方案：按需动态加载 + 本地缓存
   - GeoJSON 缓存：第一次按需 fetch /geo/[adcode]_full.json，
     缓存到 GeoJsonCache；之后切换直接复用，零网络请求
   - 业务数据：从 static/js/spots-data.js 的 SPOTS_DATA 中按省份 code 提取
   - 用户上次选择的省份持久化到 localStorage('appProvince')
   ============================================================= */
(function () {
    // ==================== 立即初始化加载文字（避免闪烁） ====================
    const savedLang0 = localStorage.getItem('appLang');
    {
        const loadingSpan = document.getElementById('loadingText');
        if (loadingSpan) {
            loadingSpan.innerText = savedLang0 === 'en'
                ? "✨ Drawing Starmap · Huizhou Charm ✨"
                : "✨ 星图绘制中 · 多省联动 ✨";
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
                geoPath: `geo/${code}_full.json`,                 // 本地 GeoJSON 路径
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
        all: {cultural: 60, scenery: 60, food: 60, intangible: 60, leisure: 60},
        nature: {cultural: 50, scenery: 90, food: 40, intangible: 30, leisure: 75},
        historic: {cultural: 90, scenery: 50, food: 40, intangible: 70, leisure: 45},
        heritage: {cultural: 75, scenery: 45, food: 40, intangible: 95, leisure: 50},
        food: {cultural: 40, scenery: 50, food: 95, intangible: 35, leisure: 70}
    };

    // ==================== 高匹配筛选策略（双模式 + 兜底） ====================
    //  percentTop:  百分位模式下取前 N%（默认 30%）
    //  scoreGate:   分数阈值模式下最低匹配分（默认 60）
    //  minHigh:     高匹配点最少保证数量（兜底）
    //  maxHigh:     高匹配点最多展示数量（避免涟漪过密）
    const HIGH_MATCH_RULE = {
        mode: 'percentile',   // 'percentile' | 'threshold'
        percentTop: 0.30,
        scoreGate: 60,
        minHigh: 8,
        maxHigh: 25
    };

    // ==================== 性能兜底（大数据模式） ====================
    // 当单省份景点数 ≥ LARGE_MODE_THRESHOLD 时启用：
    //   1) scatter.large = true（WebGL/Canvas 优化批渲染）
    //   2) highMatchCap = 20（高匹配点上限 20，减少涟漪动效性能消耗）
    //   3) 关闭 hover emphasis 动画（scale/transition 全 false）
    //   4) 流光连线只连接前 8 个高匹配点（避免线路过多杂乱）
    //   5) progressive + progressiveThreshold 分批渲染
    const LARGE_MODE_THRESHOLD = 300;
    const LARGE_MODE_HIGH_CAP = 20;
    const LARGE_MODE_LINE_CAP = 8;

    // 计算高匹配点集合（按 matchScore 降序裁剪 + 兜底）
    // 第二参数 cap 用于动态覆盖 rule.maxHigh（如大数据模式降为 20）
    function pickHighMatches(spotsWithScore, rule, cap) {
        const total = spotsWithScore.length;
        if (total === 0) return [];
        const sorted = [...spotsWithScore].sort((a, b) => b.matchScore - a.matchScore);

        let candidates;
        if (rule.mode === 'threshold') {
            candidates = sorted.filter(s => s.matchScore >= rule.scoreGate);
        } else {
            // 百分位模式：取前 percentTop 名
            const topN = Math.max(1, Math.ceil(total * rule.percentTop));
            candidates = sorted.slice(0, topN);
        }

        // 兜底：不足 minHigh 时补到前 minHigh 名
        if (candidates.length < rule.minHigh) {
            candidates = sorted.slice(0, Math.min(rule.minHigh, total));
        }
        // 上限：防止点位过密（cap 覆盖默认 maxHigh）
        const finalCap = (typeof cap === 'number' && cap > 0) ? Math.min(cap, rule.maxHigh) : rule.maxHigh;
        if (candidates.length > finalCap) {
            candidates = candidates.slice(0, finalCap);
        }
        return candidates;
    }

    // ==================== 国际化文本 ====================
    const i18n = {
        zh: {
            loading: "✨ 星图绘制中 · 多省联动 ✨",
            mainTitleDefault: "华夏星图 · 文旅雷达",
            subTitleDefault: "调整偏好 · 星辰共鸣 · 灵感流光",
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
            radarSeriesName: "当前偏好",
            switcherLabel: "🗺️ 省份",
            statusReady: "就绪",
            statusLoading: "加载中…",
            statusCached: "已缓存",
            statusError: "加载失败"
        },
        en: {
            loading: "✨ Drawing Starmap · Multi-Province ✨",
            mainTitleDefault: "China Starmap · Cultural Radar",
            subTitleDefault: "Adjust Preferences · Star Resonance · Inspiration Flow",
            legendNatural: "Nature",
            legendHistoric: "Heritage",
            legendIntangible: "ICH",
            legendFood: "Food",
            legendHighMatch: "High Match",
            filterAll: "All Spots",
            filterNatural: "Nature",
            filterHistoric: "Heritage",
            filterIntangible: "ICH",
            filterFood: "Food",
            cult: "Cultural Depth",
            scenery: "Scenic View",
            food: "Food Scene",
            intangible: "ICH Experience",
            leisure: "Relaxation",
            defaultInfo: "✨ Inspiration: Click any spot for exclusive trivia.<br>Adjust sliders to see high-match spots ripple and create light trails.<br>Filter attractions by category at bottom left.",
            radarSeriesName: "Current Preference",
            switcherLabel: "🗺️ Province",
            statusReady: "Ready",
            statusLoading: "Loading…",
            statusCached: "Cached",
            statusError: "Failed"
        }
    };

    // ==================== 全局状态 ====================
    let currentLang = 'zh';
    let myMapChart = null, myRadarChart = null;
    let currentPreference = {cultural: 68, scenery: 82, food: 55, intangible: 70, leisure: 80};
    let currentTypeFilter = 'all';
    let currentProvinceCode = null;          // 当前选中的省份 adcode
    let currentProvince = null;             // 当前选中的省份元数据 {name,nameEn,center,zoom,spots}
    let currentSpotsData = [];              // 当前省份的景点数组
    let mapRegisteredSet = new Set();       // 已通过 echarts.registerMap 注册过的地图名

    // ==================== GeoJSON 缓存 ====================
    const GeoJsonCache = new Map();         // key = provinceCode, value = GeoJSON FeatureCollection
    const registeredMaps = new Set();       // 与 mapRegisteredSet 保持同步的 ECharts 注册名集合

    function getSpotByName(name) {
        return currentSpotsData.find(s => s.name === name);
    }

    function computeMatchScore(spot, pref) {
        const diff = Math.sqrt(
            Math.pow(spot.cultureScore - pref.cultural, 2) +
            Math.pow(spot.sceneryScore - pref.scenery, 2) +
            Math.pow(spot.foodScore - pref.food, 2) +
            Math.pow(spot.heritageScore - pref.intangible, 2) +
            Math.pow(spot.leisureScore - pref.leisure, 2)
        );
        const maxDiff = Math.sqrt(5 * 100 * 100);
        return Math.min(100, Math.max(0, 100 - (diff / maxDiff) * 100));
    }

    // ==================== ECharts 渲染 ====================
    function updateMapByPreference() {
        if (!myMapChart || !currentProvince) return;
        // 复用统一的 series 生成函数（与切换省份走同一份逻辑）
        const series = getMapSeries(currentSpotsData, currentPreference);
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
        const t = i18n[currentLang];
        myRadarChart.setOption({
            radar: {
                indicator: [
                    {name: t.cult, max: 100}, {name: t.scenery, max: 100},
                    {name: t.food, max: 100}, {name: t.intangible, max: 100}, {name: t.leisure, max: 100}
                ],
                shape: 'circle', center: ['50%', '50%'], radius: '65%',
                name: {
                    textStyle: {
                        color: '#F0C870',
                        fontSize: 13,
                        fontWeight: 500
                    }
                },
                splitLine: {lineStyle: {color: 'rgba(240, 200, 112, 0.4)'}},
                splitArea: {
                    areaStyle: {
                        color: [
                            'rgba(184, 38, 38, 0.10)',
                            'rgba(240, 200, 112, 0.04)',
                            'rgba(184, 38, 38, 0.08)',
                            'rgba(240, 200, 112, 0.03)',
                            'rgba(184, 38, 38, 0.06)'
                        ]
                    }
                },
                axisLine: {lineStyle: {color: 'rgba(240, 200, 112, 0.35)'}}
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
                itemStyle: {color: '#B82626', borderColor: '#F0C870', borderWidth: 1.5},
                lineStyle: {width: 2, color: '#F0C870'},
                areaStyle: {
                    color: {
                        type: 'radial',
                        x: 0.5, y: 0.5, r: 0.65,
                        colorStops: [
                            {offset: 0, color: 'rgba(184, 38, 38, 0.5)'},
                            {offset: 1, color: 'rgba(240, 200, 112, 0.15)'}
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
    const JITTER_RANGE = 0.02; // ±0.02° 抖动幅度
    const ZOOM_TIERS = {
        // 缩放联动：当 zoom < tier.maxVisible 时仅显示 ≥ tier.minLevel 的层
        // 0: 补充, 1: 常规, 2: 核心
        tierA: {maxZoom: 1.0, minLevel: 2}, // 极小：只核心
        tierB: {maxZoom: 1.5, minLevel: 1}, // 中等：核心+常规
        tierC: {maxZoom: Infinity, minLevel: 0} // 放大：全部
    };
    let currentZoomTier = 2; // 默认"全部"档（maxLevel=0）

    // 工具：按综合分计算点位等级
    function getSpotLevel(spot) {
        const composite = (Number(spot.cultureScore || 0) + Number(spot.heritageScore || 0)) / 2;
        if (composite >= 80) return 'core';
        if (composite >= 60) return 'regular';
        return 'supplementary';
    }

    // 工具：对经纬度完全重合的点施加 ±0.02° 随机偏移
    // 返回新数组（不修改原对象）。key 用 lng.lat 字符串（4 位小数精度检测）。
    function applyCoordJitter(spots, range = JITTER_RANGE) {
        const seen = new Map(); // key -> count
        return spots.map(spot => {
            const [lng, lat] = spot.coord;
            const key = `${lng.toFixed(4)}_${lat.toFixed(4)}`;
            const c = seen.get(key) || 0;
            seen.set(key, c + 1);
            if (c === 0) return spot; // 首个不偏移
            // 同 key 第 2、3... 个点位施加随机偏移
            const dx = (Math.random() * 2 - 1) * range;
            const dy = (Math.random() * 2 - 1) * range;
            return {...spot, coord: [lng + dx, lat + dy]};
        });
    }

    function getMapSeries(spots, pref) {
        const filteredSpots = currentTypeFilter === 'all'
            ? spots
            : spots.filter(s => s.type === currentTypeFilter);

        // 空数据兜底：返回 3 个空 series 占位，避免 ECharts 报错
        if (!filteredSpots.length) {
            return [
                {name: 'Stars', type: 'scatter', coordinateSystem: 'geo', data: [], zlevel: 1},
                {name: 'High Match', type: 'effectScatter', coordinateSystem: 'geo', data: [], zlevel: 2},
                {name: 'Inspiration Route', type: 'lines', coordinateSystem: 'geo', data: [], zlevel: 3}
            ];
        }

        // 性能兜底：单省 ≥ 300 景点时启用大数据模式
        const isLargeMode = filteredSpots.length >= LARGE_MODE_THRESHOLD;
        const highCap = isLargeMode ? LARGE_MODE_HIGH_CAP : undefined;  // 20 / 默认25
        const lineCap = isLargeMode ? LARGE_MODE_LINE_CAP : Infinity;   // 8 / 不限

        // 1) 全量景点打分
        const spotsWithScore = filteredSpots.map(spot => ({
            ...spot,
            matchScore: computeMatchScore(spot, pref)
        }));

        // 2) 计算高匹配集合（百分位 / 阈值 双模式 + 兜底）
        //    大数据模式下 cap=20 覆盖默认 maxHigh=25
        const highMatches = pickHighMatches(spotsWithScore, HIGH_MATCH_RULE, highCap);
        const highMatchNames = new Set(highMatches.map(s => s.name));
        const normalSpots = spotsWithScore.filter(s => !highMatchNames.has(s.name));

        // 3) 缩放联动：按当前 zoom 档过滤可见层
        // minLevel 0=全部 / 1=核心+常规 / 2=核心
        const tier = ZOOM_TIERS.tierA.maxZoom <= currentZoom
            ? ZOOM_TIERS.tierA
            : (currentZoom <= ZOOM_TIERS.tierB.maxZoom ? ZOOM_TIERS.tierB : ZOOM_TIERS.tierC);
        const levelRank = {core: 2, regular: 1, supplementary: 0};

        function visibleByZoom(spot) {
            return levelRank[getSpotLevel(spot)] >= tier.minLevel;
        }

        const visibleNormal = normalSpots.filter(visibleByZoom);
        let visibleHigh = highMatches.filter(visibleByZoom);

        // 大数据模式：流光连线只连接前 8 个高匹配点（仅裁切 effectData，lineCap 控制）
        if (isLargeMode && visibleHigh.length > lineCap) {
            visibleHigh = visibleHigh.slice(0, lineCap);
        }

        // 4) 点位抖动：先对"可见散点"去重偏移（防止完全重叠）
        //    高匹配点也参与抖动，确保流光线路不被同一坐标拉成零长度线
        const jitteredNormal = applyCoordJitter(visibleNormal);
        const jitteredHigh = applyCoordJitter(visibleHigh);

        // 5) 第一层：普通散点（覆盖全量，统一主色 #F0C870 亮金 + 朱砂外光，半透明）
        //    symbolSize 按点位等级分核心 7 / 常规 6 / 补充 5，形成视觉层次
        const normalSeriesData = jitteredNormal.map(spot => {
            const lvl = getSpotLevel(spot);
            return {
                name: spot.name,
                value: [...spot.coord, spot.matchScore],
                itemStyle: {
                    color: '#F0C870',
                    borderColor: 'rgba(223, 208, 184, 0.5)',
                    borderWidth: 0.6,
                    opacity: 0.75
                },
                // 形状仍按类型区分（不影响主色），保留信息可读性
                symbol: typeMap[spot.type].symbol,
                symbolSize: SPOT_LEVEL_SIZE.normal[lvl]
            };
        });

        // 6) 第二层：特效散点（高匹配，金托红宝石 · 朱砂嵌宝 + 描金边 + 涟漪 + 标签）
        //    symbolSize 按点位等级：核心 12 / 常规 11 / 补充 10
        //    大数据模式：rippleEffect 周期拉长 + scale 缩小，减少性能消耗
        const effectData = jitteredHigh.map(spot => {
            const lvl = getSpotLevel(spot);
            return {
                name: spot.name,
                value: [...spot.coord, spot.matchScore],
                itemStyle: {
                    color: '#B82626',
                    shadowBlur: isLargeMode ? 10 : 16,
                    shadowColor: 'rgba(184, 38, 38, 0.65)',
                    borderColor: '#F0C870',
                    borderWidth: 2
                },
                symbol: typeMap[spot.type].symbol,
                symbolSize: SPOT_LEVEL_SIZE.high[lvl],
                rippleEffect: {
                    brushType: 'stroke',
                    scale: isLargeMode ? 2.8 : 3.6,
                    period: isLargeMode ? 5 : 4
                }
            };
        });

        // 7) 第三层：流光连线（仅高匹配点之间连成光路，使用抖动后坐标）
        //    大数据模式：仅连接前 8 个；普通模式：全连接 + 虚线回环
        const linesData = [];
        if (jitteredHigh.length >= 2) {
            const pts = jitteredHigh.map(s => s.coord);
            const segCount = Math.min(pts.length - 1, isLargeMode ? lineCap - 1 : pts.length - 1);
            for (let i = 0; i < segCount; i++) {
                linesData.push({
                    coords: [pts[i], pts[i + 1]],
                    lineStyle: {
                        color: '#F0C870',
                        width: isLargeMode ? 1.6 : 2.2,
                        curveness: 0.2,
                        type: 'solid',          // ← 改为 solid
                        opacity: 0.9
                    }
                });
            }
            // 虚线回环：仅普通模式 + 至少 3 点
            if (!isLargeMode && pts.length > 2) {
                linesData.push({
                    coords: [pts[pts.length - 1], pts[0]],
                    lineStyle: {color: '#B82626', width: 1.4, curveness: 0.3, type: 'dashed', opacity: 0.6}
                });
            }
        }

        // 8) 装配三层 series
        // 显式声明 sampling: 'none' 防止 ECharts 自动抽稀合并点位（任务4基础配置要求）
        // 大数据模式：large: true + progressive 启用批渲染；hover emphasis 关闭动画
        const baseEmphasis = {
            label: {show: true, formatter: '{b}', position: 'top', color: '#F0C870', fontSize: 11},
            itemStyle: {opacity: 1, borderWidth: 1.2}
        };
        // 大数据模式：emphasis.scale false + 无 transition 减少重绘
        if (isLargeMode) {
            baseEmphasis.scale = false;
            baseEmphasis.focus = 'self';
        }
        const series = [
            {
                name: 'Stars', type: 'scatter', coordinateSystem: 'geo',
                data: normalSeriesData, zlevel: 1,
                sampling: 'none',
                // 大数据模式：开启 large + progressive 优化
                ...(isLargeMode ? {
                    large: true,
                    largeThreshold: 100,
                    progressive: 800,
                    progressiveThreshold: 1500
                } : {}),
                // symbolSize 已在每条 data 中按等级定义
                label: {show: false},
                emphasis: baseEmphasis,
                tooltip: {
                    formatter: (p) => {
                        const s = getSpotByName(p.name);
                        return `<strong>${p.name}</strong><br/>Match: ${s?.matchScore?.toFixed(0) || '--'}%<br/>Click for trivia`;
                    }
                }
            },
            {
                name: 'High Match', type: 'effectScatter', coordinateSystem: 'geo',
                data: effectData, zlevel: 2,
                sampling: 'none',
                // 大数据模式：rippleEffect 整体降级（period 拉长、scale 缩小）
                rippleEffect: {brushType: 'stroke', period: isLargeMode ? 5 : 3, scale: isLargeMode ? 2.8 : 3.6},
                // 标签防重叠：labelLayout 自动避让 + hideOverlap 极端密集时自动隐藏部分
                labelLayout: {hideOverlap: true, moveOverlap: 'shiftY'},
                label: {
                    show: true, formatter: '{b}', position: 'right',
                    fontWeight: 'bold', color: '#F0C870', fontSize: isLargeMode ? 10 : 11,
                    textBorderColor: '#2A0A0A', textBorderWidth: 2
                },
                emphasis: isLargeMode ? {scale: false, focus: 'self'} : {focus: 'self'},
                tooltip: {
                    formatter: (p) => `${p.name} · High Match Recommendation, click for trivia`
                }
            }
        ];

        if (linesData.length) {
            series.push({
                name: 'Inspiration Route', type: 'lines', coordinateSystem: 'geo',
                data: linesData, zlevel: 3,
                lineStyle: {color: '#F0C870', width: isLargeMode ? 1.4 : 2.0, curveness: 0.2, opacity: 0.9},
                effect: {
                    show: true,
                    period: isLargeMode ? 6 : 4,
                    trailLength: 0.35,
                    symbol: 'arrow',
                    symbolSize: isLargeMode ? 6 : 8,
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
                borderColor: '#C49A6C',   // 暖金边界
                borderWidth: 1.2,
                areaColor: '#3D1F1A'      // 深褐红
            },
            emphasis: {
                itemStyle: {
                    areaColor: '#8B3A3A'  // 红褐高亮
                },
                label: {show: true, color: '#F5D07A', fontWeight: 'bold'}
            },
            label: {
                show: true,
                color: '#E8D5B5',         // 米黄标签
                fontSize: 10,
                formatter: cityLabelFormatter
            },
            tooltip: {show: true}
        };
    }

    function refreshMapGeoConfig() {
        if (!myMapChart || !currentProvince) return;
        let currentOption = null;
        try {
            currentOption = myMapChart.getOption();
        } catch (e) {
        }
        const series = (currentOption && Array.isArray(currentOption.series)) ? currentOption.series : [];
        myMapChart.setOption({
            geo: getGeoConfig(currentProvince),
            series: series
        }, false);
    }

    // ==================== 地图点击交互 ====================
    function bindMapClick() {
        if (!myMapChart) return;
        myMapChart.off('click');
        myMapChart.on('click', (params) => {
            if (params.componentType === 'series' && (params.seriesType === 'scatter' || params.seriesType === 'effectScatter')) {
                const spot = getSpotByName(params.name);
                if (spot) {
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
                    refreshAll();
                    const cold = currentLang === 'zh' ? spot.coldKnowledge : (spot.coldEn || spot.coldKnowledge);
                    const title = currentLang === 'zh' ? '冷知识' : 'Trivia';
                    const tail = currentLang === 'zh' ? '雷达已同步，专属灵感路线已更新~' : 'Radar synced, inspiration route updated~';
                    document.getElementById('coldInfo').innerHTML = `<p><strong>「${spot.name}」· ${title}</strong><br>${cold}<br>${tail}</p>`;
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
                // 实时更新数值 span（不防抖，保证跟手性）
                const valSpan = document.getElementById(SLIDER_VAL_ID[id]);
                if (valSpan) valSpan.innerText = newVal;
                // 单一来源：仅写 currentPreference + 同步滑块 UI（silent 不触发 refresh）
                const draft = Object.assign({}, currentPreference);
                draft[key] = newVal;
                const tip = currentLang === 'zh'
                    ? '✨ 灵感星语：雷达偏好已变，星光连线重新织就。<br>匹配度高的景点发出涟漪，分类筛选依旧生效~'
                    : '✨ Sliders adjusted, starlight connections renewed.<br>High-match spots ripple, filters still active~';
                updatePreference(draft, {
                    source: 'slider',
                    tip,
                    silent: true,                       // 滑块 → 不在 updatePreference 内触发 refresh
                    onApply: deactivateFilterButtons    // 手动拖滑块 → 分类按钮激活态调整
                });
                // 200ms 防抖：仅延迟刷新雷达 + 地图（避免拖动过程频繁重绘卡顿）
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
                    const tip = currentLang === 'zh'
                        ? `🎯 已应用「${btn.innerText}」偏好预设：五维权重已同步到滑块与雷达。`
                        : `🎯 Preset "${btn.innerText}" applied: weights synced to sliders & radar.`;
                    updatePreference(preset, {tip, silent: true});
                }
                // 6) 类型筛选变化或偏好预设应用 → 统一触发一次重绘
                if (typeChanged || preset) {
                    refreshAll();
                }
                // 7) 兜底冷知识文案（无预设时）
                if (!preset) {
                    const tip = currentLang === 'zh'
                        ? `🔍 当前筛选: ${btn.innerText}<br>已展示省内相关景点，可继续调节雷达获得专属匹配路线。`
                        : `🔍 Filter: ${btn.innerText}<br>Showing relevant spots, adjust radar for custom matching.`;
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
        const t = i18n[currentLang];
        const loadingSpan = document.getElementById('loadingText');
        if (loadingSpan) loadingSpan.innerText = t.loading;
        if (currentProvince) {
            document.getElementById('mainTitle').innerText = (currentProvince.name || (currentLang === 'zh' ? '华夏星图' : 'China Starmap')) + ' · ' + (currentLang === 'zh' ? '文旅雷达' : 'Cultural Radar');
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
        document.getElementById('coldInfo').innerHTML = `<p>${t.defaultInfo}</p>`;
        const sl = document.querySelector('.province-switcher .switcher-label');
        if (sl) sl.innerText = t.switcherLabel;

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

    function switchLanguage() {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('appLang', currentLang);
        refreshSpotsByLang();
        renderProvinceOptions();
        applyLanguage();
        // 切语言后立即重设 geo（让地图区域 label 立即刷新为新语言）
        refreshMapGeoConfig();
        refreshAll();
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
            if (t) t.innerText = msg || (currentLang === 'en' ? '✨ Drawing starmap… ✨' : '✨ 星图绘制中 ✨');
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

    async function loadGeoJson(provinceCode, geoPath) {
        if (GeoJsonCache.has(provinceCode)) {
            return {geoJson: GeoJsonCache.get(provinceCode), fromCache: true};
        }
        const url = geoPath || `geo/${provinceCode}_full.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
        const geoJson = await res.json();
        if (!geoJson || !Array.isArray(geoJson.features)) throw new Error('Invalid GeoJSON: ' + url);
        GeoJsonCache.set(provinceCode, geoJson);
        return {geoJson, fromCache: false};
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
                geoPath: `geo/${provinceCode}_full.json`,
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
        const t = i18n[currentLang];
        const isCached = registeredMaps.has(cfg.mapName) || GeoJsonCache.has(provinceCode);
        setStatus(isCached ? t.statusCached : t.statusLoading, isCached ? 'cached' : 'loading');
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
            const spotList = currentLang === 'en' ? cfg.spotsEn : cfg.spotsZh;
            currentSpotsData = Array.isArray(spotList) ? spotList : [];
            // 同步初始 zoom 给缩放联动判断（任务4进阶特性）
            currentZoom = cfg.zoom || 1.0;
            currentZoomTier = (currentZoom <= 1.0) ? 'tierA' : (currentZoom <= 1.5 ? 'tierB' : 'tierC');

            // === 阶段 3：更新 ECharts 地图配置 + 散点系列（强制全量更新） ===
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
                    backgroundColor: 'transparent',
                    series: getMapSeries(currentSpotsData, currentPreference)
                }, true);
            }

            // === 阶段 4：联动刷新右侧雷达 + 标题 + 状态 + 筛选 + 持久化 ===
            document.getElementById('mainTitle').innerText =
                (currentLang === 'zh' ? cfg.name : cfg.nameEn) + ' · ' +
                (currentLang === 'zh' ? '文旅雷达' : 'Cultural Radar');
            updateRadarChart(currentPreference);
            // 注：根据新需求"切省份后筛选分类状态保持不变"，此处不再调用 resetFilterTags()
            // 仅在 HTML 上确保"全部星点"默认 active（已在 DOM 中标注）
            // 若新省份无对应类型数据，ECharts 会自动展示空 set，并触发 setMapEmpty 兜底
            applyLanguage();
            try {
                localStorage.setItem('appProvince', provinceCode);
            } catch (e) {
            }

            setStatus(t.statusReady, '');
            setMapLoading(false);
            // 景点数据缺失兜底：显示空状态卡片，不触发报错
            if (currentSpotsData.length === 0) {
                setMapEmpty(true);
            } else {
                setMapEmpty(false);
            }
            setTimeout(() => {
                setStatus(t.statusReady, '');
            }, 1500);
        } catch (err) {
            console.error('省份切换失败:', err);
            setStatus(t.statusError, 'error');
            setMapLoading(false);
            // 错误兜底：下拉框回退到上一个有效省份
            const sel = document.getElementById('provinceSelect');
            const fallback = currentProvinceCode || (provinceListFallback[0] && provinceListFallback[0].code);
            if (sel && fallback) sel.value = fallback;
            document.getElementById('coldInfo').innerHTML =
                `<p>⚠️ ${provinceCode} 地图数据加载失败，请检查 /${cfg.geoPath} 是否存在。<br>错误：${err.message}</p>`;
        } finally {
            setSelectDisabled(false);
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
        sel.innerHTML = list.map(p => {
            const label = currentLang === 'zh' ? `${p.name} (${p.count})` : `${p.nameEn} (${p.count})`;
            return `<option value="${p.code}">${label}</option>`;
        }).join('');
        // 还原当前选中（避免重新填充后丢失）
        if (prev && provinceConfig[prev]) sel.value = prev;
    }

    function bindProvinceSwitcher() {
        const sel = document.getElementById('provinceSelect');
        if (!sel) return;
        const list = (Array.isArray(window.PROVINCE_LIST) && window.PROVINCE_LIST.length)
            ? window.PROVINCE_LIST
            : provinceListFallback;
        if (!list || !list.length) return;
        renderProvinceOptions();
        // 默认选择：localStorage -> 首项
        const saved = localStorage.getItem('appProvince');
        const initial = (saved && provinceConfig[saved]) ? saved : (list[0]?.code);
        if (initial) {
            sel.value = initial;
            switchProvince(initial);
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
            window.addEventListener('resize', () => {
                myMapChart && myMapChart.resize();
                myRadarChart && myRadarChart.resize();
            });
            // 缩放联动：监听 georoam，更新 currentZoom 后重新计算可见层（任务4进阶特性）
            let zoomDebounce = null;
            myMapChart.on('georoam', (e) => {
                if (!myMapChart) return;
                // 防抖：连续缩放/拖拽结束后再重算，避免每帧都重 setOption
                if (zoomDebounce) clearTimeout(zoomDebounce);
                zoomDebounce = setTimeout(() => {
                    try {
                        const opt = myMapChart.getOption();
                        // ECharts 5：geo 是数组（可能有多个），取第一个
                        const geos = Array.isArray(opt.geo) ? opt.geo : (opt.geo ? [opt.geo] : []);
                        const z = (geos[0] && typeof geos[0].zoom === 'number') ? geos[0].zoom : currentZoom;
                        if (Math.abs(z - currentZoom) > 0.01) {
                            currentZoom = z;
                            // 缩放档位变化时才重算 series（避免无意义 setOption）
                            const newTier = (z <= 1.0) ? 'tierA' : (z <= 1.5 ? 'tierB' : 'tierC');
                            if (newTier !== currentZoomTier) {
                                currentZoomTier = newTier;
                                // 增量更新 series，不动 geo / backgroundColor
                                myMapChart.setOption({
                                    series: getMapSeries(currentSpotsData, currentPreference)
                                }, false);
                            }
                        }
                    } catch (err) { /* 静默：getOption 异常不阻断交互 */
                    }
                }, 220);
            });
        }
    }

    function initLang() {
        const savedLang = localStorage.getItem('appLang');
        currentLang = savedLang === 'en' ? 'en' : 'zh';
        applyLanguage();
        document.getElementById('langSwitchBtn').addEventListener('click', switchLanguage);
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

    function startApp() {
        initLang();
        initRadar();
        initMapChart();
        bindSliders();
        bindFilterButtons();
        bindProvinceSwitcher();   // 内部会触发第一次 switchProvince
        // 任务六：页面加载完成 → 默认应用 all 预设，保证按钮/滑块/雷达/地图初始一致
        // 注意：必须在 initMapChart 之后调用，确保 radar/myMapChart 实例已就绪
        applyAllPreset();
        // 隐藏 loading（即便 GeoJSON 还在异步加载也不影响雷达/筛选）
        document.getElementById('loadingOverlay').classList.add('hide');
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
        }, 500);
    }

    if (typeof echarts !== 'undefined') {
        startApp();
    } else {
        const wait = setInterval(() => {
            if (typeof echarts !== 'undefined') {
                clearInterval(wait);
                startApp();
            }
        }, 200);
    }
})();
