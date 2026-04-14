import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def load_prompt(bot: str) -> str:
    path = os.path.join(os.path.dirname(__file__), f"../prompts/{bot}.txt")
    with open(os.path.abspath(path), "r") as f:
        return f.read()

def get_claude_response(bot: str, messages: list) -> str:
    system_prompt = load_prompt(bot)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system_prompt,
        messages=messages
    )

    return response.content[0].text
