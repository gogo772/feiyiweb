from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from .models import Performance, Merchandise


@csrf_exempt
@require_GET
def performances_list(request):
    try:
        performances = Performance.objects.all().order_by('datetime')
        data = []
        for p in performances:
            data.append({
                'id': p.id,
                'name': p.name,
                'name_en': p.name_en,
                'nameKey': p.name_key,
                'categoryKey': p.category_key,
                'datetime': p.datetime.isoformat(),
                'address': p.address,
                'address_en': p.address_en,
                'addressKey': p.address_key,
                'price': float(p.price),
                'img': '/' + p.image if p.image and not p.image.startswith('/') else p.image,
            })
        return JsonResponse({'success': True, 'data': data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_GET
def merchandise_list(request):
    try:
        merchandise = Merchandise.objects.all().order_by('id')
        data = []
        for m in merchandise:
            data.append({
                'id': m.id,
                'name': m.name,
                'name_en': m.name_en,
                'nameKey': m.name_key,
                'description': m.description,
                'description_en': m.description_en,
                'descKey': m.desc_key,
                'categoryKey': m.category_key,
                'price': float(m.price),
                'img': '/' + m.image if m.image and not m.image.startswith('/') else m.image,
            })
        return JsonResponse({'success': True, 'data': data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)