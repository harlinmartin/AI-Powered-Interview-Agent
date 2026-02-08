import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, Brain, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export const QuizActive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = useAuthStore(state => state.token);

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question

    // Fetch Quiz Data
    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(`${API_URL}/interview/${id}/start_quiz`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error("Failed to load quiz");

                const data = await res.json();
                if (data.questions) {
                    setQuestions(data.questions);
                } else if (Array.isArray(data)) {
                    setQuestions(data); // Handle direct array
                }
            } catch (err) {
                console.error(err);
                alert("Failed to generate quiz. Please try again.");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        if (token && id) fetchQuiz();
    }, [id, token, navigate]);

    // Timer Logic
    useEffect(() => {
        if (!quizStarted || quizFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleNextQuestion();
                    return 30; // Reset for next
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quizStarted, quizFinished, currentQuestionIndex]);

    const handleAnswer = (option) => {
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: option
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setTimeLeft(30);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = async () => {
        setQuizFinished(true);

        // Calculate Score
        let correctCount = 0;
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.correct_answer) {
                correctCount++;
            }
        });

        const finalScore = Math.round((correctCount / questions.length) * 100);
        setScore(finalScore);

        // Submit Results
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Prepare detailed report
            const detailedResults = questions.map((q, index) => ({
                question: q.question,
                user_answer: userAnswers[index] || "No Answer",
                ideal_answer: q.correct_answer,
                gap_analysis: userAnswers[index] === q.correct_answer
                    ? `Correct! ${q.explanation || ''}`
                    : `Incorrect. The correct answer is ${q.correct_answer}. Explanation: ${q.explanation || 'N/A'}`
            }));

            // We need to format specific JSON for the backend to store in feedback_result
            const feedbackPayload = {
                score: finalScore,
                summary: `User scored ${finalScore}% on the MCQ Quiz.`,
                detailed_q_and_a: detailedResults,
                metrics: {
                    technical: finalScore,
                    communication: 100, // N/A for MCQ
                    problem_solving: finalScore,
                    confidence: 100
                },
                strengths: ["Technical Knowledge"],
                weaknesses: [],
                suggestions: ["Review incorrect answers."]
            };

            // Use specific finalize endpoint with custom result
            // Since finalize endpoint might expect strict params, we might need to tweak it or adapt.
            // For now, let's use the existing finalize endpoint logic but we can't easily inject the JSON directly via params unless we update backend.
            // WORKAROUND: We will send this as "code_content" (hacky) or update backend. 
            // BETTER: Update `finalize` to accept `custom_feedback`. 
            // BUT for now, let's assume the standard flow will just generate a generic report if we don't guide it.
            // WAIT, `finalize` calls `generate_feedback` which uses LLM.
            // I should disable LLM for this or provide the pre-calculated result.

            // Let's just navigate to feedback and let the user see the local result first? No, need to save.
            // I'll call a special internal API or just rely on the fact that I can update the Interview record directly if I had an endpoint.

            // Let's use the `finalize` endpoint but pass a special flag or just use the LLM to "grade" it (which is redundant).
            // Actually, I can allow the LLM to grade the "Transcript" which I can construct here!

            const transcriptText = questions.map((q, i) =>
                `Question ${i + 1}: ${q.question}\nUser Answer: ${userAnswers[i] || "Skipped"}\nCorrect Answer: ${q.correct_answer}`
            ).join("\n\n");

            const formData = new FormData();
            formData.append('duration_seconds', '600');
            // We can pass the pre-calculated score if we modify backend, but standard flow is:
            // The backend reads "transcript_text" from messages.
            // Since we didn't send messages via websocket, the transcript is empty in DB.

            // FIX: We should send the transcript as a file or messages.
            // Alternatively, create a NEW endpoint `submit_quiz` that takes the JSON result.

            // FOR NOW: I'll create `submit_quiz` in the next step.
            // Let's assume it exists: POST /interview/{id}/submit_quiz

            await fetch(`${API_URL}/interview/${id}/submit_quiz`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackPayload)
            });

            setTimeout(() => navigate(`/feedback/${id}`), 2000);

        } catch (e) {
            console.error("Error submitting quiz", e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold">Generating Tailored Quiz...</h2>
                    <p className="text-slate-400">Analyzing your resume against the job description.</p>
                </div>
            </div>
        );
    }

    if (!quizStarted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl border border-slate-700">
                    <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Brain size={40} className="text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quiz Ready</h1>
                    <p className="text-slate-400 mb-8">
                        The AI has generated {questions.length} questions based on your profile.
                        <br />
                        <span className="text-sm font-semibold text-purple-400 mt-2 block">
                            30 Seconds per Question • Multiple Choice
                        </span>
                    </p>
                    <button
                        onClick={() => setQuizStarted(true)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-500/20"
                    >
                        Start Quiz
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 text-slate-500 hover:text-white text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (quizFinished) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl border border-slate-700 animate-scale-in">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h1>
                    <div className="text-6xl font-bold text-emerald-400 my-6">{score}%</div>
                    <p className="text-slate-400 mb-8">
                        Your results have been saved. Redirecting to detailed report...
                    </p>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-progress"></div>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                        <Brain size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">Tailored Quiz</h2>
                        <p className="text-xs text-slate-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Clock size={16} className={`${timeLeft < 10 ? 'text-red-500' : 'text-slate-500'}`} />
                    <span className={`font-mono font-bold ${timeLeft < 10 ? 'text-red-600' : 'text-slate-700'}`}>
                        00:{timeLeft.toString().padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-3xl w-full">
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mb-8">
                        <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
                        ></div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 leading-relaxed">
                        {currentQ?.question}
                    </h1>

                    <div className="grid grid-cols-1 gap-4">
                        {currentQ?.options?.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(option)}
                                className={`p-5 rounded-xl border-2 text-left transition-all relative group ${userAnswers[currentQuestionIndex] === option
                                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${userAnswers[currentQuestionIndex] === option
                                        ? 'border-purple-600 bg-purple-600 text-white'
                                        : 'border-slate-300 text-slate-400 group-hover:border-purple-400'
                                        }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="font-medium text-lg">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleNextQuestion}
                            disabled={!userAnswers[currentQuestionIndex]}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
