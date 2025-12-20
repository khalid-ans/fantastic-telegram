import { useState, useRef, useEffect } from 'react'
import { Clock } from 'lucide-react'

function TimePicker({ value, onChange }) {
    // Parse initial value or use defaults
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: 12, minute: 0, period: 'PM' }
        const [time, period] = timeStr.split(' ')
        const [hour, minute] = time.split(':').map(Number)
        return { hour, minute, period }
    }

    const initialTime = parseTime(value)
    const [hour, setHour] = useState(initialTime.hour)
    const [minute, setMinute] = useState(initialTime.minute)
    const [period, setPeriod] = useState(initialTime.period)

    const hourRef = useRef(null)
    const minuteRef = useRef(null)

    const hours = Array.from({ length: 12 }, (_, i) => i + 1)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    // Update parent when time changes
    useEffect(() => {
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`
        onChange(formattedTime)
    }, [hour, minute, period, onChange])

    // Scroll to selected item
    const scrollToSelected = (ref, value, items) => {
        if (ref.current) {
            const index = items.indexOf(value)
            const itemHeight = 40 // Height of each item
            ref.current.scrollTop = index * itemHeight - itemHeight
        }
    }

    useEffect(() => {
        scrollToSelected(hourRef, hour, hours)
    }, [hour])

    useEffect(() => {
        scrollToSelected(minuteRef, minute, minutes)
    }, [minute])

    return (
        <div className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-dark-300">Select Time</span>
            </div>

            <div className="flex items-center justify-center gap-2">
                {/* Hour Selector */}
                <div className="relative">
                    <div
                        ref={hourRef}
                        className="h-32 w-16 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-500/20 scrollbar-track-transparent"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        <div className="py-11"> {/* Padding to center selected item */}
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    onClick={() => setHour(h)}
                                    className={`h-10 flex items-center justify-center cursor-pointer transition-all ${hour === h
                                            ? 'text-primary-400 font-bold text-xl scale-110'
                                            : 'text-dark-500 hover:text-dark-300'
                                        }`}
                                >
                                    {String(h).padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Selection indicator */}
                    <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 border-y-2 border-primary-500/20 pointer-events-none" />
                </div>

                <span className="text-2xl font-bold text-primary-400">:</span>

                {/* Minute Selector */}
                <div className="relative">
                    <div
                        ref={minuteRef}
                        className="h-32 w-16 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-500/20 scrollbar-track-transparent"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        <div className="py-11">
                            {minutes.map((m) => (
                                <div
                                    key={m}
                                    onClick={() => setMinute(m)}
                                    className={`h-10 flex items-center justify-center cursor-pointer transition-all ${minute === m
                                            ? 'text-primary-400 font-bold text-xl scale-110'
                                            : 'text-dark-500 hover:text-dark-300'
                                        }`}
                                >
                                    {String(m).padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 border-y-2 border-primary-500/20 pointer-events-none" />
                </div>

                {/* Period Selector (AM/PM) */}
                <div className="flex flex-col gap-1 ml-2">
                    <button
                        type="button"
                        onClick={() => setPeriod('AM')}
                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${period === 'AM'
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                            }`}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod('PM')}
                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${period === 'PM'
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                            }`}
                    >
                        PM
                    </button>
                </div>
            </div>

            {/* Display selected time */}
            <div className="mt-3 text-center">
                <span className="text-lg font-bold text-primary-400">
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}
                </span>
            </div>
        </div>
    )
}

export default TimePicker
