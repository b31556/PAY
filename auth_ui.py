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



@app.get("/step2", response_class=HTMLResponse)
async def step2_page(request: Request):
    """ Render the second step of the login process.
    """
    user= auth.valid_sessiontoken(request.cookies.get("session_token"))
    if user:
        return fastapi.responses.RedirectResponse(url="/app/dashboard")
    user= auth.valid_sessiontoken(request.cookies.get("session_step1"), type="session_step1")
    if user:
        return templates.TemplateResponse("step2.html", {"request": request, "user": user})
    else:
        return fastapi.responses.RedirectResponse(url="/auth/login", status_code=302)


@app.get("/logout", response_class=HTMLResponse)
async def logout(request: Request):
    """ Log out the user and redirect to the login page.
    """
    sestoken = request.cookies.get("session_token")
    if not sestoken:
        return fastapi.responses.RedirectResponse(url="/auth/login", status_code=302)
    ses = auth.valid_sessiontoken(sestoken)
    if not ses:
        return fastapi.responses.RedirectResponse(url="/auth/login", status_code=302)
    auth.delete_sessiontoken(sestoken)
    response = RedirectResponse(url="/auth/login", status_code=302)
    response.delete_cookie("session_token")
    response.delete_cookie("session_step1")
    return response
    
    