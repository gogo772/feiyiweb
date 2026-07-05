from django.core.management.base import BaseCommand
from datetime import datetime

from commerce.models import Performance, Merchandise


class Command(BaseCommand):
    help = '导入演出和文创商品数据'

    def get_category_key_from_name(self, name):
        if '京剧' in name:
            return 'categoryJingju'
        if '昆曲' in name:
            return 'categoryKunqu'
        if '黄梅戏' in name:
            return 'categoryHuangmei'
        if '越剧' in name:
            return 'categoryYueju'
        if '高甲戏' in name:
            return 'categoryGaojia'
        if '川剧' in name:
            return 'categoryChuanju'
        if '豫剧' in name:
            return 'categoryYuju'
        return 'categoryOther'

    def get_merch_category_key(self, name):
        if any(key in name for key in ['脸谱', '面具', '傩面具', '藏戏面具']):
            return 'catAccessory'
        if any(key in name for key in ['扇', '团扇']):
            return 'catAccessory'
        if any(key in name for key in ['香囊', '头饰', '钥匙扣', '书扣']):
            return 'catAccessory'
        if any(key in name for key in ['文化衫', '围巾', '丝巾']):
            return 'catFabric'
        if any(key in name for key in ['陶瓷', '泥塑', '兔儿爷']):
            return 'catCeramic'
        if any(key in name for key in ['手账', '明信片', 'U盘', '书签']):
            return 'catStationery'
        return 'catHome'

    def handle(self, *args, **options):
        Performance.objects.all().delete()
        Merchandise.objects.all().delete()

        title_keys = [f'perf_name_{i}' for i in range(22)]
        address_keys = [f'perf_addr_{i}' for i in range(10)]
        raw_titles = [
            '京剧《贵妃醉酒》', '昆曲《牡丹亭》', '高甲戏《连升三级》', '黄梅戏《天仙配》',
            '越剧《梁祝》', '秦腔《三滴血》', '川剧《变脸》', '豫剧《花木兰》',
            '粤剧《帝女花》', '河北梆子《宝莲灯》', '评剧《杨三姐告状》', '晋剧《打金枝》',
            '婺剧《白蛇传》', '闽剧《荔枝换绛桃》', '梨园戏《董生与李氏》', '莆仙戏《春草闯堂》',
            '藏戏《文成公主》', '壮剧《百鸟衣》', '侗戏《珠郎娘美》', '皮影戏《西游记》',
            '木偶戏《火焰山》', '花鼓戏《刘海砍樵》'
        ]

        address_list = [
            '北京梅兰芳大剧院', '苏州昆剧院', '泉州高甲戏剧团', '安庆黄梅戏剧院',
            '杭州越剧院', '西安易俗大剧院', '成都川剧院', '郑州豫剧大剧院',
            '广州粤剧院', '石家庄河北梆子剧院', '唐山评剧院', '太原晋剧院',
            '金华婺剧院', '福州闽剧院', '泉州梨园戏剧院', '莆田莆仙戏剧院',
            '拉萨藏剧团', '南宁壮剧团', '黔东南侗剧团', '北京皮影剧团',
            '泉州木偶剧团', '长沙花鼓戏剧院'
        ]

        for i in range(24):
            name_key = title_keys[i % len(title_keys)]
            address_key = address_keys[i % len(address_keys)]
            raw_name = raw_titles[i % len(raw_titles)]
            month = 6 + (i // 4)
            day = (i % 28) + 1
            perf_datetime = datetime(2025, month, day, 19, 30)

            Performance.objects.create(
                name=raw_name,
                name_key=name_key,
                category_key=self.get_category_key_from_name(raw_name),
                datetime=perf_datetime,
                address=address_list[i % len(address_list)],
                address_key=address_key,
                price=180 + (i * 10),
                image=f'static/img/performances-img/{i}.jpg'
            )

        self.stdout.write(self.style.SUCCESS(f'成功导入 {Performance.objects.count()} 条演出数据'))

        raw_names = [
            "京剧脸谱书签", "昆曲折扇", "高甲戏公仔", "二十四节气手账", "太极拳文化衫",
            "非遗剪纸摆件", "皮影摆台", "刺绣香囊", "陶瓷戏曲娃娃", "竹编团扇",
            "蜡染围巾", "木版年画", "古法香牌", "戏曲头饰挂件", "民乐U盘",
            "非遗明信片套装", "扎染丝巾", "铜胎珐琅书扣", "藤编提篮", "泥塑兔儿爷",
            "兔年剪纸", "藏戏面具", "傩面具钥匙扣", "云锦小方巾"
        ]

        for i, raw_name in enumerate(raw_names):
            name_key = f'merch_name_{i}'
            desc_key = f'merch_desc_{i}'

            Merchandise.objects.create(
                name=raw_name,
                name_key=name_key,
                desc_key=desc_key,
                category_key=self.get_merch_category_key(raw_name),
                price=49 + (i * 7),
                image=f'static/img/merchandise-img/{i}.jpg'
            )

        self.stdout.write(self.style.SUCCESS(f'成功导入 {Merchandise.objects.count()} 条文创商品数据'))