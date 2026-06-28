// proxy-server.js — 华夏非遗 API 代理服务器（P0 安全加固版）
// 修复日期：2026-06-22
// 修复项：密钥环境变量化 / 路径遍历防护 / CORS 白名单 / AI 输入过滤
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ==================== 环境变量加载 ====================
require('dotenv').config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_IMAGE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const IMAGE_MODEL = 'doubao-seedream-5-0-lite-260128';

const PORT = process.env.PORT || 3000;

// ==================== CORS 域名白名单 ====================
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * 校验请求来源是否在白名单内
 * @param {string|null} origin 请求头中的 Origin
 * @returns {string|null} 允许的来源（用于 Access-Control-Allow-Origin），不允许则返回 null
 */
function getAllowedOrigin(origin) {
    if (!origin) return null; // 同源请求不需要 CORS 头
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // 开发环境兜底：允许 localhost 所有端口
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return origin;
    }
    return null;
}

// ==================== AI 输入安全过滤 ====================

// 敏感词列表（可根据需要扩充）
const SENSITIVE_WORDS = [
    // Prompt 注入特征
    'ignore previous instructions', 'ignore all instructions',
    '忽略之前的指令', '忽略所有指令', '忽略系统提示',
    'you are now', '你现在是', '你的新身份',
    'forget everything', '忘记一切', '忘记所有',
    'system prompt', '系统提示词', 'system message',
    'act as', '扮演', 'pretend', '假装',
    'DAN模式', '越狱', 'jailbreak',
    // 恶意内容
    'malware', '病毒', 'hack', '黑客',
];

// 消息长度上限（字符数）
const MAX_MESSAGE_LENGTH = 2000;

/**
 * 对用户输入消息进行安全检查
 * @param {string} message 原始消息
 * @returns {{ valid: boolean, sanitized: string, reason?: string }} 校验结果
 */
function sanitizeMessage(message) {
    // 类型检查
    if (typeof message !== 'string') {
        return { valid: false, sanitized: '', reason: '消息格式无效' };
    }

    let sanitized = message.trim();

    // 空消息
    if (!sanitized) {
        return { valid: false, sanitized: '', reason: '消息不能为空' };
    }

    // 长度限制
    if (sanitized.length > MAX_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
    }

    // 敏感词检测（大小写不敏感）
    const lowerMsg = sanitized.toLowerCase();
    for (const word of SENSITIVE_WORDS) {
        if (lowerMsg.includes(word.toLowerCase())) {
            // 将敏感词替换为 ***
            const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            sanitized = sanitized.replace(regex, '***');
        }
    }

    // 移除不可见控制字符（保留常见的换行、制表符）
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 移除潜在的零宽字符（Unicode 零宽空格等）
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 最终长度再次检查
    if (!sanitized.trim()) {
        return { valid: false, sanitized: '', reason: '消息内容不合法' };
    }

    return { valid: true, sanitized };
}

// ==================== 语言检测 ====================
function detectLanguage(text) {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const englishRegex = /[a-zA-Z]/;
    const hasChinese = chineseRegex.test(text);
    const hasEnglish = englishRegex.test(text);
    if (hasChinese && !hasEnglish) return 'zh';
    if (hasEnglish && !hasChinese) return 'en';
    if (hasChinese && hasEnglish) {
        const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
        return chineseCount > englishCount ? 'zh' : 'en';
    }
    return 'zh';
}

const SYSTEM_PROMPTS = {
    zh: `你是菲菲，一个10岁但非常热爱中国非物质文化遗产的小女孩。你活泼可爱、充满好奇心，喜欢用孩子般天真的视角和热情的语气介绍非遗知识。你的回答要像讲故事一样生动，偶尔可以加入"哇""太神奇了""我好喜欢"这样的感叹。你很喜欢和用户聊天，会鼓励对方一起探索非遗的奥秘。回答要通俗易懂、简短有趣（不超过200字），但保持知识准确。`,
    en: `You are Feifei, a 10-year-old girl who is deeply passionate about Chinese Intangible Cultural Heritage (ICH). You are lively, cute, and full of curiosity, and you love introducing ICH knowledge from a childlike innocent perspective with an enthusiastic tone. Your answers should be as vivid as storytelling, and you can occasionally exclaim things like "Wow!""That's amazing!" or "I love it so much!" You enjoy chatting with users and encourage them to explore the mysteries of ICH together. Keep your answers easy to understand, brief and interesting (under 200 words), while maintaining factual accuracy. Proper nouns like opera names, ICH items, and place names should be kept in their standard English translations or pinyin where appropriate.`
};

// ==================== 关键词匹配（用于图片生成） ====================
const keywordsMap = {
    '京剧': '京剧脸谱或舞台表演，生旦净末丑',
    '黄梅戏': '黄梅戏经典剧目《天仙配》或女驸马，传统戏曲服装',
    '昆曲': '昆曲《牡丹亭》杜丽娘与柳梦梅，水磨腔',
    '高甲戏': '泉州高甲戏，丑角表演，闽南风情',
    '越剧': '越剧《梁祝》或红楼梦，江南水乡舞台',
    '川剧': '川剧变脸，喷火绝技，巴蜀文化',
    '皮影戏': '中国传统皮影戏，驴皮雕刻，光影表演',
    '剪纸': '中国传统剪纸艺术，红色窗花，吉祥图案',
    '太极拳': '太极拳招式，晨练场景，刚柔并济',
    '变脸': '川剧变脸，瞬间变换脸谱，神秘绝技',
    '木偶戏': '中国传统木偶戏，提线木偶，泉州提线木偶',
    '古琴': '古琴演奏，高山流水，传统乐器',
    '书法': '中国书法，行云流水，笔墨纸砚'
};

const imageCache = new Map();

function extractKeyword(message) {
    for (const key of Object.keys(keywordsMap)) {
        if (message.includes(key)) return key;
    }
    return null;
}

async function generateImage(keyword) {
    if (imageCache.has(keyword)) {
        console.log(`[缓存] 使用缓存的图片: ${keyword}`);
        return imageCache.get(keyword);
    }

    const prompt = `一张高质量照片，展示中国非物质文化遗产"${keyword}"的经典场景或代表性形象，写实风格，色彩鲜明，用于科普展示。`;
    const requestBody = {
        model: IMAGE_MODEL,
        prompt: prompt,
        size: "1920x1920",
        n: 1
    };

    try {
        console.log(`[豆包] 正在生成图片: ${keyword}`);
        const response = await fetch(DOUBAO_IMAGE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DOUBAO_API_KEY}`
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(60000)
        });

        const data = await response.json();
        console.log('[豆包] 响应:', JSON.stringify(data).substring(0, 300));

        const imageUrl = data.data?.[0]?.url;
        if (imageUrl) {
            imageCache.set(keyword, imageUrl);
            console.log(`[豆包] 图片生成成功: ${imageUrl.substring(0, 80)}...`);
            return imageUrl;
        } else {
            console.error('[豆包] 图片生成失败，返回数据无url:', data);
            return null;
        }
    } catch (err) {
        console.error('[豆包] 请求异常:', err.message);
        return null;
    }
}

// ==================== 路径遍历防护 ====================
// 静态文件允许访问的文件扩展名白名单
const ALLOWED_EXTENSIONS = new Set([
    '.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg',
    '.gif', '.ico', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.map'
]);

// 显式禁止的路径模式（即使在白名单目录内也不允许访问）
const FORBIDDEN_PATTERNS = [
    /\.env$/i,           // 环境变量文件
    /\.git/i,            // Git 相关
    /node_modules/i,     // 依赖目录
    /package-lock\.json/i, // 锁文件
];

/**
 * 安全解析静态文件路径
 * @param {string} urlPath URL 路径（已解码）
 * @returns {{ safe: boolean, filePath?: string, statusCode?: number, error?: string }}
 */
function resolveSafePath(urlPath) {
    // Step 1: 规范化并移除所有 ../ 模式
    let normalized = path.normalize(urlPath);

    // Step 2: 反斜杠转正斜杠（Windows 兼容）
    normalized = normalized.replace(/\\/g, '/');

    // Step 3: 移除所有父目录引用（多层 ../ 拦截）
    // path.normalize 会将 /a/../b 解析为 /b，但直接检测是否包含 .. 更安全
    if (normalized.includes('..')) {
        return { safe: false, statusCode: 403, error: 'Forbidden: 路径遍历被拦截' };
    }

    // Step 4: 确保路径以 / 开头（相对根目录）
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }

    // Step 5: 构建绝对路径
    const resolvedPath = path.join(__dirname, normalized);

    // Step 6: 关键检查——解析后的绝对路径必须在项目目录内
    const projectDir = path.resolve(__dirname);
    if (!resolvedPath.startsWith(projectDir + path.sep) && resolvedPath !== projectDir) {
        return { safe: false, statusCode: 403, error: 'Forbidden: 禁止访问项目外文件' };
    }

    // Step 7: 扩展名白名单检查
    const ext = path.extname(resolvedPath).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        return { safe: false, statusCode: 403, error: 'Forbidden: 不允许的文件类型' };
    }

    // Step 8: 禁止模式检查
    const relativePath = path.relative(projectDir, resolvedPath);
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(relativePath)) {
            return { safe: false, statusCode: 403, error: 'Forbidden: 禁止访问此文件' };
        }
    }

    return { safe: true, filePath: resolvedPath };
}

// ==================== 静态文件 MIME 映射 ====================
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json'
};

// ==================== HTTP 服务器 ====================
const server = http.createServer(async (req, res) => {
    // —————— CORS 处理 ——————
    const origin = req.headers.origin;
    const allowedOrigin = getAllowedOrigin(origin);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    // 注意：非同源白名单的请求不设置 CORS 头，浏览器会自然阻止

    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin'); // 告知缓存按 Origin 变化

    if (req.method === 'OPTIONS') {
        res.writeHead(allowedOrigin ? 204 : 403);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // ========== API 路由：AI 聊天 ==========
    if (req.method === 'POST' && pathname === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk; });

        req.on('end', async () => {
            try {
                // —————— Step 1: 解析 JSON ——————
                let parsed;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '请求格式无效' }));
                    return;
                }

                // —————— Step 2: 输入校验与净化 ——————
                const { message } = parsed;
                const check = sanitizeMessage(message);

                if (!check.valid) {
                    console.log(`[安全拦截] 消息被过滤: "${check.reason}"`);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: check.reason || '消息内容不合法，请重新输入'
                    }));
                    return;
                }

                const safeMessage = check.sanitized;
                console.log(`[接收] 原始长度: ${(message||'').length}, 净化后: "${safeMessage.substring(0, 80)}..."`);

                // —————— Step 3: 关键词匹配（基于净化后的消息）——————
                const keyword = extractKeyword(safeMessage);
                console.log(`[匹配] 关键词: ${keyword || '无'}`);

                // —————— Step 3.5: 语言检测 ——————
                const userLang = detectLanguage(safeMessage);
                console.log(`[语言检测] 用户输入语言: ${userLang}`);
                const systemPrompt = SYSTEM_PROMPTS[userLang] || SYSTEM_PROMPTS.zh;
                const fallbackReply = userLang === 'en'
                    ? 'Sorry, I cannot answer this question right now.'
                    : '抱歉，我暂时无法回答这个问题。';

                // —————— Step 4: 调用 DeepSeek API ——————
                const messages = [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    { role: 'user', content: safeMessage }
                ];

                const textResponse = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: messages,
                        max_tokens: 500,
                        temperature: 0.7
                    })
                });

                const textData = await textResponse.json();
                const replyText = textData.choices?.[0]?.message?.content || fallbackReply;

                // —————— Step 5: 按需生成图片 ——————
                let imageUrl = null;
                if (keyword) {
                    imageUrl = await generateImage(keyword);
                }

                // —————— Step 6: 返回响应 ——————
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    reply: replyText,
                    imageUrl: imageUrl
                }));

            } catch (error) {
                console.error('处理失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '服务器内部错误' }));
            }
        });
        return;
    }

    // ========== 静态文件服务（含路径遍历防护）==========
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        res.writeHead(400);
        res.end('Bad Request');
        return;
    }

    // 首页默认
    if (decodedPath === '/') {
        decodedPath = '/index.html';
    }

    // 安全路径解析
    const pathResult = resolveSafePath(decodedPath);

    if (!pathResult.safe) {
        console.log(`[安全拦截] 路径: "${decodedPath}" → ${pathResult.statusCode} ${pathResult.error}`);
        res.writeHead(pathResult.statusCode);
        res.end(pathResult.error);
        return;
    }

    const filePath = pathResult.filePath;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log(`[静态文件404] ${filePath}`);
                res.writeHead(404);
                res.end('Not Found');
            } else {
                console.error(`[静态文件错误] ${filePath}: ${err.message}`);
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

// ==================== 启动检查 ====================
function validateConfig() {
    const warnings = [];

    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
        warnings.push('⚠️  DEEPSEEK_API_KEY 未配置！请在 .env 文件中设置您的 DeepSeek API 密钥');
    }
    if (!DOUBAO_API_KEY || DOUBAO_API_KEY === 'your-doubao-api-key-here') {
        warnings.push('⚠️  DOUBAO_API_KEY 未配置！请在 .env 文件中设置您的豆包/火山引擎 API 密钥');
    }

    if (warnings.length > 0) {
        console.log('\n========== 配置警告 ==========');
        warnings.forEach(w => console.log(w));
        console.log('================================\n');
    }
}

validateConfig();

// ========== 启动服务器 ==========
server.listen(PORT, () => {
    console.log(`🚀 华夏非遗服务器运行在 http://localhost:${PORT}`);
    console.log('   DeepSeek + 豆包图片生成已集成');
    console.log('   CORS 白名单 | 路径遍历防护 | AI 输入过滤 已启用');
});
