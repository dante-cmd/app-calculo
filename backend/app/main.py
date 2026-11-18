from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import analytics, operaciones, upload

app = FastAPI(title="Análisis de Cartera de Factoring")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(operaciones.router, prefix="/api", tags=["operaciones"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])


@app.on_event("startup")
def crear_tablas():
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok"}
