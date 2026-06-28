const fs = require('fs');
const { pinyin } = require('pinyin-pro');

const PROVINCE_FULL = {
    '北京市': 'Beijing Municipality', '天津市': 'Tianjin Municipality',
    '河北省': 'Hebei Province', '山西省': 'Shanxi Province',
    '内蒙古自治区': 'Inner Mongolia Autonomous Region',
    '辽宁省': 'Liaoning Province', '吉林省': 'Jilin Province',
    '黑龙江省': 'Heilongjiang Province', '上海市': 'Shanghai Municipality',
    '江苏省': 'Jiangsu Province', '浙江省': 'Zhejiang Province',
    '安徽省': 'Anhui Province', '福建省': 'Fujian Province',
    '江西省': 'Jiangxi Province', '山东省': 'Shandong Province',
    '河南省': 'Henan Province', '湖北省': 'Hubei Province',
    '湖南省': 'Hunan Province', '广东省': 'Guangdong Province',
    '广西壮族自治区': 'Guangxi Zhuang Autonomous Region',
    '海南省': 'Hainan Province', '重庆市': 'Chongqing Municipality',
    '四川省': 'Sichuan Province', '贵州省': 'Guizhou Province',
    '云南省': 'Yunnan Province', '西藏自治区': 'Tibet Autonomous Region',
    '陕西省': 'Shaanxi Province', '甘肃省': 'Gansu Province',
    '青海省': 'Qinghai Province',
    '宁夏回族自治区': 'Ningxia Hui Autonomous Region',
    '新疆维吾尔自治区': 'Xinjiang Uygur Autonomous Region',
    '香港特别行政区': 'Hong Kong SAR',
    '澳门特别行政区': 'Macau SAR',
    '台湾省': 'Taiwan Province'
};

const ETHNIC_GROUPS = [
    '苗族', '侗族', '布依族', '彝族', '白族', '哈尼族', '傣族', '壮族',
    '瑶族', '土家族', '藏族', '蒙古族', '回族', '维吾尔族', '哈萨克族',
    '柯尔克孜族', '锡伯族', '朝鲜族', '满族', '黎族', '傈僳族', '佤族',
    '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族',
    '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族',
    '仡佬族', '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族',
    '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族',
    '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族',
    '基诺族', '汉族', '哈萨克族'
];

const ETHNIC_PINYIN = {
    '苗族': 'Miao', '侗族': 'Dong', '布依族': 'Buyi', '彝族': 'Yi',
    '白族': 'Bai', '哈尼族': 'Hani', '傣族': 'Dai', '壮族': 'Zhuang',
    '瑶族': 'Yao', '土家族': 'Tujia', '藏族': 'Tibetan', '蒙古族': 'Mongol',
    '回族': 'Hui', '维吾尔族': 'Uygur', '哈萨克族': 'Kazakh',
    '柯尔克孜族': 'Kyrgyz', '锡伯族': 'Xibe', '朝鲜族': 'Korean',
    '满族': 'Manchu', '黎族': 'Li', '傈僳族': 'Lisu', '佤族': 'Va',
    '畲族': 'She', '高山族': 'Gaoshan', '拉祜族': 'Lahu', '水族': 'Sui',
    '东乡族': 'Dongxiang', '纳西族': 'Naxi', '景颇族': 'Jingpo',
    '土族': 'Tu', '达斡尔族': 'Daur', '仫佬族': 'Mulao', '羌族': 'Qiang',
    '布朗族': 'Blang', '撒拉族': 'Salar', '毛南族': 'Maonan',
    '仡佬族': 'Gelao', '阿昌族': 'Achang', '普米族': 'Pumi',
    '塔吉克族': 'Tajik', '怒族': 'Nu', '乌孜别克族': 'Uzbek',
    '俄罗斯族': 'Russian', '鄂温克族': 'Ewenki', '德昂族': 'Deang',
    '保安族': 'Bonan', '裕固族': 'Yugur', '京族': 'Gin',
    '塔塔尔族': 'Tatar', '独龙族': 'Derung', '鄂伦春族': 'Oroqen',
    '赫哲族': 'Hezhen', '门巴族': 'Monba', '珞巴族': 'Lhoba',
    '基诺族': 'Jino', '汉族': 'Han'
};

const INSTITUTION_TYPES = [
    '非物质文化遗产保护中心',
    '非物质文化遗产保护研究所',
    '非物质文化遗产博物馆',
    '文化遗产保护中心',
    '文化和旅游局',
    '文化广电旅游局',
    '文化体育局',
    '文化广电体育局',
    '文化体育广电服务中心',
    '公共文化服务中心',
    '群众文化工作站',
    '文化工作总站',
    '文化工作站',
    '文化站',
    '文化室',
    '文化馆',
    '文化中心',
    '艺术馆',
    '美术馆',
    '博物馆',
    '图书馆',
    '纪念馆',
    '展览馆',
    '文物局',
    '文物管理所',
    '文化市场',
    '文化厅',
    '文化局',
    '研究所',
    '研究院',
    '研究会',
    '协会',
    '学会',
    '促进会',
    '艺术团',
    '艺术剧院',
    '大剧院',
    '剧院',
    '戏曲剧院',
    '剧团',
    '曲艺团',
    '歌舞团',
    '民乐团',
    '交响乐团',
    '学校',
    '学院',
    '大学',
    '传习所',
    '传承中心',
    '传习中心',
    '管理处',
    '管理局',
    '管委会',
    '公园',
    '少年宫',
    '工人文化宫',
    '民族文化宫',
    '文化发展有限公司',
    '文化传播有限公司',
    '文化产业发展有限公司',
    '文化旅游发展有限公司',
    '有限责任公司',
    '有限公司',
    '股份有限公司',
    '管理有限公司',
    '华夏梁祝文化'
];

const INSTITUTION_EN = {
    '非物质文化遗产保护中心': 'Intangible Cultural Heritage Protection Center',
    '非物质文化遗产保护研究所': 'ICH Protection Research Institute',
    '非物质文化遗产博物馆': 'Intangible Cultural Heritage Museum',
    '文化遗产保护中心': 'Cultural Heritage Protection Center',
    '文化和旅游局': 'Culture and Tourism Bureau',
    '文化广电旅游局': 'Culture, Radio, TV and Tourism Bureau',
    '文化体育局': 'Culture and Sports Bureau',
    '文化广电体育局': 'Culture, Radio, TV and Sports Bureau',
    '文化体育广电服务中心': 'Culture, Sports, Radio & TV Service Center',
    '公共文化服务中心': 'Public Cultural Service Center',
    '群众文化工作站': 'Mass Cultural Work Station',
    '文化工作总站': 'Cultural Work Headquarters',
    '文化工作站': 'Cultural Work Station',
    '文化站': 'Cultural Station',
    '文化室': 'Cultural Room',
    '文化馆': 'Cultural Center',
    '文化中心': 'Cultural Center',
    '艺术馆': 'Art Gallery',
    '美术馆': 'Art Museum',
    '博物馆': 'Museum',
    '图书馆': 'Library',
    '纪念馆': 'Memorial Hall',
    '展览馆': 'Exhibition Hall',
    '文物局': 'Cultural Heritage Bureau',
    '文物管理所': 'Cultural Relics Management Office',
    '文化市场': 'Cultural Market',
    '文化厅': 'Culture Department',
    '文化局': 'Culture Bureau',
    '研究所': 'Research Institute',
    '研究院': 'Research Academy',
    '研究会': 'Research Association',
    '协会': 'Association',
    '学会': 'Society',
    '促进会': 'Promotion Association',
    '艺术团': 'Art Troupe',
    '艺术剧院': 'Art Theater',
    '大剧院': 'Grand Theater',
    '剧院': 'Theater',
    '戏曲剧院': 'Opera Theater',
    '剧团': 'Opera Troupe',
    '曲艺团': 'Quyi Troupe',
    '歌舞团': 'Song and Dance Troupe',
    '民乐团': 'Folk Orchestra',
    '交响乐团': 'Symphony Orchestra',
    '学校': 'School',
    '学院': 'Academy',
    '大学': 'University',
    '传习所': 'Transmission Institute',
    '传承中心': 'Inheritance Center',
    '传习中心': 'Learning and Inheritance Center',
    '管理处': 'Management Office',
    '管理局': 'Administration Bureau',
    '管委会': 'Management Committee',
    '公园': 'Park',
    '少年宫': "Children's Palace",
    '工人文化宫': "Workers' Cultural Palace",
    '民族文化宫': "Ethnic Cultural Palace",
    '文化发展有限公司': 'Cultural Development Co., Ltd.',
    '文化传播有限公司': 'Cultural Communication Co., Ltd.',
    '文化产业发展有限公司': 'Cultural Industry Development Co., Ltd.',
    '文化旅游发展有限公司': 'Cultural Tourism Development Co., Ltd.',
    '有限责任公司': 'Co., Ltd.',
    '有限公司': 'Co., Ltd.',
    '股份有限公司': 'Co., Ltd.',
    '管理有限公司': 'Management Co., Ltd.',
    '华夏梁祝文化': 'Huaxia Liangzhu Culture'
};

const NAME_TRANSLATIONS = {
    '谚语（哈萨克族谚语）': 'Proverbs (Kazakh Proverbs)',
    '卢沟桥传说': 'Legend of Lugou Bridge',
    '鬼谷子传说': 'Legend of Guiguzi',
    '东海孝妇传说': 'Legend of the Filial Woman of the East Sea',
    '刘阮传说': 'Legend of Liu and Ruan',
    '孔雀东南飞传说': 'Legend of the Peacock Flies Southeast',
    '老子传说': 'Legend of Laozi',
    '陈三五娘传说': 'Legend of Chen San and Wuniang',
    '胡峄阳传说': 'Legend of Hu Yiyang',
    '孟母教子传说': "Legend of Mencius' Mother Teaching Her Son",
    '河图洛书传说': 'Legend of Hetu Luoshu',
    '烂柯山传说': 'Legend of Lanke Mountain',
    '三国传说': 'Legends of the Three Kingdoms',
    '藏族民间故事（年保玉则神话传说）': 'Tibetan Folk Tales (Nianbaoyuze Mythical Legends)',
    '浏阳民歌': 'Liuyang Folk Songs',
    '畲族民歌': 'She Ethnic Folk Songs',
    '十番音乐（遂昌十番（昆曲））': 'Shifan Music (Suichang Shifan (Kunqu Opera))',
    '铜鼓十二调': 'Twelve Tunes of Bronze Drum',
    '西安鼓乐': "Xi'an Drum Music",
    '蓝田普化水会音乐': 'Lantian Puhua Water Assembly Music',
    '禹的传说（武汉大禹治水传说）': 'Legend of Yu (Wuhan Dayu Flood Control Legend)',
    '多声部民歌（阿尔麦-阿坝黑水县）': 'Polyphonic Folk Songs (Aermai - Heishui County, Aba)',
    '唢呐艺术（豫东唢呐）': 'Suona Art (Eastern Henan Suona)',
    '唢呐艺术（长海号子）': 'Suona Art (Changhai Haozi)',
    '唢呐艺术（临沭大兴唢呐）': 'Suona Art (Linshu Daxing Suona)',
    '十番音乐（黄石陈贵十番）': 'Shifan Music (Huangshi Chengui Shifan)',
    '冀中笙管乐（高洛音乐会）': 'Jizhong Wind and Percussion Music (Gaoluo Concert)',
    '冀中笙管乐（雄县古乐）': 'Jizhong Wind and Percussion Music (Xiongxian Ancient Music)',
    '冀中笙管乐（东高村音乐会）': 'Jizhong Wind and Percussion Music (Donggaocun Concert)',
    '森林号子（长白山森林号子）': 'Forest Haozi (Changbai Mountain Forest Haozi)',
    '侗族大歌': 'Grand Song of the Dong Ethnic Group',
    '古琴艺术': 'Guqin Art',
    '蒙古族长调民歌': 'Mongolian Long Song',
    '维吾尔木卡姆艺术': 'Uyghur Muqam Art',
    '傣族孔雀舞': 'Peacock Dance of the Dai Ethnic Group',
    '蒙古族舞蹈': 'Mongolian Dance',
    '朝鲜族农乐舞': "Korean Farmers' Dance",
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
    '阿诗玛': 'Ashima'
};

const BATCH_NAMES = {
    '第一批': '1st Batch',
    '第二批': '2nd Batch',
    '第三批': '3rd Batch',
    '第四批': '4th Batch',
    '第五批': '5th Batch',
    '第六批': '6th Batch',
    '第七批': '7th Batch',
    '第八批': '8th Batch',
    '第九批': '9th Batch',
    '第十批': '10th Batch',
    '扩展': 'Expansion',
    '增补': 'Addition'
};

const CATEGORY_KEYWORDS = {
    '民间文学': 'Folk Literature',
    '传统音乐': 'Traditional Music',
    '传统舞蹈': 'Traditional Dance',
    '传统戏剧': 'Traditional Drama',
    '曲艺': 'Quyi',
    '传统体育、游艺与杂技': 'Traditional Sports, Recreational Activities and Acrobatics',
    '传统美术': 'Traditional Fine Arts',
    '传统技艺': 'Traditional Crafts',
    '传统医药': 'Traditional Medicine',
    '民俗': 'Folk Customs'
};

const PLACE_SUFFIXES = [
    { zh: '自治州', en: 'Autonomous Prefecture' },
    { zh: '自治县', en: 'Autonomous County' },
    { zh: '自治旗', en: 'Autonomous Banner' },
    { zh: '市辖区', en: 'Urban District' },
    { zh: '地区', en: 'Prefecture' },
    { zh: '林区', en: 'Forestry District' },
    { zh: '街道', en: 'Subdistrict' },
    { zh: '社区', en: 'Community' },
    { zh: '市', en: 'City' },
    { zh: '区', en: 'District' },
    { zh: '县', en: 'County' },
    { zh: '旗', en: 'Banner' },
    { zh: '乡', en: 'Township' },
    { zh: '镇', en: 'Town' },
    { zh: '村', en: 'Village' },
    { zh: '盟', en: 'League' },
    { zh: '省', en: 'Province' },
    { zh: '自治区', en: 'Autonomous Region' }
];

function chineseToPinyin(text) {
    if (!text) return '';
    const result = pinyin(text, { toneType: 'none', type: 'string' });
    return result.replace(/\s+/g, ' ').trim();
}

function capitalizePinyin(pinyinStr) {
    return pinyinStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function translateAllChineseToPinyin(text) {
    if (!text) return '';
    let result = text;
    const chinesePattern = /[\u4e00-\u9fa5]+/g;
    let match;
    const replacements = [];
    while ((match = chinesePattern.exec(result)) !== null) {
        const zh = match[0];
        const py = capitalizePinyin(chineseToPinyin(zh));
        replacements.push({ zh, py, index: match.index, length: zh.length });
    }
    for (let i = replacements.length - 1; i >= 0; i--) {
        const r = replacements[i];
        let before = result.slice(0, r.index);
        let after = result.slice(r.index + r.length);
        let pyWithSpace = r.py;
        if (before.length > 0 && /[a-zA-Z]/.test(before[before.length - 1])) {
            pyWithSpace = ' ' + pyWithSpace;
        }
        if (after.length > 0 && /[a-zA-Z]/.test(after[0])) {
            pyWithSpace = pyWithSpace + ' ';
        }
        result = before + pyWithSpace + after;
    }
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

function translateEthnicInText(text) {
    let result = text;
    const sortedEthnic = ETHNIC_GROUPS.sort((a, b) => b.length - a.length);
    for (const eth of sortedEthnic) {
        if (result.includes(eth)) {
            result = result.split(eth).join(ETHNIC_PINYIN[eth]);
        }
    }
    return result;
}

function translatePublishDate(text) {
    if (!text) return '';
    let result = text;
    for (const [zh, en] of Object.entries(BATCH_NAMES)) {
        if (result.includes(zh)) {
            result = result.replace(zh, en);
        }
    }
    result = result.replace(/（/g, ' (').replace(/）/g, ')');
    result = translateAllChineseToPinyin(result);
    return result;
}

function translatePlacePart(text) {
    if (!text) return '';
    let result = text;

    for (const [zh, en] of Object.entries(PROVINCE_FULL)) {
        if (result.startsWith(zh)) {
            const rest = result.slice(zh.length);
            result = en + ' ' + rest;
            break;
        }
    }

    const sortedSuffixes = PLACE_SUFFIXES.sort((a, b) => b.zh.length - a.zh.length);

    let changed = true;
    while (changed) {
        changed = false;
        let bestSuf = null;
        let bestEnd = -1;
        for (const suf of sortedSuffixes) {
            const idx = result.lastIndexOf(suf.zh);
            if (idx >= 0) {
                const end = idx + suf.zh.length;
                if (end > bestEnd || (end === bestEnd && bestSuf && suf.zh.length > bestSuf.zh.length)) {
                    bestEnd = end;
                    bestSuf = suf;
                }
            }
        }
        if (bestSuf && bestEnd > 0) {
            const bestIndex = bestEnd - bestSuf.zh.length;
            let nameStart = bestIndex - 1;
            let prevSuffixEnd = -1;
            while (nameStart >= 0 && /[\u4e00-\u9fa5]/.test(result[nameStart])) {
                let foundSuffixEnd = -1;
                for (const otherSuf of sortedSuffixes) {
                    const otherEnd = nameStart + otherSuf.zh.length;
                    if (result.startsWith(otherSuf.zh, nameStart) && otherEnd < bestIndex) {
                        if (otherEnd > foundSuffixEnd) {
                            foundSuffixEnd = otherEnd;
                        }
                    }
                }
                if (foundSuffixEnd > 0) {
                    prevSuffixEnd = foundSuffixEnd;
                    break;
                }
                nameStart--;
            }
            if (prevSuffixEnd > 0) {
                nameStart = prevSuffixEnd;
            } else {
                nameStart++;
            }
            if (nameStart < bestIndex) {
                const namePart = result.slice(nameStart, bestIndex);
                let translatedName = translateEthnicInText(namePart);
                translatedName = translateAllChineseToPinyin(translatedName);
                let replacement = translatedName + ' ' + bestSuf.en;
                let before = result.slice(0, nameStart);
                let after = result.slice(bestEnd);
                if (before.length > 0 && /[a-zA-Z]/.test(before[before.length - 1])) {
                    replacement = ' ' + replacement;
                }
                if (after.length > 0 && /[a-zA-Z]/.test(after[0])) {
                    replacement = replacement + ' ';
                }
                result = before + replacement + after;
                result = result.replace(/\s+/g, ' ').trim();
                changed = true;
            }
        }
    }

    result = translateEthnicInText(result);
    result = translateAllChineseToPinyin(result);
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

function translateRegion(text) {
    if (!text) return '';
    return translatePlacePart(text);
}

function translateProtectUnit(text) {
    if (!text) return '';
    let result = text;

    let prefixPart = result;
    let suffixPart = '';

    const sortedTypes = INSTITUTION_TYPES.sort((a, b) => b.length - a.length);
    for (const type of sortedTypes) {
        const idx = result.indexOf(type);
        if (idx !== -1) {
            prefixPart = result.slice(0, idx);
            suffixPart = result.slice(idx);
            break;
        }
    }

    if (!suffixPart) {
        return translatePlacePart(result);
    }

    let prefixTranslated = translatePlacePart(prefixPart);

    let suffixTranslated = suffixPart;
    for (const type of sortedTypes) {
        if (suffixTranslated.includes(type)) {
            suffixTranslated = suffixTranslated.split(type).join(INSTITUTION_EN[type]);
        }
    }

    suffixTranslated = translateEthnicInText(suffixTranslated);
    suffixTranslated = translateAllChineseToPinyin(suffixTranslated);

    suffixTranslated = suffixTranslated.replace(/（/g, ' (').replace(/）/g, ')');
    suffixTranslated = suffixTranslated.replace(/、/g, ', ');
    suffixTranslated = suffixTranslated.replace(/，/g, ', ');

    let resultStr = prefixTranslated + ' ' + suffixTranslated;
    resultStr = resultStr.replace(/\s+/g, ' ').trim();
    resultStr = resultStr.replace(/\( /g, '(').replace(/ \)/g, ')');
    resultStr = resultStr.replace(/ Co\., Ltd\./g, ' Co., Ltd.');

    return resultStr;
}

function translateItemName(name) {
    if (!name) return '';

    if (NAME_TRANSLATIONS[name]) {
        return NAME_TRANSLATIONS[name];
    }

    let result = name;

    result = result.replace(/（/g, ' (').replace(/）/g, ')');

    result = translateEthnicInText(result);

    for (const [zh, en] of Object.entries(CATEGORY_KEYWORDS)) {
        if (result.includes(zh)) {
            result = result.replace(zh, en);
        }
    }

    const commonTerms = {
        '二十四节气': '24 Solar Terms',
        '春节': 'Spring Festival',
        '元宵节': 'Lantern Festival',
        '清明节': 'Qingming Festival',
        '端午节': 'Dragon Boat Festival',
        '中秋节': 'Mid-Autumn Festival',
        '重阳节': 'Double Ninth Festival',
        '庙会': 'Temple Fair',
        '歌会': 'Song Festival',
        '花会': 'Flower Festival',
        '灯会': 'Lantern Festival',
        '习俗': 'Custom',
        '传说': 'Legend',
        '故事': 'Story',
        '歌谣': 'Folk Song',
        '民歌': 'Folk Song',
        '音乐': 'Music',
        '舞蹈': 'Dance',
        '戏剧': 'Drama',
        '戏曲': 'Opera',
        '曲艺': 'Quyi',
        '美术': 'Fine Arts',
        '技艺': 'Craftsmanship',
        '医药': 'Medicine',
        '民俗': 'Folk Custom',
        '剪纸': 'Paper Cutting',
        '刺绣': 'Embroidery',
        '陶瓷': 'Ceramics',
        '木雕': 'Wood Carving',
        '石雕': 'Stone Carving',
        '玉雕': 'Jade Carving',
        '编织': 'Weaving',
        '漆器': 'Lacquerware',
        '印刷': 'Printing',
        '制茶': 'Tea Making',
        '酿酒': 'Brewing',
        '烹饪': 'Cooking',
        '武术': 'Martial Arts',
        '杂技': 'Acrobatics',
        '棋类': 'Board Games',
        '书法': 'Calligraphy',
        '篆刻': 'Seal Engraving',
        '年画': 'New Year Pictures',
        '皮影': 'Shadow Puppetry',
        '木偶': 'Puppet',
        '盆景': 'Bonsai',
        '风筝': 'Kite',
        '灯彩': 'Lantern',
        '面塑': 'Dough Sculpture',
        '泥塑': 'Clay Sculpture',
        '竹编': 'Bamboo Weaving',
        '草编': 'Straw Weaving',
        '藤编': 'Rattan Weaving',
        '号子': 'Haozi',
        '唢呐': 'Suona',
        '笙管乐': 'Wind and Percussion Music',
        '十番': 'Shifan',
        '谚语': 'Proverbs',
        '谜语': 'Riddles',
        '神话': 'Myth',
        '寓言': 'Fable',
        '童话': 'Fairy Tale',
        '史诗': 'Epic'
    };

    const sortedTerms = Object.entries(commonTerms).sort((a, b) => b[0].length - a[0].length);
    for (const [zh, en] of sortedTerms) {
        if (result.includes(zh)) {
            result = result.replace(zh, en);
        }
    }

    result = translateAllChineseToPinyin(result);

    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

const sourceData = JSON.parse(fs.readFileSync('static/data/intangible_heritage_data.json', 'utf8'));
const dataEn = deepClone(sourceData);

function translateNode(node, depth = 0) {
    if (node.name) {
        if (depth === 0) {
            node.name_en = 'Intangible Cultural Heritage';
        } else if (depth === 1) {
            node.name_en = CATEGORY_KEYWORDS[node.name] || translateItemName(node.name);
        } else {
            node.name_en = translateItemName(node.name);
        }
    }

    if (node.records && node.records.length > 0) {
        node.records.forEach(r => {
            r.records_en = {};

            if (r['公布时间']) {
                r.records_en['Publish Date'] = translatePublishDate(r['公布时间']);
            }

            if (r['申报地区或单位']) {
                r.records_en['Application Region/Unit'] = translateRegion(r['申报地区或单位']);
            }

            if (r['保护单位']) {
                r.records_en['Protection Unit'] = translateProtectUnit(r['保护单位']);
            }
        });
    }

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => translateNode(child, depth + 1));
    }
}

translateNode(dataEn, 0);

fs.writeFileSync('static/data/intangible_heritage_data_en.json', JSON.stringify(dataEn, null, 2), 'utf8');

let allNodes = [];
function collectNodes(node, depth = 0) {
    allNodes.push({ node, depth });
    if (node.children) {
        node.children.forEach(c => collectNodes(c, depth + 1));
    }
}
collectNodes(dataEn);

let noNameEn = 0;
let chineseInNameEn = [];
let totalRecords = 0;
let noRecordsEn = 0;
let chineseInRecords = [];

allNodes.forEach(({ node, depth }) => {
    if (!node.name_en) noNameEn++;
    else if (/[\u4e00-\u9fa5]/.test(node.name_en)) {
        chineseInNameEn.push(node.name + ' -> ' + node.name_en);
    }

    if (node.records && node.records.length > 0) {
        node.records.forEach((r, ri) => {
            totalRecords++;
            if (!r.records_en) noRecordsEn++;
            else {
                const recStr = JSON.stringify(r.records_en);
                if (/[\u4e00-\u9fa5]/.test(recStr)) {
                    chineseInRecords.push(node.name + '[' + ri + '] -> ' + recStr.substring(0, 200));
                }
            }
        });
    }
});

console.log('=== Translation Summary ===');
console.log('Total nodes:', allNodes.length);
console.log('Nodes without name_en:', noNameEn);
console.log('Nodes with Chinese in name_en:', chineseInNameEn.length);
if (chineseInNameEn.length > 0) {
    console.log('  Examples:');
    chineseInNameEn.slice(0, 10).forEach(e => console.log('    ' + e));
}
console.log('Total records:', totalRecords);
console.log('Records without records_en:', noRecordsEn);
console.log('Records with Chinese in records_en:', chineseInRecords.length);
if (chineseInRecords.length > 0) {
    console.log('  Examples:');
    chineseInRecords.slice(0, 10).forEach(e => console.log('    ' + e));
}

console.log('\n=== Sample Translations ===');
const sampleItems = allNodes.filter(n => n.depth === 2).slice(0, 5);
sampleItems.forEach(({ node }, i) => {
    console.log(`${i + 1}. ${node.name} -> ${node.name_en}`);
    if (node.records && node.records[0]) {
        const r = node.records[0];
        console.log('   Region:', r['申报地区或单位'], '->', r.records_en['Application Region/Unit']);
        console.log('   Unit:', r['保护单位'], '->', r.records_en['Protection Unit']);
    }
});

console.log('\nDone!');
