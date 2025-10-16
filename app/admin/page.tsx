'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV file first!')
      return
    }

    setUploading(true)
    setResult('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/import-lessons', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ Success! Imported ${data.count} lessons.`)
        setFile(null)
      } else {
        setResult(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin - Import Lessons</h1>
          <p className="text-gray-600 mb-8">Upload your CSV files to import lessons into the database</p>

          {/* CSV Format Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-blue-900 mb-3">📋 CSV Format Required:</h2>
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-mono bg-blue-100 p-2 rounded text-xs break-all">
                category,module_number,module_name,level_number,level_topic,lesson_explanation,practice_prompt,practice_example,expected_duration_sec,feedback_focus_areas
              </p>
              <p className="mt-3"><strong>Example row:</strong></p>
              <p className="font-mono text-xs bg-blue-100 p-2 rounded break-all">
                Creator Speaking,1,Camera Presence & Speaking Fundamentals,1,Speaking to the Lens,"Imagine one specific person behind the lens...","Answer: 'Why did you start creating content?' in 30-45s to camera.","Start with emotion; make it personal.",45,"Vocal warmth|Eye contact|Conversational tone|Pacing|Genuine emotion|Filler count"
              </p>
              <ul className="mt-3 list-disc list-inside space-y-1">
                <li><strong>category:</strong> Public Speaking, Storytelling, Creator Speaking, Casual Conversation, Workplace Communication, Pitch Anything</li>
                <li><strong>module_number:</strong> 1-5</li>
                <li><strong>module_name:</strong> Name of the module (e.g., "Camera Presence & Speaking Fundamentals")</li>
                <li><strong>level_number:</strong> 1-10 (lesson number within module)</li>
                <li><strong>level_topic:</strong> Title of the specific lesson</li>
                <li><strong>lesson_explanation:</strong> What AI will explain to the user</li>
                <li><strong>practice_prompt:</strong> The specific task to practice</li>
                <li><strong>practice_example:</strong> Tips or example approach</li>
                <li><strong>expected_duration_sec:</strong> Duration in seconds (e.g., 45, 60, 90)</li>
                <li><strong>feedback_focus_areas:</strong> Separate with | (pipe) character (e.g., "Vocal warmth|Eye contact|Pacing")</li>
              </ul>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer"
            >
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {file ? file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                {file ? 'Click to change file' : 'or drag and drop'}
              </p>
            </label>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload and Import Lessons'}
          </button>

          {/* Result Message */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              {result}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📝 Instructions:</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Prepare your CSV file with the correct format shown above</li>
              <li>Make sure there are no empty rows</li>
              <li>Upload one category file at a time</li>
              <li>You can upload the same file again to update existing lessons</li>
              <li>Each file should contain 50 lessons (5 modules × 10 lessons)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}