import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasks, undoTask, getUsers } from '../services/api'
import { History as HistoryIcon, Clock, CheckCircle2, AlertCircle, Loader2, Search, RotateCcw, Filter, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function History() {
    const { isAdmin } = useAuth()
    const [search, setSearch] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const queryClient = useQueryClient()

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
        enabled: isAdmin
    })

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', selectedUserId],
        queryFn: () => getTasks(selectedUserId)
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
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'processing':
                return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-500" />
            case 'partially_completed':
                return <CheckCircle2 className="w-5 h-5 text-amber-500" />
            case 'undone':
                return <RotateCcw className="w-5 h-5 text-violet-500" />
            default:
                return <Clock className="w-5 h-5 text-amber-500" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-50 text-green-700 border border-green-200'
            case 'processing': return 'bg-blue-50 text-blue-700 border border-blue-200'
            case 'failed': return 'bg-red-50 text-red-700 border border-red-200'
            case 'partially_completed': return 'bg-amber-50 text-amber-700 border border-amber-200'
            case 'undone': return 'bg-violet-50 text-violet-700 border border-violet-200'
            default: return 'bg-amber-50 text-amber-700 border border-amber-200'
        }
    }

    return (
        <div className="space-y-8 animate-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Broadcast History</h1>
                    <p className="text-gray-500">Review and manage your previous broadcasts.</p>
                </div>

                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="pl-9 pr-8 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:outline-none text-sm text-gray-600 appearance-none min-w-[150px] shadow-sm"
                            >
                                <option value="">My Broadcasts</option>
                                <option value="all">All Users</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none w-64 shadow-sm transition-all text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-gray-100">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Task</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Recipients</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Scheduled Time</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="py-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                                </td>
                            </tr>
                        ) : filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="py-12 text-center text-gray-500">
                                    {search ? 'No tasks match your search.' : 'No broadcast history yet.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task) => (
                                <tr key={task.taskId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-gray-900">{task.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                                    {task.content?.text || task.content?.pollQuestion || "No content"}
                                                </p>
                                                {task.content?.mediaUrl && (
                                                    <span className="px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 text-[10px] font-bold border border-primary-100">
                                                        MEDIA
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold capitalize border border-gray-200">
                                            {task.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{task.recipientCount}</td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-700">
                                                {new Date(task.scheduledAt || task.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-gray-400">
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
                                                className="p-2 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all group border border-gray-200 hover:border-red-200"
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
