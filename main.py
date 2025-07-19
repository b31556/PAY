import random
from datetime import datetime
import qrcode
import os
from io import BytesIO
from fastapi import FastAPI, HTTPException
import fastapi
from fastapi.responses import StreamingResponse
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.encoders import jsonable_encoder
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocketDisconnect


from models import Base, User, Transaction, Card, AccessToken, OtpSecret

import auth

from config import PORT, URL, DATABASE

import core

import ui

import auth_ui

templates = Jinja2Templates(directory="templates")
app = FastAPI()

app.mount("/static", fastapi.staticfiles.StaticFiles(directory="static"), name="static")

app.include_router(auth.app, prefix="/api/auth", tags=["auth"])
app.include_router(core.app, prefix="/api/core", tags=["core"])
app.include_router(ui.app, prefix="/app", tags=["ui"])
app.include_router(auth_ui.app, prefix="/auth", tags=["auth_ui"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://preview--aura-money-dashboard.lovable.app/"],  # 👈 must match Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/favicon.ico")
def favicon():
    return fastapi.responses.FileResponse("static/favicon.ico")

@app.get("/", response_class=HTMLResponse)
async def root(request: fastapi.Request):
    """
    Render the main page.
    """
    return fastapi.responses.RedirectResponse(url="/app/dashboard")

import threading

if __name__ == "__main__":
    # Start FastAPI server in a separate thread
    import uvicorn
    threading.Thread(target=lambda: uvicorn.run(app, host='0.0.0.0', port=int(PORT))).start()
    print(f"Server running at {URL} on port {PORT}")

    # Keep the main thread alive
    while True:
        pass

