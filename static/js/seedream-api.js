// seedream-api.js - 豆包 Seedream 双图融合服务（P0 安全加固版）
// 修改日期：2026-06-22
// 修复项：API 密钥环境变量化 / CORS 白名单 / 启动时检测旧密钥
const express = require('express');
const multer = require('multer');
const axios = require('axios');

require('dotenv').config();

const ARK_API_KEY = process.env.DOUBAO_API_KEY;
const MODEL_ID = 'doubao-seedream-5-0-lite-260128';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

const PORT = process.env.SEEDREAM_PORT || 3001;

// CORS 域名白名单（与 proxy-server.js 保持一致）
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
        if (ALLOWED_ORIGINS.includes(origin) ||
            /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
    }

    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// 双图上传：字段名分别为 personImage 和 sceneImage
app.post('/api/seedream-merge', upload.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'sceneImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const personFile = req.files['personImage']?.[0];
        const sceneFile = req.files['sceneImage']?.[0];
        const { prompt } = req.body;

        if (!personFile) return res.status(400).json({ success: false, error: '缺少人物照片' });
        if (!sceneFile) return res.status(400).json({ success: false, error: '缺少风景照片' });
        if (!prompt || !prompt.trim()) return res.status(400).json({ success: false, error: '请描述融合要求' });

        // 输入过滤：清洗 prompt 中的控制字符和零宽字符
        const safePrompt = prompt.trim()
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .replace(/[\u200B-\u200D\uFEFF]/g, '');

        if (!safePrompt) {
            return res.status(400).json({ success: false, error: '融合要求内容不合法' });
        }

        const personBase64 = `data:image/jpeg;base64,${personFile.buffer.toString('base64')}`;
        const sceneBase64 = `data:image/jpeg;base64,${sceneFile.buffer.toString('base64')}`;

        // 构建提示词：融合人物背景 + 用户额外描述
        const finalPrompt = `请根据以下要求合成图片：
- 将第一张图（人物照）中的人物，无缝融合到第二张图（风景照）的背景中。
- 严格保持人物面部、服装、姿态、体型与原图一致，不能变形、换脸或风格化。
- 人物的光影、色调、透视要与风景背景自然匹配，看起来像是原本就在那里拍摄的。
- 用户额外要求：${safePrompt}
- 最终输出一张照片级的真实合影，不要有明显合成痕迹，不要加滤镜或特效。`;

        const requestBody = {
            model: MODEL_ID,
            prompt: finalPrompt,
            image: [personBase64, sceneBase64],   // 关键：数组形式，顺序很重要
            sequential_image_generation: "disabled",
            size: "2K",
        };

        const response = await axios.post(API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ARK_API_KEY}`
            },
            timeout: 90000
        });

        const generatedImageUrl = response.data.data?.[0]?.url;
        if (!generatedImageUrl) throw new Error('API返回的图片URL无效');

        res.json({ success: true, imageUrl: generatedImageUrl });
    } catch (error) {
        console.error('处理失败:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message || '图像合成失败'
        });
    }
});

// 启动检查：拒绝继续使用已泄露的旧密钥
const oldDoubaoKey = 'ark-ad8921b3-fbe5-4b5a-8dd9-f2a8a17074c8-bea64';
if (ARK_API_KEY === oldDoubaoKey) {
    console.error('❌ 致命错误：检测到仍然使用已泄露的旧豆包 API 密钥！');
    console.error('   请立即前往火山引擎控制台吊销旧密钥，生成新密钥后更新 .env 文件。');
    console.error('   地址：https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey');
    process.exit(1);
}

if (!ARK_API_KEY || ARK_API_KEY === 'your-doubao-api-key-here') {
    console.log('⚠️  DOUBAO_API_KEY 未配置！请在 .env 文件中设置您的豆包/火山引擎 API 密钥');
}

app.listen(PORT, () => {
    console.log(`豆包 Seedream 双图融合服务已启动，端口 ${PORT}`);
    console.log('   CORS 白名单已启用');
});
