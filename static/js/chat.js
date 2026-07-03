// chat.js - 菲菲版（无头像，纯文本精美版）
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 获取 i18n 文本（兼容 i18n.js 尚未加载）
    function tt(key, params) {
        return (window.i18n && window.i18n.t) ? window.i18n.t(key, params) : key;
    }

    function highlightKeywords(text) {
        const currentLang = window.i18n ? window.i18n.getLang() : 'zh';
        const keywords = currentLang === 'zh' ? [
            '京剧', '昆曲', '越剧', '黄梅戏', '豫剧', '川剧', '秦腔', '粤剧', '评剧',
            '皮影戏', '木偶戏', '剪纸', '刺绣', '陶瓷', '书法', '古琴', '太极拳',
            '非遗', '非物质文化遗产', '脸谱', '变脸', '傩戏', '花鼓戏', '二人转',
            '《贵妃醉酒》', '《牡丹亭》', '《天仙配》', '《梁祝》', '生旦净末丑'
        ] : [
            'Peking Opera', 'Kunqu Opera', 'Yue Opera', 'Huangmei Opera', 'Yu Opera',
            'Sichuan Opera', 'Qinqiang', 'Cantonese Opera', 'Ping Opera',
            'Shadow Puppetry', 'Puppet Show', 'Paper Cutting', 'Embroidery',
            'Ceramics', 'Calligraphy', 'Guqin', 'Tai Chi',
            'ICH', 'Intangible Cultural Heritage', 'Mask', 'Face-Changing',
            'Nuo Opera', 'Flower Drum Opera', 'Er Ren Zhuan',
            'The Drunken Beauty', 'The Peony Pavilion', 'Heavenly Match',
            'Butterfly Lovers', 'Sheng Dan Jing Mo Chou'
        ];
        let result = text;
        keywords.forEach(kw => {
            const regex = new RegExp(`(${escapeRegExp(kw)})`, 'g');
            result = result.replace(regex, `<strong class="highlight">$1</strong>`);
        });
        return result;
    }

    async function initChat() {
        const chatWindow = document.getElementById('aiChatWindow');
        const chatBody = document.getElementById('chatBody');
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendChat');
        const closeBtn = document.getElementById('closeChat');
        const openBtn = document.getElementById('deepseekBtn');

        if (!chatWindow || !chatBody || !chatInput || !sendButton) {
            console.warn('聊天组件缺失');
            return;
        }

        if (openBtn) openBtn.onclick = () => chatWindow.style.display = 'flex';
        if (closeBtn) closeBtn.onclick = () => chatWindow.style.display = 'none';

        function addUserMessage(text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message user';
            msgDiv.innerHTML = `
                <div class="message-sender">${escapeHtml(tt('you'))}</div>
                <div class="message-bubble">${escapeHtml(text)}</div>
            `;
            chatBody.appendChild(msgDiv);
            scrollToBottom();
        }

        function createAiMessage() {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message ai';
            msgDiv.innerHTML = `
                <div class="message-sender">${escapeHtml(tt('aiSender'))}</div>
                <div class="message-bubble"><span class="ai-content"></span><span class="typing-cursor"></span></div>
            `;
            chatBody.appendChild(msgDiv);
            const contentSpan = msgDiv.querySelector('.ai-content');
            const cursorSpan = msgDiv.querySelector('.typing-cursor');
            return { contentSpan, cursorSpan, msgDiv };
        }

        function displayAiContent(contentSpan, cursorSpan, htmlContent, imageUrl = null) {
            contentSpan.innerHTML = htmlContent;
            cursorSpan.style.display = 'inline-block';
            setTimeout(() => {
                cursorSpan.style.display = 'none';
                scrollToBottom();
            }, 200);
            if (imageUrl) {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'chat-image';
                imgDiv.innerHTML = `<img src="${imageUrl}" alt="非遗图片" onclick="window.open(this.src)">`;
                contentSpan.parentNode.appendChild(imgDiv);
                scrollToBottom();
            }
        }

        function showThinkingIndicator(container) {
            const thinkDiv = document.createElement('div');
            thinkDiv.className = 'thinking-indicator';
            thinkDiv.innerHTML = `<span class="thinking-text">📖 ${escapeHtml(tt('aiThinking'))}</span><span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span>`;
            container.appendChild(thinkDiv);
            scrollToBottom();
            return thinkDiv;
        }
        function removeThinkingIndicator(indicator) { if (indicator) indicator.remove(); }
        function scrollToBottom() { chatBody.scrollTop = chatBody.scrollHeight; }

        sendButton.onclick = async () => {
            const msg = chatInput.value.trim();
            if (!msg) return;
            addUserMessage(msg);
            chatInput.value = '';

            const { contentSpan, cursorSpan, msgDiv } = createAiMessage();
            const thinkingIndicator = showThinkingIndicator(contentSpan.parentNode);

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await response.json();

                removeThinkingIndicator(thinkingIndicator);

                if (data.success) {
                    let replyText = data.reply || tt('aiNoContent');
                    replyText = replyText.replace(/\n/g, '<br>');
                    const highlightedText = highlightKeywords(replyText);
                    displayAiContent(contentSpan, cursorSpan, highlightedText, data.imageUrl);
                } else {
                    displayAiContent(contentSpan, cursorSpan, tt('aiSorry') + escapeHtml(data.error || tt('aiUnknownError')));
                }
            } catch (err) {
                console.error(err);
                removeThinkingIndicator(thinkingIndicator);
                displayAiContent(contentSpan, cursorSpan, tt('aiNetworkError'));
            }
        };

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });

        // 监听语言切换，刷新 chat 占位符
        document.addEventListener('lang:changed', () => {
            if (chatInput) chatInput.placeholder = tt('chatInput');
        });

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
    }
})();