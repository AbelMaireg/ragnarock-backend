from io import BytesIO
from fastapi import UploadFile, HTTPException
from app.tools.cleaner import clean_text

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


async def parse_file(file: UploadFile) -> str:
    """Read an uploaded file and return cleaned plain text."""
    raw_bytes = await file.read()
    return parse_file_bytes(
        filename=file.filename,
        content_type=file.content_type,
        raw_bytes=raw_bytes,
    )


def parse_file_bytes(
    filename: str | None,
    content_type: str | None,
    raw_bytes: bytes,
) -> str:
    """Parse uploaded file bytes and return cleaned plain text."""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. "
                   "Accepted: PDF, DOCX, TXT.",
        )

    if len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit.")

    if content_type == "application/pdf":
        return clean_text(_extract_pdf(raw_bytes))

    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return clean_text(_extract_docx(raw_bytes))

    # plain text
    return clean_text(raw_bytes.decode("utf-8", errors="replace"))


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(data: bytes) -> str:
    from docx import Document
    doc = Document(BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)
