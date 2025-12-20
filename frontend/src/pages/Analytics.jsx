import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { updateTaskMetrics } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Download, BarChart2, Eye, Share2, MessageSquare, Loader2, Heart, RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react'

// New API function for this page
const getAnalytics = async () => {
    // For MVP, we fetch all tasks to show aggregate data since we don't have a separate "getAllAnalytics" endpoint yet
    // In a real app, this should be a dedicated endpoint
    const res = await api.get('/tasks')
    return res.data
}

const exportDatasheet = async () => {
    try {
        const response = await api.get('/analytics/export', { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'broadcast-analytics.csv')
        document.body.appendChild(link)
        link.click()
        link.remove()
    } catch (error) {
        console.error('Export failed:', error)
    }
}

function Analytics() {
    const queryClient = useQueryClient()
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks'],
        queryFn: getAnalytics
    })

    const refreshMutation = useMutation({
        mutationFn: updateTaskMetrics,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    // Process data for charts
    const chartData = tasks
        .slice()
        .reverse()
        .map(t => ({
            name: t.name,
            success: t.results?.success || 0,
            failed: t.results?.failed || 0,
            date: new Date(t.createdAt).toLocaleDateString()
        }))

    // Calculate aggregate MTProto stats
    const totalSent = tasks.reduce((acc, t) => acc + (t.results?.success || 0), 0)
    const totalFailed = tasks.reduce((acc, t) => acc + (t.results?.failed || 0), 0)

    // Sum metrics from all messages in all tasks
    let totalViews = 0
    let totalForwards = 0
    let totalReplies = 0
    let totalReactions = 0

    tasks.forEach(task => {
        task.sentMessages?.forEach(msg => {
            totalViews += msg.metrics?.views || 0
            totalForwards += msg.metrics?.forwards || 0
            totalReplies += msg.metrics?.replies || 0
            totalReactions += msg.metrics?.reactions || 0
        })
    })

    const totalBroadcasts = tasks.length

    return (
        <div className="space-y-8 animate-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Analytics & Data</h1>
                    <p className="text-dark-400">Track performance and engagement of your broadcasts.</p>
                </div>
                <button
                    onClick={exportDatasheet}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold transition-colors"
                >
                    <Download className="w-5 h-5" />
                    Export Datasheet
                </button>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass p-6 rounded-2xl border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 text-dark-400 mb-2">
                        <Eye className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">Post Views</span>
                    </div>
                    <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
                </div>
                <div className="glass p-6 rounded-2xl border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 text-dark-400 mb-2">
                        <Share2 className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium">Forwards</span>
                    </div>
                    <p className="text-3xl font-bold">{totalForwards.toLocaleString()}</p>
                </div>
                <div className="glass p-6 rounded-2xl border-l-4 border-pink-500">
                    <div className="flex items-center gap-2 text-dark-400 mb-2">
                        <Heart className="w-4 h-4 text-pink-400" />
                        <span className="text-sm font-medium">Reactions</span>
                    </div>
                    <p className="text-3xl font-bold">{totalReactions.toLocaleString()}</p>
                </div>
                <div className="glass p-6 rounded-2xl border-l-4 border-green-500">
                    <div className="flex items-center gap-2 text-dark-400 mb-2">
                        <MessageSquare className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">Replies</span>
                    </div>
                    <p className="text-3xl font-bold">{totalReplies.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6">Delivery Performance</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="date" stroke="#666" />
                                <YAxis stroke="#666" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="success" fill="#22c55e" name="Success" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl">
                    <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {tasks.slice(0, 10).map(task => {
                            const views = task.sentMessages?.reduce((a, m) => a + (m.metrics?.views || 0), 0) || 0
                            const reacts = task.sentMessages?.reduce((a, m) => a + (m.metrics?.reactions || 0), 0) || 0

                            return (
                                <div key={task._id} className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold">{task.name}</h4>
                                            <p className="text-xs text-dark-400">{new Date(task.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => refreshMutation.mutate(task.taskId)}
                                                disabled={refreshMutation.isPending}
                                                className="p-2 rounded-lg bg-dark-800 hover:bg-primary-500/20 text-dark-400 hover:text-primary-400 transition-colors"
                                                title="Refresh Metrics"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                                            </button>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-2 border-t border-dark-800">
                                        <div className="flex items-center gap-1.5 text-xs text-dark-400">
                                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                                            {views}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-dark-400">
                                            <Heart className="w-3.5 h-3.5 text-pink-400" />
                                            {reacts}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-dark-400">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                            {task.results?.success || 0} sent
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Analytics;
