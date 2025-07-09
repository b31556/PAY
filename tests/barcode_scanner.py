from fastapi import FastAPI, Request
import uvicorn
import pyautogui
import time

app = FastAPI()

@app.post("/scanned")
async def scanned(request: Request):
    data = await request.body()
    text = data.decode("utf-8")
    
    print(f"Typing: {text}")
    text=text+"\n"


    # Type the text like it's being manually typed
    pyautogui.write(text, interval=0)

    return {"status": "typed"}
    
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
