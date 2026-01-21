import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    
    // Calculate end date (30 days from start)
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 14)
    
    // Fetch available slots from Cal.com
    const response = await fetch(
      `https://api.cal.com/v1/slots/available?eventTypeId=${process.env.CAL_COM_EVENT_TYPE_ID}&startTime=${start.toISOString()}&endTime=${end.toISOString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.CAL_COM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Cal.com API error:', error)
      return NextResponse.json({ error: 'Failed to fetch slots', details: error }, { status: 500 })
    }

    const data = await response.json()
    
    return NextResponse.json({ slots: data.slots || {} })
  } catch (error) {
    console.error('Cal.com slots error:', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}