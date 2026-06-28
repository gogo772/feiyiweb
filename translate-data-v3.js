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

const NAME_TRANSLATIONS = {
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

function chineseToPinyin(text) {
    if (!text) return '';
    const result = pinyin(text, { toneType: 'none', type: 'string' });
    return result.charAt(0).toUpperCase() + result.slice(1);
}

function translateEthnicInRegion(text) {
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
    return result;
}

function translateCountyName(text) {
    if (!text) return '';
    return chineseToPinyin(text).replace(/\s+/g, '');
}

function translateRegion(text) {
    if (!text) return '';
    let result = text;

    for (const [zh, en] of Object.entries(PROVINCE_FULL)) {
        if (result.startsWith(zh)) {
            const rest = result.slice(zh.length);
            const restWithEthnic = translateEthnicInRegion(rest);
            
            let restTranslated = restWithEthnic;
            
            const countyMatches = restWithEthnic.match(/([\u4e00-\u9fa5]+)(县|区|市|旗|乡|镇|村|街道|社区)/g);
            if (countyMatches) {
                for (const match of countyMatches) {
                    const placeTypeMatch = match.match(/(县|区|市|旗|乡|镇|村|街道|社区)$/);
                    const placeName = match.slice(0, -placeTypeMatch[0].length);
                    const placeTypeEn = {
                        '县': 'County', '区': 'District', '市': 'City',
                        '旗': 'Banner', '乡': 'Township', '镇': 'Town',
                        '村': 'Village', '街道': 'Subdistrict', '社区': 'Community'
                    }[placeTypeMatch[0]];
                    const pinyinName = translateCountyName(placeName);
                    restTranslated = restTranslated.replace(match, pinyinName + ' ' + placeTypeEn);
                }
            }
            
            restTranslated = restTranslated.replace(/省/g, '');
            restTranslated = restTranslated.replace(/自治区/g, '');
            restTranslated = restTranslated.replace(/自治州/g, ' Autonomous Prefecture');
            restTranslated = restTranslated.replace(/自治县/g, ' Autonomous County');
            restTranslated = restTranslated.replace(/自治旗/g, ' Autonomous Banner');
            restTranslated = restTranslated.replace(/地区/g, ' Prefecture');
            restTranslated = restTranslated.replace(/林区/g, ' Forestry District');
            restTranslated = restTranslated.replace(/盟/g, ' League');
            
            result = en + ' ' + restTranslated;
            result = result.replace(/\s+/g, ' ').trim();
            return result;
        }
    }

    result = translateEthnicInRegion(result);
    
    const countyMatches = result.match(/([\u4e00-\u9fa5]+)(县|区|市|旗|乡|镇|村|街道|社区|地区|盟|林区)/g);
    if (countyMatches) {
        for (const match of countyMatches) {
            const placeTypeMatch = match.match(/(县|区|市|旗|乡|镇|村|街道|社区|地区|盟|林区)$/);
            const placeName = match.slice(0, -placeTypeMatch[0].length);
            const placeTypeEn = {
                '县': 'County', '区': 'District', '市': 'City',
                '旗': 'Banner', '乡': 'Township', '镇': 'Town',
                '村': 'Village', '街道': 'Subdistrict', '社区': 'Community',
                '地区': 'Prefecture', '盟': 'League', '林区': 'Forestry District'
            }[placeTypeMatch[0]];
            const pinyinName = translateCountyName(placeName);
            result = result.replace(match, pinyinName + ' ' + placeTypeEn);
        }
    }
    
    result = result.replace(/自治州/g, ' Autonomous Prefecture');
    result = result.replace(/自治县/g, ' Autonomous County');
    result = result.replace(/自治旗/g, ' Autonomous Banner');

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

function translateItemName(name) {
    if (!name) return '';
    
    if (NAME_TRANSLATIONS[name]) {
        return NAME_TRANSLATIONS[name];
    }
    
    let result = name;
    
    result = result.replace(/（/g, ' (').replace(/）/g, ')');
    
    for (const eth of ETHNIC_GROUPS) {
        if (result.includes(eth)) {
            result = result.split(eth).join(ETHNIC_PINYIN[eth] + ' ');
        }
    }
    
    const chinesePattern = /[\u4e00-\u9fa5]+/g;
    const matches = result.match(chinesePattern);
    if (matches) {
        for (const match of matches) {
            const pinyinResult = chineseToPinyin(match);
            result = result.replace(match, pinyinResult);
        }
    }
    
    result = result.replace(/二十四节气/g, '24 Solar Terms');
    result = result.replace(/春节/g, 'Spring Festival');
    result = result.replace(/元宵节/g, 'Lantern Festival');
    result = result.replace(/清明节/g, 'Qingming Festival');
    result = result.replace(/端午节/g, 'Dragon Boat Festival');
    result = result.replace(/中秋节/g, 'Mid-Autumn Festival');
    result = result.replace(/重阳节/g, 'Double Ninth Festival');
    result = result.replace(/庙会/g, 'Temple Fair');
    result = result.replace(/歌会/g, 'Song Festival');
    result = result.replace(/花会/g, 'Flower Festival');
    result = result.replace(/灯会/g, 'Lantern Festival');
    result = result.replace(/习俗/g, 'Custom');
    result = result.replace(/传说/g, 'Legend');
    result = result.replace(/故事/g, 'Story');
    result = result.replace(/歌谣/g, 'Folk Song');
    result = result.replace(/民歌/g, 'Folk Song');
    result = result.replace(/音乐/g, 'Music');
    result = result.replace(/舞蹈/g, 'Dance');
    result = result.replace(/戏剧/g, 'Drama');
    result = result.replace(/戏曲/g, 'Opera');
    result = result.replace(/曲艺/g, 'Quyi');
    result = result.replace(/美术/g, 'Fine Arts');
    result = result.replace(/技艺/g, 'Craftsmanship');
    result = result.replace(/医药/g, 'Medicine');
    result = result.replace(/民俗/g, 'Folk Custom');
    result = result.replace(/剪纸/g, 'Paper Cutting');
    result = result.replace(/刺绣/g, 'Embroidery');
    result = result.replace(/陶瓷/g, 'Ceramics');
    result = result.replace(/木雕/g, 'Wood Carving');
    result = result.replace(/石雕/g, 'Stone Carving');
    result = result.replace(/玉雕/g, 'Jade Carving');
    result = result.replace(/编织/g, 'Weaving');
    result = result.replace(/漆器/g, 'Lacquerware');
    result = result.replace(/印刷/g, 'Printing');
    result = result.replace(/制茶/g, 'Tea Making');
    result = result.replace(/酿酒/g, 'Brewing');
    result = result.replace(/烹饪/g, 'Cooking');
    result = result.replace(/武术/g, 'Martial Arts');
    result = result.replace(/杂技/g, 'Acrobatics');
    result = result.replace(/棋类/g, 'Board Games');
    result = result.replace(/书法/g, 'Calligraphy');
    result = result.replace(/篆刻/g, 'Seal Engraving');
    result = result.replace(/年画/g, 'New Year Pictures');
    result = result.replace(/皮影/g, 'Shadow Puppetry');
    result = result.replace(/木偶/g, 'Puppet');
    result = result.replace(/盆景/g, 'Bonsai');
    result = result.replace(/风筝/g, 'Kite');
    result = result.replace(/灯彩/g, 'Lantern');
    result = result.replace(/面塑/g, 'Dough Sculpture');
    result = result.replace(/泥塑/g, 'Clay Sculpture');
    result = result.replace(/竹编/g, 'Bamboo Weaving');
    result = result.replace(/草编/g, 'Straw Weaving');
    result = result.replace(/藤编/g, 'Rattan Weaving');
    result = result.replace(/号子/g, 'Haozi');
    result = result.replace(/唢呐/g, 'Suona');
    result = result.replace(/笙管乐/g, 'Wind and Percussion Music');
    result = result.replace(/十番/g, 'Shifan');
    
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
}

const dataEn = JSON.parse(fs.readFileSync('static/data/intangible_heritage_data_en.json', 'utf8'));

let nameFields = 0;
let regionFields = 0;
let unitFields = 0;
let dateFields = 0;
let totalItems = 0;
let totalRecords = 0;
const nameSamples = [];
const regionSamples = [];
const unitSamples = [];

dataEn.children.forEach(cat => {
    cat.children.forEach(item => {
        totalItems++;
        if (!item.name_en) {
            item.name_en = translateItemName(item.name);
            nameFields++;
            if (nameSamples.length < 10) nameSamples.push({ zh: item.name, en: item.name_en });
        }
        
        if (item.records) {
            item.records.forEach(r => {
                totalRecords++;
                if (!r.records_en) {
                    r.records_en = {};
                }
                
                if (r['公布时间'] && !r.records_en['Publish Date']) {
                    r.records_en['Publish Date'] = translatePublishDate(r['公布时间']);
                    dateFields++;
                }
                
                if (r['申报地区或单位']) {
                    const newRegion = translateRegion(r['申报地区或单位']);
                    if (regionSamples.length < 10 && r['申报地区或单位'].includes('县')) {
                        regionSamples.push({ zh: r['申报地区或单位'], en: newRegion });
                    }
                    r.records_en['Application Region/Unit'] = newRegion;
                    regionFields++;
                }
                
                if (r['保护单位']) {
                    const newUnit = translateProtectUnit(r['保护单位']);
                    if (unitSamples.length < 10 && r['保护单位'].includes('县')) {
                        unitSamples.push({ zh: r['保护单位'], en: newUnit });
                    }
                    r.records_en['Protection Unit'] = newUnit;
                    unitFields++;
                }
            });
        }
    });
});

fs.writeFileSync('static/data/intangible_heritage_data_en.json', JSON.stringify(dataEn, null, 2), 'utf8');

console.log(`Total items: ${totalItems}`);
console.log(`Name fields translated: ${nameFields}`);
console.log(`Total records: ${totalRecords}`);
console.log(`Region fields updated: ${regionFields}`);
console.log(`Protection unit fields updated: ${unitFields}`);
console.log(`Publish date fields added: ${dateFields}`);

console.log('\n=== Name translation samples ===');
nameSamples.forEach((s, i) => console.log(`${i + 1}. ${s.zh} -> ${s.en}`));

console.log('\n=== Region translation samples ===');
regionSamples.forEach((s, i) => console.log(`${i + 1}. ${s.zh} -> ${s.en}`));

console.log('\n=== Protection unit translation samples ===');
unitSamples.forEach((s, i) => console.log(`${i + 1}. ${s.zh} -> ${s.en}`));

console.log('\nDone!');
