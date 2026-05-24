import { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface FileUploadProps {
  accept?: string
  maxSize?: number // in bytes
  multiple?: boolean
  onFileSelect?: (files: File[]) => void
  className?: string
}

export function FileUpload({
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onFileSelect,
  className = ''
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: File[] = []
    const errors: string[] = []

    Array.from(fileList).forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`)
        return
      }

      // Check file type if accept is specified
      if (accept !== '*/*') {
        const acceptedTypes = accept.split(',').map(t => t.trim())
        const fileType = file.type
        const fileExtension = '.' + file.name.split('.').pop()

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension === type
          }
          return fileType.includes(type.replace('*', ''))
        })

        if (!isAccepted) {
          errors.push(`${file.name} is not an accepted file type`)
          return
        }
      }

      newFiles.push(file)
    })

    if (errors.length > 0) {
      setError(errors.join(', '))
    } else {
      setError('')
    }

    const updatedFiles = multiple ? [...files, ...newFiles] : newFiles
    setFiles(updatedFiles)

    if (onFileSelect && updatedFiles.length > 0) {
      onFileSelect(updatedFiles)
    }
  }

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    if (onFileSelect) {
      onFileSelect(updatedFiles)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`glass-panel p-8 rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? 'border-ranting-sky bg-ranting-sky/10'
            : 'border-ranting-deep/30 hover:border-ranting-sky/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="w-12 h-12 text-ranting-sky mb-4" />
          <p className="text-ranting-ice font-medium mb-2">
            {dragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-ranting-muted text-sm mb-4">or</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="glossy-btn px-6 py-2 rounded-full"
          >
            Browse Files
          </button>
          <p className="text-ranting-muted text-xs mt-4">
            Maximum file size: {formatFileSize(maxSize)}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-400/50">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-ranting-ice text-sm font-medium">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 glass-panel rounded-lg"
            >
              <FileText className="w-5 h-5 text-ranting-sky" />
              <div className="flex-1 min-w-0">
                <p className="text-ranting-ice text-sm truncate">{file.name}</p>
                <p className="text-ranting-muted text-xs">{formatFileSize(file.size)}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <button
                onClick={() => removeFile(index)}
                className="p-1 rounded hover:bg-ranting-deep/30 text-ranting-muted hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
