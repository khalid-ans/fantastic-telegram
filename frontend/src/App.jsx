import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FolderManager from './pages/FolderManager'
import SendMessage from './pages/SendMessage'
import QuizBuilder from './pages/QuizBuilder'
import History from './pages/History'
import Analytics from './pages/Analytics'
import DataTracking from './pages/DataTracking'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="folders" element={<FolderManager />} />
                <Route path="send" element={<SendMessage />} />
                <Route path="quiz" element={<QuizBuilder />} />
                <Route path="history" element={<History />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="tracking" element={<DataTracking />} />
            </Route>
        </Routes>
    )
}

export default App
