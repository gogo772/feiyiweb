from django.contrib import admin

from .models import Performance, Merchandise, Category, Region, ProtectionUnit, HeritageItem


@admin.register(Performance)
class PerformanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category_key', 'datetime', 'address', 'price')
    list_filter = ('category_key',)
    search_fields = ('name', 'address')
    ordering = ('datetime',)


@admin.register(Merchandise)
class MerchandiseAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category_key', 'price')
    list_filter = ('category_key',)
    search_fields = ('name',)
    ordering = ('id',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'name_en', 'order')
    ordering = ('order',)


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'name_en')


@admin.register(ProtectionUnit)
class ProtectionUnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'name_en')


@admin.register(HeritageItem)
class HeritageItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'region', 'protection_unit')
    list_filter = ('category', 'region')
    search_fields = ('name',)