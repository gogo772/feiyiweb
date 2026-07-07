from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import User


@csrf_exempt
@require_POST
def register(request):
    try:
        data = request.POST
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return JsonResponse({'success': False, 'error': '请填写用户名和密码'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': '用户名已存在'}, status=400)

        user = User.objects.create_user(
            username=username,
            password=password,
            nickname=username,
            avatar='static/img/placeholder.svg',
        )

        return JsonResponse({'success': True, 'message': '注册成功'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def login_view(request):
    try:
        data = request.POST
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return JsonResponse({'success': False, 'error': '请填写用户名和密码'}, status=400)

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'username': user.username,
                'nickname': user.nickname or user.username,
                'avatar': user.avatar,
                'message': '登录成功'
            })
        else:
            return JsonResponse({'success': False, 'error': '用户名或密码错误'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def logout_view(request):
    try:
        logout(request)
        return JsonResponse({'success': True, 'message': '退出成功'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
def get_user(request):
    try:
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'error': '未登录'}, status=401)
        user = request.user
        return JsonResponse({
            'success': True,
            'username': user.username,
            'nickname': user.nickname or user.username,
            'avatar': user.avatar,
            'phone': user.phone if user.show_phone else '',
            'email': user.email if user.show_email else '',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)