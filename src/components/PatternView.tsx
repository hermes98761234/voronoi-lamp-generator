import { useMemo } from 'react'
import type { Pattern } from '../lib/pattern'
import { patternBody } from '../lib/svg'

export default function PatternView({ pattern, label }: { pattern: Pattern; label: string }) {
  const body = useMemo(() => patternBody(pattern, { cells: true, seeds: true }), [pattern])
  const { width, height } = pattern.profile
  return (
    <svg className="pattern" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: body }} />
  )
}
