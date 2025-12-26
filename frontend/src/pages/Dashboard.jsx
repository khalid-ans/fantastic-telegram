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
            <header className="relative py-12 px-8 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 overflow-hidden shadow-xl shadow-primary-500/20">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-extrabold text-white mb-3">
                        Welcome to Broadcaster Pro
                    </h1>
                    <p className="text-primary-100/90 text-lg font-medium">
                        Your command center for high-performance Telegram broadcasting.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/30 blur-[60px] rounded-full -translate-x-1/4 translate-y-1/4" />
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Folders"
                    value={folders.length}
                    color="text-blue-500 bg-blue-50"
                />
                <StatCard
                    icon={<Send className="w-6 h-6" />}
                    label="Broadcasts Sent"
                    value={completedTasks}
                    color="text-green-500 bg-green-50"
                />
                <StatCard
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    label="Recipients Reached"
                    value={totalRecipients.toLocaleString()}
                    color="text-purple-500 bg-purple-50"
                />
                <StatCard
                    icon={<Clock className="w-6 h-6" />}
                    label="Pending Tasks"
                    value={tasks.filter(t => t.status === 'pending').length}
                    color="text-amber-500 bg-amber-50"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 card-shadow border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                        <Zap className="w-5 h-5 text-primary-500" />
                        Recent Broadcasts
                    </h2>
                    {tasks.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500">No broadcasts yet. Start by creating a folder!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.slice(0, 5).map((task) => (
                                <div
                                    key={task.taskId}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:card-shadow border border-gray-100 transition-all duration-200"
                                >
                                    <div>
                                        <p className="font-bold text-gray-900">{task.name}</p>
                                        <p className="text-sm text-gray-500">{task.recipientCount} recipients</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${task.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                        task.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            task.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-3xl p-6 card-shadow border border-gray-100 h-fit">
                    <h2 className="text-xl font-bold mb-6 text-gray-900">Quick Actions</h2>
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
        <div className="bg-white rounded-2xl p-6 card-shadow border border-gray-100 transition-transform hover:-translate-y-1 duration-300">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        </div>
    )
}

function QuickAction({ href, label }) {
    return (
        <a
            href={href}
            className="flex items-center justify-between p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-all group border border-gray-100 hover:border-primary-100"
        >
            <span>{label}</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
        </a>
    )
}

export default Dashboard
