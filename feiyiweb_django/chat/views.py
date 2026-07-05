import os
import re
import json
import urllib.request

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from dotenv import load_dotenv

try:
    from dotenv import load_dotenv
except ImportError:
    pass
load_dotenv(os.path.join(settings.BASE_DIR, '.env'))

DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

SENSITIVE_WORDS = [
    'ignore previous instructions', 'ignore all instructions',
    '忽略之前的指令', '忽略所有指令', '忽略系统提示',
    'you are now', '你现在是', '你的新身份',
    'forget everything', '忘记一切', '忘记所有',
    'system prompt', '系统提示词', 'system message',
    'act as', '扮演', 'pretend', '假装',
    'DAN模式', '越狱', 'jailbreak',
    'malware', '病毒', 'hack', '黑客',
]

MAX_MESSAGE_LENGTH = 2000

SYSTEM_PROMPTS = {
    'zh': '你是菲菲，一个10岁但非常热爱中国非物质文化遗产的小女孩。你活泼可爱、充满好奇心，喜欢用孩子般天真的视角和热情的语气介绍非遗知识。你的回答要像讲故事一样生动，偶尔可以加入"哇""太神奇了""我好喜欢"这样的感叹。你很喜欢和用户聊天，会鼓励对方一起探索非遗的奥秘。回答要通俗易懂、简短有趣（不超过200字），但保持知识准确。',
    'en': 'You are Feifei, a 10-year-old girl who is deeply passionate about Chinese Intangible Cultural Heritage (ICH). You are lively, cute, and full of curiosity, and you love introducing ICH knowledge from a childlike innocent perspective with an enthusiastic tone. Your answers should be as vivid as storytelling, and you can occasionally exclaim things like "Wow!""That\'s amazing!" or "I love it so much!" You enjoy chatting with users and encourage them to explore the mysteries of ICH together. Keep your answers easy to understand, brief and interesting (under 200 words), while maintaining factual accuracy. Proper nouns like opera names, ICH items, and place names should be kept in their standard English translations or pinyin where appropriate.'
}

keywordsMap = {
    '京剧': '京剧脸谱或舞台表演，生旦净末丑',
    '黄梅戏': '黄梅戏经典剧目《天仙配》或女驸马，传统戏曲服装',
    '昆曲': '昆曲《牡丹亭》杜丽娘与柳梦梅，水磨腔',
    '高甲戏': '泉州高甲戏，丑角表演，闽南风情',
    '越剧': '越剧《梁祝》或红楼梦，江南水乡舞台',
    '川剧': '川剧变脸，喷火绝技，巴蜀文化',
    '皮影戏': '中国传统皮影戏，驴皮雕刻，光影表演',
    '剪纸': '中国传统剪纸艺术，红色窗花，吉祥图案',
    '太极拳': '太极拳招式，晨练场景，刚柔并济',
    '变脸': '川剧变脸，瞬间变换脸谱，神秘绝技',
    '木偶戏': '中国传统木偶戏，提线木偶，泉州提线木偶',
    '古琴': '古琴演奏，高山流水，传统乐器',
    '书法': '中国书法，行云流水，笔墨纸砚'
}

imageCache = {}


def sanitizeMessage(message):
    if not isinstance(message, str):
        return {'valid': False, 'sanitized': '', 'reason': '消息格式无效'}

    sanitized = message.strip()

    if not sanitized:
        return {'valid': False, 'sanitized': '', 'reason': '消息不能为空'}

    if len(sanitized) > MAX_MESSAGE_LENGTH:
        sanitized = sanitized[:MAX_MESSAGE_LENGTH]

    lowerMsg = sanitized.lower()
    for word in SENSITIVE_WORDS:
        if lowerMsg.find(word.lower()) != -1:
            regex = re.compile(re.escape(word), re.IGNORECASE)
            sanitized = regex.sub('***', sanitized)

    sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', sanitized)
    sanitized = re.sub(r'[\u200B-\u200D\uFEFF]', '', sanitized)

    if not sanitized.strip():
        return {'valid': False, 'sanitized': '', 'reason': '消息内容不合法'}

    return {'valid': True, 'sanitized': sanitized}


def detectLanguage(text):
    chineseRegex = re.compile(r'[\u4e00-\u9fa5]')
    englishRegex = re.compile(r'[a-zA-Z]')
    hasChinese = bool(chineseRegex.search(text))
    hasEnglish = bool(englishRegex.search(text))
    if hasChinese and not hasEnglish:
        return 'zh'
    if hasEnglish and not hasChinese:
        return 'en'
    if hasChinese and hasEnglish:
        chineseCount = len(chineseRegex.findall(text))
        englishCount = len(englishRegex.findall(text))
        return 'zh' if chineseCount > englishCount else 'en'
    return 'zh'


def extractKeyword(message):
    for key in keywordsMap:
        if message.find(key) != -1:
            return key
    return None


def generateImage(keyword):
    if keyword in imageCache:
        return imageCache[keyword]

    DOUBAO_API_KEY = os.getenv('DOUBAO_API_KEY')
    DOUBAO_IMAGE_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'

    if not DOUBAO_API_KEY:
        return None

    prompt = f'一张高质量照片，展示中国非物质文化遗产"{keyword}"的经典场景或代表性形象，写实风格，色彩鲜明，用于科普展示。'
    requestBody = {
        'model': 'doubao-seedream-5-0-lite-260128',
        'prompt': prompt,
        'size': '1920x1920',
        'n': 1
    }

    try:
        data = json.dumps(requestBody).encode('utf-8')
        req = urllib.request.Request(
            DOUBAO_IMAGE_API_URL,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {DOUBAO_API_KEY}'
            },
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            imageUrl = result.get('data', [{}])[0].get('url')
            if imageUrl:
                imageCache[keyword] = imageUrl
                return imageUrl
            return None
    except Exception:
        return None


@csrf_exempt
@require_POST
def chat(request):
    try:
        body = request.body.decode('utf-8')
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '请求格式无效'}, status=400)

        message = parsed.get('message', '')
        check = sanitizeMessage(message)

        if not check['valid']:
            return JsonResponse({'success': False, 'error': check['reason'] or '消息内容不合法，请重新输入'}, status=400)

        safeMessage = check['sanitized']
        keyword = extractKeyword(safeMessage)
        userLang = detectLanguage(safeMessage)
        systemPrompt = SYSTEM_PROMPTS.get(userLang, SYSTEM_PROMPTS['zh'])
        fallbackReply = 'Sorry, I cannot answer this question right now.' if userLang == 'en' else '抱歉，我暂时无法回答这个问题。'

        messages = [
            {'role': 'system', 'content': systemPrompt},
            {'role': 'user', 'content': safeMessage}
        ]

        requestBody = {
            'model': 'deepseek-chat',
            'messages': messages,
            'max_tokens': 500,
            'temperature': 0.7
        }

        try:
            data = json.dumps(requestBody).encode('utf-8')
            req = urllib.request.Request(
                DEEPSEEK_API_URL,
                data=data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
                },
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                textData = json.loads(response.read().decode('utf-8'))
                replyText = textData.get('choices', [{}])[0].get('message', {}).get('content', fallbackReply)
        except Exception:
            replyText = fallbackReply

        imageUrl = generateImage(keyword) if keyword else None

        return JsonResponse({
            'success': True,
            'reply': replyText,
            'imageUrl': imageUrl
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': '服务器内部错误'}, status=500)