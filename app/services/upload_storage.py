import asyncio
from pathlib import Path
from urllib.parse import urlparse

from app.core.config import get_settings
from app.schemas.queue import QueuedUpload


async def load_upload_bytes(upload: QueuedUpload) -> bytes:
    if upload.location.startswith("s3://"):
        return await _load_s3_location(upload.location)

    if upload.location.startswith("file://"):
        return await _read_local_path(Path(urlparse(upload.location).path))

    location_path = Path(upload.location)
    if location_path.is_absolute():
        return await _read_local_path(location_path)

    settings = get_settings()
    if settings.ai_upload_local_root:
        return await _read_local_path(Path(settings.ai_upload_local_root) / upload.key)

    if settings.ai_upload_s3_bucket:
        return await _load_s3_object(settings.ai_upload_s3_bucket, upload.key)

    return await _read_local_path(location_path)


async def _read_local_path(path: Path) -> bytes:
    return await asyncio.to_thread(path.read_bytes)


async def _load_s3_location(location: str) -> bytes:
    parsed = urlparse(location)
    if not parsed.netloc:
        raise ValueError(f"Invalid S3 upload location: {location}")

    key = parsed.path.lstrip("/")
    return await _load_s3_object(parsed.netloc, key)


async def _load_s3_object(bucket: str, key: str) -> bytes:
    return await asyncio.to_thread(_load_s3_object_sync, bucket, key)


def _load_s3_object_sync(bucket: str, key: str) -> bytes:
    import boto3

    settings = get_settings()
    client_kwargs: dict[str, str] = {
        "region_name": settings.ai_upload_s3_region,
    }

    if settings.ai_upload_s3_endpoint_url:
        client_kwargs["endpoint_url"] = settings.ai_upload_s3_endpoint_url

    if settings.ai_upload_s3_access_key_id and settings.ai_upload_s3_secret_access_key:
        client_kwargs["aws_access_key_id"] = settings.ai_upload_s3_access_key_id
        client_kwargs["aws_secret_access_key"] = settings.ai_upload_s3_secret_access_key

    client = boto3.client("s3", **client_kwargs)
    response = client.get_object(Bucket=bucket, Key=key)
    body = response["Body"]
    return body.read()
