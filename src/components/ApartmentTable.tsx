import type { Currency } from './ApartmentForm'

export type Apartment = {
  id: string
  location: string
  rent: number
  rentCurrency?: Currency
  expenses: number
  expensesCurrency?: Currency
  cover: number
  rooms: number
  furnished: boolean
  link: string
  comment: string
}

type Props = {
  apartments: Apartment[]
  showTotalInUSD: boolean
  setShowTotalInUSD: (v: boolean) => void
  getTotal: (a: Apartment, target: Currency) => string
  onDelete: (id: string) => void
}

export default function ApartmentTable({
  apartments,
  showTotalInUSD,
  setShowTotalInUSD,
  getTotal,
  onDelete,
}: Props) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Ubicación</th>
          <th>Alquiler</th>
          <th>Expensas</th>
          <th>
            Total
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
              <td>
                {(a.rentCurrency ?? 'ARS')} {a.rent}
              </td>
              <td>
                {(a.expensesCurrency ?? 'ARS')} {a.expenses}
              </td>
              <td>{getTotal(a, showTotalInUSD ? 'USD' : 'ARS')}</td>
              <td>{a.cover}m²</td>
              <td>{a.rooms}</td>
              <td>{a.furnished ? 'SI' : 'NO'}</td>
              <td>{a.link ? <a href={a.link} target="_blank" rel="noreferrer">Ver</a> : '—'}</td>
              <td>{a.comment || '—'}</td>
              <td>
                <button
                  type="button"
                  onClick={() => onDelete(a.id)}
                  title="Eliminar departamento"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ffa9aaff',
                    fontSize: 16,
                  }}
                >
                  <i className="fa fa-trash"></i>
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
