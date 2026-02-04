from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import os
import asyncio
import json
import websockets

router = APIRouter(prefix="/speech", tags=["Speech"])

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

@router.websocket("/ws/audio/{interview_id}")
async def websocket_audio_endpoint(websocket: WebSocket, interview_id: int):
    """
    WebSocket endpoint for real-time audio streaming with Deepgram.
    Uses Deepgram's WebSocket API directly (no SDK needed)
    """
    await websocket.accept()
    print(f"🎤 Audio WebSocket connected for interview {interview_id}")
    
    if not DEEPGRAM_API_KEY:
        print("❌ DEEPGRAM_API_KEY not set, using fallback")
        await websocket.send_json({
            "type": "error",
            "content": "Deepgram API key not configured"
        })
        await websocket.close()
        return
    
    deepgram_ws = None
    
    try:
        # Connect to Deepgram WebSocket API
        deepgram_url = (
            "wss://api.deepgram.com/v1/listen?"
            "model=nova-2&"
            "language=en-US&"
            "smart_format=true&"
            "interim_results=true&"
            "utterance_end_ms=6000&"
            "vad_events=true"
        )
        
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}"
        }
        
        print("🔌 Connecting to Deepgram...")
        deepgram_ws = await websockets.connect(deepgram_url, extra_headers=headers)
        print("✅ Connected to Deepgram")
        
        # Task to receive from Deepgram and send to frontend
        async def receive_from_deepgram():
            try:
                async for message in deepgram_ws:
                    data = json.loads(message)
                    
                    # Check if this is a transcript message
                    if data.get("type") == "Results":
                        channel = data.get("channel", {})
                        alternatives = channel.get("alternatives", [])
                        
                        if alternatives:
                            transcript = alternatives[0].get("transcript", "")
                            if transcript:
                                is_final = data.get("is_final", False)
                                print(f"📝 Deepgram: {transcript} (final: {is_final})")
                                
                                # Send to frontend
                                await websocket.send_json({
                                    "type": "transcript",
                                    "content": transcript,
                                    "is_final": is_final
                                })
            except Exception as e:
                print(f"❌ Error receiving from Deepgram: {e}")
        
        # Task to receive from frontend and send to Deepgram
        async def receive_from_frontend():
            try:
                while True:
                    data = await websocket.receive()
                    
                    if "bytes" in data:
                        # Audio chunk from frontend - send to Deepgram
                        await deepgram_ws.send(data["bytes"])
                    
                    elif "text" in data:
                        message = json.loads(data["text"])
                        if message.get("type") == "stop":
                            print("🛑 Stop signal received")
                            break
            except WebSocketDisconnect:
                print("Frontend disconnected")
            except Exception as e:
                print(f"❌ Error receiving from frontend: {e}")
        
        # Run both tasks concurrently
        await asyncio.gather(
            receive_from_deepgram(),
            receive_from_frontend()
        )
        
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ Deepgram WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "content": "Failed to connect to Deepgram"
        })
    except Exception as e:
        print(f"❌ Error in audio WebSocket: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        if deepgram_ws:
            try:
                await deepgram_ws.close()
                print("🔌 Deepgram connection closed")
            except:
                pass
        
        try:
            await websocket.close()
            print("🎤 Frontend WebSocket closed")
        except:
            pass
