from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class FileInitRequest(BaseModel):
    originalName: str = Field(min_length=1, max_length=255)
    contentType: str = Field(min_length=1, max_length=120)
    sizeBytes: int = Field(ge=0)


class FileInitResponse(BaseModel):
    fileId: UUID
    objectKey: str
    uploadUrl: str
    expiresInSeconds: int


class FilePublic(BaseModel):
    id: UUID
    owner_user_id: str

    # 🔧 project_id é INTEGER (alinhado com projects.id)
    project_id: Optional[int] = None

    original_name: str
    content_type: str
    size_bytes: int
    status: str


class FileDownloadResponse(BaseModel):
    file: FilePublic
    downloadUrl: str
    expiresInSeconds: int


class FileAttachRequest(BaseModel):
    # 🔧 projectId agora é INT
    projectId: int


class FileCompleteResponse(BaseModel):
    file: FilePublic
