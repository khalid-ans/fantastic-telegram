import { useQuery } from '@tanstack/react-query'
import { getTasks, exportAnalytics, updateTaskMetrics } from '../services/api'
import {
    Eye, Forward, MessageSquare, Heart,
    TrendingUp, RefreshCw, Download, Calendar,
    User, Hash, CheckCircle, Shield
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

function DataTracking() {
    const [isDownloading, setIsDownloading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })
    const [syncingTaskId, setSyncingTaskId] = useState(null)

    const { data: tasks = [], refetch, isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: getTasks
    })

    const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'partially_completed')

    // Flatten all sent messages for the detailed sheet
    const flattenedData = tasks.flatMap(task =>
        (task.sentMessages || []).map(msg => ({
            taskId: task.taskId,
            taskName: task.name,
            chatId: msg.recipientId,
            messageId: msg.messageId,
            status: task.status === 'undone' ? 'undone' : 'sent',
            views: msg.metrics?.views || 0,
            forwards: msg.metrics?.forwards || 0,
            reactions: msg.metrics?.reactions || 0,
            comments: msg.metrics?.replies || 0,
            lastUpdated: msg.metrics?.updatedAt || task.updatedAt || task.createdAt,
            createdAt: task.createdAt // Maintain original creation time for sorting
        }))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by Task Creation Time (Newest First)

    const handleDownload = async () => {
        try {
            setIsDownloading(true)
            const blob = await exportAnalytics()
            const url = window.URL.createObjectURL(new Blob([blob]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `broadcast-analytics-${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
            alert('Failed to download analytics. Please try again.')
        } finally {
            setIsDownloading(false)
        }
    }

    const handleClearHistory = async () => {
        if (!window.confirm('Are you sure you want to clear all tracking history? This cannot be undone.')) return

        try {
            const response = await fetch('http://localhost:5000/api/tasks/history', { method: 'DELETE' })
            if (response.ok) {
                refetch()
            } else {
                alert('Failed to clear history')
            }
        } catch (error) {
            console.error('Clear failed:', error)
            alert('Error clearing history')
        }
    }

    const handleSyncMetrics = async () => {
        const tasksWithMessages = tasks.filter(t => t.sentMessages && t.sentMessages.length > 0)
        if (tasksWithMessages.length === 0) return

        try {
            setIsSyncing(true)
            setSyncProgress({ current: 0, total: tasksWithMessages.length })

            for (let i = 0; i < tasksWithMessages.length; i++) {
                const task = tasksWithMessages[i]
                setSyncProgress(prev => ({ ...prev, current: i + 1 }))
                try {
                    await updateTaskMetrics(task.taskId)
                } catch (e) {
                    console.error(`Failed to sync metrics for task ${task.taskId}:`, e)
                }
            }
            await refetch()
        } catch (error) {
            console.error('Sync failed:', error)
        } finally {
            setIsSyncing(false)
            setSyncProgress({ current: 0, total: 0 })
        }
    }

    const handleSingleSync = async (taskId) => {
        try {
            setSyncingTaskId(taskId)
            await updateTaskMetrics(taskId)
            await refetch()
        } catch (error) {
            console.error('Single sync failed:', error)
        } finally {
            setSyncingTaskId(null)
        }
    }

    const totalSent = tasks.reduce((sum, t) => sum + (t.results?.success || 0), 0)
    const totalViews = flattenedData.reduce((sum, m) => sum + m.views, 0)
    const totalReactions = flattenedData.reduce((sum, m) => sum + m.reactions, 0)
    const totalEngagement = totalViews + totalReactions

    const stats = [
        { icon: Eye, label: 'Total Views', value: totalViews, color: 'text-blue-400', trend: '+12%' },
        { icon: Forward, label: 'Broadcasting Status', value: totalSent > 0 ? 'Active' : 'Idle', color: 'text-green-400', trend: 'Live' },
        { icon: MessageSquare, label: 'Total Messages', value: flattenedData.length, color: 'text-purple-400', trend: '+8%' },
        { icon: Heart, label: 'Engagement', value: totalEngagement, color: 'text-pink-400', trend: '+15%' },
    ]

    return (
        <div className="space-y-8 animate-in p-2">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="relative">
                    <h1 className="text-4xl font-black mb-2 tracking-tight">Data Tracking</h1>
                    <p className="text-dark-400 max-w-lg">Monitor every broadcast interaction in real-time. Export detailed reports for deep analysis.</p>

                    {isSyncing && (
                        <div className="absolute -bottom-6 left-0 flex items-center gap-2 text-[10px] font-bold text-primary-400 uppercase tracking-widest animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Syncing Live Metrics... {syncProgress.current}/{syncProgress.total}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={handleClearHistory}
                        disabled={flattenedData.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white transition-all font-bold text-red-400 border border-red-500/20 disabled:opacity-50"
                        title="Clear History"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Clear History
                    </button>
                    <button
                        onClick={handleSyncMetrics}
                        disabled={isSyncing || isLoading || tasks.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-dark-800 hover:bg-dark-700 active:scale-95 transition-all font-bold text-white border border-dark-700 disabled:opacity-50"
                    >
                        <TrendingUp className={`w-5 h-5 ${isSyncing ? 'text-yellow-400 animate-pulse' : 'text-dark-400'}`} />
                        Sync Live Metrics
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || flattenedData.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 transition-all font-bold text-white shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:grayscale"
                    >
                        {isDownloading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                        Download Sheet
                    </button>

                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="md:w-12 h-12 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 active:scale-90 transition-all border border-dark-700"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="glass rounded-2xl p-6 relative overflow-hidden group border border-white/5"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.color.replace('text', 'bg')}/10`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-dark-500 bg-dark-800 px-2 py-1 rounded-md">
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-dark-400 mb-1">{stat.label}</p>
                        <p className="text-3xl font-black tracking-tight">{stat.value.toLocaleString()}</p>
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.color.replace('text', 'bg')}/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
                    </motion.div>
                ))}
            </div>

            {/* Detailed Tracking Table Section */}
            <section className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Detailed Tracking Sheet</h2>
                            <p className="text-xs text-dark-400">Message-level engagement performance (Live from Telegram)</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs uppercase tracking-widest text-dark-400 font-bold bg-dark-900/50">
                                <th className="px-6 py-4 border-b border-white/5 w-12 text-center">#</th>
                                <th className="px-4 py-4 border-b border-white/5 min-w-[120px]">Task ID</th>
                                <th className="px-4 py-4 border-b border-white/5 min-w-[150px]">Task Name</th>
                                <th className="px-4 py-4 border-b border-white/5 min-w-[150px]">Chat ID</th>
                                <th className="px-4 py-4 border-b border-white/5">Msg ID</th>
                                <th className="px-4 py-4 border-b border-white/5 text-center">Status</th>
                                <th className="px-4 py-4 border-b border-white/5 text-center"><Eye className="w-4 h-4 mx-auto" title="Views" /></th>
                                <th className="px-4 py-4 border-b border-white/5 text-center"><Forward className="w-4 h-4 mx-auto" title="Forwards" /></th>
                                <th className="px-4 py-4 border-b border-white/5 text-center"><Heart className="w-4 h-4 mx-auto" title="Reactions" /></th>
                                <th className="px-4 py-4 border-b border-white/5 text-center"><MessageSquare className="w-4 h-4 mx-auto" title="Comments" /></th>
                                <th className="px-4 py-4 border-b border-white/5 min-w-[180px]">Last Updated</th>
                                <th className="px-4 py-4 border-b border-white/5 w-12 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {flattenedData.length > 0 ? (
                                flattenedData.map((row, idx) => (
                                    <tr key={`${row.taskId}-${row.chatId}-${row.messageId}`} className="hover:bg-white/2 transition-colors group cursor-default">
                                        <td className="px-6 py-4 text-dark-500 font-mono text-xs text-center">{idx}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3 h-3 text-dark-500" />
                                                <span className="font-mono text-xs font-medium text-dark-300 group-hover:text-primary-400 transition-colors uppercase">
                                                    {row.taskId.slice(-8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-sm text-dark-200">{row.taskName}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-dark-500" />
                                                <span className="font-mono text-xs text-dark-400">{row.chatId}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-xs text-dark-400">{row.messageId}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${row.status === 'sent' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-dark-200">{row.views}</td>
                                        <td className="px-4 py-4 text-center font-bold text-dark-200">{row.forwards}</td>
                                        <td className="px-4 py-4 text-center font-bold text-dark-200">{row.reactions}</td>
                                        <td className="px-4 py-4 text-center font-bold text-dark-200">{row.comments}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-dark-400">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-xs">
                                                    {new Date(row.lastUpdated).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => handleSingleSync(row.taskId)}
                                                disabled={syncingTaskId === row.taskId || isSyncing}
                                                className="p-2 rounded-lg hover:bg-dark-700 transition-colors text-dark-400 hover:text-primary-400 disabled:opacity-30"
                                                title="Sync Live Metrics from Telegram"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${syncingTaskId === row.taskId ? 'animate-spin' : ''}`} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="12" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center grayscale opacity-50">
                                            <Shield className="w-12 h-12 mb-4 text-dark-500" />
                                            <p className="text-lg font-bold">No tracking data available</p>
                                            <p className="text-sm text-dark-500">Run a broadcast to see detailed message performance.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </section>
        </div>
    )
}

export default DataTracking
