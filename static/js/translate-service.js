/**
 * 翻译服务公共模块
 * 支持多翻译后端、术语库、缓存、重试机制
 * 
 * 用法（Node.js）：
 *   const { Translator } = require('./static/js/translate-service');
 *   const translator = new Translator({
 *     provider: 'baidu',
 *     baidu: { appId: 'xxx', appKey: 'xxx' }
 *   });
 *   const result = await translator.translate('你好', { from: 'zh', to: 'en' });
 * 
 * 用法（浏览器，需配合代理）：
 *   const translator = new Translator({
 *     provider: 'proxy',
 *     proxy: { endpoint: '/api/translate' }
 *   });
 */

(function(global, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        const crypto = require('crypto');
        module.exports = factory({ crypto });
    } else {
        global.TranslateService = factory({ crypto: global.crypto });
    }
})(typeof window !== 'undefined' ? window : this, function(deps) {
    'use strict';

    const nodeCrypto = deps.crypto;

    // ==========================================
    // 内置标准术语库
    // ==========================================
    const STANDARD_GLOSSARY = {
        'zh-en': {
            '非物质文化遗产': 'Intangible Cultural Heritage',
            '民间文学': 'Folk Literature',
            '传统音乐': 'Traditional Music',
            '传统舞蹈': 'Traditional Dance',
            '传统戏剧': 'Traditional Drama',
            '曲艺': 'Quyi',
            '传统体育、游艺与杂技': 'Traditional Sports, Recreational Activities and Acrobatics',
            '传统美术': 'Traditional Fine Arts',
            '传统技艺': 'Traditional Crafts',
            '传统医药': 'Traditional Medicine',
            '民俗': 'Folk Customs',
            '京剧': 'Peking Opera',
            '昆曲': 'Kunqu Opera',
            '越剧': 'Yue Opera',
            '黄梅戏': 'Huangmei Opera',
            '豫剧': 'Yu Opera',
            '太极拳': 'Tai Chi',
            '剪纸': 'Paper Cutting',
            '书法': 'Calligraphy',
            '中医': 'Traditional Chinese Medicine',
            '针灸': 'Acupuncture',
            '春节': 'Spring Festival',
            '端午节': 'Dragon Boat Festival',
            '中秋节': 'Mid-Autumn Festival',
            '二十四节气': 'Twenty-Four Solar Terms',
            '第一批': '1st Batch',
            '第二批': '2nd Batch',
            '第三批': '3rd Batch',
            '第四批': '4th Batch',
            '第五批': '5th Batch',
            '国家级': 'National Level',
            '省级': 'Provincial Level',
            '市级': 'Municipal Level',
            '县级': 'County Level',
            '公布时间': 'Publish Date',
            '申报地区或单位': 'Application Region/Unit',
            '保护单位': 'Protection Unit',
            '皮影戏': 'Shadow Puppetry',
            '木偶戏': 'Puppet Show',
            '相声': 'Xiangsheng',
            '刺绣': 'Embroidery',
            '陶瓷': 'Ceramics',
            '玉雕': 'Jade Carving',
            '木雕': 'Wood Carving',
            '石雕': 'Stone Carving'
        },
        'en-zh': {
            'Intangible Cultural Heritage': '非物质文化遗产',
            'Folk Literature': '民间文学',
            'Traditional Music': '传统音乐',
            'Traditional Dance': '传统舞蹈',
            'Traditional Drama': '传统戏剧',
            'Quyi': '曲艺',
            'Traditional Sports, Recreational Activities and Acrobatics': '传统体育、游艺与杂技',
            'Traditional Fine Arts': '传统美术',
            'Traditional Crafts': '传统技艺',
            'Traditional Medicine': '传统医药',
            'Folk Customs': '民俗',
            'Peking Opera': '京剧',
            'Kunqu Opera': '昆曲',
            'Yue Opera': '越剧',
            'Huangmei Opera': '黄梅戏',
            'Yu Opera': '豫剧',
            'Tai Chi': '太极拳',
            'Paper Cutting': '剪纸',
            'Calligraphy': '书法',
            'Traditional Chinese Medicine': '中医',
            'Acupuncture': '针灸',
            'Spring Festival': '春节',
            'Dragon Boat Festival': '端午节',
            'Mid-Autumn Festival': '中秋节',
            'Twenty-Four Solar Terms': '二十四节气'
        }
    };

    // ==========================================
    // 工具函数
    // ==========================================
    function generateSalt() {
        return Math.random().toString(36).substring(2, 15);
    }

    function generateMd5(str) {
        if (nodeCrypto && nodeCrypto.createHash) {
            return nodeCrypto.createHash('md5').update(str, 'utf8').digest('hex');
        }
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getLangPair(from, to) {
        return `${from}-${to}`;
    }

    // ==========================================
    // 缓存类
    // ==========================================
    class TranslationCache {
        constructor(options = {}) {
            this.maxSize = options.maxSize || 1000;
            this.ttl = options.ttl || 24 * 60 * 60 * 1000;
            this.cache = new Map();
        }

        _makeKey(text, from, to) {
            return `${from}:${to}:${text}`;
        }

        get(text, from, to) {
            const key = this._makeKey(text, from, to);
            const entry = this.cache.get(key);
            if (!entry) return null;
            if (Date.now() - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                return null;
            }
            return entry.value;
        }

        set(text, from, to, value) {
            const key = this._makeKey(text, from, to);
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(key, { value, timestamp: Date.now() });
        }

        clear() {
            this.cache.clear();
        }

        size() {
            return this.cache.size;
        }
    }

    // ==========================================
    // 深度合并工具函数
    // ==========================================
    function deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // ==========================================
    // 翻译器主类
    // ==========================================
    class Translator {
        constructor(options = {}) {
            const defaults = {
                provider: 'baidu',
                defaultFrom: 'zh',
                defaultTo: 'en',
                maxRetries: 3,
                retryDelay: 1000,
                requestTimeout: 10000,
                useGlossary: true,
                useCache: true,
                cacheOptions: {},
                customGlossary: {},
                baidu: {
                    appId: '',
                    appKey: '',
                    baseUrl: 'https://fanyi-api.baidu.com/api/trans/vip/translate'
                },
                proxy: {
                    endpoint: '/api/translate'
                }
            };

            this.options = deepMerge(defaults, options);

            this.cache = this.options.useCache ? new TranslationCache(this.options.cacheOptions) : null;
            this._requestCount = 0;
            this._totalLatency = 0;
        }

        // ---------- 术语匹配 ----------
        _matchGlossary(text, from, to) {
            if (!this.options.useGlossary) return null;

            const langPair = getLangPair(from, to);
            const standard = STANDARD_GLOSSARY[langPair] || {};
            const custom = this.options.customGlossary[langPair] || {};

            if (standard[text]) return standard[text];
            if (custom[text]) return custom[text];

            return null;
        }

        // ---------- 百度翻译 API ----------
        async _translateBaidu(text, from, to) {
            const { appId, appKey, baseUrl } = this.options.baidu;

            if (!appId || !appKey) {
                throw new Error('百度翻译API配置不完整：缺少 appId 或 appKey');
            }

            const salt = generateSalt();
            const sign = generateMd5(appId + text + salt + appKey);

            const params = new URLSearchParams();
            params.append('q', text);
            params.append('from', from);
            params.append('to', to);
            params.append('appid', appId);
            params.append('salt', salt);
            params.append('sign', sign);

            const startTime = Date.now();
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString(),
                signal: AbortSignal.timeout ? AbortSignal.timeout(this.options.requestTimeout) : undefined
            });

            this._requestCount++;
            this._totalLatency += Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error_code) {
                const error = new Error(`百度翻译错误 [${data.error_code}]: ${data.error_msg}`);
                error.code = data.error_code;
                error.retryable = ['54001', '54003', '54005', '52001', '52002'].includes(data.error_code);
                throw error;
            }

            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result.map(r => r.dst.trim()).join('\n');
            }

            throw new Error('翻译结果为空');
        }

        // ---------- 代理翻译（浏览器端） ----------
        async _translateProxy(text, from, to) {
            const { endpoint } = this.options.proxy;

            const startTime = Date.now();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, from, to })
            });

            this._requestCount++;
            this._totalLatency += Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`代理翻译失败: HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            return data.translation || data.result || '';
        }

        // ---------- 主翻译方法（带重试） ----------
        async translate(text, options = {}) {
            const from = options.from || this.options.defaultFrom;
            const to = options.to || this.options.defaultTo;

            if (!text || typeof text !== 'string') {
                return '';
            }

            if (from === to) {
                return text;
            }

            const glossaryResult = this._matchGlossary(text, from, to);
            if (glossaryResult) {
                return glossaryResult;
            }

            if (this.cache) {
                const cached = this.cache.get(text, from, to);
                if (cached) return cached;
            }

            let lastError = null;
            let delay = this.options.retryDelay;

            for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
                try {
                    let result;
                    switch (this.options.provider) {
                        case 'baidu':
                            result = await this._translateBaidu(text, from, to);
                            break;
                        case 'proxy':
                            result = await this._translateProxy(text, from, to);
                            break;
                        default:
                            throw new Error(`不支持的翻译服务商: ${this.options.provider}`);
                    }

                    if (this.cache) {
                        this.cache.set(text, from, to, result);
                    }

                    return result;
                } catch (error) {
                    lastError = error;
                    const isRetryable = error.retryable !== false && attempt < this.options.maxRetries;

                    if (isRetryable) {
                        await sleep(delay);
                        delay *= 2;
                    } else {
                        break;
                    }
                }
            }

            throw lastError || new Error('翻译失败');
        }

        // ---------- 批量翻译 ----------
        async translateBatch(texts, options = {}) {
            const results = [];
            const concurrency = options.concurrency || 1;
            const delayBetween = options.delayBetween || 1000;

            for (let i = 0; i < texts.length; i += concurrency) {
                const batch = texts.slice(i, i + concurrency);
                const batchResults = await Promise.all(
                    batch.map(text => this.translate(text, options).catch(err => ({ error: err.message })))
                );
                results.push(...batchResults);

                if (i + concurrency < texts.length && delayBetween > 0) {
                    await sleep(delayBetween);
                }
            }

            return results;
        }

        // ---------- 统计信息 ----------
        getStats() {
            return {
                requestCount: this._requestCount,
                totalLatency: this._totalLatency,
                averageLatency: this._requestCount > 0 ? this._totalLatency / this._requestCount : 0,
                cacheSize: this.cache ? this.cache.size() : 0
            };
        }

        resetStats() {
            this._requestCount = 0;
            this._totalLatency = 0;
        }

        clearCache() {
            if (this.cache) {
                this.cache.clear();
            }
        }
    }

    return {
        Translator,
        TranslationCache,
        STANDARD_GLOSSARY
    };
});
