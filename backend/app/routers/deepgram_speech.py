from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
import os
import asyncio
import json

router = APIRouter(prefix="/speech", tags=["Speech"])

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

@router.websocket("/ws/audio/{interview_id}")
async def websocket_audio_endpoint(websocket: WebSocket, interview_id: int):
    """
    WebSocket endpoint for real-time audio streaming with Deepgram.
    Frontend sends audio chunks → Backend streams to Deepgram → Transcription sent back
    """
    await websocket.accept()
    print(f"🎤 Audio WebSocket connected for interview {interview_id}")
    
    try:
        # Initialize Deepgram client
        deepgram = DeepgramClient(DEEPGRAM_API_KEY)
        
        # Create Deepgram connection
        dg_connection = deepgram.listen.asynclive.v("1")
        
        # Store transcription to send to frontend
        transcription_buffer = []
        
        def on_message(self, result, **kwargs):
            """Handle Deepgram transcription results"""
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) > 0:
                print(f"📝 Deepgram transcript: {sentence}")
                transcription_buffer.append(sentence)
                # Send to frontend immediately
                asyncio.create_task(
                    websocket.send_json({
                        "type": "transcript",
                        "content": sentence,
                        "is_final": result.is_final
                    })
                )
        
        def on_error(self, error, **kwargs):
            print(f"❌ Deepgram error: {error}")
        
        # Register event handlers
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)
        
        # Configure Deepgram options
        options = LiveOptions(
            model="nova-2",
            language="en-US",
            smart_format=True,
            interim_results=True,
            utterance_end_ms=1200,  # 1.2s silence = end of utterance
            vad_events=True,
        )
        
        # Start Deepgram connection
        if not await dg_connection.start(options):
            print("❌ Failed to start Deepgram connection")
            await websocket.close()
            return
        
        print("✅ Deepgram connection started")
        
        # Listen for audio from frontend
        while True:
            data = await websocket.receive()
            
            if "bytes" in data:
                # Audio chunk received - send to Deepgram
                audio_chunk = data["bytes"]
                dg_connection.send(audio_chunk)
            
            elif "text" in data:
                # Control message from frontend
                message = json.loads(data["text"])
                
                if message.get("type") == "stop":
                    print("🛑 Stop signal received")
                    break
        
        # Cleanup
        await dg_connection.finish()
        print("🎤 Audio WebSocket closed")
        
    except WebSocketDisconnect:
        print(f"Client disconnected: {interview_id}")
    except Exception as e:
        print(f"CRITICAL ERROR in Audio WebSocket: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await websocket.close()
        except:
            pass
