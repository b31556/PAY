import fastapi
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import auth
import os
from fastapi.templating import Jinja2Templates
from fastapi.encoders import jsonable_encoder
from typing import Dict
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

import auth

app = APIRouter()

templates = Jinja2Templates(directory="templates/auth")
app.mount("/static", fastapi.staticfiles.StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def login(request: Request):
    """
    Render the login page.
    """
    return fastapi.responses.RedirectResponse(url="/auth/login")



@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    
    return templates.TemplateResponse("login.html", {"request": request})



@app.get("/login/ve", response_class=HTMLResponse)
async def login_page(request: Request):
    
    return templates.TemplateResponse("loginhack.html", {"request": request})


