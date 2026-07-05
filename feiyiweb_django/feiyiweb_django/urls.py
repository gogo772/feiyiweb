"""feiyiweb_django URL Configuration"""
import os

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.views.generic import TemplateView

from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('chat.urls')),
    path('api/', include('commerce.urls')),
    path('api/', include('media.urls')),
]

if settings.DEBUG:
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', serve, {
            'document_root': settings.STATICFILES_DIRS[0],
        }),
    ]

html_pages = [
    'index', 'history', 'knowledge-graph', 'merchandise',
    'orders', 'performances', 'product', 'starmap', 'travel',
    'user', 'whereami'
]
for page in html_pages:
    urlpatterns += [
        path(f'{page}.html', TemplateView.as_view(template_name=f'{page}.html')),
    ]
urlpatterns += [
    path('', TemplateView.as_view(template_name='index.html')),
]