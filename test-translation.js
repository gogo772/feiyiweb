/**
 * 翻译功能同步测试脚本
 * 覆盖：不同长度文本、不同语言组合、错误处理、性能指标
 */

require('dotenv').config();
const { Translator } = require('./static/js/translate-service');
const fs = require('fs');

// ==========================================
// 测试用例配置
// ==========================================
const TEST_CASES = {
    zh_en: {
        name: '中文 -> 英文',
        from: 'zh',
        to: 'en',
        shortTexts: [
            '你好',
            '谢谢',
            '再见',
            '非遗',
            '京剧',
            '昆曲',
            '剪纸',
            '中医',
            '春节',
            '太极拳'
        ],
        mediumTexts: [
            '非物质文化遗产是中华优秀传统文化的重要组成部分',
            '京剧是中国五大戏曲剧种之一，被视为中国国粹',
            '二十四节气是中国古代订立的一种用来指导农事的补充历法',
            '皮影戏，又称影子戏，是一种以兽皮或纸板做成的人物剪影以表演故事的民间戏剧',
            '中国书法是一门古老的汉字的书写艺术，被誉为无言的诗、无形的舞'
        ],
        longTexts: [
            '非物质文化遗产是指各族人民世代相传，并视为其文化遗产组成部分的各种传统文化表现形式，以及与传统文化表现形式相关的实物和场所。非物质文化遗产是一个国家和民族历史文化成就的重要标志，是优秀传统文化的重要组成部分。',
            '昆曲，原名昆山腔，是中国古老的戏曲声腔、剧种，被称为百花园中的一朵兰花。昆曲发源于14世纪中国的苏州昆山，后经魏良辅等人的改良而走向全国，自明代中叶以来独领中国剧坛近300年。',
            '太极拳是以中国传统儒、道哲学中的太极、阴阳辩证理念为核心思想，集颐养性情、强身健体、技击对抗等多种功能为一体，结合易学的阴阳五行之变化，中医经络学，古代的导引术和吐纳术形成的一种内外兼修、柔和、缓慢、轻灵、刚柔相济的汉族传统拳术。'
        ]
    },
    en_zh: {
        name: '英文 -> 中文',
        from: 'en',
        to: 'zh',
        shortTexts: [
            'Hello',
            'Thank you',
            'Goodbye',
            'Heritage',
            'Peking Opera',
            'Kunqu Opera',
            'Paper Cutting',
            'Tai Chi',
            'Spring Festival'
        ],
        mediumTexts: [
            'Intangible cultural heritage is an important part of traditional Chinese culture.',
            'Peking Opera is one of the five major opera genres in China and is regarded as the national opera.',
            'The Twenty-Four Solar Terms are a supplementary calendar used in ancient China to guide agricultural activities.',
            'Shadow puppetry is a form of storytelling and entertainment using flat figures that cast shadows on a screen.',
            'Chinese calligraphy is an ancient art of writing Chinese characters, often described as silent poetry.'
        ],
        longTexts: [
            'Intangible cultural heritage refers to various traditional cultural expressions that are passed down from generation to generation by people of all ethnic groups and are regarded as part of their cultural heritage, as well as the objects and places related to traditional cultural expressions.',
            'Kunqu Opera, originally known as Kunshan Opera, is one of the oldest forms of Chinese opera. It originated in Kunshan, Suzhou in the 14th century and became popular throughout China after improvements by Wei Liangfu and others.'
        ]
    }
};

// ==========================================
// 测试结果收集
// ==========================================
const results = {
    summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalLatency: 0,
        startTime: null,
        endTime: null
    },
    testCases: [],
    glossaryTests: [],
    errorTests: [],
    cacheTests: [],
    performanceMetrics: {}
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ️ ',
        success: '✅ ',
        error: '❌ ',
        warn: '⚠️  ',
        title: '\n📋 ',
        section: '\n━━━ '
    }[type] || '';
    console.log(`${prefix}${message}`);
}

// ==========================================
// 执行单个测试
// ==========================================
async function runSingleTest(translator, text, from, to, category) {
    const testResult = {
        text,
        from,
        to,
        category,
        success: false,
        translation: null,
        error: null,
        latency: 0,
        charCount: text.length
    };

    const startTime = Date.now();
    try {
        const translation = await translator.translate(text, { from, to });
        testResult.latency = Date.now() - startTime;
        testResult.translation = translation;
        testResult.success = !!translation && translation !== text;

        if (testResult.success) {
            log(`  ${category} | ${text.slice(0, 30)}${text.length > 30 ? '...' : ''} -> ${translation.slice(0, 30)}${translation.length > 30 ? '...' : ''} (${testResult.latency}ms)`, 'success');
        } else {
            log(`  ${category} | ${text.slice(0, 30)}... -> 返回空或原文`, 'error');
        }
    } catch (error) {
        testResult.latency = Date.now() - startTime;
        testResult.error = error.message;
        log(`  ${category} | ${text.slice(0, 30)}... -> 失败: ${error.message}`, 'error');
    }

    return testResult;
}

// ==========================================
// 术语库测试
// ==========================================
async function runGlossaryTests(translator) {
    log('术语库测试', 'section');
    log('验证内置术语库是否优先匹配');

    const glossaryTerms = [
        { zh: '京剧', en: 'Peking Opera' },
        { zh: '昆曲', en: 'Kunqu Opera' },
        { zh: '太极拳', en: 'Tai Chi' },
        { zh: '剪纸', en: 'Paper Cutting' },
        { zh: '中医', en: 'Traditional Chinese Medicine' },
        { zh: '春节', en: 'Spring Festival' },
        { zh: '非物质文化遗产', en: 'Intangible Cultural Heritage' }
    ];

    for (const term of glossaryTerms) {
        const test = {
            term: term.zh,
            expected: term.en,
            actual: null,
            success: false,
            fromCache: false
        };

        try {
            const statsBefore = translator.getStats();
            const result = await translator.translate(term.zh, { from: 'zh', to: 'en' });
            const statsAfter = translator.getStats();

            test.actual = result;
            test.fromCache = statsAfter.requestCount === statsBefore.requestCount;
            test.success = result === term.en;

            if (test.success) {
                log(`  ${term.zh} -> ${result} [术语库匹配: ${test.fromCache ? '缓存/内置' : 'API'}]`, 'success');
            } else {
                log(`  ${term.zh} -> ${result} (期望: ${term.en})`, 'error');
            }
        } catch (error) {
            test.error = error.message;
            log(`  ${term.zh} -> 失败: ${error.message}`, 'error');
        }

        results.glossaryTests.push(test);
    }
}

// ==========================================
// 错误处理测试
// ==========================================
async function runErrorTests() {
    log('错误处理测试', 'section');
    log('验证错误场景下的表现');

    const badTranslator = new Translator({
        provider: 'baidu',
        baidu: { appId: 'invalid_id', appKey: 'invalid_key' },
        maxRetries: 2,
        retryDelay: 500,
        useGlossary: false,
        useCache: false
    });

    const errorTests = [
        { name: '空字符串输入', input: '', expectEmpty: true },
        { name: '相同语言对', input: '测试', from: 'zh', to: 'zh', expectSame: true },
        { name: '无效的 API 密钥', input: '你好世界', from: 'zh', to: 'en', expectError: true }
    ];

    for (const test of errorTests) {
        const testResult = { ...test, success: false, actual: null, error: null };

        try {
            const result = await badTranslator.translate(test.input, {
                from: test.from || 'zh',
                to: test.to || 'en'
            });
            testResult.actual = result;

            if (test.expectEmpty && result === '') {
                testResult.success = true;
                log(`  ${test.name}: 通过 (返回空字符串)`, 'success');
            } else if (test.expectSame && result === test.input) {
                testResult.success = true;
                log(`  ${test.name}: 通过 (返回原文)`, 'success');
            } else if (test.expectError) {
                testResult.success = false;
                log(`  ${test.name}: 失败 (未抛出预期错误)`, 'error');
            } else {
                testResult.success = !!result;
                log(`  ${test.name}: 结果: ${result}`, 'info');
            }
        } catch (error) {
            testResult.error = error.message;
            if (test.expectError) {
                testResult.success = true;
                log(`  ${test.name}: 通过 (正确抛出错误: ${error.message.slice(0, 50)}...)`, 'success');
            } else {
                log(`  ${test.name}: 失败: ${error.message}`, 'error');
            }
        }

        results.errorTests.push(testResult);
    }
}

// ==========================================
// 缓存测试
// ==========================================
async function runCacheTests(translator) {
    log('缓存机制测试', 'section');
    log('验证缓存是否正常工作');

    const testText = '缓存测试文本_' + Math.random().toString(36).substring(2, 8);
    translator.clearCache();

    const stats0 = translator.getStats();
    const result1 = await translator.translate(testText, { from: 'zh', to: 'en' });
    const stats1 = translator.getStats();

    const result2 = await translator.translate(testText, { from: 'zh', to: 'en' });
    const stats2 = translator.getStats();

    const cacheHit = stats2.requestCount === stats1.requestCount;
    const resultMatch = result1 === result2;

    const testResult = {
        success: cacheHit && resultMatch,
        firstRequestCount: stats1.requestCount - stats0.requestCount,
        secondRequestCount: stats2.requestCount - stats1.requestCount,
        cacheHit,
        resultMatch,
        translation: result1
    };

    if (testResult.success) {
        log(`  缓存命中: ${cacheHit}, 结果一致: ${resultMatch}`, 'success');
        log(`  首次请求 API 次数: ${testResult.firstRequestCount}, 第二次请求 API 次数: ${testResult.secondRequestCount}`, 'info');
    } else {
        log(`  缓存测试失败 - 命中: ${cacheHit}, 结果一致: ${resultMatch}`, 'error');
    }

    results.cacheTests.push(testResult);
}

// ==========================================
// 主测试流程
// ==========================================
async function main() {
    log('翻译功能同步测试开始', 'title');
    results.summary.startTime = new Date().toISOString();

    // 初始化翻译器
    const translator = new Translator({
        provider: 'baidu',
        baidu: {
            appId: process.env.BAIDU_TRANSLATE_APP_ID,
            appKey: process.env.BAIDU_TRANSLATE_APP_KEY
        },
        maxRetries: 3,
        retryDelay: 1000,
        useGlossary: true,
        useCache: true
    });

    log(`翻译服务商: 百度翻译`);
    log(`最大重试: ${translator.options.maxRetries} 次`);
    log(`术语库: ${translator.options.useGlossary ? '启用' : '禁用'}`);
    log(`缓存: ${translator.options.useCache ? '启用' : '禁用'}`);

    // 1. 术语库测试
    await runGlossaryTests(translator);

    // 2. 各语言对翻译测试
    for (const [key, testCase] of Object.entries(TEST_CASES)) {
        log(`\n${testCase.name} 测试`, 'section');

        // 短文本
        log('短文本测试', 'title');
        for (const text of testCase.shortTexts) {
            const result = await runSingleTest(translator, text, testCase.from, testCase.to, 'short');
            results.testCases.push(result);
            await new Promise(r => setTimeout(r, 500));
        }

        // 中等文本
        log('中等长度文本测试', 'title');
        for (const text of testCase.mediumTexts) {
            const result = await runSingleTest(translator, text, testCase.from, testCase.to, 'medium');
            results.testCases.push(result);
            await new Promise(r => setTimeout(r, 800));
        }

        // 长文本
        log('长文本测试', 'title');
        for (const text of testCase.longTexts) {
            const result = await runSingleTest(translator, text, testCase.from, testCase.to, 'long');
            results.testCases.push(result);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // 3. 缓存测试
    await runCacheTests(translator);

    // 4. 错误处理测试
    await runErrorTests();

    // 5. 统计汇总
    log('\n测试结果汇总', 'title');
    results.summary.endTime = new Date().toISOString();

    const stats = translator.getStats();
    results.performanceMetrics = stats;

    results.summary.totalTests = results.testCases.length + results.glossaryTests.length + results.errorTests.length + results.cacheTests.length;
    results.summary.passed = [
        ...results.testCases.filter(t => t.success),
        ...results.glossaryTests.filter(t => t.success),
        ...results.errorTests.filter(t => t.success),
        ...results.cacheTests.filter(t => t.success)
    ].length;
    results.summary.failed = results.summary.totalTests - results.summary.passed;
    results.summary.totalLatency = stats.totalLatency;

    // 按类别统计
    const categoryStats = {};
    for (const tc of results.testCases) {
        const cat = `${tc.from}-${tc.to}/${tc.category}`;
        if (!categoryStats[cat]) categoryStats[cat] = { total: 0, passed: 0, avgLatency: 0, totalLatency: 0 };
        categoryStats[cat].total++;
        if (tc.success) categoryStats[cat].passed++;
        categoryStats[cat].totalLatency += tc.latency;
        categoryStats[cat].avgLatency = categoryStats[cat].totalLatency / categoryStats[cat].total;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 性能指标汇总');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  总测试数:     ${results.summary.totalTests}`);
    console.log(`  通过:         ${results.summary.passed}`);
    console.log(`  失败:         ${results.summary.failed}`);
    console.log(`  通过率:       ${((results.summary.passed / results.summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`  API 请求数:   ${stats.requestCount}`);
    console.log(`  总延迟:       ${stats.totalLatency}ms`);
    console.log(`  平均延迟:     ${stats.averageLatency.toFixed(0)}ms`);
    console.log(`  缓存大小:     ${stats.cacheSize} 条`);
    console.log('');
    console.log('  按类别统计:');
    for (const [cat, data] of Object.entries(categoryStats)) {
        const passRate = ((data.passed / data.total) * 100).toFixed(1);
        console.log(`    ${cat.padEnd(20)} ${data.passed}/${data.total} (${passRate}%) 平均: ${data.avgLatency.toFixed(0)}ms`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 保存测试报告
    const reportPath = 'test-translation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    log(`测试报告已保存到: ${reportPath}`, 'info');

    return results.summary.failed === 0;
}

main().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('测试运行出错:', err);
    process.exit(1);
});
