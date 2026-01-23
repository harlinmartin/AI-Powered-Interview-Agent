import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code, CheckCircle, Timer, Play, FileCode } from 'lucide-react';

export const CodingTest = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [timeBox, setTimeBox] = useState(10 * 60); // 10 mins

    // Mock Problems Database
    const PROBLEMS = {
        python: {
            title: "Data Processing: Valid Anagram",
            desc: "Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
            starter: "def is_anagram(s: str, t: str) -> bool:\n    # Write your code here\n    pass"
        },
        javascript: {
            title: "Async Data Fetcher",
            desc: "Implement a function `fetchWithRetry(url, retries)` that attempts to fetch data from a URL. If it fails, it should retry up to `retries` times before throwing an error. Use async/await.",
            starter: "async function fetchWithRetry(url, retries) {\n    // Write your code here\n}"
        },
        java: {
            title: "Stream API: Employee Filter",
            desc: "Given a list of Employee objects (id, name, salary), write a method that returns a list of names of employees who earn more than 50,000, sorted alphabetically.",
            starter: "import java.util.*;\nimport java.util.stream.*;\n\nclass Solution {\n    public List<String> filterEmployees(List<Employee> employees) {\n        // Write your code here\n        return new ArrayList<>();\n    }\n}"
        },
        cpp: {
            title: "Memory Management: LRU Cache",
            desc: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class.",
            starter: "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        \n    }\n    \n    int get(int key) {\n        return -1;\n    }\n    \n    void put(int key, int value) {\n        \n    }\n};"
        }
    };

    const currentProblem = PROBLEMS[language] || PROBLEMS["python"];

    // Initialize Code
    useEffect(() => {
        if (!code) setCode(currentProblem.starter);
    }, [language]);

    // Timer
    useEffect(() => {
        if (submitted) return;
        const interval = setInterval(() => setTimeBox(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(interval);
    }, [submitted]);

    const handleSubmit = () => {
        setSubmitted(true);
        // Here we would send code to backend
        setTimeout(() => {
            // Redirect to Feedback Report
            navigate(`/feedback/${id}`);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                        <Code size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Coding Assessment</h1>
                        <p className="text-xs text-gray-400">Phase 2 of 2</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Language Selector */}
                    <div className="flex items-center gap-2">
                        <FileCode size={16} className="text-gray-400" />
                        <select
                            value={language}
                            onChange={(e) => {
                                setLanguage(e.target.value);
                                setCode(PROBLEMS[e.target.value].starter);
                            }}
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm focus:border-blue-500 outline-none"
                            disabled={submitted}
                        >
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-1 rounded-full border ${timeBox < 60 ? 'bg-red-900/30 border-red-500/50 text-red-400' : 'bg-gray-700 border-gray-600 text-yellow-400'}`}>
                        <Timer size={18} />
                        <span className="font-mono font-bold text-lg">
                            {Math.floor(timeBox / 60)}:{(timeBox % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Task */}
                <div className="w-1/3 p-8 border-r border-gray-700 overflow-y-auto bg-gray-900 flex flex-col">
                    <div className="mb-8">
                        <span className="text-xs font-bold text-blue-400 tracking-widest uppercase mb-2 block">Problem Statement</span>
                        <h2 className="text-2xl font-bold mb-4 text-white leading-tight">{currentProblem.title}</h2>
                        <div className="prose prose-invert prose-sm">
                            <p className="text-gray-300 leading-relaxed text-base">{currentProblem.desc}</p>
                        </div>
                    </div>

                    <div className="mt-auto bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-sm text-gray-400 mb-2">Instructions</h4>
                        <ul className="text-xs text-gray-500 space-y-2">
                            <li>• Use the standard libraries available in {language}.</li>
                            <li>• Optimize for Time Complexity.</li>
                            <li>• Click "Run" to test (Mocked).</li>
                            <li>• Submit when ready to finish the assessment.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Panel: Code Editor */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e]">
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 w-full bg-[#1e1e1e] text-gray-200 font-mono p-6 resize-none focus:outline-none text-sm leading-relaxed"
                        spellCheck={false}
                        disabled={submitted}
                    />
                    <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                        <button className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
                            <Play size={16} /> Run Code
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={submitted}
                            className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all ${submitted
                                ? 'bg-green-600 text-white cursor-default shadow-lg'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                }`}
                        >
                            {submitted ? (
                                <>
                                    <CheckCircle size={20} /> Submitted!
                                </>
                            ) : (
                                "Submit Solution & Get Feedback"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
