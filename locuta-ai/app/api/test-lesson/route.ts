import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('lessons')
    .select('level_title, practice_prompt, practice_example')
    .eq('category', 'Storytelling')
    .eq('module_number', 1)
    .eq('level_number', 3)
    .single()

  return NextResponse.json({
    raw_data: data,
    error: error,
    practice_prompt_value: data?.practice_prompt,
    practice_example_value: data?.practice_example
  })
}