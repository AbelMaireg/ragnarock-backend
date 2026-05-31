import os
import asyncio
import tempfile
import pytest

from fastapi import HTTPException

from app.tools.parser import parse_file_bytes, MAX_FILE_BYTES
from app.services.upload_storage import load_upload_bytes
from app.core.config import get_settings


def test_parse_plain_text_ok():
    text = b"Hello World"
    out = parse_file_bytes("hello.txt", "text/plain", text)
    assert "Hello World" in out


def test_parse_unsupported_type_raises():
    with pytest.raises(HTTPException) as ei:
        parse_file_bytes("bin.exe", "application/octet-stream", b"\x00\x01")
    assert ei.value.status_code == 400


def test_parse_too_large_raises():
    big = b"x" * (MAX_FILE_BYTES + 1)
    with pytest.raises(HTTPException) as ei:
        parse_file_bytes("big.txt", "text/plain", big)
    assert ei.value.status_code == 413


@pytest.mark.asyncio
async def test_load_upload_bytes_file_scheme(tmp_path):
    # create a temp file
    p = tmp_path / "upload.txt"
    p.write_text("abcd")

    class Q:
        location = f"file://{p}"
        key = "upload.txt"

    data = await load_upload_bytes(Q())
    assert data == b"abcd"


@pytest.mark.asyncio
async def test_load_upload_bytes_local_root(tmp_path, monkeypatch):
    # create local root and file
    root = tmp_path / "root"
    root.mkdir()
    p = root / "k.txt"
    p.write_text("xyz")

    class Q:
        location = "k.txt"
        key = "k.txt"

    settings = get_settings()
    settings.ai_upload_local_root = str(root)

    data = await load_upload_bytes(Q())
    assert data == b"xyz"
