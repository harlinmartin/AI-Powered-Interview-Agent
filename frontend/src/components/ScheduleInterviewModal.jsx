import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Briefcase, FileText, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { COMPANIES, ROUND_TYPES, EXPERIENCE_LEVELS, ROLES } from '../utils/constants';
import { useToast } from '../contexts/ToastContext';

export const ScheduleInterviewModal = ({ isOpen, onClose, onStart }) => {
    const { error: toastError } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        company: '',
        position: 'Backend Developer (Django)',
        roundType: '',
        difficulty: 'Medium',
        file: null
    });

    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData(prev => ({ ...prev, company: '', roundType: '', file: null }));
        }
    }, [isOpen]);

    // Filter companies
    useEffect(() => {
        if (formData.company) {
            const filtered = COMPANIES.filter(c => c.toLowerCase().includes(formData.company.toLowerCase()));
            setFilteredCompanies(filtered);
        } else {
            setFilteredCompanies([]);
        }
    }, [formData.company]);

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        try {
            setLoading(true);
            // Construct the composite JD string for the backend
            const compositeAndContext = `
TARGET COMPANY: ${formData.company || 'General'}
JOB POSITION: ${formData.position}
ROUND TYPE: ${formData.roundType}
DIFFICULTY: ${formData.difficulty}

CONTEXT:
${ROLES[formData.position] || 'Standard interview process.'}
            `.trim();

            await onStart(formData.file, compositeAndContext, formData.roundType, formData.difficulty);
            onClose();
        } catch (error) {
            console.error("Failed to start interview:", error);
            // Optional: alert user here if not handled in store
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[600px] flex overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Left Sidebar */}
                <div className="w-64 bg-gray-50 p-6 border-r border-gray-100 flex flex-col justify-between hidden md:flex">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-1">Schedule Interview</h2>
                        <p className="text-xs text-gray-500 mb-8">Configure your interview session</p>

                        <div className="space-y-2">
                            <StepItem step={1} currentStep={step} icon={<Briefcase size={16} />} label="Job & Configuration" />
                            <StepItem step={2} currentStep={step} icon={<FileText size={16} />} label="Resume Upload" />
                            <StepItem step={3} currentStep={step} icon={<Calendar size={16} />} label="Start Interview" />
                        </div>
                    </div>

                    <div className="text-xs text-gray-400">
                        Step {step} of 3
                        <div className="w-full bg-gray-200 h-1 rounded-full mt-2">
                            <div
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header (Mobile only) */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center md:hidden">
                        <h2 className="font-bold">Schedule Interview</h2>
                        <button onClick={onClose}><X size={20} /></button>
                    </div>

                    {/* Header (Desktop) */}
                    <div className="p-4 flex justify-end hidden md:flex">
                        <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto">
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">Job & Configuration</h3>
                                    <p className="text-gray-500 text-sm">Select the job position, round type, and difficulty.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Company Selection */}
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Company</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholder="Search company (e.g. Google)..."
                                            value={formData.company}
                                            onChange={(e) => {
                                                setFormData({ ...formData, company: e.target.value });
                                                setShowCompanyDropdown(true);
                                            }}
                                        />
                                        {showCompanyDropdown && formData.company && filteredCompanies.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-40 overflow-y-auto">
                                                {filteredCompanies.map(c => (
                                                    <div
                                                        key={c}
                                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                        onClick={() => {
                                                            setFormData({ ...formData, company: c });
                                                            setShowCompanyDropdown(false);
                                                        }}
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {formData.company && COMPANIES.includes(formData.company) && (
                                            <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                                Company context loaded for {formData.company}.
                                            </div>
                                        )}
                                    </div>

                                    {/* Job Position */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Position <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white mb-2"
                                            value={Object.keys(ROLES).includes(formData.position) ? formData.position : 'Custom'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'Custom') {
                                                    setFormData({ ...formData, position: '' });
                                                } else {
                                                    setFormData({ ...formData, position: val });
                                                }
                                            }}
                                        >
                                            <option value="" disabled>Select Role</option>
                                            {Object.keys(ROLES).map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>

                                        {(!Object.keys(ROLES).includes(formData.position) || formData.position === '') && (
                                            <input
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none animate-in fade-in slide-in-from-top-2"
                                                placeholder="Enter custom job position..."
                                                value={formData.position}
                                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                                autoFocus
                                            />
                                        )}
                                    </div>

                                    {/* Round Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Round Type <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                            value={formData.roundType}
                                            onChange={(e) => setFormData({ ...formData, roundType: e.target.value })}
                                        >
                                            <option value="" disabled>Choose round type</option>
                                            {ROUND_TYPES.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        <div className="mt-2 space-y-1">
                                            {ROUND_TYPES.slice(0, 3).map((type) => (
                                                <div
                                                    key={type}
                                                    className={`p-2 rounded border cursor-pointer text-sm flex items-center justify-between ${formData.roundType === type ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
                                                    onClick={() => setFormData({ ...formData, roundType: type })}
                                                >
                                                    {type}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Difficulty */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                                        <div className="flex gap-2">
                                            {EXPERIENCE_LEVELS.map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => setFormData({ ...formData, difficulty: level })}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${formData.difficulty === level
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">Resume Upload</h3>
                                    <p className="text-gray-500 text-sm">Upload your resume to personalize the questions.</p>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition cursor-pointer relative h-64 flex flex-col items-center justify-center">
                                    <input
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                                                if (!validTypes.includes(file.type)) {
                                                    toastError("Invalid file type. Please upload a PDF or Image.");
                                                    return;
                                                }
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toastError("File too large. Max 5MB.");
                                                    return;
                                                }
                                                setFormData({ ...formData, file });
                                            }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {formData.file ? (
                                        <div className="text-blue-600">
                                            <CheckCircle2 size={48} className="mx-auto mb-4" />
                                            <p className="font-medium text-lg">{formData.file.name}</p>
                                            <p className="text-sm text-gray-400 mt-2">{(formData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <p className="text-sm text-blue-500 mt-4">Click to change file</p>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">
                                            <Upload size={48} className="mx-auto mb-4" />
                                            <p className="font-medium text-lg text-gray-600">Click to upload or drag and drop</p>
                                            <p className="text-sm mt-2">PDF files only (Max 5MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">Start Interview</h3>
                                    <p className="text-gray-500 text-sm">Verify your details before starting.</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                    <div className="flex justify-between border-b border-gray-200 pb-3">
                                        <span className="text-gray-500">Company</span>
                                        <span className="font-medium text-gray-900">{formData.company || 'Not Specified'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-3">
                                        <span className="text-gray-500">Position</span>
                                        <span className="font-medium text-gray-900">{formData.position}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-3">
                                        <span className="text-gray-500">Round Type</span>
                                        <span className="font-medium text-gray-900">{formData.roundType}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-200 pb-3">
                                        <span className="text-gray-500">Difficulty</span>
                                        <span className={`font-medium px-2 py-0.5 rounded text-sm ${formData.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                            formData.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {formData.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Resume</span>
                                        <span className="font-medium text-blue-600 flex items-center gap-1">
                                            <FileText size={14} />
                                            {formData.file ? formData.file.name : 'No file uploaded'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                            >
                                Back
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={step === 1 && (!formData.position || !formData.roundType)}
                                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.file}
                                className="px-8 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Initializing Session...' : 'Start Interview'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StepItem = ({ step, currentStep, icon, label }) => {
    const isActive = step === currentStep;
    const isCompleted = step < currentStep;

    return (
        <div className={`p-3 rounded-lg flex items-center gap-3 transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isActive ? 'bg-blue-600 text-white' :
                isCompleted ? 'bg-blue-100 text-blue-600' : 'bg-gray-200'
                }`}>
                {isCompleted ? <CheckCircle2 size={16} /> : icon}
            </div>
            <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                {label}
            </span>
        </div>
    );
};
