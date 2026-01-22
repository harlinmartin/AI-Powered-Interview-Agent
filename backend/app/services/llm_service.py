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
        history: List[models.Message]
    ) -> str:
        if not self.client:
            print("WARNING: GROQ_API_KEY not found. Using Mock Response.")
            return f"Rank: Mock AI Response. I heard you say: '{user_message}'. (Set GROQ_API_KEY in backend/.env to get real AI responses)"

        # Construc Prompt
        system_prompt = f"""You are an expert technical interviewer.
        Job Description: {job_description}
        
        Candidate Context (Resume Matches): {context}
        
        Your Goal: Conduct a professional technical interview.
        1. LEVEL: Ask **BASIC to MEDIUM** difficulty questions. Do NOT ask advanced or expert-level questions.
        2. SOURCE: Strictly based on the Candidate's Resume. If the resume is empty, ask generic basic software questions.
        3. ACKNOWLEDGE: Very briefly acknowledge the answer (e.g. "Okay", "I see") before asking the next question.
        4. CONCISENESS: Keep your response relatively short (max 2-3 sentences). Ask ONE clear question at a time.
        5. TONE: Friendly, patient, and encouraging.
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
        1. Calculate an ATS Score (0-100) based on keyword matching and relevance.
        2. Identify MISSING keywords from the JD that are critical.
        3. Identify formatting issues (e.g. headers, columns - assume text input context).
        4. REWRITE the "Summary" and "Skills" sections to be perfectly optimized for this JD.

        Output ONLY valid JSON:
        {{
            "ats_score": <int>,
            "missing_keywords": ["list", "of", "keywords"],
            "formatting_issues": ["list", "of", "issues"],
            "optimized_content": "Markdown formatted string with Improved Summary and Skills sections."
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
        for msg in transcript_messages:
            role = "Interviewer (AI)" if msg.role == "assistant" else "Candidate (User)"
            transcript_text += f"{role}: {msg.content}\n"

        system_prompt = """You are an Expert Interview Coach.
        
        JOB DESCRIPTION:
        {job_description}

        INTERVIEW TRANSCRIPT:
        {transcript_text}

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

llm_service = LLMService()
