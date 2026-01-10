import { useEffect, useState } from 'react'
import './App.css'
import ApartmentForm, { type Currency, type FormState } from './components/ApartmentForm'
import ApartmentTable, { type Apartment } from './components/ApartmentTable'
import { enviroment } from './enviroments/enviroment'


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

export default function App() {
  const [showForm, setShowForm] = useState(false)
  const [showTotalInUSD, setShowTotalInUSD] = useState(false)

  // Solo Blue venta
  const [usdRateArs, setUsdRateArs] = useState<number>(1000)
  const [rateError, setRateError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchBlueRate() {
      try {
        const res = await fetch('https://api.bluelytics.com.ar/v2/latest')
        if (!res.ok) throw new Error(`Bluelytics error ${res.status}`)

        const data = await res.json()
        const rate = Number(data?.blue?.value_sell)

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

  function toARS(amount: number, currency: Currency) {
    return currency === 'ARS' ? amount : amount * usdRateArs
  }
  function toUSD(amount: number, currency: Currency) {
    return currency === 'USD' ? amount : amount / usdRateArs
  }

  const [form, setForm] = useState<FormState>({
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

  const [apartments, setApartments] = useState<Apartment[]>(
    () => safeParse<Apartment[]>(localStorage.getItem(LS_KEY), [])
  )

  const [location, setLocation] = useState({
    address: '',
    placeId: '',
    lat: null as number | null,
    lng: null as number | null,
  })

  const [query, setQuery] = useState('')

  function handleReset() {
    const ok = confirm('¿Reiniciar listado de departamentos?')
    if (!ok) {
      console.log('[Reiniciar] Cancelado por el usuario')
      return
    }
    localStorage.removeItem(LS_KEY)
    setApartments([])
    console.log('[Reiniciar] Listado eliminado correctamente')
  }

  function handleDelete(id: string) {
    const ok = confirm('¿Eliminar este departamento?')
    if (!ok) return

    setApartments((prev) => {
      const updated = prev.filter((x) => x.id !== id)
      localStorage.setItem(LS_KEY, JSON.stringify(updated))
      return updated
    })
  }

  function handleConfirm() {
    if (!location.address) {
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

      rent: rentNum,
      rentCurrency: form.rentCurrency,

      expenses: expNum,
      expensesCurrency: form.expensesCurrency,

      cover: coverNum,
      rooms: roomsNum,
      furnished: form.furnished,
      link: form.link.trim(),
      comment: form.comment.trim(),
    }

    setApartments((prev) => {
      const updated = [newItem, ...prev]
      localStorage.setItem(LS_KEY, JSON.stringify(updated))
      return updated
    })

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

  // const GEOAPIFY_KEY = '4c4ca6a87d484e2e8f6fe563a3db2db4'
  const GEOAPIFY_KEY = enviroment.GEOAPIFY_KEY

  return (
    <>
      <h1>Lista de departamentos</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowForm((p) => !p)}>
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

      <ApartmentForm
        geoapifyKey={GEOAPIFY_KEY}
        show={showForm}
        form={form}
        setForm={setForm}
        location={location}
        setLocation={setLocation}
        query={query}
        setQuery={setQuery}
      />

      <ApartmentTable
        apartments={apartments}
        showTotalInUSD={showTotalInUSD}
        setShowTotalInUSD={setShowTotalInUSD}
        getTotal={getTotal}
        onDelete={handleDelete}
      />

      <small style={{ display: 'block', marginTop: 10, opacity: 0.65 }}>
        Tasa usada (blue): 1 USD = {usdRateArs} ARS{rateError ? ` (fallback; ${rateError})` : ''}{' '}
        <a href="https://bluelytics.com.ar/#!/" target="_blank" rel="noreferrer">
          bluelytics.com.ar
        </a>
      </small>
    </>
  )
}
