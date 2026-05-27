import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SECTORS } from '@/lib/sources/categories'

export const revalidate = 300 // cache for 5 minutes at the edge

export async function GET() {
  const counts: Record<string, number> = {}

  const { data } = await supabaseAdmin
    .from('jobs')
    .select('category')

  if (data) {
    for (const row of data) {
      if (row.category) {
        counts[row.category] = (counts[row.category] ?? 0) + 1
      }
    }
  }

  // Only return counts for known sector IDs
  const result: Record<string, number> = {}
  for (const sector of SECTORS) {
    result[sector.id] = counts[sector.id] ?? 0
  }

  return NextResponse.json(result)
}
