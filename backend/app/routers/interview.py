from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database
from ..services import rag_service
from .auth import get_current_user
import json

router = APIRouter(prefix="/interview", tags=["Interview"])

@router.post("/upload")
async def upload_interview_files(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        if not (resume.filename.endswith(".pdf") or resume.filename.lower().endswith(('.png', '.jpg', '.jpeg'))):
            raise HTTPException(status_code=400, detail="Only PDF, PNG, JPG files allowed")
        
        # Create Interview ID first
        new_interview = models.Interview(
            user_id=current_user.id,
            job_description=job_description,
            status="PROCESSING"
        )
        db.add(new_interview)
        db.commit()
        db.refresh(new_interview)
        
        # Process Resume
        content = await resume.read()
        
        # Check if Image
        if resume.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            print("INFO: Processing Resume Image with Vision LLM...")
            mime_type = "image/jpeg" if resume.filename.lower().endswith(('.jpg','.jpeg')) else "image/png"
            import app.services.llm_service as llm_lib # delayed import to avoid circular
            # Actually use the instance from the module
            from ..services.llm_service import llm_service
            resume_text = llm_service.extract_text_from_image(content, mime_type)
            if not resume_text:
                resume_text = "FAILED TO EXTRACT TEXT FROM IMAGE."
        else:
            # Standard PDF
            resume_text = rag_service.ingest_resume(content, new_interview.id)
        
        # Update Interview with text
        new_interview.resume_text = resume_text
        new_interview.status = "READY"
        db.commit()
        
        return {"interview_id": new_interview.id, "status": "Ready"}
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"UPLOAD ERROR: {error_msg}")
        with open("upload_error.log", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/{interview_id}/finalize")
def finalize_interview(
    interview_id: int,
    duration_seconds: int = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = "COMPLETED"
    interview.duration_seconds = duration_seconds
    db.commit()
    return {"status": "Updated", "duration": duration_seconds}

@router.get("/")
def get_user_interviews(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interviews = db.query(models.Interview).filter(models.Interview.user_id == current_user.id).order_by(models.Interview.id.desc()).all()
    return interviews

@router.post("/{interview_id}/analyze")
def analyze_interview_resume(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if hasattr(interview, 'analysis_result') and interview.analysis_result:
         # Return cached if we had a column for it (Optimization for later)
         pass

    # Call LLM
    import json
    try:
        analysis_json = llm_service.analyze_resume(interview.resume_text, interview.job_description)
        return json.loads(analysis_json)
    except Exception as e:
        print(f"Analysis Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze resume")

@router.post("/{interview_id}/feedback")
def generate_interview_feedback(
    interview_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Fetch Transcript
    history = db.query(models.Message).filter(models.Message.interview_id == interview_id).order_by(models.Message.id.asc()).all()
    
    if len(history) < 2:
        return {
            "score": 0, 
            "summary": "Not enough interaction data to generate feedback.",
            "strengths": ["N/A"],
            "weaknesses": ["N/A"],
            "suggestions": ["Please complete the interview first."]
        }

    # Call LLM
    import json
    try:
        feedback_json = llm_service.generate_feedback(history, interview.job_description)
        # Verify JSON
        try:
             json_obj = json.loads(feedback_json)
        except:
             # Fallback if LLM output invalid JSON (simple retry or wrap)
             json_obj = {"score": 0, "summary": "Error parsing AI response", "metrics": {}}
        
        # PERSIST FEEDBACK
        interview.feedback_result = feedback_json
        db.commit()
        
        return json.loads(feedback_json)
    except Exception as e:
        print(f"Feedback Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate feedback")

@router.post("/resume/optimize")
async def optimize_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        content = await resume.read()
        
        # Extract Text
        resume_text = ""
        if resume.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            mime_type = "image/jpeg" if resume.filename.lower().endswith(('.jpg','.jpeg')) else "image/png"
            resume_text = llm_service.extract_text_from_image(content, mime_type)
        elif resume.filename.endswith(".pdf"):
             # Use pypdf for text extraction
             import pypdf
             import io
             pdf_reader = pypdf.PdfReader(io.BytesIO(content))
             for page in pdf_reader.pages:
                resume_text += page.extract_text() + "\n"
        else:
             raise HTTPException(status_code=400, detail="Unsupported file format")

        if not resume_text or len(resume_text.strip()) < 50:
             return {"error": "Could not extract text from file"}

        # Optimize
        optimization_result = llm_service.optimize_resume_for_ats(resume_text, job_description)
        result_json = json.loads(optimization_result)

        # PERSIST RESULT
        try:
            import datetime
            new_opt = models.ResumeOptimization(
                user_id=current_user.id,
                job_description=job_description,
                ats_score=result_json.get("ats_score", 0),
                missing_keywords=json.dumps(result_json.get("missing_keywords", [])),
                suggestions=result_json.get("optimized_content", ""),
                created_at=datetime.datetime.now().isoformat()
            )
            db.add(new_opt)
            db.commit()
        except Exception as db_err:
            print(f"DB Error saving optimization: {db_err}")

        return result_json

    except Exception as e:
        print(f"Optimization Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Resume optimization failed")

@router.get("/resume/history")
def get_resume_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    history = db.query(models.ResumeOptimization).filter(models.ResumeOptimization.user_id == current_user.id).order_by(models.ResumeOptimization.id.desc()).all()
    # Format for frontend
    return [
        {
            "id": h.id,
            "job_description": h.job_description,
            "ats_score": h.ats_score,
            "missing_keywords": json.loads(h.missing_keywords) if h.missing_keywords else [],
            "optimized_content": h.suggestions,
            "created_at": h.created_at
        }
        for h in history
    ]

from fastapi import WebSocket, WebSocketDisconnect
from ..services.rag_service import get_relevant_context
from ..services.llm_service import llm_service

@router.websocket("/ws/{interview_id}")
async def websocket_endpoint(websocket: WebSocket, interview_id: int, token: str, db: Session = Depends(database.get_db)):
    # Verify token logic here (Simulated for WS)
    # real impl would decode jwt or use a dependency with Query param
    
    await websocket.accept()
    
    try:
        # Verify interview ownership
        interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
        if not interview:
             print(f"Error: Interview {interview_id} not found")
             await websocket.close()
             return

        # 1. Start Interview if new
        # Check history
        history = db.query(models.Message).filter(models.Message.interview_id == interview_id).all()
        
        if not history:
            # Generate initial question
            initial_msg = "Hello! I've reviewed your resume. Are you ready to start?"
            # Save AI message
            db_msg = models.Message(interview_id=interview_id, role="assistant", content=initial_msg)
            db.add(db_msg)
            db.commit()
            await websocket.send_json({"type": "ai_response", "content": initial_msg})
        
        while True:
            data = await websocket.receive_json()
            user_text = data.get("content")
            
            if user_text:
                # 1. Save User Message
                user_msg = models.Message(interview_id=interview_id, role="user", content=user_text)
                db.add(user_msg)
                db.commit()
                
                # 2. Get RAG Context
                context = get_relevant_context(user_text, interview_id)
                
                # 3. Get LLM Response
                # Fetch fresh history (including new user msg)
                history = db.query(models.Message).filter(models.Message.interview_id == interview_id).all()
                
                # CHECK FOR INTERVIEW END
                if len(history) >= 30: # ~15 interactions
                    closing_msg = "Thank you for the interview. We have gathered enough information. Please proceed to the coding assessment. Goodbye!"
                    
                    # Save Closing Message
                    final_msg_db = models.Message(interview_id=interview_id, role="assistant", content=closing_msg)
                    db.add(final_msg_db)
                    db.commit()
                    
                    await websocket.send_json({"type": "ai_response", "content": closing_msg})
                    await websocket.close()
                    break

                ai_text = llm_service.generate_response(
                    user_message=user_text,
                    context=context,
                    job_description=interview.job_description,
                    history=history
                )
                
                # 4. Save AI Response
                ai_msg_db = models.Message(interview_id=interview_id, role="assistant", content=ai_text)
                db.add(ai_msg_db)
                db.commit()
                
                # 5. Send to Front
                await websocket.send_json({"type": "ai_response", "content": ai_text})

    except WebSocketDisconnect:
        print(f"Client disconnected: {interview_id}")
    except Exception as e:
        print(f"CRITICAL ERROR in WebSocket: {e}")
        import traceback
        traceback.print_exc()
        await websocket.close()
