import { useEffect, useMemo, useRef, useState } from 'react'

export type Currency = 'ARS' | 'USD'

export type Suggestion = {
  id: string
  label: string
  lat: number
  lng: number
}

export type FormState = {
  rent: string
  rentCurrency: Currency
  expenses: string
  expensesCurrency: Currency
  cover: string
  rooms: string
  furnished: boolean
  link: string
  comment: string
}

type Props = {
  geoapifyKey: string
  show: boolean
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>

  location: {
    address: string
    placeId: string
    lat: number | null
    lng: number | null
  }
  setLocation: React.Dispatch<
    React.SetStateAction<{
      address: string
      placeId: string
      lat: number | null
      lng: number | null
    }>
  >

  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
}

function isSuggestion(x: Suggestion | null): x is Suggestion {
  return x !== null
}

export default function ApartmentForm({
  geoapifyKey,
  show,
  form,
  setForm,
  location,
  setLocation,
  query,
  setQuery,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoadingSug, setIsLoadingSug] = useState(false)
  const [isOpenSug, setIsOpenSug] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const canSearch = useMemo(() => {
    return show && !!geoapifyKey && query.trim().length >= 3
  }, [show, geoapifyKey, query])

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
        url.searchParams.set('apiKey', geoapifyKey)
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
  }, [canSearch, query, geoapifyKey])

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

  if (!show) return null

  return (
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

        {!!location.address && (
          <small style={{ display: 'block', marginTop: 6, opacity: 0.8 }}>
            Guardado: {location.address} ({location.lat?.toFixed(5)}, {location.lng?.toFixed(5)})
          </small>
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
          onChange={(e) =>
            setForm((p) => ({ ...p, expensesCurrency: e.target.value as Currency }))
          }
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
  )
}
