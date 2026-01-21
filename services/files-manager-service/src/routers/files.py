import uuid
from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user_id
from ..config import settings
from ..schemas import (
    FileInitRequest, FileInitResponse,
    FileDownloadResponse, FileAttachRequest,
    FileCompleteResponse, FilePublic
)
from .. import models
from ..s3 import presigned_put_url, presigned_get_url, delete_object
from ..db import get_conn  # ✅ faltava

router = APIRouter(prefix="/files", tags=["files"])


def _allowed_content_types() -> set[str]:
    return {x.strip() for x in settings.ALLOWED_CONTENT_TYPES.split(",") if x.strip()}


def _to_public(row: dict) -> FilePublic:
    return FilePublic(**row)


@router.get("/health")
def health():
    return {"ok": True, "service": "files-manager"}


@router.post("/init", response_model=FileInitResponse)
def init_upload(
    body: FileInitRequest,
    user_id: str = Depends(get_current_user_id),
):
    if body.sizeBytes > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    allowed = _allowed_content_types()
    if allowed and body.contentType not in allowed:
        raise HTTPException(status_code=415, detail="Unsupported content type")

    file_uuid = str(uuid.uuid4())
    object_key = f"users/{user_id}/{file_uuid}"

    row = models.insert_file(
        owner_user_id=user_id,
        original_name=body.originalName,
        content_type=body.contentType,
        size_bytes=body.sizeBytes,
        object_key=object_key,
    )

    upload_url = presigned_put_url(object_key=object_key, content_type=body.contentType)

    return FileInitResponse(
        fileId=row["id"],
        objectKey=object_key,
        uploadUrl=upload_url,
        expiresInSeconds=settings.PRESIGNED_EXPIRES_SECONDS,
    )


@router.post("/{file_id}/complete", response_model=FileCompleteResponse)
def complete_upload(
    file_id: str,
    user_id: str = Depends(get_current_user_id),
):
    row = models.get_file(file_id)
    if not row or row["status"] == "DELETED":
        raise HTTPException(status_code=404, detail="File not found")

    if str(row["owner_user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = models.set_file_ready(file_id)
    if not updated:
        raise HTTPException(status_code=404, detail="File not found")

    return FileCompleteResponse(file=_to_public(updated))


@router.post("/{file_id}/attach", response_model=FileCompleteResponse)
def attach_to_project(
    file_id: str,
    body: FileAttachRequest,
    user_id: str = Depends(get_current_user_id),
):
    row = models.get_file(file_id)
    if not row or row["status"] != "READY":
        raise HTTPException(status_code=400, detail="File must be READY to attach")

    if str(row["owner_user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        updated = models.attach_file_to_project(file_id=file_id, project_id=body.projectId)
    except Exception:
        raise HTTPException(status_code=409, detail="Project already has a file")

    return FileCompleteResponse(file=_to_public(updated))


@router.get("/{file_id}/download", response_model=FileDownloadResponse)
def download(
    file_id: str,
    user_id: str = Depends(get_current_user_id),  # ✅ qualquer autenticado
):
    row = models.get_file(file_id)
    if not row or row["status"] != "READY":
        raise HTTPException(status_code=404, detail="File not found")

    url = presigned_get_url(row["object_key"])
    return FileDownloadResponse(
        file=_to_public(row),
        downloadUrl=url,
        expiresInSeconds=settings.PRESIGNED_EXPIRES_SECONDS,
    )


@router.get("/by-project/{project_id}")
def get_by_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),  # ✅ qualquer autenticado
):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM files WHERE project_id=%s AND status='READY' LIMIT 1",
                (project_id,),
            )
            row = cur.fetchone()

    return {"fileId": row["id"] if row else None}


@router.delete("/{file_id}")
def delete(
    file_id: str,
    user_id: str = Depends(get_current_user_id),
):
    row = models.get_file(file_id)
    if not row or row["status"] == "DELETED":
        raise HTTPException(status_code=404, detail="File not found")

    if str(row["owner_user_id"]) != str(user_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    delete_object(row["object_key"])
    models.mark_file_deleted(file_id)
    return {"status": "deleted"}

