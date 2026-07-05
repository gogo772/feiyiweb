import json
import os

from django.core.management.base import BaseCommand
from django.conf import settings

from commerce.models import Category, Region, ProtectionUnit, HeritageItem


CATEGORY_ORDER = {
    '民间文学': 1,
    '传统音乐': 2,
    '传统舞蹈': 3,
    '传统戏剧': 4,
    '曲艺': 5,
    '传统体育、游艺与杂技': 6,
    '传统美术': 7,
    '传统技艺': 8,
    '传统医药': 9,
    '民俗': 10,
}


class Command(BaseCommand):
    help = 'Import heritage data from JSON files'

    def handle(self, *args, **options):
        data_path = os.path.join(settings.BASE_DIR, 'static', 'data', 'intangible_heritage_data.json')

        if not os.path.exists(data_path):
            self.stderr.write(self.style.ERROR(f'数据文件不存在: {data_path}'))
            return

        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.stdout.write(self.style.SUCCESS('开始导入非遗数据...'))

        imported_count = 0
        skipped_count = 0

        for category_data in data.get('children', []):
            category_name = category_data.get('name', '')

            category, created = Category.objects.get_or_create(
                name=category_name,
                defaults={
                    'name_en': '',
                    'order': CATEGORY_ORDER.get(category_name, 99)
                }
            )

            if created:
                self.stdout.write(f'  创建类别: {category_name}')

            for item_data in category_data.get('children', []):
                item_name = item_data.get('name', '')

                for record in item_data.get('records', []):
                    announcement_time = record.get('公布时间', '')
                    region_name = record.get('申报地区或单位', '')
                    unit_name = record.get('保护单位', '')
                    region_name_en = record.get('申报地区或单位_en', '')
                    unit_name_en = record.get('保护单位_en', '')

                    if not item_name or not region_name:
                        skipped_count += 1
                        continue

                    region, _ = Region.objects.get_or_create(
                        name=region_name,
                        defaults={'name_en': region_name_en}
                    )

                    unit, _ = ProtectionUnit.objects.get_or_create(
                        name=unit_name,
                        defaults={'name_en': unit_name_en}
                    )

                    heritage_item, created = HeritageItem.objects.get_or_create(
                        name=item_name,
                        region=region,
                        defaults={
                            'name_en': '',
                            'category': category,
                            'protection_unit': unit,
                            'announcement_time': announcement_time,
                        }
                    )

                    if created:
                        imported_count += 1
                        self.stdout.write(f'    导入项目: {item_name}')
                    else:
                        skipped_count += 1

        self.stdout.write(self.style.SUCCESS(f'导入完成！新增: {imported_count} 条, 跳过: {skipped_count} 条'))