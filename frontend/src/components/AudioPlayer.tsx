import { useState } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
  audioSrc?: string // Base64 encoded audio or URL
  className?: string
}

export function AudioPlayer({ audioSrc, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // TODO: Wire to actual audio element
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    // TODO: Control audio playback
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioSrc) {
    return (
      <div className={`glass-panel p-4 rounded-lg ${className}`}>
        <p className="text-ranting-muted text-sm">No audio available</p>
      </div>
    )
  }

  return (
    <div className={`glass-panel p-4 rounded-lg ${className}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          className="glossy-btn flex items-center justify-center w-12 h-12 rounded-full"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-ranting-ice text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 h-2 bg-ranting-deep/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ranting-sky to-ranting-accent transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="text-ranting-muted text-sm font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <button className="glossy-btn-ghost flex items-center justify-center w-10 h-10 rounded-full">
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
