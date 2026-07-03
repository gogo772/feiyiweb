/**
 * weather.js —— 天气代理服务（高德地图版）
 * 运行端口：3003（可通过 .env 中 WEATHER_PORT 覆盖）
 *
 * 提供接口：
 *   GET /api/weather?city=Huangshan          当前天气
 *   GET /api/weather/forecast?city=Huangshan 未来天气预报
 *   GET /api/health                          健康检查
 *
 * 依赖：express, node-fetch, cors, dotenv
 */
require('dotenv').config({path: require('path').join(__dirname, '../../.env')});
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

const port = process.env.WEATHER_PORT || 3003;
const amapKey = process.env.AMAP_SERVER_KEY;

if (!amapKey) {
    console.error('❌ 错误：.env 中未配置 AMAP_SERVER_KEY');
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// ---------- 辅助函数 ----------
// 将高德天气文本映射到 OpenWeatherMap 图标代码
function getWeatherIconCode(weatherText) {
    const map = {
        '晴': '01d', '多云': '02d', '阴': '03d', '阵雨': '09d',
        '雷阵雨': '11d', '小雨': '10d', '中雨': '10d', '大雨': '10d',
        '暴雨': '10d', '雪': '13d', '雾': '50d', '霾': '50d'
    };
    for (let [key, code] of Object.entries(map)) {
        if (weatherText.includes(key)) return code;
    }
    return '01d';
}

// 城市英文名 → 中文名映射
const cityZhMap = {
    'Hefei': '合肥', 'Wuhu': '芜湖', 'Bengbu': '蚌埠', 'Huainan': '淮南',
    'Maanshan': '马鞍山', 'Huaibei': '淮北', 'Tongling': '铜陵', 'Anqing': '安庆',
    'Huangshan': '黄山', 'Chuzhou': '滁州', 'Fuyang': '阜阳', 'Suzhou': '宿州',
    "Lu'an": '六安', 'Bozhou': '亳州', 'Chizhou': '池州', 'Xuancheng': '宣城'
};

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
    res.json({status: 'ok', service: 'weather', timestamp: new Date().toISOString()});
});

// ---------- 当前天气接口 ----------
app.get('/api/weather', async (req, res) => {
    const cityEn = req.query.city;
    if (!cityEn) return res.status(400).json({error: 'Missing city parameter'});
    const cityZh = cityZhMap[cityEn] || cityEn;
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(cityZh)}&key=${amapKey}`;
    console.log(`📞 当前天气请求: city=${cityZh}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`✅ 高德返回: status=${data.status}, infocode=${data.infocode}, lives长度=${data.lives?.length}`);

        if (data.status !== '1' || data.infocode !== '10000') {
            throw new Error(`高德接口错误: ${data.info || data.infocode}`);
        }
        const live = data.lives?.[0];
        if (!live) throw new Error('未获取到实况天气数据');

        res.json({
            cod: 200,
            main: {temp: parseFloat(live.temperature)},
            weather: [{description: live.weather, icon: getWeatherIconCode(live.weather)}]
        });
    } catch (err) {
        console.error('❌ 当前天气错误:', err.message);
        res.status(500).json({error: err.message || 'Weather service error'});
    }
});

// ---------- 天气预报接口 ----------
app.get('/api/weather/forecast', async (req, res) => {
    const cityEn = req.query.city;
    if (!cityEn) return res.status(400).json({error: 'Missing city parameter'});
    const cityZh = cityZhMap[cityEn] || cityEn;
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(cityZh)}&key=${amapKey}&extensions=all`;
    console.log(`📞 预报天气请求: city=${cityZh}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`✅ 高德返回: status=${data.status}, forecasts长度=${data.forecasts?.[0]?.casts?.length}`);

        if (data.status !== '1' || data.infocode !== '10000') {
            throw new Error(`高德接口错误: ${data.info || data.infocode}`);
        }
        const forecasts = data.forecasts?.[0]?.casts;
        if (!forecasts || forecasts.length === 0) throw new Error('未获取到预报数据');

        const dailyList = forecasts.map(cast => ({
            dt_txt: `${cast.date} 12:00:00`,
            main: {temp_min: parseInt(cast.nighttemp), temp_max: parseInt(cast.daytemp)},
            weather: [{description: cast.dayweather, icon: getWeatherIconCode(cast.dayweather)}]
        }));

        res.json({cod: "200", city: {name: cityZh}, list: dailyList});
    } catch (err) {
        console.error('❌ 预报天气错误:', err.message);
        res.status(500).json({error: err.message || 'Forecast service error'});
    }
});

// ---------- 启动 ----------
app.listen(port, '0.0.0.0', () => {
    console.log(`🌦️  天气代理服务（高德版）已启动`);
    console.log(`   ● 地址：http://localhost:${port}`);
    console.log(`   ● 当前天气：GET http://localhost:${port}/api/weather?city=Huangshan`);
    console.log(`   ● 天气预报：GET http://localhost:${port}/api/weather/forecast?city=Huangshan`);
});

process.on('SIGINT', () => {
    console.log('\n[关闭] 天气服务正在关闭...');
    process.exit(0);
});
