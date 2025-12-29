import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FolderManager from './pages/FolderManager'
import SendMessage from './pages/SendMessage'
import QuizBuilder from './pages/QuizBuilder'
import History from './pages/History'
import Analytics from './pages/Analytics'
import DataTracking from './pages/DataTracking'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PendingApproval from './pages/PendingApproval'
import UserManagement from './pages/UserManagement'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/pending-approval" element={<PendingApproval />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="folders" element={<FolderManager />} />
                        <Route element={<ProtectedRoute requiredRole="moderator" />}>
                            <Route path="send" element={<SendMessage />} />
                            <Route path="quiz" element={<QuizBuilder />} />
                        </Route>
                        <Route path="history" element={<History />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="tracking" element={<DataTracking />} />
                        <Route path="settings" element={<Settings />} />
                        <Route element={<ProtectedRoute requiredRole="admin" />}>
                            <Route path="users" element={<UserManagement />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    )
}

export default App
