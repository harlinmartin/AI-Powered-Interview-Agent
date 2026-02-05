import os
from groq import Groq
from typing import List
from .. import models

class LLMService:
    def __init__(self):
        from dotenv import load_dotenv
        load_dotenv()
        self.api_key = os.getenv("GROQ_API_KEY")
        print(f"DEBUG: LLMService initialized. API Key present: {bool(self.api_key)}")
        if self.api_key:
            print(f"DEBUG: API Key starts with: {self.api_key[:5]}...")
        else:
            print("DEBUG: GROQ_API_KEY is None or Empty")
            
        self.client = Groq(api_key=self.api_key) if self.api_key else None

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        """
        Uses Llama 3.2 Vision to extract text from a resume image.
        """
        if not self.client:
            return "OCR Service Unavailable (No API Key)"

        import base64
        import io
        import datetime
        
        def log_debug(msg):
             with open("/tmp/ocr_debug.log", "a") as f:
                 f.write(f"[{datetime.datetime.now()}] {msg}\n")
        
        log_debug(f"Starting Extraction. Mime: {mime_type}, Bytes: {len(image_bytes)}")

        # Resize Image if Pillow is available
        try:
            from PIL import Image
            log_debug("Pillow is available.")
            image = Image.open(io.BytesIO(image_bytes))
            log_debug(f"Original Size: {image.size}")
            
            # Max dimension
            max_size = 1024
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                # Convert to RGB if RGBA/P to save as JPEG
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                image.save(buffer, format="JPEG", quality=85)
                image_bytes = buffer.getvalue()
                mime_type = "image/jpeg"
                log_debug(f"Resized to: {new_size}, New Bytes: {len(image_bytes)}")
            else:
                log_debug("Image within size limits.")
        except ImportError:
            log_debug("WARNING: Pillow not installed. Skipping image resize.")
        except Exception as e:
            log_debug(f"WARNING: Image resize failed: {e}")

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        try:
            log_debug(f"Calling Groq Vision (90b)...")
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all the text from this resume image verbatim. Do not summarize. Just output the text content."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                model="llama-3.2-11b-vision-preview",
            )
            content = chat_completion.choices[0].message.content
            log_debug(f"Groq Response Length: {len(content) if content else 0}")
            if not content:
                 log_debug("ERROR: Vision API returned empty content.")
                 return None
            return content
        except Exception as e:
            log_debug(f"Vision OCR Error: {e}")
            return None

    def validate_answer_quality(
        self,
        question: str,
        answer: str
    ) -> dict:
        """
        Validates the quality and relevance of a candidate's answer.
        
        Returns:
            {
                'is_valid': bool,
                'issue_type': str | None,
                'redirect_message': str | None
            }
        """
        # Skip validation for greetings and initial exchanges
        greeting_keywords = ['hello', 'hi', 'hey', 'start', 'ready', 'begin', 'yes', 'sure', 'okay', 'ok', 'let\'s']
        answer_lower = answer.lower().strip()
        
        # If answer is a greeting or affirmation, allow it
        if any(keyword in answer_lower for keyword in greeting_keywords) and len(answer.split()) <= 5:
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}
        
        # If question is a greeting, don't validate the response
        question_lower = question.lower()
        if any(keyword in question_lower for keyword in ['hello', 'hi', 'ready', 'start', 'begin', 'welcome']):
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}
        
        # REMOVED: Too short validation - we now accept brief but valid answers
        
        # 2. Check for repetitive nonsense (gibberish detection)
        words = answer.lower().split()
        if len(words) > 3:  # Only check if more than 3 words
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.3:  # Less than 30% unique words
                return {
                    'is_valid': False,
                    'issue_type': 'gibberish',
                    'redirect_message': "I didn't quite understand that. Could you please rephrase your answer?"
                }
        
        # 3. Use LLM to check relevance (only for substantial questions)
        if not self.client:
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}
        
        # Skip LLM validation for very short exchanges
        if len(question.split()) < 5:
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}
        
        try:
            prompt = f"""You are an interview quality checker.

Question asked: "{question}"
Candidate's answer: "{answer}"

IMPORTANT: Only flag answers that are CLEARLY off-topic or nonsense. Be lenient with:
- Short affirmative responses ("yes", "sure", "let's start")
- Greetings and pleasantries
- Transitional phrases

Analyze if the answer is:
1. Relevant to the question (not completely off-topic like talking about food when asked about coding)
2. Meaningful (not gibberish like "blah blah blah" or random testing)
3. Adequate length for the question type

Respond with ONLY a JSON object:
{{
    "is_relevant": true/false,
    "is_meaningful": true/false,
    "is_adequate_length": true/false,
    "issue": "off_topic" | "gibberish" | "too_short" | "none"
}}"""

            response = self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                max_tokens=150
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            
            if result['issue'] != 'none':
                redirect_messages = {
                    'off_topic': f"I appreciate your response, but let's stay focused on the question: {question}",
                    'gibberish': "I didn't quite understand that. Could you please provide a clear answer?",
                    'too_short': "Could you elaborate on that a bit more? I'd like to hear more details."
                }
                
                return {
                    'is_valid': False,
                    'issue_type': result['issue'],
                    'redirect_message': redirect_messages.get(result['issue'])
                }
            
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}
            
        except Exception as e:
            print(f"⚠️ Answer validation error: {e}")
            # If validation fails, assume answer is valid to avoid blocking
            return {'is_valid': True, 'issue_type': None, 'redirect_message': None}

    def generate_response(
        self, 
        user_message: str, 
        context: str, 
        job_description: str,
        history: List[models.Message],
        round_type: str = "Technical",
        difficulty: str = "Medium",
        last_question: str = None  # NEW: Track last question for validation
    ) -> str:
        # Check if we're in coding phase (skip validation during coding)
        is_coding_phase = any(msg.role == "system" and "CODING PHASE" in msg.content for msg in history)
        
        # DISABLED: Answer validation was causing too many false positives
        # Users were getting "I didn't quite understand" for valid answers
        # The AI should handle conversation flow naturally without validation
        
        # if last_question and user_message and not is_coding_phase:
        #     validation = self.validate_answer_quality(last_question, user_message)
        #     if not validation['is_valid']:
        #         print(f"🚫 Answer validation failed: {validation['issue_type']}")
        #         return validation['redirect_message']
        
        if not self.client:
            print("WARNING: GROQ_API_KEY not found. Using Mock Response.")
            return f"Rank: Mock AI Response. I heard you say: '{user_message}'. (Set GROQ_API_KEY in backend/.env to get real AI responses)"

        # Check for Coding Phase (reuse the check)
        if is_coding_phase:
            system_prompt = f"""You are a Technical Interview Proctor for a CODING ROUND.
            The candidate is currently solving coding questions in the editor.
            
            **STRICT RULES**:
            - **DO NOT ASK QUESTIONS** - They are coding, not talking
            - **ONLY HELP WITH CLARIFICATIONS** if they ask
            - **DO NOT SOLVE THE PROBLEM** for them
            - **BE BRIEF** - They need to focus on coding
            
            **Your Role**:
            - If they ask "Can I use Python?" → "Yes, select the language in the editor."
            - If they ask about constraints → Explain briefly
            - If they're silent → Say nothing or "Let me know if you need help"
            - If they say they're done → "Great! Submit when ready."
            
            **IMPORTANT**: This is a CODING round, not a conversation. Keep responses minimal.
            """
        else:
            # --- DYNAMIC PROMPT BASED ON ROUND TYPE ---
            if round_type == "HR Round":
                 system_prompt = f"""You are an HR Manager conducting a BEHAVIORAL interview.
                 
                 **CANDIDATE'S RESUME/BACKGROUND**:
                 {context}
                 
                 **JOB DESCRIPTION**:
                 {job_description}
                 
                 **STRICT RULES**:
                 - **ONLY ASK BEHAVIORAL/SOFT SKILLS QUESTIONS**
                 - NO technical questions (no coding, algorithms, system design)
                 - Focus on: Teamwork, Leadership, Conflict Resolution, Past Experiences, Strengths/Weaknesses
                 - Ask about specific situations from their resume
                 
                 **INTERVIEW FLOW**:
                 - Ask 5-8 questions total
                 - If you've asked enough questions and got good answers, CONCLUDE the interview
                 - To conclude, say: "That concludes our interview. Thank you for your time!"
                 
                 **Example Questions**:
                 - "Tell me about a time you faced a conflict with a team member"
                 - "Describe a challenging project from your resume and how you handled it"
                 - "What's your biggest strength and how did you demonstrate it?"
                 
                 **Strategy**:
                 1. **USE RESUME**: Reference their actual projects/companies
                 2. **ACCEPT BRIEF ANSWERS**: Move on if they answered
                 3. **CONCLUDE WHEN READY**: After 5-8 good questions, end the interview
                 
                 **IMPORTANT**: Keep it conversational. Max 2 sentences.
                 """
            
            elif round_type == "Communication":
                 system_prompt = f"""You are a Communication Coach conducting a natural conversation.
                 
                 **CANDIDATE'S BACKGROUND**:
                 {context}
                 
                 **Goal**: Evaluate fluency naturally.
                 
                 **Strategy**:
                 1. **BE NATURAL**: Accept brief answers if they're clear.
                 2. **ACKNOWLEDGE**: Vary your response ("Good.", "I understand.", "Thanks.").
                 3. **MOVE ON**: Ask simple questions about their background.
                 
                 **IMPORTANT**: Keep it conversational. Max 2 sentences.
                 """

            elif round_type == "System Design":
                 system_prompt = f"""You are a System Architect having a technical discussion.
                 
                 **CANDIDATE'S BACKGROUND**:
                 {context}
                 
                 **Goal**: Explore system design thinking based on their experience.
                 
                 **Strategy**:
                 1. **REFERENCE THEIR WORK**: Ask about systems they've built (from resume).
                 2. **ACCEPT VALID POINTS**: If they give a reasonable answer, move forward.
                 3. **ACKNOWLEDGE**: "Good point.", "Fair enough.", "I see."
                 
                 **IMPORTANT**: Don't always probe deeper. Max 2 sentences.
                 """
            
            else: # DEFAULT: Technical / Coding Round (Verbal Part)
                if round_type == "Coding":
                    system_prompt = f"""You are a Technical Interviewer. 
                    Goal: Start the Coding Assessment.
                    
                    Say: "Hello! We will focus on hands-on coding. Ready to open the workspace?"
                    
                    **Constraint**: Just ask if they are ready.
                    """
                else: 
                    # Standard Technical
                    system_prompt = f"""You are a Technical Interviewer conducting a TECHNICAL interview.
                    
                    **CANDIDATE'S RESUME/BACKGROUND**:
                    {context}
                    
                    **JOB DESCRIPTION**:
                    {job_description}
                    
                    **STRICT RULES**:
                    - **ONLY ASK TECHNICAL QUESTIONS**
                    - NO behavioral questions (no teamwork, conflict, soft skills)
                    - Focus on: Algorithms, Data Structures, System Design, Technologies, Problem-Solving
                    - Ask about technologies and projects from their resume
                    
                    **INTERVIEW FLOW**:
                    - Ask 6-10 questions total
                    - If you've covered enough technical ground and got good answers, CONCLUDE
                    - To conclude, say: "That concludes our technical interview. Thank you!"
                    
                    **Example Questions**:
                    - "Explain how you implemented [technology from resume]"
                    - "What's the time complexity of [algorithm]?"
                    - "How would you design a scalable system for [use case]?"
                    - "Tell me about the architecture of [project from resume]"
                    
                    **Strategy**:
                    1. **USE RESUME**: Ask about their specific tech stack and projects
                    2. **ACCEPT BRIEF ANSWERS**: If they answered clearly, move on
                    3. **CONCLUDE WHEN READY**: After covering key areas, end the interview
                    
                    **IMPORTANT**: Be efficient. Reference their actual work. Max 2 sentences.
                    """

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history (Limit to last 10 messages to save context)
        for msg in history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
            
        messages.append({"role": "user", "content": user_message})

        completion = self.client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile", # Updated to supported model
        )

        return completion.choices[0].message.content

    def analyze_resume(self, resume_text: str, job_description: str) -> str:
        if not self.client:
             return '{"score": 0, "strengths": ["Mock Strength"], "weaknesses": ["Mock Weakness"], "suggestions": ["Check API Key"]}'

        # Check for empty resume (common PDF parsing issue)
        if not resume_text or len(resume_text.strip()) < 50:
             print("WARNING: Resume text is empty or too short. PDF extraction likely failed.")
             return '{"score": 0, "strengths": ["None Detected"], "weaknesses": ["Resume Empty"], "suggestions": ["We could not extract text from this PDF.", "Please ensure it is a TEXT-based PDF, not a scanned image.", "Try converting your resume to a standard PDF format."]}'

        system_prompt = """You are an expert Hiring Manager and Resume Analyst.
        JOB DESCRIPTION:
        {job_description}

        RESUME CONTENT:
        {resume_text}

        Your Task: Analyze the resume against the JD.
        Output ONLY valid JSON in the following format:
        {{
            "score": <0-100 integer>,
            "strengths": ["list", "of", "key", "strengths"],
            "weaknesses": ["list", "of", "missing", "skills", "or", "issues"],
            "suggestions": ["specific", "actionable", "improvements"]
        }}
        Do not output any markdown formatting or extra text. Just the JSON.
        """
        
        # Format the prompt
        prompt = system_prompt.format(job_description=job_description, resume_text=resume_text)

        messages = [
            {"role": "system", "content": "You are a Resume Analyzer. Output JSON only."},
            {"role": "user", "content": prompt}
        ]

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error analyzing resume: {e}")
            return '{"error": "Analysis failed"}'

    def optimize_resume_for_ats(self, resume_text: str, job_description: str) -> str:
        print(f"DEBUG: ATS Optimization called. JD Check: '{job_description[:50]}...'")
        
        # DETERMINISTIC VALIDATION: Fast-fail for short/garbage inputs
        jd_words = job_description.strip().split()
        
        # If JD is 2-4 words, assume it's a role name and expand it
        if 2 <= len(jd_words) <= 4:
            role_name = job_description.strip()
            job_description = f"""Position: {role_name}
Looking for a qualified candidate for the {role_name} position.
Required skills and experience relevant to {role_name} role.
Responsibilities include tasks typical for {role_name} positions."""
            print(f"DEBUG: Expanded short role '{role_name}' to full JD")
            jd_words = job_description.strip().split()
        
        # Reject if still too short (< 2 words or < 10 chars)
        if len(jd_words) < 2 or len(job_description.strip()) < 10:
             print(f"DEBUG: JD rejected via validation (Words: {len(jd_words)}, Chars: {len(job_description.strip())})")
             return '{"error": "The provided Job Description is invalid. Please provide at least a role name (e.g., \'Frontend Developer\')."}'

        if not self.client:
             return '{"ats_score": 0, "optimized_content": "Mock Optimized Text", "missing_keywords": ["Python"], "formatting_issues": ["Use standard font"]}'

        system_prompt = """You are a RUTHLESS ATS (Applicant Tracking System) Algorithm designed by FAANG recruiters.
        
        JOB DESCRIPTION:
        {job_description}

        RESUME TEXT:
        {resume_text}

        Your Task:
        1. **CRITICAL STEP: JOB DESCRIPTION VALIDATION**:
           - **READ THE JOB DESCRIPTION FIRST.**
           - Is it "blah blah blah"? -> REJECT.
           - Is it less than 10 words? -> REJECT.
           - Is it random gibberish? -> REJECT.
           
           **TECH ROLE CHECK (STRICT)**:
           - Is the role a non-tech job? (e.g. Barber, Doctor, Nurse, Chef, Driver, Teacher, Sales Clerk)? -> **REJECT**.
           - **ALLOWED ROLES**: Software, Data, IT, Product, Design, Engineering, Cyber, QA.
           
           **IF REJECTED:**
           Output EXACTLY this JSON and NOTHING else:
           {{ "error": "The provided Job Description is invalid or not a supported Tech role. Please enter a valid Tech Job Description." }}
           
           **DO NOT PROCEED TO SCORING IF JD IS INVALID OR NON-TECH.**

        2. **VALIDATION (RESUME)**: determine if the provided RESUME TEXT is actually a resume or CV.
           - If it is a recipe, code file, book chapter, random text, or irrelevant document:
             Output JSON with: {{ "error": "The uploaded file does not appear to be a valid resume. It seems to be [brief description of what it is]." }}
             AND STOP.

        3. **RUTHLESS SCORING CRITERIA (0-100)**:
           - **95-100 (Unicorn)**: 100% Keyword match, identical Tech Stack, FAANG-level experience, quantifiably high impact. (EXTREMELY RARE).
           - **85-94 (Top Tier)**: Excellent match, maybe missing 1 minor tool. Strong bullets.
           - **70-84 (Good)**: Solid candidate, but generic bullets or missing 2-3 important keywords from JD.
           - **50-69 (Average)**: Weak formatting, missing CORE hard skills (e.g., JD wants React, they have jQuery), or no metrics in bullets.
           - **< 40 (Auto-Reject)**: 
             1. **Role Mismatch** (e.g., Sales applying for Python Dev) -> **MAX SCORE 25**.
             2. **Missing Critical Stack** (e.g., JD requires AWS, Resume has 0 Cloud exp).
             3. **Garbage/Empty Resume**.

        4. **SCORING LOGIC**:
           - **Start at 100.**
           - **-10 points** for EACH missing "Hard Skill" required in the JD.
           - **-15 points** if Bullet points lack numbers/metrics (e.g., "Worked on API" vs "Built API handling 10k req/s").
           - **-20 points** if formatting/structure is cluttered or hard to parse.
           - **-20 points** if "Years of Experience Mismatch" (e.g., JD requires 3+ years, Resume has significantly less, like <1 year).
           - **-50 points** if the Resume Role does not match the JD Role (e.g., Java Dev applying for Frontend).

        5. **OUTPUT**:
           - **missing_keywords**: List EXACT words from JD not found in Resume.
           - **formatting_issues**: Be nitpicky (e.g., "Inconsistent timestamps", "Too much text", "Lack of action verbs").

        Output ONLY valid JSON:
        {{
            "error": null,
            "ats_score": <int>,
            "missing_keywords": ["list", "of", "keywords"],
            "formatting_issues": ["list", "of", "issues"],
            "optimized_content": "Markdown string containing:\n\n### Role Analysis\n(Explicitly state: 'Role Mismatch detected' or 'Role Alignment confirmed'. Explain why.)\n\n### Project Recommendations\n(Specific advice on what to highlight)\n\n### Bullet Point Critique\n**Weak:** (Quote)\n**Why it hurts:** (Explanation)\n**Better:** (Rewrite with metrics)\n\n### Optimized Summary\n(Text)\n\n### Optimized Skills\n(Text)"
        }}
        """
        
        prompt = system_prompt.format(job_description=job_description, resume_text=resume_text)

        messages = [
            {"role": "system", "content": "You are an ATS Expert. Output JSON only."},
            {"role": "user", "content": prompt}
        ]

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error optimizing resume: {e}")
            return '{"error": "Optimization failed"}'

    def generate_feedback(self, transcript_messages: List[models.Message], job_description: str) -> str:
        if not self.client:
             return '{"score": 50, "metrics": {"technical": 50, "communication": 50, "problem_solving": 50, "confidence": 50}, "summary": "Mock Feedback - No API Key", "strengths": ["None"], "weaknesses": ["None"], "suggestions": ["Check API Key"]}'

        # Convert messages to a readable format
        transcript_text = ""
        user_msg_count = 0
        for msg in transcript_messages:
            if msg.role == "user":
                user_msg_count += 1
            
            # Proper Role mapping
            if msg.role == "assistant":
                role = "Interviewer (AI)"
            elif msg.role == "system":
                role = "SYSTEM / CODE SUBMISSION"
            else:
                role = "Candidate (User)"
                
            transcript_text += f"{role}: {msg.content}\n"

        # --- CHECK FOR INSUFFICIENT DATA ---
        if user_msg_count < 3 and "CODE SUBMISSION" not in transcript_text:
             print("INFO: Insufficient interview data. Returning incomplete feedback.")
             return '{"score": 0, "metrics": {"technical": 0, "communication": 0, "problem_solving": 0, "confidence": 0}, "summary": "The interview was too short to generate a valid score. Please complete at least 3-4 exchanges.", "strengths": ["N/A"], "weaknesses": ["Interview incomplete"], "suggestions": ["Please retry properly."]}'


        system_prompt = """You are an Expert Interview Coach with STRICT grading standards.
        
        JOB DESCRIPTION:
        {job_description}

        INTERVIEW TRANSCRIPT:
        {transcript_text}

        **CRITICAL SCORING RULES (MUST FOLLOW)**:
        
        1. **STEP 1: COUNT CODE SUBMISSIONS**:
           - Scan the transcript for "CODE SUBMISSION" blocks.
           - **Count distinct answers**: How many SEPARATE questions were answered with actual code?
        
        2. **STEP 2: APPLY PENALTY (NON-NEGOTIABLE)**:
           - If 2 questions were asked but you found ONLY 1 code submission: **SCORE MUST BE < 50%**.
             - *Reason*: "Incomplete Interview - Missed Question 2".
             - Do NOT hallucinate that they "did well" on the missing question.
           - If 0 questions completed: **SCORE = 0%**.
           - If code is present but just comments/partial: **SCORE = 10-20%**.
        
        3. **STEP 3: QUALITY GRADING** (Only rule if BOTH questions were attempted):
           - **90-100%**: Both questions solved correctly with good code quality.
           - **70-89%**: Both questions attempted, 1 fully correct, 1 partial.
           - **50-69%**: Only 1 question fully solved out of 2 (but 2nd was at least attempted).
           
        4. **VERBAL ROUND**: If this is NOT a coding round (no "CODE SUBMISSION" tags), ignore the above and grade normally on communication.

        Output ONLY valid JSON:
        {{
            "score": <0-100 overall>,
            "metrics": {{
                "technical": <0-100>,
                "communication": <0-100>,
                "problem_solving": <0-100>,
                "confidence": <0-100>
            }},
            "feedback_type": "CODING" | "VERBAL",
            "summary": "2-3 sentences summary.",
            "code_feedback": "CRITICAL: Detailed analysis. IF CODING ROUND: Line-by-line code review (e.g. 'Line 10: O(n^2) loop'). IF VERBAL ROUND: Detailed performance critique (e.g. 'Your explanation of CAP Theorem lacked nuance on Partition Tolerance. You demonstrated good high-level understanding but missed specific trade-offs.').",
            "strengths": ["list"],
            "weaknesses": ["list"],
            "suggestions": ["list"]
        }}
        """

        
        prompt = system_prompt.format(job_description=job_description, transcript_text=transcript_text)

        messages = [
            {"role": "system", "content": "You are an Interview Coach. Output JSON only."},
            {"role": "user", "content": prompt}
        ]

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error generating feedback: {e}")
            return '{"error": "Feedback generation failed"}'

    def generate_transition_message(self, history: List[models.Message], last_user_message: str, job_description: str) -> str:
        if not self.client:
            return "We have covered enough ground. I've placed two coding questions in the editor for you. Please utilize the editor to solve them."

        system_prompt = """You are a Technical Interviewer.
        
        CONTEXT:
        You are moving the candidate to the **Coding Assessment**.
        The candidate just said: "{last_user_message}"
        
        TASK:
        Generate a friendly, direct transition message.
        
        Guidelines:
        1. **If they agree/are ready**: "Great! I've opened the coding workspace. You'll see two questions in the editor."
        2. **If they ask a question**: Answer it briefly, then move to the editor.
        3. **Never start with "I think there might be some confusion".**
        
        Example:
        "Excellent. I've enabled the coding environment for you. Please choose your preferred language and begin."
        """
        
        prompt = system_prompt.format(last_user_message=last_user_message)
        
        messages = [{"role": "system", "content": prompt}]
        
        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error generating transition: {e}")
            return "Moving to the coding round now."
    def generate_coding_questions(self, job_description: str) -> str:
        if not self.client:
             return '// Mock Question 1: Write a function to reverse a string.\n// Mock Question 2: Find the factorial of a number.'

        system_prompt = """You are a Technical Interviewer.
        JOB DESCRIPTION:
        {job_description}

        Your Task: Generate 2 coding questions suitable for this role.
        
        **Rules for Question Selection**:
        1. **Frontend Role (React, Vue, Web)**: 
           - Q1: Practical UI task (e.g., "Build a Counter hook", "Create a Debounce function", "Implement a simple Todo reducer").
           - Q2: DOM/JS manipulation or simple Algo (e.g., "Flatten array", "Finding unique elements").
           
        2. **Backend Role (Python, Node, API)**:
           - Q1: Data processing/API task (e.g., "Design a rate limiter function", "Parse a log file").
           - Q2: Algorithmic task (e.g., "Valid Anagram", "LRU Cache").
           
        3. **General/Fullstack**:
           - Mix of above or standard DSA.

        Output ONLY the questions as code comments (starting with // or #).
        Do not add any introductory text.
        
        Format:
        // Question 1: [Question Text]
        // [Constraints/Examples]
        // [Starter Code if helpful]
        
        // Question 2: [Question Text]
        // [Constraints/Examples]
        """
        
        messages = [
            {"role": "system", "content": "You are a Technical Interviewer. Output code comments only."},
            {"role": "user", "content": system_prompt.format(job_description=job_description)}
        ]

        try:
            completion = self.client.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error generating coding questions: {e}")
            return '// Error generating questions. Please ask the interviewer for a coding task.'

llm_service = LLMService()
