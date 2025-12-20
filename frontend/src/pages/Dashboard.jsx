import { useQuery } from '@tanstack/react-query'
import { getTasks, getFolders } from '../services/api'
import { Zap, Users, Send, CheckCircle2, Clock, ArrowUpRight, TrendingUp } from 'lucide-react'

function Dashboard() {
    const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: getTasks })
    const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: getFolders })

    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const totalRecipients = tasks.reduce((sum, t) => sum + (t.recipientCount || 0), 0)

    return (
        <div className="space-y-8 animate-in">
            {/* Hero Section */}
            <header className="relative py-10 px-8 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-extrabold text-white mb-3">
                        Welcome to Broadcaster Pro
                    </h1>
                    <p className="text-primary-100/80 text-lg">
                        Your command center for high-performance Telegram broadcasting.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Folders"
                    value={folders.length}
                    color="text-blue-400"
                />
                <StatCard
                    icon={<Send className="w-6 h-6" />}
                    label="Broadcasts Sent"
                    value={completedTasks}
                    color="text-green-400"
                />
                <StatCard
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    label="Recipients Reached"
                    value={totalRecipients.toLocaleString()}
                    color="text-purple-400"
                />
                <StatCard
                    icon={<Clock className="w-6 h-6" />}
                    label="Pending Tasks"
                    value={tasks.filter(t => t.status === 'pending').length}
                    color="text-amber-400"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-3xl p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary-400" />
                        Recent Broadcasts
                    </h2>
                    {tasks.length === 0 ? (
                        <p className="text-dark-400 py-8 text-center">No broadcasts yet. Start by creating a folder!</p>
                    ) : (
                        <div className="space-y-3">
                            {tasks.slice(0, 5).map((task) => (
                                <div
                                    key={task.taskId}
                                    className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 hover:bg-dark-800/50 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium">{task.name}</p>
                                        <p className="text-sm text-dark-400">{task.recipientCount} recipients</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        task.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                            task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-amber-500/20 text-amber-400'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-3xl p-6">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <QuickAction href="/folders" label="Create Folder" />
                        <QuickAction href="/send" label="Send Broadcast" />
                        <QuickAction href="/quiz" label="Create Quiz" />
                        <QuickAction href="/history" label="View History" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="glass rounded-2xl p-6">
            <div className={`${color} mb-3`}>{icon}</div>
            <p className="text-sm text-dark-400 mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    )
}

function QuickAction({ href, label }) {
    return (
        <a
            href={href}
            className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 hover:bg-dark-800/50 transition-colors group"
        >
            <span className="font-medium">{label}</span>
            <ArrowUpRight className="w-4 h-4 text-dark-400 group-hover:text-primary-400 transition-colors" />
        </a>
    )
}

export default Dashboard
