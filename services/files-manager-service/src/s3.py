# src/s3.py
import boto3
from botocore.exceptions import ClientError
from .config import settings


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_INTERNAL,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


def _publicize(url: str) -> str:
    """Troca o endpoint interno (minio:9000) pelo público (localhost:9000) se existir."""
    endpoint_internal = settings.S3_ENDPOINT_INTERNAL
    endpoint_public = settings.S3_PUBLIC_ENDPOINT or endpoint_internal
    return url.replace(endpoint_internal, endpoint_public)


def ensure_bucket_exists():
    s3 = s3_client()
    bucket = settings.S3_BUCKET

    try:
        s3.head_bucket(Bucket=bucket)
        return
    except ClientError as e:
        # 404 => bucket não existe; outros erros devem rebentar para veres no log
        status = e.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if status not in (404, 403):
            raise

    # MinIO geralmente não precisa LocationConstraint, e às vezes até falha se meteres
    s3.create_bucket(Bucket=bucket)


def presigned_put_url(object_key: str, content_type: str):
    s3 = s3_client()
    url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=settings.PRESIGNED_EXPIRES_SECONDS,
    )
    return _publicize(url)


def presigned_get_url(object_key: str):
    s3 = s3_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": object_key,
        },
        ExpiresIn=settings.PRESIGNED_EXPIRES_SECONDS,
    )
    return _publicize(url)


def delete_object(object_key: str):
    s3 = s3_client()
    s3.delete_object(Bucket=settings.S3_BUCKET, Key=object_key)
