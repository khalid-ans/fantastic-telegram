import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthStatus } from '../services/api'
import { useAuth } from '../context/AuthContext'
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
    Menu,
    Users
} from 'lucide-react'
import { useState } from 'react'

function Navbar() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, logout, isAdmin, isModerator } = useAuth()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const { data: status, isLoading } = useQuery({
        queryKey: ['telegramStatus'],
        queryFn: getAuthStatus,
        refetchInterval: 10000,
        enabled: !!user
    })

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/folders', icon: FolderKanban, label: 'Folders' },
        ...(isModerator ? [
            { path: '/send', icon: Send, label: 'Message' },
            { path: '/quiz', icon: HelpCircle, label: 'Quiz' },
        ] : []),
        { path: '/history', icon: History, label: 'History' },
        { path: '/tracking', icon: BarChart3, label: 'Tracking' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/settings', icon: Settings, label: 'Settings' },
        ...(isAdmin ? [{ path: '/users', icon: Users, label: 'Users' }] : [])
    ]

    const isConnected = status?.connected

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 text-lg leading-tight">Broadcaster</h1>
                            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">
                                {user?.role || 'User'} Level
                            </p>
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

                    {/* Right Section */}
                    <div className="hidden md:flex items-center gap-2">
                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        {isLoading ? (
                            <div className="w-24 h-8 bg-gray-100 rounded-lg animate-pulse" />
                        ) : isConnected ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold text-green-700">Telegram Active</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                <Unplug className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs font-bold text-gray-500">Telegram Offline</span>
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <div className="flex items-center gap-3 ml-2">
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-gray-900">{user?.username}</span>
                                <span className="text-[10px] text-gray-500 capitalize">{user?.role}</span>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
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
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar
