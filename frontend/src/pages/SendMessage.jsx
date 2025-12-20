import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFolders, scheduleTask } from '../services/api'
import { Send, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, FolderKanban, Image as ImageIcon, X } from 'lucide-react'

function SendMessage() {
    const [taskName, setTaskName] = useState('')
    const [message, setMessage] = useState('')
    const [selectedFolders, setSelectedFolders] = useState([])
    const [scheduledAt, setScheduledAt] = useState('')
    const [expiryHours, setExpiryHours] = useState('')
    const [mediaFile, setMediaFile] = useState(null)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(null)

    const { data: folders = [] } = useQuery({
        queryKey: ['folders'],
        queryFn: getFolders
    })

    const scheduleMutation = useMutation({
        mutationFn: scheduleTask,
        onSuccess: () => {
            setSuccess(true)
            setError(null)
            setTaskName('')
            setMessage('')
            setSelectedFolders([])
            setScheduledAt('')
            setExpiryHours('')
            setMediaFile(null)
            setTimeout(() => setSuccess(false), 3000)
        },
        onError: (err) => {
            setError(err.response?.data?.error || err.message)
            setTimeout(() => setError(null), 5000)
        }
    })

    const toggleFolder = (folderId) => {
        setSelectedFolders(prev =>
            prev.includes(folderId)
                ? prev.filter(id => id !== folderId)
                : [...prev, folderId]
        )
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!taskName.trim() || (!message.trim() && !mediaFile) || selectedFolders.length === 0) return

        const formData = new FormData()
        formData.append('name', taskName.trim())
        formData.append('type', 'message')
        formData.append('content', JSON.stringify({ text: message }))
        formData.append('folderIds', JSON.stringify(selectedFolders))
        if (scheduledAt) formData.append('scheduledAt', scheduledAt)
        if (expiryHours) formData.append('expiryHours', expiryHours)
        if (mediaFile) formData.append('media', mediaFile)

        scheduleMutation.mutate(formData)
    }

    const recipientCount = folders
        .filter(f => selectedFolders.includes(f._id))
        .reduce((sum, f) => sum + (f.entityIds?.length || 0), 0)

    return (
        <div className="space-y-8 animate-in">
            <header>
                <h1 className="text-3xl font-bold mb-2">Send Message</h1>
                <p className="text-dark-400">Broadcast messages to your Telegram contacts.</p>
            </header>

            {success && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Broadcast scheduled successfully!</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Message Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass rounded-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary-400" />
                            Message Details
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Task Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Weekly Newsletter"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Message Content
                            </label>
                            <textarea
                                placeholder="Type your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                Attach Media (Optional)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer px-4 py-2 rounded-xl bg-dark-800 border border-dark-600 hover:border-primary-500 transition-colors flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>{mediaFile ? 'Change File' : 'Choose File'}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setMediaFile(e.target.files[0])}
                                        accept="image/*,video/*,.pdf,.doc,.docx"
                                    />
                                </label>
                                {mediaFile && (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 text-sm">
                                        <span className="truncate max-w-[150px]">{mediaFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setMediaFile(null)}
                                            className="hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-dark-500 mt-2">
                                Images, Videos, or Documents (max 20MB)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Schedule (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Message Expiry (Hours)
                            </label>
                            <input
                                type="number"
                                placeholder="e.g., 24 (Leave blank for no expiry)"
                                value={expiryHours}
                                onChange={(e) => setExpiryHours(e.target.value)}
                                min="1"
                                className="w-full px-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Folder Selection */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <FolderKanban className="w-5 h-5 text-primary-400" />
                            Select Folders
                        </h2>

                        {folders.length === 0 ? (
                            <p className="text-dark-400 text-sm py-4">
                                No folders available. Create folders first.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {folders.map((folder) => (
                                    <label
                                        key={folder._id}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedFolders.includes(folder._id)
                                            ? 'bg-primary-500/20 border border-primary-500/30'
                                            : 'bg-dark-900/50 border border-transparent hover:border-dark-600'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFolders.includes(folder._id)}
                                            onChange={() => toggleFolder(folder._id)}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedFolders.includes(folder._id)
                                            ? 'bg-primary-500 border-primary-500'
                                            : 'border-dark-500'
                                            }`}>
                                            {selectedFolders.includes(folder._id) && (
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{folder.name}</p>
                                            <p className="text-xs text-dark-400">{folder.entityIds?.length || 0} contacts</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        {selectedFolders.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-dark-700">
                                <p className="text-sm text-dark-400">
                                    Total recipients: <span className="text-white font-bold">{recipientCount}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={scheduleMutation.isPending || !taskName.trim() || !message.trim() || selectedFolders.length === 0}
                        className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {scheduleMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Scheduling...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Send Broadcast
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default SendMessage
