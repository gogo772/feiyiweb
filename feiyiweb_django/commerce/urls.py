from django.urls import path

from . import views

urlpatterns = [
    path('performances', views.performances_list, name='performances_list'),
    path('merchandise', views.merchandise_list, name='merchandise_list'),
]