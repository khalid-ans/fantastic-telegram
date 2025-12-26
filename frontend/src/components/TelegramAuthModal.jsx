import { useState, useEffect } from 'react'
import { X, Phone, Key, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { sendAuthCode, signIn, getAuthStatus } from '../services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

function TelegramAuthModal({ isOpen, onClose }) {
    const [step, setStep] = useState(1) // 1: Phone, 2: Code
    const [phoneNumber, setPhoneNumber] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [error, setError] = useState(null)
    const queryClient = useQueryClient()

    const { data: status, refetch: refetchStatus } = useQuery({
        queryKey: ['authStatus'],
        queryFn: getAuthStatus
    })

    const sendCodeMutation = useMutation({
        mutationFn: sendAuthCode,
        onSuccess: () => {
            setStep(2)
            setError(null)
        },
        onError: (err) => setError(err.response?.data?.error || err.message)
    })

    const signInMutation = useMutation({
        mutationFn: signIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['authStatus'] })
            queryClient.invalidateQueries({ queryKey: ['entities'] })
            setError(null)
            onClose()
        },
        onError: (err) => setError(err.response?.data?.error || err.message)
    })

    if (!isOpen) return null

    const handleSendCode = (e) => {
        e.preventDefault()
        if (!phoneNumber) return
        sendCodeMutation.mutate(phoneNumber)
    }

    const handleSignIn = (e) => {
        e.preventDefault()
        if (!verificationCode) return
        signInMutation.mutate(verificationCode)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
            <div className="glass rounded-3xl w-full max-w-md overflow-hidden relative border border-white/10 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center">
                            <Phone className="w-8 h-8 text-primary-400" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center mb-2">Connect Telegram</h2>
                    <p className="text-dark-400 text-center text-sm mb-8">
                        Login with your phone number to sync your channels and groups safely.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-400 mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                    <input
                                        type="tel"
                                        placeholder="+1234567890"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={sendCodeMutation.isPending}
                                className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {sendCodeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSignIn} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-400 mb-2">Verification Code</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                    <input
                                        type="text"
                                        placeholder="Enter the code from Telegram"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-900/50 border border-dark-700 focus:border-primary-500 focus:outline-none transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={signInMutation.isPending}
                                className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {signInMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full py-2 text-sm text-dark-500 hover:text-dark-400"
                            >
                                Change phone number
                            </button>
                        </form>
                    )}

                    <div className="mt-8 flex items-center gap-3 p-4 rounded-2xl bg-dark-900/30 border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
                        <p className="text-xs text-dark-500">
                            Your session will be securely stored for automatic reconnection.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TelegramAuthModal
