import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user first
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in first' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    // Parse CSV headers
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine)
    
    console.log('CSV Headers:', headers)

    const lessons = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      if (values.length !== headers.length) {
        console.warn(`Skipping line ${i + 1}: Expected ${headers.length} columns, got ${values.length}`)
        continue
      }

      const row: any = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })

      // Map your CSV columns to database columns
      const lesson = {
        category: row.category,
        module_number: parseInt(row.module_number),
        module_title: row.module_name,
        level_number: parseInt(row.level_number),
        level_title: row.level_topic,
        lesson_explanation: row.lesson_explanation,
        practice_example: row.practice_example,
        practice_prompt: row.practice_prompt,
        expected_duration_sec: parseInt(row.expected_duration_sec),
        // Convert pipe-separated string to array
        feedback_focus_areas: row.feedback_focus_areas 
          ? row.feedback_focus_areas.split('|').map((s: string) => s.trim())
          : []
      }

      // Validate required fields
      if (!lesson.category || !lesson.module_number || !lesson.level_number) {
        console.warn(`Skipping line ${i + 1}: Missing required fields`)
        continue
      }

      lessons.push(lesson)
    }

    if (lessons.length === 0) {
      return NextResponse.json({ error: 'No valid lessons found in CSV' }, { status: 400 })
    }

    console.log(`Parsed ${lessons.length} lessons`)

    // Insert into database using service role to bypass RLS
    const { data, error } = await supabase
      .from('lessons')
      .upsert(lessons, {
        onConflict: 'category,module_number,level_number',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: `Database error: ${error.message}`,
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      count: lessons.length,
      message: `Successfully imported ${lessons.length} lessons`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to parse CSV line (handles quoted values with commas)
function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}