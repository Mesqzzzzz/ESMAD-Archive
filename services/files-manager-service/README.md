# files-manager-service (FastAPI)

## Endpoints

- GET /health
- POST /files/init
- POST /files/{id}/complete
- POST /files/{id}/attach
- GET /files/{id}/download
- DELETE /files/{id}

## Fluxo recomendado

1. POST /files/init -> devolve presigned PUT
2. Browser faz PUT (upload direto ao MinIO)
3. POST /files/{id}/complete
4. POST /files/{id}/attach (projectId)

## DB

Executa sql/001_create_files_table.sql na BD esmad.

## ENV

Usar .env.example como base.
