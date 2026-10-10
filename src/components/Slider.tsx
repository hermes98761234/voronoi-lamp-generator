import { useId, useState } from 'react'

interface Props {
  label: string
  unit?: string
  value: number
  min: number
  max: number
  step?: number
  hint?: string
  onChange: (v: number) => void
}

/** Range slider with a typed number box. The box commits on blur / Enter so half-typed values never fight the clamp. */
export default function Slider({ label, unit, value, min, max, step = 1, hint, onChange }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const v = Number(draft.replace(',', '.'))
    if (draft.trim() !== '' && Number.isFinite(v)) onChange(v)
    setDraft(null)
  }
  return (
    <div className="field slider">
      <div className="slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="num">
          <input
            type="text"
            inputMode="decimal"
            aria-label={label}
            value={draft ?? String(Math.round(value * 100) / 100)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
          />
          {unit && <span className="unit">{unit}</span>}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
