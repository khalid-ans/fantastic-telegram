import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthStatus } from '../services/api'
import axios from 'axios'
import {
    LayoutDashboard,
    FolderKanban,
    Send,
    HelpCircle,
    History,
    BarChart3,
    Zap,
    Unplug,
    UserCircle2,
    ShieldCheck,
    Settings,
    LogOut
} from 'lucide-react'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/folders', icon: FolderKanban, label: 'Folders' },
    { path: '/send', icon: Send, label: 'Send Message' },
    { path: '/quiz', icon: HelpCircle, label: 'Quiz Builder' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/tracking', icon: BarChart3, label: 'Data Tracking' },
]

function Sidebar({ onOpenAuth }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: status, isLoading } = useQuery({
        queryKey: ['authStatus'],
        queryFn: getAuthStatus,
        refetchInterval: 10000 // Refetch every 10 seconds
    })

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await axios.post('http://localhost:5000/api/auth/logout')
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['authStatus'])
            navigate('/login')
        }
    })

    const isConnected = status?.connected

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 glass p-6 flex flex-col z-50">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight">Broadcaster</h1>
                    <p className="text-xs text-dark-400">Telegram Pro</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary-500/20 text-primary-400 border-l-2 border-primary-400'
                                : 'text-dark-400 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}

                <div className="pt-4 mt-4 border-t border-white/5">
                    <NavLink
                        to="/analytics"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                            }`
                        }
                    >
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">Analytics</span>
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                            }`
                        }
                    >
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                </div>
            </nav>

            {/* Connection Status Footer */}
            <div className="pt-6 border-t border-white/5 mt-auto">
                {isLoading ? (
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-dark-700" />
                        <div className="flex-1 space-y-2">
                            <div className="h-2 bg-dark-700 rounded w-2/3" />
                            <div className="h-2 bg-dark-700 rounded w-1/2" />
                        </div>
                    </div>
                ) : isConnected ? (
                    <div className="group relative">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <ShieldCheck className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-green-400">Connected</p>
                                <p className="text-[10px] text-dark-400 font-medium truncate">
                                    {status.firstName || status.username || 'User Session'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => logoutMutation.mutate()}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                        >
                            <LogOut className="w-3 h-3" />
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full group"
                    >
                        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all outline outline-1 outline-transparent hover:outline-white/5">
                            <div className="w-9 h-9 rounded-xl bg-dark-800 flex items-center justify-center border border-dark-700 group-hover:border-primary-500/50 group-hover:bg-primary-500/10 transition-all">
                                <Unplug className="w-5 h-5 text-dark-400 group-hover:text-primary-400" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-bold text-dark-300 group-hover:text-primary-400 transition-colors">Disconnected</p>
                                <p className="text-[10px] text-dark-500 group-hover:text-primary-500 transition-colors uppercase tracking-wider font-bold">Connect Now</p>
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </aside>
    )
}

export default Sidebar
