import os
import yaml


def _load_yaml(bot: str, filename: str) -> dict:
    base = os.path.dirname(__file__)
    path = os.path.abspath(os.path.join(base, f"../clients/{bot}/{filename}"))
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        return yaml.safe_load(f) or {}


def load_config(bot: str) -> dict:
    return _load_yaml(bot, "config.yaml")


def load_operations(bot: str) -> dict:
    return _load_yaml(bot, "operations.yaml")


def load_catalog(bot: str) -> dict:
    return _load_yaml(bot, "catalog.yaml")


def build_system_prompt(bot: str) -> str:
    cfg  = load_config(bot)
    ops  = load_operations(bot)
    cat  = load_catalog(bot)

    biz        = cfg.get("business", {})
    bot_cfg    = cfg.get("bot", {})
    voice      = cfg.get("brand_voice", {})
    escalation = cfg.get("escalation", {})

    hours      = ops.get("hours", {})
    delivery   = ops.get("delivery", {})
    payment    = ops.get("payment", {})
    policies   = ops.get("policies", {})
    order_flow = ops.get("order_flow", {})
    faqs       = ops.get("static_faqs", [])

    skin_guide = cat.get("skin_type_guide", {})
    categories = cat.get("categories", {})
    promos     = [p for p in cat.get("promos", []) if p.get("active")]

    lines = []

    # ── Identity ──────────────────────────────────────────────
    lines += [
        f"You are {bot_cfg.get('name')}, the AI assistant for {biz.get('name')} — {biz.get('tagline', '')}.",
        "",
    ]

    # ── Personality ───────────────────────────────────────────
    lines += ["YOUR PERSONALITY"]
    lines.append(f"- {voice.get('personality', '')}")
    lines.append(f"- Style: {voice.get('style', '')}")
    lines.append(f"- Language: {voice.get('language', '')}")
    if voice.get("use_po"):
        lines.append('- Use "po" occasionally for warmth, but don\'t overdo it.')
    lines.append(f"- Emoji usage: {voice.get('emoji_usage', 'minimal')}")
    lines.append("")

    if voice.get("do"):
        lines.append("ALWAYS:")
        for item in voice["do"]:
            lines.append(f"- {item}")
        lines.append("")

    if voice.get("dont"):
        lines.append("NEVER:")
        for item in voice["dont"]:
            lines.append(f"- {item}")
        lines.append("")

    phrases = voice.get("sample_phrases", {})
    if phrases:
        lines.append("SAMPLE PHRASES (match this tone exactly):")
        for examples in phrases.values():
            for ex in examples:
                lines.append(f'  "{ex}"')
        lines.append("")

    # ── Business info ─────────────────────────────────────────
    lines.append("BUSINESS INFO")
    lines.append(f"- Name: {biz.get('name')}")
    contact = biz.get("contact", {})
    for platform, handle in contact.items():
        lines.append(f"- {platform.capitalize()}: {handle}")
    lines.append("")

    # ── Hours ─────────────────────────────────────────────────
    if hours:
        lines.append("OPERATING HOURS")
        for key, val in hours.items():
            lines.append(f"- {val}")
        lines.append("")

    # ── Delivery ──────────────────────────────────────────────
    if delivery:
        lines.append("DELIVERY")
        if delivery.get("available"):
            couriers = ", ".join(delivery.get("couriers", []))
            lines.append(f"- Couriers: {couriers}")
            lines.append(f"- Fee: ₱{delivery.get('fee')}. Free for orders ₱{delivery.get('free_threshold')}+")
            lines.append(f"- Metro Manila: {delivery.get('metro_manila_days')}")
            lines.append(f"- Provincial: {delivery.get('provincial_days')}")
            if delivery.get("tracking"):
                lines.append(f"- Tracking: {delivery['tracking']}")
            if delivery.get("non_serviceable"):
                lines.append(f"- {delivery['non_serviceable']}")
        else:
            lines.append("- Delivery not available.")
        lines.append("")

    # ── Payment ───────────────────────────────────────────────
    if payment:
        methods = payment.get("methods", [])
        lines.append(f"PAYMENT METHODS: {', '.join(methods)}")
        lines.append("")
        instructions = payment.get("instructions", {})
        if instructions:
            lines.append("PAYMENT INSTRUCTIONS (share after order is confirmed)")
            for method, details in instructions.items():
                if isinstance(details, dict):
                    lines.append(f"- {method.upper()}: {details.get('instruction', '')}")
                else:
                    lines.append(f"- {method.upper()}: {details}")
            lines.append("")

    # ── Policies ──────────────────────────────────────────────
    if policies:
        lines.append("POLICIES")
        for key, val in policies.items():
            lines.append(f"- {key.replace('_', ' ').title()}: {val}")
        lines.append("")

    # ── Active promos ─────────────────────────────────────────
    if promos:
        lines.append("ACTIVE PROMOS (mention these when relevant)")
        for p in promos:
            lines.append(f"- {p['name']}: {p['description']}")
        lines.append("")

    # ── Skin type guide ───────────────────────────────────────
    if skin_guide:
        lines.append("SKIN TYPE GUIDE (use this to recommend products)")
        for skin_type, products in skin_guide.items():
            lines.append(f"- {skin_type.replace('_', ' ').title()}: {', '.join(products)}")
        lines.append("")

    # ── Product catalog ───────────────────────────────────────
    lines.append("PRODUCT CATALOG")
    for category, products in categories.items():
        active = [p for p in products if p.get("active", True)]
        if not active:
            continue
        lines.append(f"\n{category.upper()}")
        for p in active:
            bestseller = " ⭐ Bestseller" if p.get("bestseller") else ""
            variants_str = ""
            if p.get("variants"):
                variants_str = f" | Variants: {', '.join(p['variants'])}"
            lines.append(f"- {p['name']} — ₱{p['price']}{bestseller}{variants_str}")
            lines.append(f"  {p['description']}")
    lines.append("")

    # ── Static FAQs ───────────────────────────────────────────
    if faqs:
        lines.append("FREQUENTLY ASKED QUESTIONS")
        for faq in faqs:
            lines.append(f"Q: {faq['q']}")
            lines.append(f"A: {faq['a']}")
            lines.append("")

    # ── Order flow ────────────────────────────────────────────
    lines.append("TAKING ORDERS")
    lines.append("Collect these details one at a time — never ask for everything at once:")
    for field in order_flow.get("required_fields", []):
        lines.append(f"  - {field}")
    lines.append("")
    lines.append("Once you have everything, confirm the full order back to the customer clearly.")
    lines.append("When they confirm, send a warm closing message AND append this block at the end (silently processed):")
    lines.append("")
    lines.append('[ORDER_CONFIRMED]{"customer_name":"<name>","contact":"<number>","items":[{"name":"<product>","variant":"<shade or n/a>","qty":<number>,"price":<price>}],"delivery_address":"<address>","payment_method":"<method>","subtotal":<total>}[/ORDER_CONFIRMED]')
    lines.append("")
    lines.append("Only output this block after the customer has explicitly confirmed.")
    lines.append("")

    # ── Escalation ────────────────────────────────────────────
    lines.append("WHEN TO ESCALATE TO A HUMAN")
    lines.append(f'Fallback message to use: "{escalation.get("fallback_message", "")}"')
    lines.append("Escalate when:")
    for trigger in escalation.get("triggers", []):
        lines.append(f"- {trigger}")
    lines.append('When escalating, append: [ESCALATION_NEEDED]{"reason":"<brief reason>"}[/ESCALATION_NEEDED]')

    return "\n".join(lines)
