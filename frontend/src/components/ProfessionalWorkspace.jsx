import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, Save, Settings, Maximize2, RotateCcw, Copy, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export const ProfessionalWorkspace = ({
    items = {
        q1: { id: 'q1', title: 'Question 1', code: '', language: 'python', desc: 'Waiting for question...' },
        q2: { id: 'q2', title: 'Question 2', code: '', language: 'javascript', desc: 'Waiting for question...' }
    },
    activeTab = 'q1',
    onStateChange, // (newState) => void
    onSubmit
}) => {
    // Local state to manage immediate UI updates before propagating up if needed, 
    // or we can just rely on props if the parent updates fast enough. 
    // For an editor, local state with debounced propagation is usually better for permances,
    // but here we'll trust the parent or just use a local ref for value and update parent on blur/change.
    // Actually, let's keep it simple: Controlled component.

    // We need to handle the case where props might be empty initially
    const safeItems = items || {
        q1: { id: 'q1', title: 'Question 1', code: '# Write your code here', language: 'python', desc: 'No question loaded.' },
    };

    const currentItem = safeItems[activeTab] || safeItems['q1'];
    const [theme, setTheme] = useState('vs-dark'); // vs-dark, light
    const textareaRef = useRef(null);
    const { success } = useToast();

    // Line Numbers Logic
    const getLineNumbers = (code) => {
        const lines = code.split('\n').length;
        return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n');
    };

    const handleCodeChange = (e) => {
        const newCode = e.target.value;
        onStateChange({
            ...safeItems,
            [activeTab]: {
                ...currentItem,
                code: newCode
            }
        });
    };

    const handleTabChange = (tabId) => {
        // Just notify parent to switch tab ? Or handle internal state for activeTab?
        // Let's assume the parent controlls the activeTab as well for full state lifting,
        // BUT the implementation plan said "State preservation".
        // Let's pass the activeTab change request up.
        onStateChange(safeItems, tabId);
        // Wait, onStateChange signature needs to be clear.
        // Let's change the props to: items, activeTabId, onChange(items, activeTabId)
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border border-[#333] shadow-2xl rounded-lg overflow-hidden font-sans text-sm">
            {/* Top Bar: Tabs & Actions */}
            <div className="flex bg-[#252526] h-10 items-center px-0 border-b border-[#1e1e1e]">
                {/* Tabs */}
                <div className="flex h-full overflow-x-auto">
                    {Object.values(safeItems).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onStateChange(safeItems, item.id)}
                            className={`flex items-center px-4 h-full border-r border-[#1e1e1e] min-w-[120px] max-w-[200px] truncate transition-colors
                                ${activeTab === item.id
                                    ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                                    : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]'}`}
                        >
                            <span className="truncate text-xs font-medium">{item.title}</span>
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1 bg-[#252526] draggable-region"></div>

                {/* Toolbar Actions */}
                <div className="flex items-center px-2 gap-2 bg-[#252526]">
                    <select
                        value={currentItem.language}
                        onChange={(e) => {
                            onStateChange({
                                ...safeItems,
                                [activeTab]: { ...currentItem, language: e.target.value }
                            }, activeTab);
                        }}
                        className="bg-[#3c3c3c] text-[#ccccc7] text-xs border-none rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="react">React (JSX)</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>


                    <button
                        onClick={() => {
                            if (onSubmit) {
                                onSubmit(currentItem);
                                success('Code submitted successfully!');
                            }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                    >
                        <CheckCircle size={12} />
                        <span>Submit</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Description Panel (Collapsible/Resizable could be nice, but keep it fixed 30% for now) */}
                <div className="w-1/3 bg-[#1e1e1e] border-r border-[#333] flex flex-col">
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                        <h3 className="text-gray-200 font-bold text-lg mb-2">{currentItem.title}</h3>
                        <div className="prose prose-invert prose-sm">
                            <p className="text-gray-400 leading-relaxed text-sm whitespace-pre-wrap">{currentItem.desc}</p>
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative flex flex-col bg-[#1e1e1e]">

                    {/* Editor Container */}
                    <div className="flex-1 flex relative font-mono text-sm overflow-hidden">

                        {/* Line Numbers */}
                        <div className="w-12 bg-[#1e1e1e] text-[#858585] text-right pr-3 pt-4 select-none border-r border-[#333] leading-6">
                            <pre className="font-mono text-xs">{getLineNumbers(currentItem.code)}</pre>
                        </div>

                        {/* Textarea Area */}
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={currentItem.code}
                                onChange={handleCodeChange}
                                className="absolute inset-0 w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 pt-4 leading-6 border-none outline-none resize-none whitespace-pre tab-4"
                                spellCheck="false"
                                placeholder="// Write your code here..."
                                style={{
                                    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                                    lineHeight: "1.5rem"
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        const start = e.target.selectionStart;
                                        const end = e.target.selectionEnd;
                                        const newValue = currentItem.code.substring(0, start) + "    " + currentItem.code.substring(end);

                                        onStateChange({
                                            ...safeItems,
                                            [activeTab]: {
                                                ...currentItem,
                                                code: newValue
                                            }
                                        }, activeTab);

                                        // Async set selection needed because React rerender
                                        setTimeout(() => {
                                            if (textareaRef.current) {
                                                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
                                            }
                                        }, 0);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Status Bar */}
                    <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-xs justify-between select-none">
                        <div className="flex items-center gap-4">
                            <span>Ready</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Ln {currentItem.code.substr(0, textareaRef.current?.selectionStart || 0).split('\n').length}, Col 1</span>
                            <span>UTF-8</span>
                            <span>{currentItem.language.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
