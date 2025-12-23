import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasks, undoTask } from '../services/api'
import { History as HistoryIcon, Clock, CheckCircle2, AlertCircle, Loader2, Search, RotateCcw } from 'lucide-react'
import { useState } from 'react'

function History() {
    const [search, setSearch] = useState('')
    const queryClient = useQueryClient()

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks
    })

    const filteredTasks = tasks.filter(task =>
        task.name.toLowerCase().includes(search.toLowerCase())
    )

    const handleUndo = async (taskId) => {
        if (!confirm('Are you sure you want to undo this broadcast? This will delete the messages for all recipients.')) return
        try {
            await undoTask(taskId)
            alert('Undo request sent successfully.')
            // Refresh tasks so UI reflects undo (status & button visibility)
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        } catch (err) {
            alert('Failed to undo broadcast: ' + (err.response?.data?.error || err.message))
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-400" />
            case 'processing':
                return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-400" />
            case 'partially_completed':
                return <CheckCircle2 className="w-5 h-5 text-amber-300" />
            case 'undone':
                return <RotateCcw className="w-5 h-5 text-violet-400" />
            default:
                return <Clock className="w-5 h-5 text-amber-400" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-400'
            case 'processing': return 'bg-blue-500/20 text-blue-400'
            case 'failed': return 'bg-red-500/20 text-red-400'
            case 'partially_completed': return 'bg-amber-500/20 text-amber-300'
            case 'undone': return 'bg-violet-500/20 text-violet-400'
            default: return 'bg-amber-500/20 text-amber-400'
        }
    }

    return (
        <div className="space-y-8 animate-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Broadcast History</h1>
                    <p className="text-dark-400">Review and manage your previous broadcasts.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 rounded-xl bg-dark-800 border border-dark-700 focus:border-primary-500 focus:outline-none w-64"
                    />
                </div>
            </header>

            <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-dark-800/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-400 uppercase tracking-wider">Task</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-400 uppercase tracking-wider">Recipients</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-400 uppercase tracking-wider">Scheduled Time</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-dark-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto" />
                                </td>
                            </tr>
                        ) : filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-12 text-center text-dark-400">
                                    {search ? 'No tasks match your search.' : 'No broadcast history yet.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task) => (
                                <tr key={task.taskId} className="hover:bg-dark-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium">{task.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-dark-500 truncate max-w-[200px]">
                                                    {task.content?.text || task.content?.pollQuestion || "No content"}
                                                </p>
                                                {task.content?.mediaUrl && (
                                                    <span className="px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 text-[10px] font-bold border border-primary-500/20">
                                                        MEDIA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-dark-700 text-xs font-medium capitalize">
                                            {task.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold">{task.recipientCount}</td>
                                    <td className="px-6 py-4 text-dark-400 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-dark-200">
                                                {new Date(task.scheduledAt || task.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-dark-500">
                                                {new Date(task.scheduledAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                            {getStatusIcon(task.status)}
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(task.status === 'completed' || task.status === 'partially_completed') && task.sentMessages?.length > 0 && (
                                            <button
                                                onClick={() => handleUndo(task.taskId)}
                                                className="p-2 rounded-lg bg-dark-700 hover:bg-red-500/20 text-dark-300 hover:text-red-400 transition-all group"
                                                title="Undo / Delete sent messages"
                                            >
                                                <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default History
