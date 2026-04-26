"""Claude-based think-aloud generator.

Replaces the original gpt-4-vision-preview implementation. Uses Anthropic's
prompt caching on the static few-shot block so the 8 example screenshots are
not re-uploaded every call.
"""
import base64
import os
from functools import lru_cache
from pathlib import Path
from typing import List

from anthropic import Anthropic

from .. import config

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

_FEW_SHOT_FILES = [f"{i}.jpg" for i in range(1, 9)]

_SYSTEM_PROMPT = "You are a subject doing UI usability testing."

_FEW_SHOT_TEXT = (
    "You are a subject doing UI usability testing. The images record the "
    "pages you pass through during the operation. For each step jump, "
    "think aloud and tag your [emotion] as positive, negative, or neutral.\n\n"
    "Heuristics:\n"
    "- Loading screens cannot be analyzed alone.\n"
    "- positive: a jump matches expectation.\n"
    "- neutral: exploring or learning.\n"
    "- negative: lots of exploration without finding the goal.\n\n"
    "Example A — Task: Check my ranking in the user group.\n"
    "Page flow: [pic1, pic2, pic3, pic4, pic5].\n"
    "Think aloud:\n"
    "<pic1-pic2-pic3> No word similar to 'User group' on the first page, "
    "so I tried jumping to a new interface. On the new page the term 'Run "
    "user Group' appeared, matching expectation.[positive]\n"
    "<pic3-pic4-pic5> Tapped the target button, performed the jump, and "
    "saw the expected ranking.[positive]\n\n"
    "Example B — Task: Create a quick meeting.\n"
    "Page flow: [pic6, pic7, pic8].\n"
    "Think aloud:\n"
    "<pic6-pic7> 'Quick meeting' appeared on the first page, matching "
    "expectation. Tapped the target button to jump.[positive]\n"
    "<pic7-pic8> Reached the quick-meeting page; tapping 'Enter Meeting' "
    "completes the task.[positive]"
)


@lru_cache(maxsize=1)
def _client() -> Anthropic:
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in."
        )
    return Anthropic()


@lru_cache(maxsize=1)
def _few_shot_image_blocks() -> tuple:
    """Return a tuple of image content blocks for the static few-shot examples."""
    blocks = []
    for fname in _FEW_SHOT_FILES:
        path: Path = config.FEW_SHOT_DIR / fname
        if not path.exists():
            raise FileNotFoundError(f"Missing few-shot example: {path}")
        data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
        blocks.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": data},
        })
    return tuple(blocks)


def _decorate(text: str) -> str:
    """Map sentinel tags to emoji + angle-bracket-friendly markup, like the original."""
    text = text.replace("<", "[").replace(">", "]")
    text = (
        text.replace("[positive]", "&#x1F604;")
        .replace("[negative]", "&#x1F622;")
        .replace("[neutral]", "&#x1F611;")
    )
    return text


def _user_block(scenario: str, image_b64_list: List[str]) -> dict:
    pic_names = [f"pic{i + 1}" for i in range(len(image_b64_list))]
    body: List[dict] = [{
        "type": "text",
        "text": (
            f"Now here is your test:\nTask scenario: {scenario}.\n"
            f"Process page flow: {pic_names}\n"
            "Please do not provide concluding remarks in the last paragraph."
        ),
    }]
    for b64 in image_b64_list:
        body.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
        })
    return {"role": "user", "content": body}


def think_aloud(image_b64_list: List[str], scenario: str) -> str:
    """Generate a think-aloud narration for a sequence of workflow screenshots."""
    client = _client()

    few_shot_content: List[dict] = [{"type": "text", "text": _FEW_SHOT_TEXT}]
    few_shot_content.extend(_few_shot_image_blocks())
    # Cache the entire static few-shot block so we don't re-upload 8 images per call.
    few_shot_content[-1] = {**few_shot_content[-1], "cache_control": {"type": "ephemeral"}}

    messages = [
        {"role": "user", "content": few_shot_content},
        {"role": "assistant", "content": "Understood. Send me the next task and I will narrate the think-aloud in the same format."},
        _user_block(scenario, image_b64_list),
    ]

    resp = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        messages=messages,
    )

    text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
    print(f"[claude] usage: {resp.usage}")
    return _decorate(text)
