import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import TelegramAuthModal from './TelegramAuthModal'

function Layout() {
    const [isAuthOpen, setIsAuthOpen] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar onOpenAuth={() => setIsAuthOpen(true)} />
            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
