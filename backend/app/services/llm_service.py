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
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        try:
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
            return chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Vision OCR Error: {e}")
            return ""

    def generate_response(
        self, 
        user_message: str, 
        context: str, 
        job_description: str,
        history: List[models.Message],
        round_type: str = "Technical",
        difficulty: str = "Medium"
    ) -> str:
        if not self.client:
            print("WARNING: GROQ_API_KEY not found. Using Mock Response.")
            return f"Rank: Mock AI Response. I heard you say: '{user_message}'. (Set GROQ_API_KEY in backend/.env to get real AI responses)"

        # Check for Coding Phase
        is_coding_phase = False
        for msg in history:
            if msg.role == "system" and "CODING PHASE" in msg.content:
                is_coding_phase = True
                break

        if is_coding_phase:
            system_prompt = f"""You are a Technical Interview Proctor.
            The candidate is currently solving coding questions in the editor.
            
            Your Goal: Assist them if they have clarifying questions, but DO NOT solve the problem for them.
            
            **Guidelines:**
            - **ANSWER QUESTIONS**: "Can I use Python?" -> "Yes, you can select the language in the editor."
            - **CLARIFICATIONS**: Explain the problem constraints if asked.
            - **ENCOURAGE**: If they are silent, ask "How is it going?" or "Let me know if you need clarification."
            - **CONCISENESS**: Keep answers short and helpful.
            """
        else:
            # --- DYNAMIC PROMPT BASED ON ROUND TYPE ---
            if round_type == "HR Round":
                 system_prompt = f"""You are a Hiring Manager.
                 Job Description: {job_description}
                 Resume Context: {context}
                 
                 **Goal**: Assess soft skills.
                 
                 **Strategy**:
                 1. **ACKNOWLEDGE**: Vary your response (e.g. "I see.", "Interesting.", "Thanks for sharing.", "Okay."). DO NOT always say "That makes sense."
                 2. **ASK**: Ask a NEW question about Teamwork, Conflict, or Experience.
                 
                 **MANDATORY**: You MUST ask a question. Max 2 sentences.
                 """
            
            elif round_type == "Communication":
                 system_prompt = f"""You are an Communication Coach.
                 **Goal**: Evaluate fluency.
                 
                 **Strategy**:
                 1. **ACKNOWLEDGE**: Vary your response (e.g. "Good example.", "I understand.", "Thanks."). Avoid repetition.
                 2. **ASK**: Ask a simple question ("Tell me about hobbies").
                 
                 **MANDATORY**: End with a question. Max 2 sentences.
                 """

            elif round_type == "System Design":
                 system_prompt = f"""You are a System Architect.
                 **Goal**: Design a system.
                 
                 **Strategy**:
                 1. **ACKNOWLEDGE**: Validate their point (e.g. "Good point.", "Fair enough.", "I see the trade-off.").
                 2. Probe deeper ("How does that scale?").
                 
                 **MANDATORY**: End with a question.
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
                    system_prompt = f"""You are a Technical Interviewer.
                    Job Description: {job_description}
                    Resume Context: {context}
                    
                    **Goal**: Assess technical skills.
                    
                    **Strategy**:
                    1. **ACKNOWLEDGE**: Vary terms ("Right.", "Okay.", "Interesting approach.", "I see."). DO NOT repeat phrases.
                    2. Ask a Technical Question.
                    
                    **MANDATORY**: You MUST ask a technical question. Max 2 sentences.
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
        if not self.client:
             return '{"ats_score": 0, "optimized_text": "Mock Optimized Text", "missing_keywords": ["Python"], "formatting_issues": ["Use standard font"]}'

        system_prompt = """You are an ATS (Applicant Tracking System) Optimization Expert.
        
        JOB DESCRIPTION:
        {job_description}

        RESUME TEXT:
        {resume_text}

        Your Task:
        1. **ANALYZE THE ROLE**: Identify if this is Backend, Frontend, Full Stack, ML, etc.
        2. **CALCULATE ATS SCORE**: (0-100) based on keyword matching.
        3. **IDENTIFY GAPS**: Missing critical keywords.
        4. **ROLE-SPECIFIC ADVICE**:
           - **Projects to Highlight**: Suggest 1-2 specific projects the candidate should describe to match this specific role (e.g. "For Backend, highlight your API scaling project").
           - **Weak Bullets**: Quote 1 specific weak bullet point from the resume and rewrite it to be impact-driven (X-Y-Z formula).
        5. **REWRITE**: improved "Summary" and "Skills".

        Output ONLY valid JSON:
        {{
            "ats_score": <int>,
            "missing_keywords": ["list", "of", "keywords"],
            "formatting_issues": ["list", "of", "issues"],
            "optimized_content": "Markdown string containing:\n\n### Role Analysis\n(Type of role detected)\n\n### Project Recommendations\n(Specific advice on what to highlight)\n\n### Bullet Point Critique\n**Weak:** (Quote)\n**Better:** (Rewrite)\n\n### Optimized Summary\n(Text)\n\n### Optimized Skills\n(Text)"
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

        system_prompt = """You are an Expert Interview Coach.
        
        JOB DESCRIPTION:
        {job_description}

        INTERVIEW TRANSCRIPT:
        {transcript_text}

        **CRITICAL SCORING RULES**:
        1. **CHECK CODE SUBMISSION**: Look for "CODE SUBMISSION" or "SYSTEM" messages containing code.
        2. **EMPTY/DEFAULT CODE**: If the code is just `// Type your code here if asked...` or empty, **SCORE MUST BE 0**.
        3. **NO CODE**: If there is no code submission in a Coding Round, likely score < 40.
        4. **STRICT GRADING**: Do not be generous. If they didn't write code for a coding question, they FAILED.

        Output ONLY valid JSON:
        {{
            "score": <0-100 overall>,
            "metrics": {{
                "technical": <0-100>,
                "communication": <0-100>,
                "problem_solving": <0-100>,
                "confidence": <0-100>
            }},
            "summary": "2-3 sentences summary.",
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

        Your Task: Generate 2 coding questions (Data Structures & Algorithms) suitable for this role.
        Output ONLY the questions as code comments (starting with // or #).
        Do not add any introductory text.
        
        Format:
        // Question 1: [Question Text]
        // [Constraints/Examples]
        
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
