import { useState } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void
  className?: string
}

export function VoiceRecorder({ onRecordingComplete, className = '' }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  // TODO: Wire to Web Audio API / MediaRecorder
  const handleStartRecording = () => {
    setIsRecording(true)
    // Start timer for visual feedback
    const timer = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
    // Store timer ID for cleanup
    return () => clearInterval(timer)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setRecordingTime(0)
    // TODO: Create audio blob and call onRecordingComplete
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!isRecording ? (
        <button
          onClick={handleStartRecording}
          className="glossy-btn flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <Mic className="w-5 h-5" />
          <span>Record</span>
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="mic-pulse flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-400/50">
            <Mic className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-mono">{formatTime(recordingTime)}</span>
          </div>
          <button
            onClick={handleStopRecording}
            className="glossy-btn-ghost flex items-center gap-2 px-3 py-2 rounded-full"
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </button>
        </div>
      )}
    </div>
  )
}
