import re


def clean_text(text: str) -> str:
    """Normalize raw text: strip noise, collapse whitespace, remove non-printable chars."""
    # Remove non-printable characters
    text = re.sub(r"[^\x09\x0A\x0D\x20-\x7E -￿]", " ", text)
    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse runs of spaces/tabs on the same line
    text = re.sub(r"[ \t]+", " ", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(lines).strip()
