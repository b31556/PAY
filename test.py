from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

app = FastAPI()

# THIS NEEDS TO BE ASYNC IF YOU PLAN TO READ THE BODY
async def decrypt_payload(request: Request) -> dict:
    # Simulate decrypting something from the body (replace with real logic)
    # For now just mocking
    return {
        "decrypted_data": str(request.url),
        "secret_code": "example",
        "value": 42
    }

@app.get("/test")
async def iwantittobeclearcode(decrypted=Depends(decrypt_payload)):
    return {
        "decoded": decrypted["secret_code"],
        "number": decrypted["value"] * 10
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
