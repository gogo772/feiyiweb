const fs = require('fs');

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

const PROVINCE_SHORT = {
    '北京': 'Beijing', '天津': 'Tianjin', '河北': 'Hebei', '山西': 'Shanxi',
    '内蒙古': 'Inner Mongolia', '辽宁': 'Liaoning', '吉林': 'Jilin',
    '黑龙江': 'Heilongjiang', '上海': 'Shanghai', '江苏': 'Jiangsu',
    '浙江': 'Zhejiang', '安徽': 'Anhui', '福建': 'Fujian', '江西': 'Jiangxi',
    '山东': 'Shandong', '河南': 'Henan', '湖北': 'Hubei', '湖南': 'Hunan',
    '广东': 'Guangdong', '广西': 'Guangxi', '海南': 'Hainan',
    '重庆': 'Chongqing', '四川': 'Sichuan', '贵州': 'Guizhou',
    '云南': 'Yunnan', '西藏': 'Tibet', '陕西': 'Shaanxi', '甘肃': 'Gansu',
    '青海': 'Qinghai', '宁夏': 'Ningxia', '新疆': 'Xinjiang',
    '香港': 'Hong Kong', '澳门': 'Macau', '台湾': 'Taiwan'
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
    '基诺族', '汉族'
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
    '管理有限公司'
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
    '管理有限公司': 'Management Co., Ltd.'
};

function translateEthnicInRegion(text) {
    let result = text;
    for (const eth of ETHNIC_GROUPS) {
        if (result.includes(eth)) {
            result = result.split(eth).join(ETHNIC_PINYIN[eth]);
        }
    }
    return result;
}

function translateRegion(text) {
    if (!text) return '';
    let result = text;

    for (const [zh, en] of Object.entries(PROVINCE_FULL)) {
        if (result.startsWith(zh)) {
            const rest = result.slice(zh.length);
            const restTranslated = translateEthnicInRegion(rest);
            result = en + restTranslated;
            result = result.replace(/省/g, '');
            result = result.replace(/自治区/g, '');
            result = result.replace(/自治州/g, ' Autonomous Prefecture');
            result = result.replace(/自治县/g, ' Autonomous County');
            result = result.replace(/自治旗/g, ' Autonomous Banner');
            result = result.replace(/地区/g, ' Prefecture');
            result = result.replace(/市/g, ' City');
            result = result.replace(/区/g, ' District');
            result = result.replace(/县/g, ' County');
            result = result.replace(/旗/g, ' Banner');
            result = result.replace(/林区/g, ' Forestry District');
            result = result.replace(/盟/g, ' League');
            return result.replace(/\s+/g, ' ').trim();
        }
    }

    result = translateEthnicInRegion(result);
    result = result.replace(/自治州/g, ' Autonomous Prefecture');
    result = result.replace(/自治县/g, ' Autonomous County');
    result = result.replace(/自治旗/g, ' Autonomous Banner');
    result = result.replace(/地区/g, ' Prefecture');
    result = result.replace(/市/g, ' City');
    result = result.replace(/区/g, ' District');
    result = result.replace(/县/g, ' County');
    result = result.replace(/旗/g, ' Banner');
    result = result.replace(/林区/g, ' Forestry District');
    result = result.replace(/盟/g, ' League');

    return result.replace(/\s+/g, ' ').trim();
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
        return translateRegion(result);
    }

    let prefixTranslated = translateRegion(prefixPart);

    let suffixTranslated = suffixPart;
    for (const type of sortedTypes) {
        if (suffixTranslated.includes(type)) {
            suffixTranslated = suffixTranslated.split(type).join(INSTITUTION_EN[type]);
        }
    }

    suffixTranslated = suffixTranslated.replace(/（/g, ' (').replace(/）/g, ')');
    suffixTranslated = suffixTranslated.replace(/、/g, ', ');
    suffixTranslated = suffixTranslated.replace(/，/g, ', ');

    let resultStr = prefixTranslated + ' ' + suffixTranslated;
    resultStr = resultStr.replace(/\s+/g, ' ').trim();
    resultStr = resultStr.replace(/\( /g, '(').replace(/ \)/g, ')');
    resultStr = resultStr.replace(/ Co\., Ltd\./g, ' Co., Ltd.');

    return resultStr;
}

const data = JSON.parse(fs.readFileSync('static/data/intangible_heritage_data.json', 'utf8'));
const dataEn = JSON.parse(fs.readFileSync('static/data/intangible_heritage_data_en.json', 'utf8'));

let regionFields = 0;
let unitFields = 0;
let totalRecords = 0;
const regionSamples = [];
const unitSamples = [];

data.children.forEach((cat, catIdx) => {
    const catEn = dataEn.children[catIdx];
    cat.children.forEach((item, itemIdx) => {
        if (item.records) {
            const itemEn = catEn && catEn.children ? catEn.children[itemIdx] : null;
            item.records.forEach((r, recordIdx) => {
                totalRecords++;
                if (r['申报地区或单位']) {
                    const enRegion = translateRegion(r['申报地区或单位']);
                    if (!r['申报地区或单位_en']) {
                        r['申报地区或单位_en'] = enRegion;
                        regionFields++;
                    }
                    if (itemEn && itemEn.records && itemEn.records[recordIdx]) {
                        itemEn.records[recordIdx].records_en = itemEn.records[recordIdx].records_en || {};
                        itemEn.records[recordIdx].records_en['Application Region/Unit'] = enRegion;
                    }
                    if (regionSamples.length < 10) regionSamples.push({ zh: r['申报地区或单位'], en: enRegion });
                }
                if (r['保护单位']) {
                    const enUnit = translateProtectUnit(r['保护单位']);
                    if (!r['保护单位_en']) {
                        r['保护单位_en'] = enUnit;
                        unitFields++;
                    }
                    if (itemEn && itemEn.records && itemEn.records[recordIdx]) {
                        itemEn.records[recordIdx].records_en = itemEn.records[recordIdx].records_en || {};
                        itemEn.records[recordIdx].records_en['Protection Unit'] = enUnit;
                    }
                    if (unitSamples.length < 10) unitSamples.push({ zh: r['保护单位'], en: enUnit });
                }
            });
        }
    });
});

fs.writeFileSync('static/data/intangible_heritage_data.json', JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync('static/data/intangible_heritage_data_en.json', JSON.stringify(dataEn, null, 2), 'utf8');

console.log(`Total records: ${totalRecords}`);
console.log(`Region fields translated: ${regionFields}`);
console.log(`Protection unit fields translated: ${unitFields}`);

console.log('\n=== Region samples ===');
regionSamples.forEach((s, i) => console.log(`${i + 1}. ${s.zh} -> ${s.en}`));

console.log('\n=== Protection unit samples ===');
unitSamples.forEach((s, i) => console.log(`${i + 1}. ${s.zh} -> ${s.en}`));

console.log('\nDone!');
