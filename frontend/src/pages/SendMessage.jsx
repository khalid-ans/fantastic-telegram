import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getFolders, scheduleTask } from '../services/api'
import { Send, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, FolderKanban, Image as ImageIcon, X } from 'lucide-react'
import TimePicker from '../components/TimePicker'

function SendMessage() {
    const [taskName, setTaskName] = useState('')
    const [message, setMessage] = useState('')
    const [selectedFolders, setSelectedFolders] = useState([])
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('12:00 PM')
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
            setScheduleDate('')
            setScheduleTime('12:00 PM')
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
        // Combine date and time into ISO string
        if (scheduleDate && scheduleTime) {
            const [time, period] = scheduleTime.split(' ')
            const [hourStr, minuteStr] = time.split(':')
            let hour = parseInt(hourStr)
            const minute = parseInt(minuteStr)

            // Convert to 24-hour format
            if (period === 'PM' && hour !== 12) hour += 12
            if (period === 'AM' && hour === 12) hour = 0

            const scheduledDateTime = new Date(scheduleDate)
            scheduledDateTime.setHours(hour, minute, 0, 0)
            formData.append('scheduledAt', scheduledDateTime.toISOString())
        }
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
                <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Send Message</h1>
                <p className="text-gray-500">Broadcast messages to your Telegram contacts.</p>
            </header>

            {success && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 text-green-600 border border-green-200">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Broadcast scheduled successfully!</span>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Message Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 space-y-4 card-shadow border border-gray-100">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                            <Send className="w-5 h-5 text-primary-500" />
                            Message Details
                        </h2>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Task Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Weekly Newsletter"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Message Content
                            </label>
                            <textarea
                                placeholder="Type your message here..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all resize-none placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                Attach Media (Optional)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-primary-500 hover:text-primary-600 transition-all flex items-center gap-2">
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
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-50 text-primary-600 border border-primary-100 text-sm">
                                        <span className="truncate max-w-[150px]">{mediaFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setMediaFile(null)}
                                            className="hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Images, Videos, or Documents (max 20MB)
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Schedule Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all"
                                />
                            </div>

                            {scheduleDate && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Schedule Time
                                    </label>
                                    <TimePicker
                                        value={scheduleTime}
                                        onChange={setScheduleTime}
                                    />
                                </div>
                            )}

                            {scheduleDate && scheduleTime && (
                                <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                                    <p className="text-xs text-gray-500 mb-1">Scheduled for:</p>
                                    <p className="text-sm font-bold text-primary-600">
                                        {new Date(scheduleDate).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })} at {scheduleTime}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Message Expiry (Hours)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="e.g., 0.1 (6 min), 0.5 (30 min), 24 (1 day)"
                                value={expiryHours}
                                onChange={(e) => setExpiryHours(e.target.value)}
                                min="0.1"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all placeholder:text-gray-400"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Supports decimal values: 0.1 = 6 minutes, 0.5 = 30 minutes, 1 = 1 hour
                            </p>
                        </div>
                    </div>
                </div>

                {/* Folder Selection */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 card-shadow border border-gray-100">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                            <FolderKanban className="w-5 h-5 text-primary-500" />
                            Select Folders
                        </h2>

                        {folders.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">
                                No folders available. Create folders first.
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {folders.map((folder) => (
                                    <label
                                        key={folder._id}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedFolders.includes(folder._id)
                                            ? 'bg-primary-50 border border-primary-200'
                                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFolders.includes(folder._id)}
                                            onChange={() => toggleFolder(folder._id)}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedFolders.includes(folder._id)
                                            ? 'bg-primary-500 border-primary-500'
                                            : 'border-gray-300 bg-white'
                                            }`}>
                                            {selectedFolders.includes(folder._id) && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{folder.name}</p>
                                            <p className="text-xs text-gray-500">{folder.entityIds?.length || 0} contacts</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        {selectedFolders.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500">
                                    Total recipients: <span className="text-primary-600 font-bold">{recipientCount}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={scheduleMutation.isPending || !taskName.trim() || !message.trim() || selectedFolders.length === 0}
                        className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg shadow-xl shadow-primary-500/30 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
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
