const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config();

const baiduAppId = process.env.BAIDU_TRANSLATE_APP_ID;
const baiduAppKey = process.env.BAIDU_TRANSLATE_APP_KEY;
const baiduBaseUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

if (!baiduAppId || !baiduAppKey) {
    console.error('错误: 百度翻译API配置不完整，请检查 .env 文件中的 BAIDU_TRANSLATE_APP_ID 和 BAIDU_TRANSLATE_APP_KEY');
    process.exit(1);
}

const STANDARD_TRANSLATIONS = {
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
    '苗族古歌': 'Ancient Songs of the Miao People',
    '布洛陀': 'Buluotuo',
    '遮帕麻和遮咪麻': 'Zhepama and Zhemima',
    '牡帕密帕': 'Mupa Mipa',
    '刻道': 'Carving Paths',
    '白蛇传传说': 'Legend of the White Snake',
    '梁祝传说': 'Legend of Liang Zhu',
    '孟姜女传说': 'Legend of Meng Jiangnu',
    '董永传说': 'Legend of Dong Yong',
    '西施传说': 'Legend of Xi Shi',
    '济公传说': 'Legend of Jigong',
    '满族说部': 'Manchu Storytelling',
    '河西宝卷': 'Hexi Baojuan',
    '刘三姐歌谣': 'Liu Sanjie Folk Songs',
    '玛纳斯': 'Manas',
    '江格尔': 'Jangar',
    '格萨(斯)尔': 'Gesar',
    '阿诗玛': 'Ashima',
    '侗族大歌': 'Grand Song of the Dong Ethnic Group',
    '古琴艺术': 'Guqin Art',
    '蒙古族长调民歌': 'Mongolian Long Song',
    '维吾尔木卡姆艺术': 'Uyghur Muqam Art',
    '傣族孔雀舞': 'Peacock Dance of the Dai Ethnic Group',
    '蒙古族舞蹈': 'Mongolian Dance',
    '朝鲜族农乐舞': 'Korean Farmers\' Dance',
    '京剧': 'Peking Opera',
    '昆曲': 'Kunqu Opera',
    '越剧': 'Yue Opera',
    '黄梅戏': 'Huangmei Opera',
    '豫剧': 'Yu Opera',
    '秦腔': 'Qin Opera',
    '评剧': 'Ping Opera',
    '川剧': 'Sichuan Opera',
    '皮影戏': 'Shadow Puppetry',
    '木偶戏': 'Puppet Show',
    '相声': 'Xiangsheng',
    '评书': 'Pingshu',
    '快板': 'Kuaiban',
    '京韵大鼓': 'Jingyun Drum',
    '太极拳': 'Tai Chi',
    '少林功夫': 'Shaolin Kung Fu',
    '围棋': 'Weiqi (Go)',
    '象棋': 'Chinese Chess',
    '书法': 'Calligraphy',
    '篆刻': 'Seal Engraving',
    '剪纸': 'Paper Cutting',
    '皮影': 'Shadow Puppetry',
    '年画': 'New Year Pictures',
    '刺绣': 'Embroidery',
    '陶瓷': 'Ceramics',
    '玉雕': 'Jade Carving',
    '木雕': 'Wood Carving',
    '石雕': 'Stone Carving',
    '中医': 'Traditional Chinese Medicine',
    '针灸': 'Acupuncture',
    '中药炮制': 'Chinese Materia Medica Processing',
    '春节': 'Spring Festival',
    '元宵节': 'Lantern Festival',
    '清明节': 'Qingming Festival',
    '端午节': 'Dragon Boat Festival',
    '中秋节': 'Mid-Autumn Festival',
    '重阳节': 'Double Ninth Festival',
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
    '保护单位': 'Protection Unit'
};

const REQUEST_INTERVAL = 1000;

function generateSalt() {
    return Math.random().toString(36).substring(2, 15);
}

function generateSign(appid, q, salt, key) {
    const str = appid + q + salt + key;
    return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

async function callBaiduTranslateAPI(text, maxRetries = 5) {
    if (STANDARD_TRANSLATIONS[text]) {
        return STANDARD_TRANSLATIONS[text];
    }

    let delay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const salt = generateSalt();
            const sign = generateSign(baiduAppId, text, salt, baiduAppKey);
            
            const params = new URLSearchParams();
            params.append('q', text);
            params.append('from', 'zh');
            params.append('to', 'en');
            params.append('appid', baiduAppId);
            params.append('salt', salt);
            params.append('sign', sign);
            
            const response = await fetch(baiduBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.error_code) {
                if (data.error_code === '54001' || data.error_code === '54003' || data.error_code === '54005') {
                    console.warn(`  ⚠️ 频率限制/签名错误，等待 ${delay}ms 后重试 (${attempt}/${maxRetries}): ${data.error_msg}`);
                    await sleep(delay);
                    delay *= 2;
                    continue;
                }
                throw new Error(`翻译错误: ${data.error_code} - ${data.error_msg}`);
            }

            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result[0].dst.trim();
            }

            throw new Error('翻译结果为空');
        } catch (error) {
            if (attempt < maxRetries) {
                console.warn(`  ⚠️ 请求失败，等待 ${delay}ms 后重试 (${attempt}/${maxRetries}): ${error.message}`);
                await sleep(delay);
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error('达到最大重试次数');
}

async function translateHeritageData(inputPath, outputPath, testMode = false) {
    console.log(`\n=== 开始翻译非遗数据 ===`);
    console.log(`输入文件: ${inputPath}`);
    console.log(`输出文件: ${outputPath}`);
    console.log(`测试模式: ${testMode ? '是' : '否'}`);
    console.log(`内置术语数量: ${Object.keys(STANDARD_TRANSLATIONS).length}`);
    console.log(`翻译引擎: 百度翻译API`);

    let data;
    if (fs.existsSync(outputPath)) {
        console.log(`检测到已存在的输出文件，继续增量翻译...`);
        data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } else {
        data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    }

    let translatedCount = 0;
    let skippedCount = 0;
    let totalCount = 0;
    let manualCount = 0;

    if (data.name && !data.name_en) {
        totalCount++;
        console.log(`\n翻译顶层类别: ${data.name}`);
        try {
            if (STANDARD_TRANSLATIONS[data.name]) {
                data.name_en = STANDARD_TRANSLATIONS[data.name];
                manualCount++;
                console.log(`  ✓ (内置) 结果: ${data.name_en}`);
            } else {
                data.name_en = await callBaiduTranslateAPI(data.name);
                translatedCount++;
                console.log(`  ✓ 结果: ${data.name_en}`);
            }
        } catch (error) {
            console.error(`  ✗ 失败: ${error.message}`);
            data.name_en = data.name;
        }
        await sleep(REQUEST_INTERVAL);
    } else if (data.name_en) {
        skippedCount++;
    }

    for (const category of data.children) {
        if (category.name && !category.name_en) {
            totalCount++;
            console.log(`\n翻译一级分类: ${category.name}`);
            try {
                if (STANDARD_TRANSLATIONS[category.name]) {
                    category.name_en = STANDARD_TRANSLATIONS[category.name];
                    manualCount++;
                    console.log(`  ✓ (内置) 结果: ${category.name_en}`);
                } else {
                    category.name_en = await callBaiduTranslateAPI(category.name);
                    translatedCount++;
                    console.log(`  ✓ 结果: ${category.name_en}`);
                }
            } catch (error) {
                console.error(`  ✗ 失败: ${error.message}`);
                category.name_en = category.name;
            }
            await sleep(REQUEST_INTERVAL);
        } else if (category.name_en) {
            skippedCount++;
        }

        if (category.children) {
                for (const item of category.children) {
                    if (item.name && !item.name_en) {
                        totalCount++;
                        console.log(`  翻译项目: ${item.name}`);
                        try {
                            if (STANDARD_TRANSLATIONS[item.name]) {
                                item.name_en = STANDARD_TRANSLATIONS[item.name];
                                manualCount++;
                                console.log(`    ✓ (内置) 结果: ${item.name_en}`);
                            } else {
                                item.name_en = await callBaiduTranslateAPI(item.name);
                                translatedCount++;
                                console.log(`    ✓ 结果: ${item.name_en}`);
                            }
                        } catch (error) {
                            console.error(`    ✗ 失败: ${error.message}`);
                            item.name_en = item.name;
                        }
                        await sleep(REQUEST_INTERVAL);
                    } else if (item.name_en) {
                        skippedCount++;
                    }

                    if (item.records && item.records.length > 0) {
                        for (const record of item.records) {
                            if (!record.records_en) {
                                record.records_en = {};
                                console.log(`    翻译记录: ${item.name}`);
                                for (const [key, value] of Object.entries(record)) {
                                    if (key === 'records_en') continue;
                                    try {
                                        const translatedKey = STANDARD_TRANSLATIONS[key] || await callBaiduTranslateAPI(key);
                                        let translatedValue = value;
                                        if (typeof value === 'string') {
                                            translatedValue = STANDARD_TRANSLATIONS[value] || await callBaiduTranslateAPI(value);
                                        }
                                        record.records_en[translatedKey] = translatedValue;
                                        translatedCount++;
                                        console.log(`      ✓ ${key} -> ${translatedKey}: ${translatedValue}`);
                                        await sleep(REQUEST_INTERVAL);
                                    } catch (error) {
                                        console.error(`    ✗ 记录字段翻译失败 [${key}]: ${error.message}`);
                                        record.records_en[key] = value;
                                    }

                                    if (testMode && translatedCount >= 10) {
                                        console.log('\n已达到测试限制，停止翻译');
                                        break;
                                    }
                                }
                            } else {
                                skippedCount += Object.keys(record.records_en).length;
                            }
                            if (testMode && translatedCount >= 10) break;
                        }
                    }
                    if (testMode && translatedCount >= 10) break;
                }
            }
        if (testMode && translatedCount >= 10) break;
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n=== 翻译完成 ===`);
    console.log(`总字段数: ${totalCount}`);
    console.log(`内置术语翻译: ${manualCount}`);
    console.log(`API翻译: ${translatedCount}`);
    console.log(`跳过(已翻译): ${skippedCount}`);
    console.log(`失败/保留: ${totalCount - manualCount - translatedCount}`);
    console.log(`输出文件已保存: ${outputPath}`);

    return { totalCount, translatedCount, skippedCount, manualCount };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');

    if (testMode) {
        console.log('运行测试翻译（仅翻译前10个字段）');
        await translateHeritageData(
            'static/data/test_heritage.json',
            'static/data/test_heritage_en.json',
            true
        );
    } else {
        console.log('运行全量翻译（支持增量继续）');
        await translateHeritageData(
            'static/data/intangible_heritage_data.json',
            'static/data/intangible_heritage_data_en.json',
            false
        );
    }
}

main().catch(error => {
    console.error('翻译过程出错:', error);
    process.exit(1);
});