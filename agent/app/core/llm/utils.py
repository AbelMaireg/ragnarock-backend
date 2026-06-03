def strip_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` markdown fences LLMs wrap responses in."""
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        inner = lines[1:] if lines[0].startswith("```") else lines
        if inner and inner[-1].strip() == "```":
            inner = inner[:-1]
        return "\n".join(inner).strip()
    return stripped
