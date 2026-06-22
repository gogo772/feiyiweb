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

    function highlightKeywords(text) {
        const keywords = [
            '京剧', '昆曲', '越剧', '黄梅戏', '豫剧', '川剧', '秦腔', '粤剧', '评剧',
            '皮影戏', '木偶戏', '剪纸', '刺绣', '陶瓷', '书法', '古琴', '太极拳',
            '非遗', '非物质文化遗产', '脸谱', '变脸', '傩戏', '花鼓戏', '二人转',
            '《贵妃醉酒》', '《牡丹亭》', '《天仙配》', '《梁祝》', '生旦净末丑'
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
                <div class="message-sender">您</div>
                <div class="message-bubble">${escapeHtml(text)}</div>
            `;
            chatBody.appendChild(msgDiv);
            scrollToBottom();
        }

        function createAiMessage() {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message ai';
            msgDiv.innerHTML = `
                <div class="message-sender">菲菲</div>
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
            thinkDiv.innerHTML = `<span class="thinking-text">📖 菲菲正在查典籍</span><span class="dot-1">.</span><span class="dot-2">.</span><span class="dot-3">.</span>`;
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
                const response = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await response.json();

                removeThinkingIndicator(thinkingIndicator);

                if (data.success) {
                    let replyText = data.reply || '（没有返回内容）';
                    replyText = replyText.replace(/\n/g, '<br>');
                    const highlightedText = highlightKeywords(replyText);
                    displayAiContent(contentSpan, cursorSpan, highlightedText, data.imageUrl);
                } else {
                    displayAiContent(contentSpan, cursorSpan, '抱歉，菲菲暂时听不到你说的话：' + escapeHtml(data.error || '未知错误'));
                }
            } catch (err) {
                console.error(err);
                removeThinkingIndicator(thinkingIndicator);
                displayAiContent(contentSpan, cursorSpan, '网络连接错误，请确保后端服务已启动（node proxy-server.js）');
            }
        };

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
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