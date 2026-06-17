"""Summarize lịch sử + Rewrite prompt hiện tại (stream) bằng gpt-4o-mini (128k context)."""

from __future__ import annotations

from typing import AsyncIterator

from openai import AsyncOpenAI

from config import OPENAI_API_KEY, OPENAI_CHAT_MODEL


SYSTEM_SUMMARIZE = """Bạn là chuyên gia tóm tắt hội thoại. Nhiệm vụ: nhận lịch sử chat
giữa user và assistant, trả về MỘT đoạn văn bản TÓM TẮT NGẮN GỌN (dưới 200 từ)
gồm: chủ đề user đang quan tâm, thông tin đã trao đổi, trạng thái hội thoại.
CHỈ trả về đoạn tóm tắt, KHÔNG thêm lời dẫn."""


SYSTEM_REWRITE = """Bạn là chuyên gia viết lại prompt cho chatbot tư vấn supplement (ProFit).
Nhiệm vụ: nhận lịch sử đã tóm tắt + câu hỏi mới nhất của user, viết lại thành MỘT prompt
dài, rõ ràng, tự chứa:

1. THAM CHIẾU RÕ: thay đại từ ("nó", "cái đó", "thế còn", "bao nhiêu") bằng nội dung
   cụ thể từ lịch sử tóm tắt.
2. MỞ RỘNG: thêm chi tiết ngữ cảnh, nhu cầu, ràng buộc (giá, mục tiêu tập, sức khỏe...)
   nếu user đã đề cập hoặc suy luận được từ lịch sử.
3. SẠCH: bỏ lời chào, icon, viết tắt gây nhiễu; giữ 1 câu hỏi trọng tâm.

QUY TẮC:
- KHÔNG bịa thông tin user chưa đề cập.
- KHÔNG trả lời câu hỏi, chỉ viết lại prompt.
- KHÔNG thêm tiền tố, chỉ trả về bản prompt đã viết lại bằng tiếng Việt.
- Nếu câu đã rõ ràng và độc lập, trả về nguyên văn.
- NÊN dài hơn câu gốc (1-3 câu), thêm ngữ cảnh phong phú hơn."""


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return _client


async def summarize_history(history: list[dict]) -> str:
    """Nén lịch sử hội thoại thành 1 đoạn tóm tắt ngắn (non-stream, dùng để feed cho rewrite)."""
    if not history:
        return "(cuộc trò chuyện mới, chưa có lịch sử)"

    lines = []
    for t in history:
        if t.get("role") == "user":
            lines.append(f"User: {t.get('content', '')}")
        elif t.get("role") == "assistant":
            lines.append(f"Assistant: {t.get('content', '')}")

    conversation = "\n".join(lines) if lines else "(trống)"

    resp = await _get_client().chat.completions.create(
        model=OPENAI_CHAT_MODEL,
        temperature=0.0,
        max_tokens=300,
        messages=[
            {"role": "system", "content": SYSTEM_SUMMARIZE},
            {"role": "user", "content": f"LỊCH SỬ HỘI THOẠI:\n{conversation}"},
        ],
    )
    return (resp.choices[0].message.content or "").strip()


async def stream_rewrite_prompt(current_prompt: str, summary: str) -> AsyncIterator[str]:
    """Stream phiên bản viết lại của prompt hiện tại, từng token từ model.stream()."""
    stream = await _get_client().chat.completions.create(
        model=OPENAI_CHAT_MODEL,
        temperature=0.0,
        max_tokens=600,
        stream=True,
        messages=[
            {"role": "system", "content": SYSTEM_REWRITE},
            {
                "role": "user",
                "content": f"LỊCH SỬ ĐÃ TÓM TẮT:\n{summary}\n\n"
                f"CÂU HỎI MỚI NHẤT CỦA USER:\n{current_prompt}",
            },
        ],
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        token = getattr(delta, "content", None)
        if token:
            yield token