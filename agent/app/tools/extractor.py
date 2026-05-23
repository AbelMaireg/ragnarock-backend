import httpx
from fastapi import HTTPException
from bs4 import BeautifulSoup
from app.tools.cleaner import clean_text

TIMEOUT = 10  # seconds
MAX_CONTENT_BYTES = 2 * 1024 * 1024  # 2 MB cap on fetched HTML


async def extract_url(url: str) -> str:
    """Fetch a public URL, strip HTML, return cleaned plain text."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=400,
            detail="URL request timed out. Please paste the content as text instead.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=400,
            detail=f"URL returned HTTP {e.response.status_code}. "
                   "Please paste the content as text instead.",
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not reach the URL. Please paste the content as text instead.",
        )

    raw_html = response.text[:MAX_CONTENT_BYTES]
    soup = BeautifulSoup(raw_html, "html.parser")

    # Remove script, style, nav, footer noise
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    return clean_text(text)
