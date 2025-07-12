from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.responses import FileResponse
import fastapi.staticfiles
from typing import Dict
import os
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, constr
import fastapi
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.encoders import jsonable_encoder
import auth

app = APIRouter()

templates = Jinja2Templates(directory="templates")
app.mount("/static", fastapi.staticfiles.StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    """
    Render the main page.
    """
    return templates.TemplateResponse("index.html", {"request": {}})

def get_valid_user_from_cookie(request: Request):
    session_token = request.cookies.get("session_token")
    
    user=auth.valid_sessiontoken(session_token)
    if not session_token or not user:
        raise HTTPException(
            status_code=302,
            headers={"Location": "/auth/login"}
        )
    
    return user

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user=Depends(get_valid_user_from_cookie)):
    """
    Render the dashboard page.
    """
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})