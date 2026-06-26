// tianqi.js —— 星图天气组件版
// 自动检测天气服务地址：支持通过 window.WEATHER_API_BASE 覆盖，默认 localhost:3003
const WEATHER_BASE = (typeof window !== 'undefined' && window.WEATHER_API_BASE) || 'http://localhost:3003';

// ==================== 天气公共模块 ====================
// 全国省份-城市数据映射（用于两级天气选择）
const PROVINCE_CITY_DATA = {
    '340000': {
        name: '安徽', nameEn: 'Anhui', cities: [
            {en: "Hefei", cn: "合肥", enDisplay: "Hefei"},
            {en: "Wuhu", cn: "芜湖", enDisplay: "Wuhu"},
            {en: "Bengbu", cn: "蚌埠", enDisplay: "Bengbu"},
            {en: "Huainan", cn: "淮南", enDisplay: "Huainan"},
            {en: "Maanshan", cn: "马鞍山", enDisplay: "Ma'anshan"},
            {en: "Huaibei", cn: "淮北", enDisplay: "Huaibei"},
            {en: "Tongling", cn: "铜陵", enDisplay: "Tongling"},
            {en: "Anqing", cn: "安庆", enDisplay: "Anqing"},
            {en: "Huangshan", cn: "黄山", enDisplay: "Huangshan"},
            {en: "Chuzhou", cn: "滁州", enDisplay: "Chuzhou"},
            {en: "Fuyang", cn: "阜阳", enDisplay: "Fuyang"},
            {en: "Suzhou", cn: "宿州", enDisplay: "Suzhou"},
            {en: "Lu'an", cn: "六安", enDisplay: "Lu'an"},
            {en: "Bozhou", cn: "亳州", enDisplay: "Bozhou"},
            {en: "Chizhou", cn: "池州", enDisplay: "Chizhou"},
            {en: "Xuancheng", cn: "宣城", enDisplay: "Xuancheng"}
        ]
    },
    '330000': {
        name: '浙江', nameEn: 'Zhejiang', cities: [
            {en: "Hangzhou", cn: "杭州", enDisplay: "Hangzhou"},
            {en: "Ningbo", cn: "宁波", enDisplay: "Ningbo"},
            {en: "Wenzhou", cn: "温州", enDisplay: "Wenzhou"},
            {en: "Jiaxing", cn: "嘉兴", enDisplay: "Jiaxing"},
            {en: "Huzhou", cn: "湖州", enDisplay: "Huzhou"},
            {en: "Shaoxing", cn: "绍兴", enDisplay: "Shaoxing"},
            {en: "Jinhua", cn: "金华", enDisplay: "Jinhua"},
            {en: "Quzhou", cn: "衢州", enDisplay: "Quzhou"},
            {en: "Zhoushan", cn: "舟山", enDisplay: "Zhoushan"},
            {en: "Taizhou", cn: "台州", enDisplay: "Taizhou"},
            {en: "Lishui", cn: "丽水", enDisplay: "Lishui"}
        ]
    },
    '320000': {
        name: '江苏', nameEn: 'Jiangsu', cities: [
            {en: "Nanjing", cn: "南京", enDisplay: "Nanjing"},
            {en: "Suzhou", cn: "苏州", enDisplay: "Suzhou"},
            {en: "Wuxi", cn: "无锡", enDisplay: "Wuxi"},
            {en: "Changzhou", cn: "常州", enDisplay: "Changzhou"},
            {en: "Zhenjiang", cn: "镇江", enDisplay: "Zhenjiang"},
            {en: "Nantong", cn: "南通", enDisplay: "Nantong"},
            {en: "Yangzhou", cn: "扬州", enDisplay: "Yangzhou"},
            {en: "Yancheng", cn: "盐城", enDisplay: "Yancheng"},
            {en: "Xuzhou", cn: "徐州", enDisplay: "Xuzhou"},
            {en: "Taizhou", cn: "泰州", enDisplay: "Taizhou"},
            {en: "Suqian", cn: "宿迁", enDisplay: "Suqian"},
            {en: "Lianyungang", cn: "连云港", enDisplay: "Lianyungang"},
            {en: "Huai'an", cn: "淮安", enDisplay: "Huai'an"}
        ]
    },
    '350000': {
        name: '福建', nameEn: 'Fujian', cities: [
            {en: "Fuzhou", cn: "福州", enDisplay: "Fuzhou"},
            {en: "Xiamen", cn: "厦门", enDisplay: "Xiamen"},
            {en: "Putian", cn: "莆田", enDisplay: "Putian"},
            {en: "Sanming", cn: "三明", enDisplay: "Sanming"},
            {en: "Quanzhou", cn: "泉州", enDisplay: "Quanzhou"},
            {en: "Zhangzhou", cn: "漳州", enDisplay: "Zhangzhou"},
            {en: "Nanping", cn: "南平", enDisplay: "Nanping"},
            {en: "Longyan", cn: "龙岩", enDisplay: "Longyan"},
            {en: "Ningde", cn: "宁德", enDisplay: "Ningde"}
        ]
    },
    '360000': {
        name: '江西', nameEn: 'Jiangxi', cities: [
            {en: "Nanchang", cn: "南昌", enDisplay: "Nanchang"},
            {en: "Jingdezhen", cn: "景德镇", enDisplay: "Jingdezhen"},
            {en: "Pingxiang", cn: "萍乡", enDisplay: "Pingxiang"},
            {en: "Jiujiang", cn: "九江", enDisplay: "Jiujiang"},
            {en: "Xinyu", cn: "新余", enDisplay: "Xinyu"},
            {en: "Yingtan", cn: "鹰潭", enDisplay: "Yingtan"},
            {en: "Ganzhou", cn: "赣州", enDisplay: "Ganzhou"},
            {en: "Jian", cn: "吉安", enDisplay: "Jian"},
            {en: "Yichun", cn: "宜春", enDisplay: "Yichun"},
            {en: "Fuzhou", cn: "抚州", enDisplay: "Fuzhou"},
            {en: "Shangrao", cn: "上饶", enDisplay: "Shangrao"}
        ]
    },
    '410000': {
        name: '河南', nameEn: 'Henan', cities: [
            {en: "Zhengzhou", cn: "郑州", enDisplay: "Zhengzhou"},
            {en: "Kaifeng", cn: "开封", enDisplay: "Kaifeng"},
            {en: "Luoyang", cn: "洛阳", enDisplay: "Luoyang"},
            {en: "Pingdingshan", cn: "平顶山", enDisplay: "Pingdingshan"},
            {en: "Anyang", cn: "安阳", enDisplay: "Anyang"},
            {en: "Hebi", cn: "鹤壁", enDisplay: "Hebi"},
            {en: "Xinxiang", cn: "新乡", enDisplay: "Xinxiang"},
            {en: "Jiaozuo", cn: "焦作", enDisplay: "Jiaozuo"},
            {en: "Puyang", cn: "濮阳", enDisplay: "Puyang"},
            {en: "Xuchang", cn: "许昌", enDisplay: "Xuchang"},
            {en: "Luohe", cn: "漯河", enDisplay: "Luohe"},
            {en: "Sanmenxia", cn: "三门峡", enDisplay: "Sanmenxia"},
            {en: "Nanyang", cn: "南阳", enDisplay: "Nanyang"},
            {en: "Shangqiu", cn: "商丘", enDisplay: "Shangqiu"},
            {en: "Xinyang", cn: "信阳", enDisplay: "Xinyang"},
            {en: "Zhoukou", cn: "周口", enDisplay: "Zhoukou"},
            {en: "Zhumadian", cn: "驻马店", enDisplay: "Zhumadian"},
            {en: "Jiyuan", cn: "济源", enDisplay: "Jiyuan"}
        ]
    },
    '420000': {
        name: '湖北', nameEn: 'Hubei', cities: [
            {en: "Wuhan", cn: "武汉", enDisplay: "Wuhan"},
            {en: "Huangshi", cn: "黄石", enDisplay: "Huangshi"},
            {en: "Shiyan", cn: "十堰", enDisplay: "Shiyan"},
            {en: "Yichang", cn: "宜昌", enDisplay: "Yichang"},
            {en: "Xiangyang", cn: "襄阳", enDisplay: "Xiangyang"},
            {en: "Ezhou", cn: "鄂州", enDisplay: "Ezhou"},
            {en: "Jingmen", cn: "荆门", enDisplay: "Jingmen"},
            {en: "Xiaogan", cn: "孝感", enDisplay: "Xiaogan"},
            {en: "Jingzhou", cn: "荆州", enDisplay: "Jingzhou"},
            {en: "Huanggang", cn: "黄冈", enDisplay: "Huanggang"},
            {en: "Xianning", cn: "咸宁", enDisplay: "Xianning"},
            {en: "Suizhou", cn: "随州", enDisplay: "Suizhou"},
            {en: "Enshi", cn: "恩施", enDisplay: "Enshi"},
            {en: "Xiantao", cn: "仙桃", enDisplay: "Xiantao"},
            {en: "Qianjiang", cn: "潜江", enDisplay: "Qianjiang"},
            {en: "Tianmen", cn: "天门", enDisplay: "Tianmen"},
            {en: "Shennongjia", cn: "神农架", enDisplay: "Shennongjia"}
        ]
    },
    '430000': {
        name: '湖南', nameEn: 'Hunan', cities: [
            {en: "Changsha", cn: "长沙", enDisplay: "Changsha"},
            {en: "Zhuzhou", cn: "株洲", enDisplay: "Zhuzhou"},
            {en: "Xiangtan", cn: "湘潭", enDisplay: "Xiangtan"},
            {en: "Hengyang", cn: "衡阳", enDisplay: "Hengyang"},
            {en: "Shaoyang", cn: "邵阳", enDisplay: "Shaoyang"},
            {en: "Yueyang", cn: "岳阳", enDisplay: "Yueyang"},
            {en: "Changde", cn: "常德", enDisplay: "Changde"},
            {en: "Zhangjiajie", cn: "张家界", enDisplay: "Zhangjiajie"},
            {en: "Yiyang", cn: "益阳", enDisplay: "Yiyang"},
            {en: "Chenzhou", cn: "郴州", enDisplay: "Chenzhou"},
            {en: "Yongzhou", cn: "永州", enDisplay: "Yongzhou"},
            {en: "Huaihua", cn: "怀化", enDisplay: "Huaihua"},
            {en: "Loudi", cn: "娄底", enDisplay: "Loudi"},
            {en: "Xiangxi", cn: "湘西", enDisplay: "Xiangxi"}
        ]
    },
    '440000': {
        name: '广东', nameEn: 'Guangdong', cities: [
            {en: "Guangzhou", cn: "广州", enDisplay: "Guangzhou"},
            {en: "Shaoguan", cn: "韶关", enDisplay: "Shaoguan"},
            {en: "Shenzhen", cn: "深圳", enDisplay: "Shenzhen"},
            {en: "Zhuhai", cn: "珠海", enDisplay: "Zhuhai"},
            {en: "Shantou", cn: "汕头", enDisplay: "Shantou"},
            {en: "Foshan", cn: "佛山", enDisplay: "Foshan"},
            {en: "Jiangmen", cn: "江门", enDisplay: "Jiangmen"},
            {en: "Zhanjiang", cn: "湛江", enDisplay: "Zhanjiang"},
            {en: "Maoming", cn: "茂名", enDisplay: "Maoming"},
            {en: "Zhaoqing", cn: "肇庆", enDisplay: "Zhaoqing"},
            {en: "Huizhou", cn: "惠州", enDisplay: "Huizhou"},
            {en: "Meizhou", cn: "梅州", enDisplay: "Meizhou"},
            {en: "Shanwei", cn: "汕尾", enDisplay: "Shanwei"},
            {en: "Heyuan", cn: "河源", enDisplay: "Heyuan"},
            {en: "Yangjiang", cn: "阳江", enDisplay: "Yangjiang"},
            {en: "Qingyuan", cn: "清远", enDisplay: "Qingyuan"},
            {en: "Dongguan", cn: "东莞", enDisplay: "Dongguan"},
            {en: "Zhongshan", cn: "中山", enDisplay: "Zhongshan"},
            {en: "Chaozhou", cn: "潮州", enDisplay: "Chaozhou"},
            {en: "Jieyang", cn: "揭阳", enDisplay: "Jieyang"},
            {en: "Yunfu", cn: "云浮", enDisplay: "Yunfu"}
        ]
    },
    '450000': {
        name: '广西', nameEn: 'Guangxi', cities: [
            {en: "Nanning", cn: "南宁", enDisplay: "Nanning"},
            {en: "Liuzhou", cn: "柳州", enDisplay: "Liuzhou"},
            {en: "Guilin", cn: "桂林", enDisplay: "Guilin"},
            {en: "Wuzhou", cn: "梧州", enDisplay: "Wuzhou"},
            {en: "Beihai", cn: "北海", enDisplay: "Beihai"},
            {en: "Fangchenggang", cn: "防城港", enDisplay: "Fangchenggang"},
            {en: "Qinzhou", cn: "钦州", enDisplay: "Qinzhou"},
            {en: "Guigang", cn: "贵港", enDisplay: "Guigang"},
            {en: "Yulin", cn: "玉林", enDisplay: "Yulin"},
            {en: "Baise", cn: "百色", enDisplay: "Baise"},
            {en: "Hezhou", cn: "贺州", enDisplay: "Hezhou"},
            {en: "Hechi", cn: "河池", enDisplay: "Hechi"},
            {en: "Laibin", cn: "来宾", enDisplay: "Laibin"},
            {en: "Chongzuo", cn: "崇左", enDisplay: "Chongzuo"}
        ]
    },
    '510000': {
        name: '四川', nameEn: 'Sichuan', cities: [
            {en: "Chengdu", cn: "成都", enDisplay: "Chengdu"},
            {en: "Zigong", cn: "自贡", enDisplay: "Zigong"},
            {en: "Panzhihua", cn: "攀枝花", enDisplay: "Panzhihua"},
            {en: "Luzhou", cn: "泸州", enDisplay: "Luzhou"},
            {en: "Deyang", cn: "德阳", enDisplay: "Deyang"},
            {en: "Mianyang", cn: "绵阳", enDisplay: "Mianyang"},
            {en: "Guangyuan", cn: "广元", enDisplay: "Guangyuan"},
            {en: "Suining", cn: "遂宁", enDisplay: "Suining"},
            {en: "Neijiang", cn: "内江", enDisplay: "Neijiang"},
            {en: "Leshan", cn: "乐山", enDisplay: "Leshan"},
            {en: "Nanchong", cn: "南充", enDisplay: "Nanchong"},
            {en: "Meishan", cn: "眉山", enDisplay: "Meishan"},
            {en: "Yibin", cn: "宜宾", enDisplay: "Yibin"},
            {en: "Guang'an", cn: "广安", enDisplay: "Guang'an"},
            {en: "Dazhou", cn: "达州", enDisplay: "Dazhou"},
            {en: "Ya'an", cn: "雅安", enDisplay: "Ya'an"},
            {en: "Bazhong", cn: "巴中", enDisplay: "Bazhong"},
            {en: "Ziyang", cn: "资阳", enDisplay: "Ziyang"},
            {en: "Aba", cn: "阿坝", enDisplay: "Aba"},
            {en: "Ganzi", cn: "甘孜", enDisplay: "Ganzi"},
            {en: "Liangshan", cn: "凉山", enDisplay: "Liangshan"}
        ]
    }
};

// 向后兼容：anhuiCities 保留为原安徽数据
const anhuiCities = PROVINCE_CITY_DATA['340000'].cities;

// 字母分组标题（全局定义，供 buildCityMenu 和 renderProvinceCities 共享）
const GROUP_TITLES = {
    'A': {zh: 'A', en: 'A'}, 'B': {zh: 'B', en: 'B'}, 'C': {zh: 'C', en: 'C'},
    'D': {zh: 'D', en: 'D'}, 'F': {zh: 'F', en: 'F'}, 'G': {zh: 'G', en: 'G'},
    'H': {zh: 'H', en: 'H'}, 'J': {zh: 'J', en: 'J'}, 'K': {zh: 'K', en: 'K'},
    'L': {zh: 'L', en: 'L'}, 'M': {zh: 'M', en: 'M'}, 'N': {zh: 'N', en: 'N'},
    'P': {zh: 'P', en: 'P'}, 'Q': {zh: 'Q', en: 'Q'}, 'S': {zh: 'S', en: 'S'},
    'T': {zh: 'T', en: 'T'}, 'W': {zh: 'W', en: 'W'}, 'X': {zh: 'X', en: 'X'},
    'Y': {zh: 'Y', en: 'Y'}, 'Z': {zh: 'Z', en: 'Z'}
};

// 模块内部状态
let currentLangForWeather = 'zh'; // 模块内部状态新增一个变量存储当前语言
let currentWeatherCity = 'Hefei';
let forecastCache = null;
let forecastCacheTime = 0;
let weatherRefreshInterval = null;
const FORECAST_CACHE_DURATION = 10 * 60 * 1000; // 10分钟

// 全局 toast 函数（由各页面提供，如果不存在则降级为 console）
function safeShowToast(msg) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg);
    } else {
        console.log('[Toast]', msg);
    }
}

// 模拟天气数据（当API不可用时使用）
const mockWeatherData = {
    'Hefei': {
        temp: 25,
        icon: '02d',
        description: '多云',
        forecast: [
            { date: 'today', low: 20, high: 28, icon: '02d', desc: '多云' },
            { date: 'tomorrow', low: 19, high: 27, icon: '03d', desc: '阴' },
            { date: 'day3', low: 21, high: 29, icon: '01d', desc: '晴' },
            { date: 'day4', low: 22, high: 30, icon: '01d', desc: '晴' },
            { date: 'day5', low: 23, high: 31, icon: '02d', desc: '多云' }
        ]
    },
    'Wuhu': {
        temp: 26,
        icon: '01d',
        description: '晴',
        forecast: [
            { date: 'today', low: 21, high: 29, icon: '01d', desc: '晴' },
            { date: 'tomorrow', low: 20, high: 28, icon: '02d', desc: '多云' },
            { date: 'day3', low: 22, high: 30, icon: '03d', desc: '阴' },
            { date: 'day4', low: 21, high: 29, icon: '01d', desc: '晴' },
            { date: 'day5', low: 22, high: 30, icon: '01d', desc: '晴' }
        ]
    },
    'Bozhou': {
        temp: 24,
        icon: '03d',
        description: '阴',
        forecast: [
            { date: 'today', low: 19, high: 27, icon: '03d', desc: '阴' },
            { date: 'tomorrow', low: 18, high: 26, icon: '03d', desc: '阴' },
            { date: 'day3', low: 20, high: 28, icon: '01d', desc: '晴' },
            { date: 'day4', low: 21, high: 29, icon: '01d', desc: '晴' },
            { date: 'day5', low: 22, high: 30, icon: '01d', desc: '晴' }
        ]
    },
    'Hangzhou': {
        temp: 27,
        icon: '01d',
        description: '晴',
        forecast: [
            { date: 'today', low: 22, high: 30, icon: '01d', desc: '晴' },
            { date: 'tomorrow', low: 21, high: 29, icon: '02d', desc: '多云' },
            { date: 'day3', low: 23, high: 31, icon: '01d', desc: '晴' },
            { date: 'day4', low: 22, high: 30, icon: '03d', desc: '阴' },
            { date: 'day5', low: 23, high: 31, icon: '02d', desc: '多云' }
        ]
    },
    'Nanjing': {
        temp: 26,
        icon: '02d',
        description: '多云',
        forecast: [
            { date: 'today', low: 21, high: 29, icon: '02d', desc: '多云' },
            { date: 'tomorrow', low: 20, high: 28, icon: '03d', desc: '阴' },
            { date: 'day3', low: 22, high: 30, icon: '01d', desc: '晴' },
            { date: 'day4', low: 23, high: 31, icon: '01d', desc: '晴' },
            { date: 'day5', low: 22, high: 30, icon: '02d', desc: '多云' }
        ]
    },
    'Fuzhou': {
        temp: 28,
        icon: '01d',
        description: '晴',
        forecast: [
            { date: 'today', low: 24, high: 32, icon: '01d', desc: '晴' },
            { date: 'tomorrow', low: 23, high: 31, icon: '02d', desc: '多云' },
            { date: 'day3', low: 25, high: 33, icon: '01d', desc: '晴' },
            { date: 'day4', low: 24, high: 32, icon: '03d', desc: '阴' },
            { date: 'day5', low: 25, high: 33, icon: '02d', desc: '多云' }
        ]
    },
    'Chengdu': {
        temp: 23,
        icon: '03d',
        description: '阴',
        forecast: [
            { date: 'today', low: 18, high: 26, icon: '03d', desc: '阴' },
            { date: 'tomorrow', low: 17, high: 25, icon: '10d', desc: '小雨' },
            { date: 'day3', low: 19, high: 27, icon: '03d', desc: '阴' },
            { date: 'day4', low: 20, high: 28, icon: '01d', desc: '晴' },
            { date: 'day5', low: 21, high: 29, icon: '02d', desc: '多云' }
        ]
    },
    'Guangzhou': {
        temp: 29,
        icon: '02d',
        description: '多云',
        forecast: [
            { date: 'today', low: 25, high: 33, icon: '02d', desc: '多云' },
            { date: 'tomorrow', low: 24, high: 32, icon: '10d', desc: '小雨' },
            { date: 'day3', low: 25, high: 33, icon: '01d', desc: '晴' },
            { date: 'day4', low: 26, high: 34, icon: '02d', desc: '多云' },
            { date: 'day5', low: 27, high: 35, icon: '01d', desc: '晴' }
        ]
    }
};

function getMockWeather(city) {
    return mockWeatherData[city] || mockWeatherData['Hefei'];
}

// 获取星期几（中英文）
function getWeekday(dateStr, lang) {
    const date = new Date(dateStr);
    const weekdaysZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayIndex = date.getDay();
    return lang === 'zh' ? weekdaysZh[weekdayIndex] : weekdaysEn[weekdayIndex];
}

// 获取月/日显示
function getMonthDay(dateStr, lang) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

// 天气描述中英翻译映射（高德 API 返回中文描述 → 英文翻译）
const weatherDescMap = {
    '晴': 'Sunny',
    '少云': 'Few Clouds',
    '多云': 'Cloudy',
    '阴': 'Overcast',
    '阵雨': 'Showers',
    '雷阵雨': 'Thunderstorm',
    '小雨': 'Light Rain',
    '中雨': 'Moderate Rain',
    '大雨': 'Heavy Rain',
    '暴雨': 'Rainstorm',
    '大暴雨': 'Torrential Rain',
    '特大暴雨': 'Extreme Rain',
    '冻雨': 'Freezing Rain',
    '雨夹雪': 'Sleet',
    '小雪': 'Light Snow',
    '中雪': 'Moderate Snow',
    '大雪': 'Heavy Snow',
    '暴雪': 'Snowstorm',
    '雾': 'Fog',
    '霾': 'Haze',
    '浮尘': 'Dust',
    '扬沙': 'Sand',
    '沙尘暴': 'Sandstorm',
    '强沙尘暴': 'Severe Sandstorm',
    '阴转多云': 'Overcast→Cloudy',
    '多云转阴': 'Cloudy→Overcast',
    '晴转多云': 'Sunny→Cloudy',
    '多云转晴': 'Cloudy→Sunny',
    '阵雨转多云': 'Showers→Cloudy',
    '多云转阵雨': 'Cloudy→Showers',
    '小雨转阴': 'L.Rain→Overcast',
    '中雨转小雨': 'M.Rain→L.Rain',
    '大雨转中雨': 'H.Rain→M.Rain',
};

// 翻译天气描述
function translateWeatherDesc(desc, lang) {
    if (lang === 'zh' || !desc) return desc;
    // 先尝试完整匹配
    if (weatherDescMap[desc]) return weatherDescMap[desc];
    // 逐段翻译（处理"XX转XX"未覆盖的变体）
    const parts = desc.split('转');
    if (parts.length === 2) {
        const p1 = weatherDescMap[parts[0]] || parts[0];
        const p2 = weatherDescMap[parts[1]] || parts[1];
        return `${p1}→${p2}`;
    }
    // 回退：返回原文
    return desc;
}

// 判断是否为今天
function isToday(dateStr) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;
    return dateStr === todayLocal;
}

// 渲染悬浮框内容（苹果风格）
function renderForecastTooltip(forecastData, currentLang) {
    const tooltip = document.getElementById('weatherTooltip');
    if (!tooltip) return;
    tooltip.innerHTML = '';

    if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
        tooltip.innerHTML = `<div style="text-align:center; padding:12px;">${currentLang === 'zh' ? '暂无预报数据' : 'No forecast data'}</div>`;
        return;
    }
    if (!forecastData.list[0].dt_txt) {
        tooltip.innerHTML = `<div style="text-align:center; padding:12px;">⚠️ ${currentLang === 'zh' ? '数据格式错误' : 'Invalid data'}</div>`;
        return;
    }

    // 全局温度范围
    let globalMinTemp = Infinity;
    let globalMaxTemp = -Infinity;
    forecastData.list.forEach(item => {
        const minTemp = item.main.temp_min;
        const maxTemp = item.main.temp_max;
        if (minTemp < globalMinTemp) globalMinTemp = minTemp;
        if (maxTemp > globalMaxTemp) globalMaxTemp = maxTemp;
    });
    globalMinTemp -= 1;
    globalMaxTemp += 1;

    forecastData.list.forEach((item, idx) => {
        const dateStr = item.dt_txt.split(' ')[0];
        const tempMin = Math.round(item.main.temp_min);
        const tempMax = Math.round(item.main.temp_max);
        const rawDesc = item.weather[0].description;
        const desc = translateWeatherDesc(rawDesc, currentLang);
        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

        const minOffset = ((tempMin - globalMinTemp) / (globalMaxTemp - globalMinTemp)) * 100;
        const maxOffset = ((tempMax - globalMinTemp) / (globalMaxTemp - globalMinTemp)) * 100;
        const barWidth = maxOffset - minOffset;
        const dotPosition = ((tempMin + tempMax) / 2 - globalMinTemp) / (globalMaxTemp - globalMinTemp) * 100;

        let leftContent = '';
        if (idx === 0 && isToday(dateStr)) {
            leftContent = `<span class="forecast-date">${currentLang === 'zh' ? '今天' : 'Today'}</span>`;
        } else {
            const monthDay = getMonthDay(dateStr, currentLang);
            const weekday = getWeekday(dateStr, currentLang);
            leftContent = `<span class="forecast-date">${monthDay}</span><span class="forecast-weekday">${weekday}</span>`;
        }

        const row = document.createElement('div');
        row.className = 'forecast-row';
        row.innerHTML = `
            <div class="forecast-left">
                ${leftContent}
                <img class="forecast-icon" src="${iconUrl}" alt="${desc}">
            </div>
            <div class="forecast-middle">
                <div class="temp-range-bar">
                    <div class="temp-range-fill" style="left: ${minOffset}%; width: ${barWidth}%;"></div>
                    <div class="temp-range-dot" style="left: ${dotPosition}%;"></div>
                </div>
                <div class="temp-labels">
                    <span class="temp-low">${tempMin}°</span>
                    <span class="temp-high">${tempMax}°</span>
                </div>
            </div>
        `;
        tooltip.appendChild(row);
    });
}

// 获取未来五天天气预报（调用后端代理）
async function fetchWeatherForecast(city, currentLang) {
    if (!city) return null;
    const now = Date.now();
    if (forecastCache && forecastCache.city === city && (now - forecastCacheTime) < FORECAST_CACHE_DURATION) {
        return forecastCache.data;
    }
    try {
        const langParam = currentLang === 'zh' ? 'zh_cn' : 'en';
        const forecastUrl = `${WEATHER_BASE}/api/weather/forecast/?city=${city}&lang=${langParam}`;
        const response = await fetch(forecastUrl);
        const data = await response.json();
        if (Number(data.cod) === 200) {
            forecastCache = {city, data};
            forecastCacheTime = now;
            return data;
        } else {
            throw new Error(data.error || 'Forecast API error');
        }
    } catch (error) {
        console.warn('天气预报API不可用，使用模拟数据:', error);
        const mock = getMockWeather(city);
        const today = new Date();
        const mockData = {
            cod: 200,
            list: mock.forecast.map((item, index) => {
                const date = new Date(today);
                date.setDate(today.getDate() + index);
                return {
                    dt_txt: date.toISOString().split(' ')[0],
                    main: { temp_min: item.low, temp_max: item.high },
                    weather: [{ icon: item.icon, description: item.desc }]
                };
            })
        };
        forecastCache = {city, data: mockData};
        forecastCacheTime = now;
        return mockData;
    }
}

// 预加载天气预报（静默）
async function preloadForecast(city, currentLang) {
    if (!city) return;
    try {
        await fetchWeatherForecast(city, currentLang);
    } catch (err) {
        console.warn(`[Preload] 预加载失败: ${city}`, err);
    }
}

// 显示悬浮框
// 修改 showWeatherTooltip，不再接收参数，而是使用模块内的 currentLangForWeather
async function showWeatherTooltip() {
    const tooltip = document.getElementById('weatherTooltip');
    if (!tooltip) return;
    const lang = currentLangForWeather;

    if (forecastCache && forecastCache.city === currentWeatherCity &&
        (Date.now() - forecastCacheTime) < FORECAST_CACHE_DURATION) {
        renderForecastTooltip(forecastCache.data, lang);
        tooltip.classList.add('visible');
        return;
    }

    tooltip.innerHTML = `<div style="text-align:center;">⏳ ${lang === 'zh' ? '加载中...' : 'Loading...'}</div>`;
    tooltip.classList.add('visible');

    fetchWeatherForecast(currentWeatherCity, lang).then(forecastData => {
        if (forecastData) {
            renderForecastTooltip(forecastData, lang);
        } else {
            tooltip.innerHTML = `<div style="text-align:center;">⚠️ ${lang === 'zh' ? '获取预报失败' : 'Failed to get forecast'}</div>`;
        }
    }).catch(() => {
        tooltip.innerHTML = `<div style="text-align:center;">⚠️ ${lang === 'zh' ? '网络错误' : 'Network error'}</div>`;
    });
}

function hideWeatherTooltip() {
    const tooltip = document.getElementById('weatherTooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

// 获取当前天气并显示
async function fetchAndDisplayWeather(city, currentLang, saveToStorage = true) {
    if (!city) return;
    const langParam = currentLang === 'zh' ? 'zh_cn' : 'en';
    const weatherUrl = `${WEATHER_BASE}/api/weather/?city=${city}&lang=${langParam}`;
    try {
        const response = await fetch(weatherUrl);
        const data = await response.json();
        if (Number(data.cod) !== 200) throw new Error(data.message || 'Weather API error');
        const temp = Math.round(data.main.temp);
        const rawDesc = data.weather[0].description;
        const desc = translateWeatherDesc(rawDesc, currentLang);
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        document.querySelector('.weather-temp').innerHTML = `${temp}°C`;
        const weatherIconImg = document.querySelector('.weather-icon');
        weatherIconImg.src = iconUrl;
        weatherIconImg.alt = desc;
        const weatherDescEl = document.querySelector('.weather-desc');
        if (weatherDescEl) {
            weatherDescEl.style.display = 'none';
        }
        if (saveToStorage) {
            localStorage.setItem('lastWeatherCity', city);
            preloadForecast(city, currentLang);
        }
    } catch (error) {
        console.warn('天气API不可用，使用模拟数据:', error);
        const mock = getMockWeather(city);
        const iconUrl = `https://openweathermap.org/img/wn/${mock.icon}@2x.png`;
        document.querySelector('.weather-temp').innerHTML = `${mock.temp}°C`;
        const weatherIconImg = document.querySelector('.weather-icon');
        weatherIconImg.src = iconUrl;
        weatherIconImg.alt = mock.description;
        const weatherDescEl = document.querySelector('.weather-desc');
        if (weatherDescEl) weatherDescEl.style.display = 'none';
        if (saveToStorage) {
            localStorage.setItem('lastWeatherCity', city);
            preloadForecast(city, currentLang);
        }
    }
}

// 自动刷新（每10分钟）
function startWeatherAutoRefresh(currentLang) {
    if (weatherRefreshInterval) clearInterval(weatherRefreshInterval);
    weatherRefreshInterval = setInterval(() => {
        if (currentWeatherCity) {
            fetchAndDisplayWeather(currentWeatherCity, currentLang, false);
        }
    }, 10 * 60 * 1000);
}

// 构建天气下拉菜单（联动式一体化下拉）
function buildCityMenu(currentLang) {
    const menu = document.getElementById('cityMenu');
    const provinceTabs = document.getElementById('weatherProvinceTabs');
    const citiesContainer = document.getElementById('weatherCitiesContainer');
    if (!menu || !provinceTabs || !citiesContainer) return;
    const isZh = currentLang === 'zh';

    // 获取当前地图省份（如果存在）
    const currentMapProvinceCode = window.currentProvinceCode || '340000';

    // 渲染省份快速切换栏
    let tabsHtml = '';
    Object.keys(PROVINCE_CITY_DATA).forEach(provinceCode => {
        const province = PROVINCE_CITY_DATA[provinceCode];
        const provinceName = isZh ? province.name : province.nameEn;
        const isActive = provinceCode === currentMapProvinceCode ? 'active' : '';
        tabsHtml += `<div class="weather-province-tab ${isActive}" data-province-code="${provinceCode}">${provinceName}</div>`;
    });
    provinceTabs.innerHTML = tabsHtml;

    // 渲染城市列表（默认显示当前地图省份的城市）
    renderProvinceCities(currentMapProvinceCode, currentLang);

    // 绑定省份切换事件
    document.querySelectorAll('.weather-province-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const provinceCode = tab.getAttribute('data-province-code');

            // 更新Tab激活状态
            document.querySelectorAll('.weather-province-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 切换城市列表
            renderProvinceCities(provinceCode, currentLang);

            // 默认选中该省省会（第一个城市）
            const provinceData = PROVINCE_CITY_DATA[provinceCode];
            if (provinceData && provinceData.cities.length > 0) {
                const firstCity = provinceData.cities[0];
                selectCity(firstCity, currentLang);
            }
        });
    });

    // 绑定城市点击事件
    document.querySelectorAll('.weather-cities-list li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            const cityEn = li.getAttribute('data-city-en');
            const cityCn = li.getAttribute('data-city-cn');
            const provinceCode = li.getAttribute('data-province-code');

            const city = PROVINCE_CITY_DATA[provinceCode].cities.find(c => c.en === cityEn);
            if (city) {
                selectCity(city, currentLang);

                // 联动：切换到对应的地图省份
                if (window.changeMapProvince && typeof window.changeMapProvince === 'function') {
                    window.changeMapProvince(provinceCode);
                }
            }

            if (window.innerWidth <= 768) document.getElementById('cityDropdown').classList.remove('active');
        });
    });
}

// 渲染指定省份的城市列表
function renderProvinceCities(provinceCode, currentLang) {
    const citiesContainer = document.getElementById('weatherCitiesContainer');
    if (!citiesContainer) return;

    const province = PROVINCE_CITY_DATA[provinceCode];
    if (!province) return;

    const isZh = currentLang === 'zh';

    // 字母分组城市
    const cityGroups = {};
    province.cities.forEach(city => {
        let pinyinFirst = city.enDisplay.charAt(0).toUpperCase();
        if (city.en === 'Maanshan') pinyinFirst = 'M';
        if (city.en === "Lu'an") pinyinFirst = 'L';
        if (!cityGroups[pinyinFirst]) cityGroups[pinyinFirst] = [];
        cityGroups[pinyinFirst].push(city);
    });

    const groupOrder = ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'S', 'T', 'W', 'X', 'Y', 'Z'];
    let html = '<ul class="weather-cities-list">';

    groupOrder.forEach(letter => {
        const cities = cityGroups[letter];
        if (cities && cities.length > 0) {
            const title = isZh ? GROUP_TITLES[letter].zh : GROUP_TITLES[letter].en;
            html += `<div class="city-group"><div class="group-header">${title}</div>`;
            cities.forEach(city => {
                const displayName = isZh ? city.cn : city.enDisplay;
                const isSelected = city.en === currentWeatherCity ? 'selected' : '';
                html += `<li data-city-en="${city.en}" data-city-cn="${city.cn}" data-city-enDisplay="${city.enDisplay}" data-province-code="${provinceCode}" class="${isSelected}">${displayName}</li>`;
            });
            html += `</div>`;
        }
    });

    html += '</ul>';
    citiesContainer.innerHTML = html;

    // 重新绑定城市点击事件
    document.querySelectorAll('.weather-cities-list li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            const cityEn = li.getAttribute('data-city-en');
            const cityCn = li.getAttribute('data-city-cn');
            const provinceCode = li.getAttribute('data-province-code');

            const city = PROVINCE_CITY_DATA[provinceCode].cities.find(c => c.en === cityEn);
            if (city) {
                selectCity(city, currentLang);

                // 联动：切换到对应的地图省份
                if (window.changeMapProvince && typeof window.changeMapProvince === 'function') {
                    window.changeMapProvince(provinceCode);
                }
            }

            if (window.innerWidth <= 768) document.getElementById('cityDropdown').classList.remove('active');
        });
    });
}

// 选择城市并更新显示
function selectCity(city, currentLang) {
    const displayName = currentLang === 'zh' ? city.cn : city.enDisplay;
    document.getElementById('currentCityDisplay').innerText = displayName;
    currentWeatherCity = city.en;

    // 更新位置显示（城市, 省份）
    updateLocationDisplay(city, currentLang);

    // 获取天气数据
    fetchAndDisplayWeather(city.en, currentLang, true);
    localStorage.setItem('lastWeatherCity', city.en);
}

// 更新位置显示（城市, 省份）
function updateLocationDisplay(city, currentLang) {
    const locationEl = document.getElementById('weatherLocation');
    if (!locationEl) return;

    // 查找所属省份
    for (const [provinceCode, province] of Object.entries(PROVINCE_CITY_DATA)) {
        const found = province.cities.find(c => c.en === city.en);
        if (found) {
            const provinceName = currentLang === 'zh' ? province.name : province.nameEn;
            const cityName = currentLang === 'zh' ? city.cn : city.enDisplay;
            locationEl.innerText = `| ${cityName}, ${provinceName}`;
            return;
        }
    }
}

// 供外部调用：根据地图省份切换天气
function syncWeatherToMapProvince(provinceCode) {
    if (!PROVINCE_CITY_DATA[provinceCode]) return;

    const currentLang = window.currentLang || 'zh';
    const province = PROVINCE_CITY_DATA[provinceCode];

    // 更新省份Tab激活状态
    document.querySelectorAll('.weather-province-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-province-code') === provinceCode);
    });

    // 切换城市列表
    renderProvinceCities(provinceCode, currentLang);

    // 默认选中该省省会
    if (province.cities.length > 0) {
        const firstCity = province.cities[0];
        selectCity(firstCity, currentLang);
    }
}

// 更新当前城市显示
function updateCurrentCityDisplay(currentLang) {
    for (const [provinceCode, province] of Object.entries(PROVINCE_CITY_DATA)) {
        const found = province.cities.find(c => c.en === currentWeatherCity);
        if (found) {
            document.getElementById('currentCityDisplay').innerText = currentLang === 'zh' ? found.cn : found.enDisplay;
            updateLocationDisplay(found, currentLang);
            return;
        }
    }
}

// 移动端菜单支持
function bindMobileCityMenu() {
    const dropdown = document.getElementById('cityDropdown');
    if (!dropdown) return;
    dropdown.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        }
    });
    document.addEventListener('click', () => {
        if (window.innerWidth <= 768) dropdown.classList.remove('active');
    });
}

// 对外暴露的初始化函数
function initWeatherWidget(initialLang) {
    currentLangForWeather = initialLang;

    // 获取当前地图省份，默认安徽
    const currentMapProvinceCode = window.currentProvinceCode || '340000';

    // 优先使用当前地图省份的省会，其次使用保存的城市
    let cityToLoad = localStorage.getItem('lastWeatherCity');
    const provinceData = PROVINCE_CITY_DATA[currentMapProvinceCode];
    if (provinceData && provinceData.cities.length > 0) {
        // 如果保存的城市不在当前省份，则使用当前省份省会
        const cityInProvince = provinceData.cities.find(c => c.en === cityToLoad);
        if (!cityInProvince) {
            cityToLoad = provinceData.cities[0].en;  // 省会
        }
    }
    cityToLoad = cityToLoad || 'Hefei';

    currentWeatherCity = cityToLoad;
    buildCityMenu(initialLang);
    updateCurrentCityDisplay(initialLang);
    fetchAndDisplayWeather(cityToLoad, initialLang, false);
    startWeatherAutoRefresh(initialLang);
    bindMobileCityMenu();

    // 绑定悬浮框事件（只执行一次，使用固定的函数引用）
    const weatherInfoDiv = document.getElementById('weatherInfo');
    if (weatherInfoDiv && !window._weatherEventsBound) {
        weatherInfoDiv.addEventListener('mouseenter', showWeatherTooltip);
        weatherInfoDiv.addEventListener('mouseleave', hideWeatherTooltip);
        window._weatherEventsBound = true;
    }

    preloadForecast(currentWeatherCity, initialLang);
    setInterval(() => {
        if (currentWeatherCity) {
            preloadForecast(currentWeatherCity, currentLangForWeather);
        }
    }, 10 * 60 * 1000);
}

// 供语言切换时刷新天气组件语言（重新构建菜单、刷新显示、清除预报缓存）
function refreshWeatherLanguage(newLang) {
    currentLangForWeather = newLang;
    forecastCache = null;
    forecastCacheTime = 0;
    buildCityMenu(newLang);
    updateCurrentCityDisplay(newLang);
    fetchAndDisplayWeather(currentWeatherCity, newLang, false);
}

// 暴露到全局，供非模块脚本调用
if (typeof window !== 'undefined') {
    window.initWeatherWidget = initWeatherWidget;
    window.refreshWeatherLanguage = refreshWeatherLanguage;
    window.syncWeatherToMapProvince = syncWeatherToMapProvince;
}