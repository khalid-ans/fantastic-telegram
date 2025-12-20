import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TelegramAuthModal from './TelegramAuthModal'

function Layout() {
    const [isAuthOpen, setIsAuthOpen] = useState(false)

    return (
        <div className="min-h-screen">
            <Sidebar onOpenAuth={() => setIsAuthOpen(true)} />
            <main className="ml-64 p-8">
                <Outlet />
            </main>

            <TelegramAuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
            />
        </div>
    )
}

export default Layout
