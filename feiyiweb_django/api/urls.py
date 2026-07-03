from django.urls import path

from . import views

urlpatterns = [
    path('chat', views.chat, name='chat'),
    path('upload', views.upload, name='upload'),
    path('generate-image', views.generate_image, name='generate_image'),
    path('performances', views.performances_list, name='performances_list'),
    path('merchandise', views.merchandise_list, name='merchandise_list'),
]