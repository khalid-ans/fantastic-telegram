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
    ShieldCheck,
    Settings,
    LogOut,
    Menu
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/folders', icon: FolderKanban, label: 'Folders' },
    { path: '/send', icon: Send, label: 'Message' },
    { path: '/quiz', icon: HelpCircle, label: 'Quiz' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/tracking', icon: BarChart3, label: 'Tracking' },
]

function Navbar({ onOpenAuth }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const { data: status, isLoading } = useQuery({
        queryKey: ['authStatus'],
        queryFn: getAuthStatus,
        refetchInterval: 10000
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
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 text-lg leading-tight">Broadcaster</h1>
                            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">Telegram Pro</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                                    }`
                                }
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {/* Right Section (Auth, Settings, Analytics) */}
                    <div className="hidden md:flex items-center gap-2">
                        <NavLink
                            to="/analytics"
                            className={({ isActive }) =>
                                `p-2 rounded-lg transition-all ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-50'}`
                            }
                            title="Analytics"
                        >
                            <BarChart3 className="w-5 h-5" />
                        </NavLink>

                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `p-2 rounded-lg transition-all ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600 hover:bg-gray-50'}`
                            }
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </NavLink>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        {isLoading ? (
                            <div className="w-24 h-8 bg-gray-100 rounded-lg animate-pulse" />
                        ) : isConnected ? (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-bold text-green-700 truncate max-w-[100px]">
                                        {status.firstName || 'Connected'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => logoutMutation.mutate()}
                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all transform hover:-translate-y-0.5"
                            >
                                <Unplug className="w-4 h-4" />
                                <span className="text-sm font-bold">Connect</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${isActive
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`
                                }
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar
