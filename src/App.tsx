import { useEffect, useMemo, useState } from 'react'
import { tr, type T } from './i18n'
import { DEFAULTS, PRESETS, sanitize, type LampParams } from './lib/params'
import { computePattern } from './lib/pattern'
import { patternSvg } from './lib/svg'
import { toBinaryStl } from './lib/stl'
import { loadState, saveState, type AppState } from './lib/state'
import { downloadBlob } from './download'
import { useLamp } from './useLamp'
import Slider from './components/Slider'
import PatternView from './components/PatternView'
import Viewer3D from './components/Viewer3D'

const PLA_G_PER_MM3 = 1.24e-3

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [resetKey, setResetKey] = useState(0)
  const { params, lang, theme, lampOn } = state
  const t: T = (s, ...a) => tr(lang, s, ...a)
  const set = (patch: Partial<LampParams>) => setState((s) => ({ ...s, params: sanitize({ ...s.params, ...patch }) }))
  const lamp = useLamp(params)
  const pattern = useMemo(() => computePattern(params), [params])

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    root.lang = lang
  }, [theme, lang])

  const stats = lamp.mesh?.stats
  const mm = t('mm')
  const stl = () => {
    if (!lamp.mesh) return
    downloadBlob(toBinaryStl(lamp.mesh.positions, lamp.mesh.indices), `voronoi-lamp-${params.shape}-${params.seed}.stl`, 'model/stl')
  }
  const vaseLabels = [0, 25, 50, 75, 100]

  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">{t('Voronoi lamp generator')}</span>
        <span className="hint">{t('Parametric lamp shades and shells with Voronoi openings, ready to 3D print.')}</span>
      </header>
      <div className="body">
        <aside className="side">
          <div className="panel">
            <section className="section">
              <h3>{t('Presets')}</h3>
              <div className="chips">
                {PRESETS.map((p) => (
                  <button key={p.name} className="small" onClick={() => set({ ...DEFAULTS, ...p.params, seed: params.seed })}>
                    {t(p.name)}
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <h3>{t('Shape')}</h3>
              <div className="field">
                <select aria-label={t('Shape')} value={params.shape} onChange={(e) => set({ shape: e.target.value as LampParams['shape'] })}>
                  <option value="cylinder">{t('Cylinder / cone')}</option>
                  <option value="sphere">{t('Sphere')}</option>
                  <option value="vase">{t('Vase profile')}</option>
                </select>
              </div>
              {params.shape === 'cylinder' && (
                <>
                  <Slider label={t('Height')} unit={mm} value={params.height} min={30} max={400} onChange={(v) => set({ height: v })} />
                  <Slider label={t('Bottom radius')} unit={mm} value={params.radiusBottom} min={15} max={150} onChange={(v) => set({ radiusBottom: v })} />
                  <Slider label={t('Top radius')} unit={mm} value={params.radiusTop} min={15} max={150} onChange={(v) => set({ radiusTop: v })} />
                </>
              )}
              {params.shape === 'sphere' && (
                <>
                  <Slider label={t('Radius')} unit={mm} value={params.sphereRadius} min={30} max={150} onChange={(v) => set({ sphereRadius: v })} />
                  <Slider
                    label={t('Opening angle')}
                    unit="°"
                    value={params.capAngle}
                    min={5}
                    max={70}
                    hint={t('Angle cut off at the top and bottom of the sphere.')}
                    onChange={(v) => set({ capAngle: v })}
                  />
                </>
              )}
              {params.shape === 'vase' && (
                <>
                  <Slider label={t('Height')} unit={mm} value={params.height} min={60} max={400} onChange={(v) => set({ height: v })} />
                  {vaseLabels.map((pct, i) => (
                    <Slider
                      key={pct}
                      label={t('Radius at {0}% of the height', pct)}
                      unit={mm}
                      value={params.vase[i]}
                      min={15}
                      max={100}
                      onChange={(v) => set({ vase: params.vase.map((r, k) => (k === i ? v : r)) })}
                    />
                  ))}
                </>
              )}
            </section>

            <section className="section">
              <h3>{t('Openings')}</h3>
              <Slider label={t('Cells')} value={params.cells} min={6} max={200} onChange={(v) => set({ cells: v })} />
              <div className="row seedrow">
                <Slider label={t('Seed')} value={params.seed} min={0} max={9999} onChange={(v) => set({ seed: v })} />
                <button onClick={() => set({ seed: Math.floor(Math.random() * 10000) })}>{t('Randomize')}</button>
              </div>
              <p className="hint">{t('Same seed, same lamp.')}</p>
              <Slider
                label={t('Relaxation (Lloyd)')}
                value={params.relax}
                min={0}
                max={15}
                hint={t('More passes make the cells rounder and more even.')}
                onChange={(v) => set({ relax: v })}
              />
              <Slider label={t('Rib width')} unit={mm} value={params.rib} min={1} max={12} step={0.1} hint={t('Material left between two openings.')} onChange={(v) => set({ rib: v })} />
              <Slider label={t('Corner radius')} unit={mm} value={params.corner} min={0} max={10} step={0.1} onChange={(v) => set({ corner: v })} />
              <Slider
                label={t('Solid rim')}
                unit={mm}
                value={params.rim}
                min={0}
                max={40}
                step={0.5}
                hint={t('Closed band at the top and bottom edge.')}
                onChange={(v) => set({ rim: v })}
              />
              <Slider label={t('Cells left closed')} unit="%" value={params.solidPct} min={0} max={60} onChange={(v) => set({ solidPct: v })} />
            </section>

            <section className="section">
              <h3>{t('Wall')}</h3>
              <Slider
                label={t('Wall thickness')}
                unit={mm}
                value={params.wall}
                min={0.8}
                max={8}
                step={0.1}
                hint={stats && stats.wall < params.wall - 0.01 ? t('Limited to {0} mm by the radius.', stats.wall.toFixed(1)) : t('Print upright with the open top up. Walls under about 1.2 mm may be fragile.')}
                onChange={(v) => set({ wall: v })}
              />
              <label className="check">
                <input type="checkbox" checked={params.base} onChange={(e) => set({ base: e.target.checked })} /> {t('Closed bottom plate')}
              </label>
              <Slider label={t('Smoothness (facets)')} value={params.segments} min={48} max={240} step={4} onChange={(v) => set({ segments: v })} />
            </section>

            <section className="section">
              <h3>{t('Settings')}</h3>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="lang">{t('Language')}</label>
                  <select id="lang" value={lang} onChange={(e) => setState((s) => ({ ...s, lang: e.target.value as AppState['lang'] }))}>
                    <option value="en">English</option>
                    <option value="uk">Українська</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="theme">{t('Theme')}</label>
                  <select id="theme" value={theme} onChange={(e) => setState((s) => ({ ...s, theme: e.target.value as AppState['theme'] }))}>
                    <option value="auto">{t('System')}</option>
                    <option value="light">{t('Light')}</option>
                    <option value="dark">{t('Dark')}</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </aside>

        <main className="main">
          <div className="box">
            <div className="viewer-wrap">
              <Viewer3D mesh={lamp.mesh} lampOn={lampOn} resetKey={resetKey} label={t('3D preview of the lamp')} />
              {lamp.status === 'building' && <div className="overlay">{t('Building the solid…')}</div>}
              {lamp.status === 'error' && <div className="overlay err-text">{t('Could not build the model: {0}', lamp.error)}</div>}
            </div>
            <div className="row actions">
              <button className="primary" onClick={stl} disabled={!lamp.mesh}>
                {t('Download STL')}
              </button>
              <button onClick={() => downloadBlob(patternSvg(pattern), `voronoi-lamp-pattern-${params.seed}.svg`, 'image/svg+xml')}>{t('Download pattern SVG')}</button>
              <span className="spacer" />
              <label className="check">
                <input type="checkbox" checked={lampOn} onChange={(e) => setState((s) => ({ ...s, lampOn: e.target.checked }))} /> {t('Lamp on')}
              </label>
              <button onClick={() => setResetKey((k) => k + 1)}>{t('Reset view')}</button>
            </div>
          </div>

          <div className="box">
            <h3>{t('Model')}</h3>
            {stats ? (
              <table className="data">
                <tbody>
                  <tr>
                    <td>{t('Openings cut')}</td>
                    <td>{stats.holes}</td>
                  </tr>
                  <tr>
                    <td>{t('Open area')}</td>
                    <td>{(stats.openRatio * 100).toFixed(0)}%</td>
                  </tr>
                  <tr>
                    <td>{t('Size')}</td>
                    <td>
                      {stats.size.map((v) => v.toFixed(0)).join(' × ')} {mm}
                    </td>
                  </tr>
                  <tr>
                    <td>{t('Volume')}</td>
                    <td>
                      {(stats.volume / 1000).toFixed(1)} cm³ · {t('About {0} g in PLA', Math.round(stats.volume * PLA_G_PER_MM3))}
                    </td>
                  </tr>
                  <tr>
                    <td>{t('Triangles')}</td>
                    <td>{stats.triangles.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>{t('Watertight (manifold)')}</td>
                    <td className={stats.manifold ? 'ok-text' : 'err-text'}>{stats.manifold ? t('Yes') : t('No')}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="hint">{t('Building the solid…')}</p>
            )}
          </div>

          <div className="box">
            <h3>{t('Flat pattern')}</h3>
            <p className="hint">{t('The wall rolled out flat. Left and right edges meet at the seam. Dots are the seeds.')}</p>
            <PatternView pattern={pattern} label={t('Flat pattern of the openings')} />
          </div>
        </main>
      </div>
      <p className="hint foot">
        {t('Runs entirely in your browser. Nothing is uploaded.')}{' '}
        <a href="https://github.com/hermes98761234/voronoi-lamp-generator">{t('Source on GitHub')}</a>
      </p>
    </div>
  )
}

