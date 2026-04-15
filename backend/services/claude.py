import os
import anthropic
from services.prompt_builder import build_system_prompt

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Bots that have a full config.yaml — use prompt builder
CONFIG_BOTS = ["store"]

def get_system_prompt(bot: str) -> str:
    if bot in CONFIG_BOTS:
        return build_system_prompt(bot)
    # Fallback to legacy .txt file for bots not yet migrated
    path = os.path.join(os.path.dirname(__file__), f"../prompts/{bot}.txt")
    with open(os.path.abspath(path), "r") as f:
        return f.read()


def get_claude_response(bot: str, messages: list) -> str:
    system_prompt = get_system_prompt(bot)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages
    )

    return response.content[0].text
