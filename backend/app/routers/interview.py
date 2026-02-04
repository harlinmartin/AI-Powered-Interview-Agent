from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from .. import models, database
from ..services import rag_service
from .auth import get_current_user
import json
import datetime
import os

router = APIRouter(prefix="/interview", tags=["Interview"])

def process_resume_background(interview_id: int, file_content: bytes, filename: str):
    """
    Background task to process resume (Extract text + Embedding).
    Manages its own DB session.
    """
    db = database.SessionLocal()
    try:
        print(f"INFO: [Background] Processing resume for Interview {interview_id}")
        
        # Check if Image
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            print("INFO: [Background] Processing Resume Image with Vision LLM...")
            mime_type = "image/jpeg" if filename.lower().endswith(('.jpg','.jpeg')) else "image/png"
            # Import locally to avoid circulars if any
            from ..services.llm_service import llm_service
            resume_text = llm_service.extract_text_from_image(file_content, mime_type)
            if not resume_text:
                resume_text = "FAILED TO EXTRACT TEXT FROM IMAGE."
        else:
            # Standard PDF
            print("INFO: [Background] Processing PDF Resume...")
            resume_text = rag_service.ingest_resume(file_content, interview_id)
            
        # Update DB
        interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
        if interview:
            interview.resume_text = resume_text
            interview.status = "READY"
            db.commit()
            print(f"INFO: [Background] Interview {interview_id} ready.")
    except Exception as e:
        print(f"ERROR: [Background] Resume processing failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

@router.post("/upload")
async def upload_interview_files(
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    round_type: str = Form("Technical"),
    difficulty: str = Form("Medium"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        with open("/tmp/debug_upload.log", "a") as f:
            f.write(f"\n[{datetime.datetime.now()}] START UPLOAD\n")
            f.write(f"DB URL: {os.environ.get('DATABASE_URL')}\n")
        
        print(f"INFO: POST /upload hit. File: {resume.filename}")
        if not (resume.filename.endswith(".pdf") or resume.filename.lower().endswith(('.png', '.jpg', '.jpeg'))):
            raise HTTPException(status_code=400, detail="Only PDF, PNG, JPG files allowed")
        
        # Create Interview ID immediately
        new_interview = models.Interview(
            user_id=current_user.id,
            job_description=job_description,
            round_type=round_type,
            difficulty=difficulty,
            status="PROCESSING",
            created_at=datetime.datetime.utcnow().isoformat() + 'Z'
        )
        db.add(new_interview)
        with open("/tmp/debug_upload.log", "a") as f: f.write("Check: Before Commit\n")
        db.commit()
        with open("/tmp/debug_upload.log", "a") as f: f.write("Check: After Commit\n")
        db.refresh(new_interview)
        
        # Read file content to memory
        content = await resume.read()

        # Validate Content (Synchronous Check)
        import io
        import pypdf
        text_content = ""
        try:
             if resume.filename.endswith(".pdf"):
                 pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                 if len(pdf_reader.pages) == 0:
                      raise Exception("Empty PDF")
                 for page in pdf_reader.pages:
                     text_content += page.extract_text() or ""
             else:
                 # Ensure images are at least valid bytes (simplified check)
                 if len(content) < 100:
                      raise Exception("File too small")
                 # For images, we trust Vision LLM in background, or we can't easily validate text sync without latency
                 text_content = "IMAGE_CONTENT_PENDING" 

             if len(text_content.strip()) < 50 and resume.filename.endswith(".pdf"):
                 raise HTTPException(status_code=400, detail="Invalid Resume: The PDF seems empty or unreadable (scanned?). Please upload a text-based PDF.")

             # Keyword Check to ensure it's a resume
             if resume.filename.endswith(".pdf"):
                 keywords = ["education", "experience", "skills", "project", "resume", "cv", "employment", "summary", "profile", "technical", "work"]
                 if not any(k in text_content.lower() for k in keywords):
                      raise HTTPException(status_code=400, detail="Invalid Document. Please upload a valid resume.")

        except HTTPException:
             raise
        except Exception as e:
             print(f"Validation Error: {e}")
             raise HTTPException(status_code=400, detail="Invalid File: Could not read document. Please ensure it is a valid PDF.")
        
        # Offload all processing to background task
        background_tasks.add_task(process_resume_background, new_interview.id, content, resume.filename)
        
        # Return immediately
        print("INFO: Returning ID immediately.")
        return {"interview_id": new_interview.id, "status": "Processing"}
        
    except Exception as e:
        import traceback
        error_msg = f"\n[{datetime.datetime.now()}] UPLOAD ERROR:\n{traceback.format_exc()}\n"
        print(error_msg)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/{interview_id}/finalize")
def finalize_interview(
    interview_id: int,
    duration_seconds: int = Form(...),
    code_content: str = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.status = "COMPLETED"
    interview.duration_seconds = duration_seconds
    
    # Save Code Submission if present
    if code_content:
        # Save as a final system message or specific field if schema supports (using Message for now)
        code_msg = models.Message(interview_id=interview_id, role="system", content=f"CODE SUBMISSION:\n{code_content}")
        db.add(code_msg)
        
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

def _optimize_resume_sync(content: bytes, filename: str, job_description: str, db: Session, current_user: models.User):
    try:
        print(f"DEBUG: Starting sync optimization for {filename}")
        # Extract Text
        resume_text = ""
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            mime_type = "image/jpeg" if filename.lower().endswith(('.jpg','.jpeg')) else "image/png"
            resume_text = llm_service.extract_text_from_image(content, mime_type)
        elif filename.endswith(".pdf"):
             # Use pypdf for text extraction
             import pypdf
             import io
             pdf_reader = pypdf.PdfReader(io.BytesIO(content))
             for page in pdf_reader.pages:
                resume_text += page.extract_text() + "\n"
        else:
             raise HTTPException(status_code=400, detail="Unsupported file format")

        if not resume_text or len(resume_text.strip()) < 50:
             print("DEBUG: Resume text extraction failed or empty")
             raise HTTPException(status_code=400, detail="Invalid Document: Could not extract sufficient text. Please ensure the file is readable.")

        # Keyword Validation
        keywords = ["education", "experience", "skills", "project", "resume", "cv", "employment", "summary", "profile", "technical", "work"]
        if not any(k in resume_text.lower() for k in keywords):
             print("DEBUG: No resume keywords found")
             raise HTTPException(status_code=400, detail="Invalid Document. Please upload a valid resume.")
        
        print(f"DEBUG: Text extracted ({len(resume_text)} chars). Calling LLM...")

        # Optimize
        optimization_result = llm_service.optimize_resume_for_ats(resume_text, job_description)
        result_json = json.loads(optimization_result)

        if result_json.get("error"):
             raise HTTPException(status_code=400, detail=result_json["error"])

        # PERSIST RESULT
        try:
            import datetime
            
            # Robust Parsing
            raw_score = result_json.get("ats_score", 0)
            try:
                # Handle "85", "85/100", "High (85)"
                import re
                score_match = re.search(r'\d+', str(raw_score))
                final_score = int(score_match.group()) if score_match else 0
            except:
                final_score = 0
                
            new_opt = models.ResumeOptimization(
                user_id=current_user.id,
                job_description=job_description,
                ats_score=final_score,
                missing_keywords=json.dumps(result_json.get("missing_keywords", [])),
                suggestions=result_json.get("optimized_content", ""),
                created_at=datetime.datetime.now().isoformat()
            )
            # Create a NEW session for this thread since we can't easily reuse the one from async context safely if it was closed or race conditions
            # actually we passed db session, but for thread safety let's be careful. 
            # standard sqlalchemy session is not thread specific but not thread safe if shared. 
            # However run_in_threadpool just runs it in a thread. 
            # safer to use the passed db session if we are sure we await it properly? 
            # actually, passed db session depends on request scope.
            
            db.add(new_opt)
            db.commit()
            print("DEBUG: Result saved to DB")
        except Exception as db_err:
            import traceback
            import datetime
            error_msg = f"\n[{datetime.datetime.now()}] DB SAVE ERROR:\n{str(db_err)}\nData: {str(result_json)}\n"
            print(error_msg)
            
        return result_json

    except Exception as e:
        print(f"ERROR in _optimize_resume_sync: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.post("/resume/optimize")
async def optimize_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    try:
        print(f"INFO: Received optimize request for {resume.filename}")
        content = await resume.read()
        
        # Run blocking logic in threadpool
        result = await run_in_threadpool(
            _optimize_resume_sync, 
            content=content, 
            filename=resume.filename, 
            job_description=job_description, 
            db=db, 
            current_user=current_user
        )
        
        return result

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import datetime
        error_msg = f"\n[{datetime.datetime.now()}] OPTIMIZE ERROR:\n{traceback.format_exc()}\n"
        print(error_msg)
        print(f"Optimization Error: {e}")
        raise HTTPException(status_code=500, detail=f"Resume optimization failed: {str(e)}")

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
            # Personalize Greeting
            initial_msg = "Hello! I've reviewed your resume. Are you ready to start?"
            try:
                # Decode token to get user name (Naive / simple for WS)
                from .auth import SECRET_KEY, ALGORITHM
                from jose import jwt
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                user = db.query(models.User).filter(models.User.email == email).first()
                if user and user.full_name:
                    first_name = user.full_name.split()[0]
                    initial_msg = f"Hi {first_name}, let's start the interview."
            except Exception as e:
                print(f"WS Greeting Error: {e}")

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
                
                # 2. Get RAG Context (Offload to threadpool)
                context = await run_in_threadpool(get_relevant_context, user_text, interview_id)
                
                # 3. Get LLM Response
                # Fetch fresh history (including new user msg)
                history = db.query(models.Message).filter(models.Message.interview_id == interview_id).all()
                
                # CHECK FOR INTERVIEW END
                # Trigger Coding Round
                should_trigger_coding = False
                # Robust check for round type
                current_round = interview.round_type.strip() if interview.round_type else "Technical"
                
                print(f"DEBUG: Coding Trigger Check. Type: '{current_round}', History: {len(history)}")

                # Check if already triggered
                has_coding_started = any("CODING PHASE" in m.content for m in history if m.role == "system")

                if current_round == "Coding" and len(history) >= 4 and not has_coding_started:
                    should_trigger_coding = True
                elif current_round == "Technical" and len(history) >= 20 and not has_coding_started:
                    should_trigger_coding = True
                
                if should_trigger_coding:
                    
                    # 1. Generate Coding Questions
                    print("Generating Coding Questions...")
                    coding_questions = await run_in_threadpool(llm_service.generate_coding_questions, interview.job_description)

                    # 2. Verbal Transition Message (Dynamic)
                    transition_msg = await run_in_threadpool(llm_service.generate_transition_message, history, user_text, interview.job_description)
                    
                    # Save Transition Message
                    transition_msg_db = models.Message(interview_id=interview_id, role="assistant", content=transition_msg)
                    db.add(transition_msg_db)
                    db.commit()
                    
                    # Send Audio Message
                    await websocket.send_json({"type": "ai_response", "content": transition_msg})
                    
                    # 3. Send Coding Assessment Signal
                    await websocket.send_json({
                        "type": "coding_assessment", 
                        "content": "Starting Coding Round...",
                        "questions": coding_questions
                    })
                    
                    # 4. Inject System Note for "Coding Phase"
                    system_note = "SYSTEM: The interview has transitioned to the CODING PHASE. The candidate is now solving the coding questions. If they ask for clarification, help them, but do not solve it for them. If they say they are done, congratulate them."
                    sys_msg_db = models.Message(interview_id=interview_id, role="system", content=system_note)
                    db.add(sys_msg_db)
                    db.commit()
                    
                    continue # Continue listening

                # Extract last question from frontend (if provided)
                last_question = data.get('last_question', None)
                
                # Offload blocking LLM generation
                ai_text = await run_in_threadpool(
                    llm_service.generate_response,
                    user_message=user_text,
                    context=context,
                    job_description=interview.job_description,
                    history=history,
                    round_type=interview.round_type,
                    difficulty=interview.difficulty,
                    last_question=last_question
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
