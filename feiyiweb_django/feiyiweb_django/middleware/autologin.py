from django.contrib.auth import get_user_model, login
from django.http import HttpResponseRedirect
from django.urls import reverse


class AutoLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/admin/') and not request.user.is_authenticated:
            User = get_user_model()
            try:
                user = User.objects.get(username='admin')
                if user.is_active and user.is_staff:
                    login(request, user)
                    if request.path == '/admin/login/':
                        return HttpResponseRedirect(reverse('admin:index'))
            except User.DoesNotExist:
                pass

        response = self.get_response(request)
        return response