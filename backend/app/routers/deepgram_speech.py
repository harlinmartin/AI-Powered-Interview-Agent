from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import os
import asyncio
import json
import httpx

router = APIRouter(prefix="/speech", tags=["Speech"])

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
DEEPGRAM_URL = "wss://api.deepgram.com/v1/listen"

@router.websocket("/ws/audio/{interview_id}")
async def websocket_audio_endpoint(websocket: WebSocket, interview_id: int):
    """
    WebSocket endpoint for real-time audio streaming with Deepgram.
    Frontend sends audio chunks → Backend streams to Deepgram → Transcription sent back
    """
    await websocket.accept()
    print(f"🎤 Audio WebSocket connected for interview {interview_id}")
    
    # For now, just echo back that Deepgram is not available
    # and tell frontend to use Web Speech API fallback
    try:
        await websocket.send_json({
            "type": "error",
            "content": "Deepgram not available, using fallback"
        })
        
        # Keep connection open but don't process audio
        while True:
            data = await websocket.receive()
            
            if "text" in data:
                message = json.loads(data["text"])
                if message.get("type") == "stop":
                    break
                    
    except WebSocketDisconnect:
        print(f"Client disconnected: {interview_id}")
    except Exception as e:
        print(f"Error in Audio WebSocket: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
