from django.db import models


PERFORMANCE_CATEGORY_CHOICES = [
    ('categoryJingju', '京剧'),
    ('categoryKunqu', '昆曲'),
    ('categoryHuangmei', '黄梅戏'),
    ('categoryYueju', '越剧'),
    ('categoryGaojia', '高甲戏'),
    ('categoryChuanju', '川剧'),
    ('categoryYuju', '豫剧'),
    ('categoryOther', '其他'),
]

MERCHANDISE_CATEGORY_CHOICES = [
    ('catAccessory', '配饰'),
    ('catFabric', '织物'),
    ('catCeramic', '陶瓷'),
    ('catStationery', '文房'),
    ('catHome', '家居'),
]


class Performance(models.Model):
    name = models.CharField(max_length=200, verbose_name='演出名称')
    name_en = models.CharField(max_length=200, verbose_name='英文名称', blank=True)
    name_key = models.CharField(max_length=100, verbose_name='i18n名称key', blank=True)
    category_key = models.CharField(max_length=50, choices=PERFORMANCE_CATEGORY_CHOICES, verbose_name='分类')
    datetime = models.DateTimeField(verbose_name='演出时间')
    address = models.CharField(max_length=200, verbose_name='演出地点')
    address_en = models.CharField(max_length=200, verbose_name='英文地点', blank=True)
    address_key = models.CharField(max_length=100, verbose_name='i18n地址key', blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='票价')
    image = models.CharField(max_length=500, verbose_name='图片路径')
    description = models.TextField(blank=True, verbose_name='演出描述')
    description_en = models.TextField(blank=True, verbose_name='英文描述')
    desc_key = models.CharField(max_length=100, verbose_name='i18n描述key', blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '票务演出'
        verbose_name_plural = '票务演出'
        ordering = ['datetime']


class Merchandise(models.Model):
    name = models.CharField(max_length=200, verbose_name='商品名称')
    name_en = models.CharField(max_length=200, verbose_name='英文名称', blank=True)
    name_key = models.CharField(max_length=100, verbose_name='i18n名称key', blank=True)
    description = models.TextField(blank=True, verbose_name='商品描述')
    description_en = models.TextField(blank=True, verbose_name='英文描述')
    desc_key = models.CharField(max_length=100, verbose_name='i18n描述key', blank=True)
    category_key = models.CharField(max_length=50, choices=MERCHANDISE_CATEGORY_CHOICES, verbose_name='分类')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='价格')
    image = models.CharField(max_length=500, verbose_name='图片路径')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '文创周边'
        verbose_name_plural = '文创周边'
        ordering = ['id']


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name='类别名称')
    name_en = models.CharField(max_length=100, verbose_name='英文名称', blank=True)
    order = models.IntegerField(default=0, verbose_name='排序')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '非遗类别'
        verbose_name_plural = '非遗类别'
        ordering = ['order']


class Region(models.Model):
    name = models.CharField(max_length=200, verbose_name='地区名称')
    name_en = models.CharField(max_length=200, verbose_name='英文名称', blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '申报地区'
        verbose_name_plural = '申报地区'


class ProtectionUnit(models.Model):
    name = models.CharField(max_length=200, verbose_name='保护单位名称')
    name_en = models.CharField(max_length=200, verbose_name='英文名称', blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '保护单位'
        verbose_name_plural = '保护单位'


class HeritageItem(models.Model):
    name = models.CharField(max_length=200, verbose_name='项目名称')
    name_en = models.CharField(max_length=200, verbose_name='英文名称', blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, verbose_name='所属类别')
    region = models.ForeignKey(Region, on_delete=models.CASCADE, verbose_name='申报地区')
    protection_unit = models.ForeignKey(ProtectionUnit, on_delete=models.CASCADE, verbose_name='保护单位')
    announcement_time = models.CharField(max_length=50, verbose_name='公布时间')
    description = models.TextField(blank=True, verbose_name='项目简介')
    image_url = models.CharField(max_length=500, blank=True, verbose_name='图片链接')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '非遗项目'
        verbose_name_plural = '非遗项目'