from fastapi import FastAPI
from .routers.health import router as health_router
from .routers.files import router as files_router
from .s3 import ensure_bucket_exists
from .mq import mq_init

app = FastAPI(title="Files Manager Service", version="1.0.0")

@app.on_event("startup")
async def on_startup():
    ensure_bucket_exists()
    await mq_init()

app.include_router(health_router)
app.include_router(files_router)
