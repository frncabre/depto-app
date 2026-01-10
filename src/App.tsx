import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Currency = 'ARS' | 'USD'

type Suggestion = {
  id: string
  label: string
  lat: number
  lng: number
}

function isSuggestion(x: Suggestion | null): x is Suggestion {
  return x !== null
}

type Apartment = {
  id: string
  location: string
  placeId?: string
  lat?: number | null
  lng?: number | null

  rent: number
  rentCurrency?: Currency
  expenses: number
  expensesCurrency?: Currency

  cover: number
  rooms: number
  furnished: boolean
  link: string
  comment: string
  createdAt: string
}

const LS_KEY = 'apartments_v1'

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function fmtARS(n: number) {
  return `ARS ${n.toLocaleString('es-AR')}`
}
function fmtUSD(n: number) {
  return `USD ${n.toFixed(2)}`
}

function App() {
  const [showForm, setShowForm] = useState(false)
  const [showTotalInUSD, setShowTotalInUSD] = useState(false)

  // ====== TASA USD/ARS (SOLO BLUE VENTA) ======
  const [usdRateArs, setUsdRateArs] = useState<number>(1000) // fallback inicial
  const [rateError, setRateError] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function fetchBlueRate() {
      try {
        const res = await fetch('https://api.bluelytics.com.ar/v2/latest')
        if (!res.ok) throw new Error(`Bluelytics error ${res.status}`)

        const data = await res.json()
        const rate = Number(data?.blue?.value_sell) // ✅ SOLO BLUE VENTA

        if (!Number.isFinite(rate) || rate <= 0) throw new Error('Tasa blue.value_sell inválida')

        if (!cancelled) {
          setUsdRateArs(rate)
          setRateError('')
          console.log('[Tasa Blue] OK ✅', { usdRateArs: rate, last_update: data?.last_update })
        }
      } catch (err: any) {
        if (!cancelled) {
          setRateError(err?.message || 'Error al obtener tasa')
          console.error('[Tasa Blue] Error ❌', err)
        }
      }
    }

    fetchBlueRate()
    return () => {
      cancelled = true
    }
  }, [])
  // ==========================================

  function toARS(amount: number, currency: Currency) {
    return currency === 'ARS' ? amount : amount * usdRateArs
  }
  function toUSD(amount: number, currency: Currency) {
    return currency === 'USD' ? amount : amount / usdRateArs
  }

  const [form, setForm] = useState({
    rent: '',
    rentCurrency: 'ARS' as Currency,
    expenses: '',
    expensesCurrency: 'ARS' as Currency,
    cover: '',
    rooms: '',
    furnished: false,
    link: '',
    comment: '',
  })

  const [apartments, setApartments] = useState<Apartment[]>(
    () => safeParse<Apartment[]>(localStorage.getItem(LS_KEY), [])
  )

  const [location, setLocation] = useState({
    address: '',
    placeId: '',
    lat: null as number | null,
    lng: null as number | null,
  })

  // Autocomplete state
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoadingSug, setIsLoadingSug] = useState(false)
  const [isOpenSug, setIsOpenSug] = useState(false)

  const key = '4c4ca6a87d484e2e8f6fe563a3db2db4'
  const abortRef = useRef<AbortController | null>(null)

  const canSearch = useMemo(() => {
    return showForm && !!key && query.trim().length >= 3
  }, [showForm, key, query])

  useEffect(() => {
    if (!canSearch) {
      setSuggestions([])
      return
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setIsLoadingSug(true)

      try {
        const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
        url.searchParams.set('text', query.trim())
        url.searchParams.set('apiKey', key)
        url.searchParams.set('limit', '6')
        url.searchParams.set('lang', 'es')
        url.searchParams.set('filter', 'countrycode:ar')

        const res = await fetch(url.toString(), { signal: ac.signal })
        if (!res.ok) throw new Error(`Geoapify error ${res.status}`)

        const data = await res.json()
        const feats = (data?.features ?? []) as any[]

        const mapped: Suggestion[] = feats
          .map((f) => {
            const coords = f?.geometry?.coordinates
            const props = f?.properties
            if (!coords?.length || !props) return null

            const lng = Number(coords[0])
            const lat = Number(coords[1])

            const id = String(props.place_id ?? f.id ?? `${lat},${lng}`)
            const label = String(props.formatted ?? props.address_line1 ?? props.name ?? '').trim()
            if (!label) return null

            return { id, label, lat, lng }
          })
          .filter(isSuggestion)

        setSuggestions(mapped)
        setIsOpenSug(true)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.error('[Geoapify] Error ❌', e)
          setSuggestions([])
        }
      } finally {
        setIsLoadingSug(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [canSearch, query, key])

  function pickSuggestion(s: Suggestion) {
    setLocation({
      address: s.label,
      placeId: s.id,
      lat: s.lat,
      lng: s.lng,
    })
    setQuery(s.label)
    setIsOpenSug(false)
  }

  // function handleDelete(id: string) {
  //   const ok = confirm('¿Eliminar este departamento?')
  //   if (!ok) {
  //     console.log('[Eliminar] Cancelado por el usuario')
  //     return
  //   }

  //   try {
  //     setApartments((prev) => {
  //       const updated = prev.filter((a) => a.id !== id)
  //       localStorage.setItem(LS_KEY, JSON.stringify(updated))
  //       return updated
  //     })
  //     console.log(`[Eliminar] Departamento eliminado ✅ id=${id}`)
  //   } catch (err) {
  //     console.error('[Eliminar] Error al eliminar ❌', err)
  //   }
  // }

  function handleReset() {
    const ok = confirm('¿Reiniciar listado de departamentos?')
    if (!ok) {
      console.log('[Reiniciar] Cancelado por el usuario')
      return
    }

    try {
      localStorage.removeItem(LS_KEY)
      setApartments([])
      console.log('[Reiniciar] Listado eliminado correctamente ✅')
    } catch (err) {
      console.error('[Reiniciar] Error al reiniciar ❌', err)
    }
  }

  function handleConfirm() {
    try {
      if (!location.address) {
        console.log('[Confirmar] No se agregó: falta ubicación (seleccioná una sugerencia).')
        alert('Elegí una ubicación desde las sugerencias.')
        return
      }

      const rentNum = Number(form.rent || 0)
      const expNum = Number(form.expenses || 0)
      const coverNum = Number(form.cover || 0)
      const roomsNum = Number(form.rooms || 0)

      const newItem: Apartment = {
        id: crypto.randomUUID(),
        location: location.address,
        placeId: location.placeId,
        lat: location.lat,
        lng: location.lng,

        rent: rentNum,
        rentCurrency: form.rentCurrency,

        expenses: expNum,
        expensesCurrency: form.expensesCurrency,

        cover: coverNum,
        rooms: roomsNum,
        furnished: form.furnished,
        link: form.link.trim(),
        comment: form.comment.trim(),
        createdAt: new Date().toISOString(),
      }

      setApartments((prev) => {
        const updated = [newItem, ...prev]
        localStorage.setItem(LS_KEY, JSON.stringify(updated))
        return updated
      })

      console.log('[Confirmar] Agregado OK ✅', newItem)

      setForm({
        rent: '',
        rentCurrency: 'ARS',
        expenses: '',
        expensesCurrency: 'ARS',
        cover: '',
        rooms: '',
        furnished: false,
        link: '',
        comment: '',
      })
      setLocation({ address: '', placeId: '', lat: null, lng: null })
      setQuery('')
      setShowForm(false)
    } catch (err) {
      console.error('[Confirmar] Error al guardar ❌', err)
    }
  }

  function getTotal(a: Apartment, target: Currency) {
    const rentCur: Currency = a.rentCurrency ?? 'ARS'
    const expCur: Currency = a.expensesCurrency ?? 'ARS'

    if (target === 'ARS') {
      const totalArs = toARS(a.rent, rentCur) + toARS(a.expenses, expCur)
      return fmtARS(totalArs)
    } else {
      const totalUsd = toUSD(a.rent, rentCur) + toUSD(a.expenses, expCur)
      return fmtUSD(totalUsd)
    }
  }

  return (
    <>
      <h1>Lista de departamentos</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Cancelar' : '+ Agregar Depto Visto'}
        </button>

        {showForm ? (
          <button type="button" onClick={handleConfirm}>
            Confirmar
          </button>
        ) : (
          <button type="button" onClick={handleReset}>
            Reiniciar
          </button>
        )}
      </div>

      {showForm && (
        <form>
          <div style={{ position: 'relative' }}>
            <label>Ubicación:</label>
            <input
              type="text"
              placeholder="Escribí una dirección…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpenSug(true)
              }}
              onFocus={() => setIsOpenSug(true)}
              onBlur={() => setTimeout(() => setIsOpenSug(false), 150)}
            />

            {isOpenSug && (isLoadingSug || suggestions.length > 0) && (
              <div className="suggestions">
                {isLoadingSug && <div className="suggestionItem muted">Buscando…</div>}
                {!isLoadingSug &&
                  suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="suggestionItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(s)}
                    >
                      {s.label}
                    </button>
                  ))}
                {!isLoadingSug && suggestions.length === 0 && query.trim().length >= 3 && (
                  <div className="suggestionItem muted">Sin resultados</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label>Alquiler:</label>
            <input
              type="number"
              min="0"
              placeholder="100"
              value={form.rent}
              onChange={(e) => setForm((p) => ({ ...p, rent: e.target.value }))}
            />
          </div>

          <div>
            <label>Moneda Alquiler:</label>
            <select
              value={form.rentCurrency}
              onChange={(e) => setForm((p) => ({ ...p, rentCurrency: e.target.value as Currency }))}
            >
              <option value="ARS">ARS$</option>
              <option value="USD">USD$</option>
            </select>
          </div>

          <div>
            <label>Expensas:</label>
            <input
              type="number"
              min="0"
              placeholder="10"
              value={form.expenses}
              onChange={(e) => setForm((p) => ({ ...p, expenses: e.target.value }))}
            />
          </div>

          <div>
            <label>Moneda Expensas:</label>
            <select
              value={form.expensesCurrency}
              onChange={(e) => setForm((p) => ({ ...p, expensesCurrency: e.target.value as Currency }))}
            >
              <option value="ARS">ARS$</option>
              <option value="USD">USD$</option>
            </select>
          </div>

          <div>
            <label>m² Cubiertos:</label>
            <input
              type="number"
              min="0"
              placeholder="10"
              value={form.cover}
              onChange={(e) => setForm((p) => ({ ...p, cover: e.target.value }))}
            />
          </div>

          <div>
            <label>Ambientes:</label>
            <input
              type="number"
              placeholder="2"
              value={form.rooms}
              onChange={(e) => setForm((p) => ({ ...p, rooms: e.target.value }))}
            />
          </div>

          <div>
            <label>Amoblado:</label>
            <select
              value={String(form.furnished)}
              onChange={(e) => setForm((p) => ({ ...p, furnished: e.target.value === 'true' }))}
            >
              <option value="true">SI</option>
              <option value="false">NO</option>
            </select>
          </div>

          <div>
            <label>URL:</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={form.link}
              onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
            />
          </div>

          <div>
            <label>Comentario</label>
            <input
              type="text"
              placeholder="Comentario"
              value={form.comment}
              onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
            />
          </div>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Ubicación</th>
            <th>Alquiler</th>
            <th>Expensas</th>
            <th>
              Total
              <div style={{display: 'flex' ,justifyContent: 'space-between'}}>
                <small style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>
                  {showTotalInUSD ? 'USD' : 'ARS'}
                </small>
                <label className="switch" style={{ marginLeft: 8 }}>
                  <input
                    type="checkbox"
                    checked={showTotalInUSD}
                    onChange={(e) => setShowTotalInUSD(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </th>
            <th>Cubiertos</th>
            <th>Ambientes</th>
            <th>Amoblado</th>
            <th>Link</th>
            <th>Comentario</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {apartments.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ opacity: 0.7, textAlign: 'center', padding: 14 }}>
                No hay departamentos guardados todavía
              </td>
            </tr>
          ) : (
            apartments.map((a) => (
              <tr key={a.id}>
                <td>{a.location}</td>
                <td>{(a.rentCurrency ?? 'ARS')} {a.rent}</td>
                <td>{(a.expensesCurrency ?? 'ARS')} {a.expenses}</td>
                <td>{getTotal(a, showTotalInUSD ? 'USD' : 'ARS')}</td>
                <td>{a.cover}</td>
                <td>{a.rooms}</td>
                <td>{a.furnished ? 'SI' : 'NO'}</td>
                <td>{a.link ? <a href={a.link} target="_blank" rel="noreferrer">Ver</a> : '—'}</td>
                <td>{a.comment || '—'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = confirm('¿Eliminar este departamento?')
                      if (!ok) return
                      setApartments((prev) => {
                        const updated = prev.filter((x) => x.id !== a.id)
                        localStorage.setItem(LS_KEY, JSON.stringify(updated))
                        return updated
                      })
                    }}
                    title="Eliminar departamento"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffa9aaff', fontSize: 16 }}
                  >
                    <i className="fa fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <small style={{ display: 'block', marginTop: 10, opacity: 0.65 }}>
        Tasa usada (blue): 1 USD = {usdRateArs} ARS{rateError ? ` (fallback; ${rateError})` : ''} <a href='https://bluelytics.com.ar/#!/'>bluelytics.com.ar</a>
      </small>
    </>
  )
}

export default App
