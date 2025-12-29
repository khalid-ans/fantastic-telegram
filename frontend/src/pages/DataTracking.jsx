import { useQuery } from '@tanstack/react-query'
import { getTasks, exportAnalytics, updateTaskMetrics, getUsers } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
    Eye, Forward, MessageSquare, Heart,
    TrendingUp, RefreshCw, Download, Calendar,
    User, Hash, CheckCircle, Shield, Filter
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

function DataTracking() {
    const { isAdmin } = useAuth()
    const [isDownloading, setIsDownloading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })
    const [syncingTaskId, setSyncingTaskId] = useState(null)
    const [selectedUserId, setSelectedUserId] = useState('')

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: getUsers,
        enabled: isAdmin
    })

    const { data: tasks = [], refetch, isLoading } = useQuery({
        queryKey: ['tasks', selectedUserId],
        queryFn: () => getTasks(selectedUserId)
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
            engagement: msg.metrics?.views + msg.metrics?.reactions + msg.metrics?.replies || 0,
            voters: msg.metrics?.voters || 0,
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
            await api.clearHistory(isAdmin) // Admin can clear all if they want, but here we just clear their view (as per backend logic)
            refetch()
        } catch (error) {
            console.error('Clear failed:', error)
            alert('Error clearing history: ' + (error.response?.data?.error || error.message))
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

    // Calculate Trends
    const now = new Date()
    const currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const getMetricsForPeriod = (start, end) => {
        return flattenedData.filter(m => {
            const date = new Date(m.createdAt) // Use task creation time for aggregation
            return date >= start && date < end
        }).reduce((acc, m) => ({
            views: acc.views + m.views,
            messages: acc.messages + 1,
            engagement: acc.engagement + m.views + m.reactions + m.comments,
            voters: acc.voters + (m.voters || 0)
        }), { views: 0, messages: 0, engagement: 0, voters: 0 })
    }

    const currentMetrics = getMetricsForPeriod(currentPeriodStart, now)
    const previousMetrics = getMetricsForPeriod(previousPeriodStart, currentPeriodStart)

    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%'
        const growth = ((current - previous) / previous) * 100
        return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
    }

    const totalVoters = flattenedData.reduce((sum, m) => sum + (m.voters || 0), 0)

    const stats = [
        { icon: Eye, label: 'Total Views', value: totalViews, color: 'text-blue-500', trend: calculateTrend(currentMetrics.views, previousMetrics.views) },
        { icon: MessageSquare, label: 'Total Messages', value: flattenedData.length, color: 'text-purple-500', trend: calculateTrend(currentMetrics.messages, previousMetrics.messages) },
        { icon: Heart, label: 'Engagement', value: totalEngagement, color: 'text-pink-500', trend: calculateTrend(currentMetrics.engagement, previousMetrics.engagement) },
        { icon: CheckCircle, label: 'Quiz Participation', value: totalVoters, color: 'text-green-500', trend: calculateTrend(currentMetrics.voters, previousMetrics.voters) },
    ]

    return (
        <div className="space-y-8 animate-in p-2">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="relative">
                    <h1 className="text-4xl font-black mb-2 tracking-tight text-gray-900">Data Tracking</h1>
                    <p className="text-gray-500 max-w-lg">Monitor every broadcast interaction in real-time. Export detailed reports for deep analysis.</p>

                    {isSyncing && (
                        <div className="absolute -bottom-6 left-0 flex items-center gap-2 text-[10px] font-bold text-primary-600 uppercase tracking-widest animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Syncing Live Metrics... {syncProgress.current}/{syncProgress.total}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {isAdmin && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="pl-9 pr-8 h-12 rounded-xl bg-white border border-gray-200 focus:border-primary-500 focus:outline-none text-sm text-gray-600 appearance-none min-w-[150px] shadow-sm"
                            >
                                <option value="">My Tracking</option>
                                <option value="all">Global Tracking</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={handleClearHistory}
                        disabled={flattenedData.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-50 hover:bg-red-100 hover:text-red-700 transition-all font-bold text-red-600 border border-red-200 disabled:opacity-50"
                        title="Clear History"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Clear History
                    </button>
                    <button
                        onClick={handleSyncMetrics}
                        disabled={isSyncing || isLoading || tasks.length === 0}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-95 transition-all font-bold text-white border border-gray-900 disabled:opacity-50"
                    >
                        <TrendingUp className={`w-5 h-5 ${isSyncing ? 'text-yellow-400 animate-pulse' : 'text-gray-200'}`} />
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
                        className="md:w-12 h-12 flex items-center justify-center rounded-xl bg-white hover:bg-gray-50 active:scale-90 transition-all border border-gray-200 text-gray-700"
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
                        className="bg-white rounded-2xl p-6 relative overflow-hidden group border border-gray-100 card-shadow"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.color.replace('text', 'bg')}/10`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-gray-500 mb-1">{stat.label}</p>
                        <p className="text-3xl font-black tracking-tight text-gray-900">{stat.value.toLocaleString()}</p>
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.color.replace('text', 'bg')}/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-500`} />
                    </motion.div>
                ))}
            </div>

            {/* Detailed Tracking Table Section */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden card-shadow">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center border border-primary-100">
                            <TrendingUp className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Detailed Tracking Sheet</h2>
                            <p className="text-xs text-gray-500">Message-level engagement performance (Live from Telegram)</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs uppercase tracking-widest text-gray-500 font-bold bg-gray-50">
                                <th className="px-6 py-4 border-b border-gray-100 w-12 text-center">#</th>
                                <th className="px-4 py-4 border-b border-gray-100 min-w-[120px]">Task ID</th>
                                <th className="px-4 py-4 border-b border-gray-100 min-w-[150px]">Task Name</th>
                                <th className="px-4 py-4 border-b border-gray-100 min-w-[150px]">Chat ID</th>
                                <th className="px-4 py-4 border-b border-gray-100">Msg ID</th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center">Status</th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center"><Eye className="w-4 h-4 mx-auto" title="Views" /></th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center"><Forward className="w-4 h-4 mx-auto" title="Forwards" /></th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center"><Heart className="w-4 h-4 mx-auto" title="Reactions" /></th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center"><MessageSquare className="w-4 h-4 mx-auto" title="Comments" /></th>
                                <th className="px-4 py-4 border-b border-gray-100 text-center"><CheckCircle className="w-4 h-4 mx-auto" title="Voters" /></th>
                                <th className="px-4 py-4 border-b border-gray-100 min-w-[180px]">Last Updated</th>
                                <th className="px-4 py-4 border-b border-gray-100 w-12 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {flattenedData.length > 0 ? (
                                flattenedData.map((row, idx) => (
                                    <tr key={`${row.taskId}-${row.chatId}-${row.messageId}`} className="hover:bg-gray-50 transition-colors group cursor-default">
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs text-center">{idx}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3 h-3 text-gray-400" />
                                                <span className="font-mono text-xs font-medium text-gray-500 group-hover:text-primary-600 transition-colors uppercase">
                                                    {row.taskId.slice(-8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-sm text-gray-900">{row.taskName}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-gray-400" />
                                                <span className="font-mono text-xs text-gray-500">{row.chatId}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-xs text-gray-500">{row.messageId}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${row.status === 'sent' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                                                }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-700">{row.views}</td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-700">{row.forwards}</td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-700">{row.reactions}</td>
                                        <td className="px-4 py-4 text-center font-bold text-gray-700">{row.comments}</td>
                                        <td className="px-4 py-4 text-center font-bold text-green-600 bg-green-50/50 rounded-lg">{row.voters > 0 ? row.voters : '-'}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-gray-500">
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
                                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary-600 disabled:opacity-30"
                                                title="Sync Live Metrics from Telegram"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${syncingTaskId === row.taskId ? 'animate-spin' : ''}`} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="13" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center grayscale opacity-50">
                                            <Shield className="w-12 h-12 mb-4 text-gray-300" />
                                            <p className="text-lg font-bold text-gray-500">No tracking data available</p>
                                            <p className="text-sm text-gray-400">Run a broadcast to see detailed message performance.</p>
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
