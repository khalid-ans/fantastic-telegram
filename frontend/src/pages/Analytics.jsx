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
                    <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Analytics & Data</h1>
                    <p className="text-gray-500">Track performance and engagement of your broadcasts.</p>
                </div>
                <button
                    onClick={exportDatasheet}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold transition-colors text-white shadow-lg shadow-primary-500/20"
                >
                    <Download className="w-5 h-5" />
                    Export Datasheet
                </button>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold">Post Views</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-purple-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Share2 className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-bold">Forwards</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalForwards.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-pink-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-bold">Reactions</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalReactions.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border-l-4 border-green-500 card-shadow">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold">Replies</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{totalReplies.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl card-shadow border border-gray-100">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">Delivery Performance</h3>
                    <div className="h-80 w-full min-h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#111827' }}
                                />
                                <Bar dataKey="success" fill="#22c55e" name="Success" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl card-shadow border border-gray-100">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">Recent Activity</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {tasks.slice(0, 10).map(task => {
                            const views = task.sentMessages?.reduce((a, m) => a + (m.metrics?.views || 0), 0) || 0
                            const reacts = task.sentMessages?.reduce((a, m) => a + (m.metrics?.reactions || 0), 0) || 0

                            return (
                                <div key={task._id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{task.name}</h4>
                                            <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => refreshMutation.mutate(task.taskId)}
                                                disabled={refreshMutation.isPending}
                                                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-primary-50 text-gray-500 hover:text-primary-600 transition-colors"
                                                title="Refresh Metrics"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                                            </button>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${task.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                                                task.status === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                                                    'bg-blue-50 text-blue-600 border-blue-200'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-2 border-t border-gray-200">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                                            {views}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <Heart className="w-3.5 h-3.5 text-pink-500" />
                                            {reacts}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
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
