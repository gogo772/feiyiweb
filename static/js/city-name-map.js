/* =============================================================
   公共数据：11 省地市名称中英对照表
   - 数据源：基于 /geo/[adcode]_full.json 的 features[].properties.name
   - 用途：地图 label 切语言时显示对应英文（去除"市/自治州/林区"等后缀，
     采用汉语拼音，音调省略）
   - 维护：如 GeoJSON 地市发生增减，更新本表即可
   ============================================================= */
(function (global) {
    // key = 省份 adcode, value = { 中文: 英文 } 映射
    // 命名规则：去掉"市/自治州/林区/地区"等行政区后缀，使用汉语拼音
    const CITY_NAME_MAP = {
        '340000': { // 安徽
            '合肥市': 'Hefei',     '芜湖市': 'Wuhu',         '蚌埠市': 'Bengbu',
            '淮南市': 'Huainan',   '马鞍山市': "Ma'anshan",  '淮北市': 'Huaibei',
            '铜陵市': 'Tongling',  '安庆市': 'Anqing',       '黄山市': 'Huangshan',
            '滁州市': 'Chuzhou',   '阜阳市': 'Fuyang',       '宿州市': 'Suzhou',
            '六安市': "Lu'an",     '亳州市': 'Bozhou',       '池州市': 'Chizhou',
            '宣城市': 'Xuancheng'
        },
        '330000': { // 浙江
            '杭州市': 'Hangzhou',  '宁波市': 'Ningbo',       '温州市': 'Wenzhou',
            '嘉兴市': 'Jiaxing',   '湖州市': 'Huzhou',       '绍兴市': 'Shaoxing',
            '金华市': 'Jinhua',    '衢州市': 'Quzhou',       '舟山市': 'Zhoushan',
            '台州市': 'Taizhou',   '丽水市': 'Lishui'
        },
        '320000': { // 江苏
            '南京市': 'Nanjing',   '无锡市': 'Wuxi',         '徐州市': 'Xuzhou',
            '常州市': 'Changzhou', '苏州市': 'Suzhou',       '南通市': 'Nantong',
            '连云港市': 'Lianyungang', '淮安市': "Huai'an",   '盐城市': 'Yancheng',
            '扬州市': 'Yangzhou',  '镇江市': 'Zhenjiang',    '泰州市': 'Taizhou',
            '宿迁市': 'Suqian'
        },
        '350000': { // 福建
            '福州市': 'Fuzhou',    '厦门市': 'Xiamen',       '莆田市': 'Putian',
            '三明市': 'Sanming',   '泉州市': 'Quanzhou',     '漳州市': 'Zhangzhou',
            '南平市': 'Nanping',   '龙岩市': 'Longyan',      '宁德市': 'Ningde'
        },
        '360000': { // 江西
            '南昌市': 'Nanchang',  '景德镇市': 'Jingdezhen', '萍乡市': 'Pingxiang',
            '九江市': 'Jiujiang',  '新余市': 'Xinyu',        '鹰潭市': 'Yingtan',
            '赣州市': 'Ganzhou',   '吉安市': "Ji'an",        '宜春市': 'Yichun',
            '抚州市': 'Fuzhou JX', '上饶市': 'Shangrao'
        },
        '410000': { // 河南
            '郑州市': 'Zhengzhou', '开封市': 'Kaifeng',      '洛阳市': 'Luoyang',
            '平顶山市': 'Pingdingshan', '安阳市': 'Anyang',   '鹤壁市': 'Hebi',
            '新乡市': 'Xinxiang',  '焦作市': 'Jiaozuo',      '濮阳市': 'Puyang',
            '许昌市': 'Xuchang',   '漯河市': 'Luohe',        '三门峡市': 'Sanmenxia',
            '南阳市': 'Nanyang',   '商丘市': 'Shangqiu',     '信阳市': 'Xinyang',
            '周口市': 'Zhoukou',   '驻马店市': 'Zhumadian',  '济源市': 'Jiyuan'
        },
        '420000': { // 湖北
            '武汉市': 'Wuhan',     '黄石市': 'Huangshi',     '十堰市': 'Shiyan',
            '宜昌市': 'Yichang',   '襄阳市': 'Xiangyang',    '鄂州市': 'Ezhou',
            '荆门市': 'Jingmen',   '孝感市': 'Xiaogan',      '荆州市': 'Jingzhou',
            '黄冈市': 'Huanggang', '咸宁市': 'Xianning',     '随州市': 'Suizhou',
            '恩施土家族苗族自治州': 'Enshi Tujia & Miao AP', '仙桃市': 'Xiantao',
            '潜江市': 'Qianjiang', '天门市': 'Tianmen',      '神农架林区': 'Shennongjia Forestry'
        },
        '430000': { // 湖南
            '长沙市': 'Changsha',  '株洲市': 'Zhuzhou',      '湘潭市': 'Xiangtan',
            '衡阳市': 'Hengyang',  '邵阳市': 'Shaoyang',     '岳阳市': 'Yueyang',
            '常德市': 'Changde',   '张家界市': 'Zhangjiajie', '益阳市': 'Yiyang',
            '郴州市': 'Chenzhou',  '永州市': 'Yongzhou',     '怀化市': 'Huaihua',
            '娄底市': 'Loudi',     '湘西土家族苗族自治州': 'Xiangxi Tujia & Miao AP'
        },
        '440000': { // 广东
            '广州市': 'Guangzhou', '韶关市': 'Shaoguan',     '深圳市': 'Shenzhen',
            '珠海市': 'Zhuhai',    '汕头市': 'Shantou',      '佛山市': 'Foshan',
            '江门市': 'Jiangmen',  '湛江市': 'Zhanjiang',    '茂名市': 'Maoming',
            '肇庆市': 'Zhaoqing',  '惠州市': 'Huizhou GD',   '梅州市': 'Meizhou',
            '汕尾市': 'Shanwei',   '河源市': 'Heyuan',       '阳江市': 'Yangjiang',
            '清远市': 'Qingyuan',  '东莞市': 'Dongguan',     '中山市': 'Zhongshan',
            '潮州市': 'Chaozhou',  '揭阳市': 'Jieyang',      '云浮市': 'Yunfu'
        },
        '450000': { // 广西
            '南宁市': 'Nanning',   '柳州市': 'Liuzhou',      '桂林市': 'Guilin',
            '梧州市': 'Wuzhou',    '北海市': 'Beihai',       '防城港市': 'Fangchenggang',
            '钦州市': 'Qinzhou',   '贵港市': 'Guigang',      '玉林市': 'Yulin GX',
            '百色市': 'Baise',     '贺州市': 'Hezhou',       '河池市': 'Hechi',
            '来宾市': 'Laibin',    '崇左市': 'Chongzuo'
        },
        '510000': { // 四川
            '成都市': 'Chengdu',   '自贡市': 'Zigong',       '攀枝花市': 'Panzhihua',
            '泸州市': 'Luzhou',    '德阳市': 'Deyang',       '绵阳市': 'Mianyang',
            '广元市': 'Guangyuan', '遂宁市': 'Suining',      '内江市': 'Neijiang',
            '乐山市': 'Leshan',    '南充市': 'Nanchong',     '眉山市': 'Meishan',
            '宜宾市': 'Yibin',     '广安市': "Guang'an",     '达州市': 'Dazhou',
            '雅安市': "Ya'an",     '巴中市': 'Bazhong',      '资阳市': 'Ziyang',
            '阿坝藏族羌族自治州': 'Aba Tibetan & Qiang AP', '甘孜藏族自治州': 'Garze Tibetan AP',
            '凉山彝族自治州': 'Liangshan Yi AP'
        }
    };

    /**
     * 获取地市的英文名（去除行政区后缀，未命中时回退中文）
     * @param {string} provinceCode - 省份 adcode
     * @param {string} zhName       - GeoJSON properties.name
     * @param {string} lang         - 'zh' | 'en'
     * @returns {string}
     */
    function getCityName(provinceCode, zhName, lang) {
        if (lang === 'zh' || !zhName) return zhName || '';
        const map = CITY_NAME_MAP[provinceCode];
        if (map && map[zhName]) return map[zhName];
        console.warn('[city-name-map] Missing English name for:', zhName, 'in province', provinceCode);
        return zhName;
    }

    global.CITY_NAME_MAP = CITY_NAME_MAP;
    global.getCityName = getCityName;
})(window);
