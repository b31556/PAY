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

from database import db_session
from models import User, Transaction, Card, AccessToken, OtpSecret, Session
from config import URL, PORT, DATABASE, SESSION_TIMEOUT, STEP1_TIMEOUT

from encrpt import process_response, process_request, RequestContext

app = APIRouter()

templates = Jinja2Templates(directory="templates")
app.mount("/static", fastapi.staticfiles.StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    """
    Render the main page.
    """
    return templates.TemplateResponse("index.html", {"request": {}})


@app.post("/dashboard")
async def dashboard(ctx: RequestContext = Depends(process_request), request: Request = fastapi.Request):
    """
    Render the dashboard page.
    """
    ctx

    html_content = templates.get_template("dashboard.html").render(request=request)
    
    with open("templates/styles.css", "r") as f:
        css_content = f.read()

    with open("templates/dashboard.js", "r") as f:
        js_content = f.read()

    with open("templates/banking-api.js", "r") as f:
        banking_api_content = f.read()

    return process_response(
        {
            "html": html_content,
            "style": css_content,
            "scripts": [banking_api_content, js_content],
            "title": "Dashboard",
            "code": 200
        },
        ctx
    )
    

@app.post("/accounts")
async def accounts(ctx: RequestContext = Depends(process_request), request: Request = fastapi.Request):
    """
    Render the accounts page.
    """
    ctx

    html_content = templates.get_template("accounts.html").render(request=request)

    with open("templates/styles.css", "r") as f:
        css_content = f.read()

    with open("templates/accounts.js", "r") as f:
        js_content = f.read()

    with open("templates/banking-api.js", "r") as f:
        banking_api_content = f.read()

    return process_response(
        {
            "html": html_content,
            "style": css_content,
            "scripts": [banking_api_content, js_content],
            "title": "Accounts",
            "code": 200
        },
        ctx
    )

@app.post("/transactions")
async def transactions(ctx: RequestContext = Depends(process_request), request: Request = fastapi.Request):
    """
    Render the transactions page.
    """
    ctx

    html_content = templates.get_template("transactions.html").render(request=request)

    with open("templates/styles.css", "r") as f:
        css_content = f.read()

    with open("templates/transactions.js", "r") as f:
        js_content = f.read()

    with open("templates/banking-api.js", "r") as f:
        banking_api_content = f.read()

    return process_response(
        {
            "html": html_content,
            "style": css_content,
            "scripts": [banking_api_content, js_content],
            "title": "Transactions",
            "code": 200
        },
        ctx
    )


@app.post("/transfer")
async def transfer(ctx: RequestContext = Depends(process_request), request: Request = fastapi.Request):
    """
    Render the transfer page.
    """
    ctx

    html_content = templates.get_template("transfer.html").render(request=request)

    with open("templates/styles.css", "r", encoding="utf-8") as f:
        css_content = f.read()

    with open("templates/transfer.js", "r", encoding="utf-8") as f:
        js_content = f.read()

    with open("templates/banking-api.js", "r", encoding="utf-8") as f:
        banking_api_content = f.read()

    return process_response(
        {
            "html": html_content,
            "style": css_content,
            "scripts": [banking_api_content, js_content],
            "title": "Transfer",
            "code": 200
        },
        ctx
    )