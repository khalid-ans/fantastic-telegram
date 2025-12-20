import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFolders, scheduleTask } from '../services/api'
import { HelpCircle, Wand2, Plus, Trash2, CheckCircle2, Loader2, Upload, Calendar } from 'lucide-react'

function QuizBuilder() {
    const [mode, setMode] = useState('auto')
    // Tasks List State
    const [quizzes, setQuizzes] = useState([])
    const [scheduledTime, setScheduledTime] = useState(null)

    // Form Inputs (for manual or editing)
    const [taskName, setTaskName] = useState('')
    const [selectedFolders, setSelectedFolders] = useState([])
    const [rawText, setRawText] = useState('')
    const [success, setSuccess] = useState(false)
    const [isParsing, setIsParsing] = useState(false)

    // Manual Edit State (active quiz index)
    const [editingIndex, setEditingIndex] = useState(0)

    const { data: folders = [] } = useQuery({
        queryKey: ['folders'],
        queryFn: getFolders
    })

    const scheduleMutation = useMutation({
        mutationFn: async (quizData) => {
            // We return the promise to allow Promise.all
            return scheduleTask(quizData)
        }
    })

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => setRawText(event.target.result)
        reader.readAsText(file)
    }

    const parseRawText = () => {
        if (!rawText.trim()) return
        setIsParsing(true)

        // 1. Detect Scheduling
        const scheduleRegex = /scheduled on (\d{1,2}\/\d{1,2}\/\d{4}) at (\d{1,2}(?::\d{2})?\s*(?:AM|PM))/i
        const scheduleMatch = rawText.match(scheduleRegex)
        if (scheduleMatch) {
            const [_, dateStr, timeStr] = scheduleMatch
            const [day, month, year] = dateStr.split('/')
            const timeParts = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
            if (timeParts) {
                let hour = parseInt(timeParts[1])
                const minute = parseInt(timeParts[2] || '0')
                const period = timeParts[3].toUpperCase()
                if (period === 'PM' && hour < 12) hour += 12
                if (period === 'AM' && hour === 12) hour = 0
                setScheduledTime(new Date(year, month - 1, day, hour, minute))
            }
        }

        // 2. Split by "Question" or number patterns to find multiple blocks
        // This is a simple heuristic: split by "Question:" or "Q:" or "1." if double-newline separated
        // We'll normalize newlines first
        const blocks = rawText.split(/\n\s*\n/) // Split by empty lines

        const newQuizzes = []

        // Helper to parse a single block
        const parseBlock = (block) => {
            if (!block.trim()) return null
            const lines = block.split('\n').filter(l => l.trim())
            let q = '', opts = [], corr = -1, exp = ''

            for (const line of lines) {
                const trimmed = line.trim()
                if (scheduleRegex.test(trimmed)) continue

                // Question
                if (trimmed.match(/^(Question:|Que:|Q:|\d+\.)/i) && !q) {
                    q = trimmed.replace(/^(Question:|Que:|Q:|\d+\.)\s*/i, '').trim()
                    continue
                } else if (!q && opts.length === 0) {
                    // Fallback: first line is question
                    q = trimmed
                    continue
                }

                // Answer
                if (trimmed.match(/^(Answer:|Ans:|Correct:)/i)) {
                    const ansText = trimmed.split(':')[1]?.trim().toUpperCase()
                    if (ansText) {
                        const charCode = ansText.charCodeAt(0)
                        if (charCode >= 65 && charCode <= 74) corr = charCode - 65
                        else if (charCode >= 49 && charCode <= 57) corr = parseInt(ansText) - 1
                    }
                    continue
                }

                // Explanation
                if (trimmed.match(/^(Explanation:|Exp:)/i)) {
                    exp = trimmed.replace(/^(Explanation:|Exp:)\s*/i, '').trim()
                    continue
                }

                // Option
                const optionMatch = trimmed.match(/^([A-J]\)|[A-J]\.|[1-9]\.|Option\s+\d+:?)\s*(.+)/i)
                if (optionMatch) {
                    opts.push(optionMatch[2].trim())
                } else if (opts.length > 0 && !trimmed.match(/^(Answer|Ans|Correct|Explanation|Exp)/i)) {
                    // Continuation or simple format
                    if (opts.length < 10) opts.push(trimmed)
                }
            }

            if (q && opts.length >= 2) {
                return { question: q, options: opts, correctOption: Math.max(0, corr), explanation: exp }
            }
            return null
        }

        // Try parsing blocks
        for (const block of blocks) {
            const quiz = parseBlock(block)
            if (quiz) newQuizzes.push(quiz)
        }

        // Fallback: if blocks didn't work (maybe single block text), try parsing whole text
        if (newQuizzes.length === 0) {
            const quiz = parseBlock(rawText)
            if (quiz) newQuizzes.push(quiz)
        }

        if (newQuizzes.length > 0) {
            setQuizzes(newQuizzes)
            setMode('preview') // Switch to preview checks
        }

        setIsParsing(false)
    }

    const handleManualAdd = () => {
        setQuizzes([...quizzes, {
            question: 'New Question',
            options: ['Option A', 'Option B'],
            correctOption: 0,
            explanation: ''
        }])
        setEditingIndex(quizzes.length) // Focus new one
    }

    const updateQuiz = (index, field, value) => {
        const updated = [...quizzes]
        updated[index] = { ...updated[index], [field]: value }
        setQuizzes(updated)
    }

    const updateOption = (qIndex, oIndex, value) => {
        const updated = [...quizzes]
        const newOpts = [...updated[qIndex].options]
        newOpts[oIndex] = value
        updated[qIndex].options = newOpts
        setQuizzes(updated)
    }

    const addOption = (qIndex) => {
        const updated = [...quizzes]
        if (updated[qIndex].options.length >= 10) return
        updated[qIndex].options = [...updated[qIndex].options, `Option ${String.fromCharCode(65 + updated[qIndex].options.length)}`]
        setQuizzes(updated)
    }

    const removeOption = (qIndex, oIndex) => {
        const updated = [...quizzes]
        if (updated[qIndex].options.length <= 2) return

        const newOpts = updated[qIndex].options.filter((_, i) => i !== oIndex)
        updated[qIndex].options = newOpts

        // Correct the correctOption index if it was the one removed or is now out of bounds
        if (updated[qIndex].correctOption === oIndex) {
            updated[qIndex].correctOption = 0
        } else if (updated[qIndex].correctOption > oIndex) {
            updated[qIndex].correctOption -= 1
        }

        setQuizzes(updated)
    }

    const duplicateQuiz = (index) => {
        const newQuizzes = [...quizzes]
        const clone = JSON.parse(JSON.stringify(quizzes[index]))
        newQuizzes.splice(index + 1, 0, clone)
        setQuizzes(newQuizzes)
    }

    // Bulk Submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!taskName.trim() || quizzes.length === 0 || selectedFolders.length === 0) return

        try {
            let baseTime = scheduledTime ? new Date(scheduledTime) : null

            // Schedule all quizzes
            const promises = quizzes.map((quiz, i) => {
                // Stagger times if scheduled (e.g. 5 mins apart?) 
                // For now, let's schedule them all at same time (Broadcaster queue handles concurrency)
                // OR allow user to specify interval? 
                // Requirement said: "Multiple Quizzes option" - implies bulk upload.
                const nameSuffix = quizzes.length > 1 ? ` (Part ${i + 1})` : ''

                return scheduleMutation.mutateAsync({
                    name: taskName.trim() + nameSuffix,
                    type: 'poll',
                    content: {
                        pollQuestion: quiz.question,
                        pollOptions: quiz.options,
                        correctOption: quiz.correctOption,
                        pollExplanation: quiz.explanation
                    },
                    folderIds: selectedFolders,
                    scheduledAt: baseTime ? baseTime.toISOString() : null
                })
            })

            await Promise.all(promises)
            setSuccess(true)
            setTimeout(() => {
                setSuccess(false)
                setQuizzes([])
                setTaskName('')
                setRawText('')
                setMode('auto')
            }, 3000)
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-8 animate-in pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Quiz Builder</h1>
                    <p className="text-dark-400">Create interactive quizzes (Bulk supported).</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setMode('manual'); if (quizzes.length === 0) handleManualAdd(); }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'manual' || mode === 'preview' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setMode('auto')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'auto' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400'}`}
                    >
                        Auto Parse
                    </button>
                </div>
            </header>

            {success && (
                <div className="p-4 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">All quizzes scheduled successfully!</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {mode === 'auto' ? (
                        <div className="glass rounded-2xl p-6 space-y-4">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Wand2 className="w-5 h-5 text-blue-400" /> Auto Parser</h2>
                            <textarea
                                placeholder="Paste multiple questions here..."
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                rows={15}
                                className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 font-mono text-sm resize-none"
                            />
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 cursor-pointer transition-colors text-sm">
                                    <Upload className="w-4 h-4" /> Upload File
                                    <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.md" />
                                </label>
                                <button
                                    onClick={parseRawText}
                                    className="flex-1 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold"
                                >
                                    {isParsing ? 'Parsing...' : 'Parse & Preview'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Quiz Editor for Multiple Items */}
                            {quizzes.map((quiz, idx) => (
                                <div key={idx} className="glass rounded-2xl p-6 relative group">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => duplicateQuiz(idx)}
                                            className="p-2 text-dark-500 hover:text-primary-400"
                                            title="Duplicate"
                                        >
                                            <Wand2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newQ = [...quizzes];
                                                newQ.splice(idx, 1);
                                                setQuizzes(newQ);
                                            }}
                                            className="p-2 text-dark-500 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-dark-500">Q{idx + 1}</span>
                                            <input
                                                value={quiz.question}
                                                onChange={(e) => updateQuiz(idx, 'question', e.target.value)}
                                                className="flex-1 bg-transparent border-b border-dark-700 focus:border-primary-500 focus:outline-none py-1 font-bold"
                                                placeholder="Question text"
                                            />
                                        </div>

                                        <div className="pl-8 space-y-2">
                                            {quiz.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2 group/opt">
                                                    <button
                                                        onClick={() => updateQuiz(idx, 'correctOption', oIdx)}
                                                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors ${quiz.correctOption === oIdx ? 'bg-green-500 text-white' : 'bg-dark-800 text-dark-400'}`}
                                                    >
                                                        {String.fromCharCode(65 + oIdx)}
                                                    </button>
                                                    <input
                                                        value={opt}
                                                        onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                                        className="flex-1 bg-transparent border-b border-dark-800 focus:border-primary-500 focus:outline-none text-sm py-1"
                                                    />
                                                    {quiz.options.length > 2 && (
                                                        <button
                                                            onClick={() => removeOption(idx, oIdx)}
                                                            className="text-dark-600 hover:text-red-400 opacity-0 group-hover/opt:opacity-100"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {quiz.options.length < 10 && (
                                                <button
                                                    onClick={() => addOption(idx)}
                                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-2 font-medium"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Option
                                                </button>
                                            )}
                                        </div>

                                        <div className="pl-8">
                                            <input
                                                value={quiz.explanation}
                                                onChange={(e) => updateQuiz(idx, 'explanation', e.target.value)}
                                                placeholder="Add explanation (optional)..."
                                                className="w-full bg-dark-900/30 text-xs px-3 py-2 rounded-lg text-blue-300 focus:outline-none focus:bg-dark-900/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button onClick={handleManualAdd} className="w-full py-4 rounded-xl border-2 border-dashed border-dark-700 text-dark-400 hover:border-primary-500/50 hover:text-primary-400 flex items-center justify-center gap-2 font-bold transition-all">
                                <Plus className="w-5 h-5" /> Add Another Question
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6 space-y-4">
                        <h2 className="font-bold">Settings</h2>

                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Task Name Prefix</label>
                            <input
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder="e.g. History Quiz"
                                className="w-full px-4 py-2 rounded-xl bg-dark-900/50 border border-dark-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Schedule Time</label>
                            <input
                                type="datetime-local"
                                value={scheduledTime ? new Date(scheduledTime.getTime() - (scheduledTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setScheduledTime(e.target.value ? new Date(e.target.value) : null)}
                                className="w-full px-4 py-2 rounded-xl bg-dark-900/50 border border-dark-700 text-white"
                            />
                            {scheduledTime && (
                                <p className="text-xs text-green-400 mt-1">
                                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                    {scheduledTime.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="font-bold mb-4">Select Folders</h2>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {folders.map(f => (
                                <label key={f._id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white/5 rounded-lg">
                                    <input
                                        type="checkbox"
                                        checked={selectedFolders.includes(f._id)}
                                        onChange={() => setSelectedFolders(p => p.includes(f._id) ? p.filter(id => id !== f._id) : [...p, f._id])}
                                        className="rounded border-dark-500 bg-dark-800"
                                    />
                                    <span className="text-sm">{f.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={quizzes.length === 0 || !taskName || selectedFolders.length === 0}
                        className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        Publish {quizzes.length} Questions
                    </button>
                </div>
            </div>
        </div>
    )
}

export default QuizBuilder
