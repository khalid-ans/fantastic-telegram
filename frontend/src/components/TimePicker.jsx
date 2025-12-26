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
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-bold text-gray-700">Select Time</span>
            </div>

            <div className="flex items-center justify-center gap-2">
                {/* Hour Selector */}
                <div className="relative">
                    <div
                        ref={hourRef}
                        className="h-32 w-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        <div className="py-11"> {/* Padding to center selected item */}
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    onClick={() => setHour(h)}
                                    className={`h-10 flex items-center justify-center cursor-pointer transition-all ${hour === h
                                        ? 'text-primary-600 font-bold text-xl scale-110'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {String(h).padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Selection indicator */}
                    <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 border-y-2 border-primary-100 pointer-events-none" />
                </div>

                <span className="text-2xl font-bold text-primary-500">:</span>

                {/* Minute Selector */}
                <div className="relative">
                    <div
                        ref={minuteRef}
                        className="h-32 w-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        <div className="py-11">
                            {minutes.map((m) => (
                                <div
                                    key={m}
                                    onClick={() => setMinute(m)}
                                    className={`h-10 flex items-center justify-center cursor-pointer transition-all ${minute === m
                                        ? 'text-primary-600 font-bold text-xl scale-110'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {String(m).padStart(2, '0')}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 border-y-2 border-primary-100 pointer-events-none" />
                </div>

                {/* Period Selector (AM/PM) */}
                <div className="flex flex-col gap-1 ml-2">
                    <button
                        type="button"
                        onClick={() => setPeriod('AM')}
                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${period === 'AM'
                            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        AM
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod('PM')}
                        className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${period === 'PM'
                            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        PM
                    </button>
                </div>
            </div>

            {/* Display selected time */}
            <div className="mt-3 text-center">
                <span className="text-lg font-bold text-primary-600">
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}
                </span>
            </div>
        </div>
    )
}

export default TimePicker
