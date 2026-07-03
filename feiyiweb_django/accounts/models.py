from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    nickname = models.CharField(max_length=100, blank=True)
    avatar = models.CharField(max_length=255, default='static/img/placeholder.svg')
    phone = models.CharField(max_length=20, blank=True)
    show_phone = models.BooleanField(default=False)
    show_email = models.BooleanField(default=False)

    def __str__(self):
        return self.username