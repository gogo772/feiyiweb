from django.contrib import admin

from .models import Category, Region, ProtectionUnit, HeritageItem, Performance, Merchandise

admin.site.site_header = '非遗后台管理系统'
admin.site.site_title = '非遗后台管理系统'
admin.site.index_title = '非遗后台管理系统'


class HeritageItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'region', 'announcement_time')
    list_filter = ('category', 'region')
    search_fields = ('name', 'name_en', 'description')
    ordering = ('category', 'name')


class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en', 'order')
    list_editable = ('order',)
    search_fields = ('name', 'name_en')


class RegionAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en')
    search_fields = ('name', 'name_en')


class ProtectionUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_en')
    search_fields = ('name', 'name_en')


admin.site.register(Category, CategoryAdmin)
admin.site.register(Region, RegionAdmin)
admin.site.register(ProtectionUnit, ProtectionUnitAdmin)
admin.site.register(HeritageItem, HeritageItemAdmin)


class PerformanceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category_key', 'datetime', 'address', 'price')
    list_filter = ('category_key',)
    search_fields = ('name', 'name_en', 'address')
    ordering = ('datetime',)


class MerchandiseAdmin(admin.ModelAdmin):
    list_display = ('name', 'category_key', 'price')
    list_filter = ('category_key',)
    search_fields = ('name', 'name_en', 'description')
    ordering = ('id',)


admin.site.register(Performance, PerformanceAdmin)
admin.site.register(Merchandise, MerchandiseAdmin)