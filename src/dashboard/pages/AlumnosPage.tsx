export function AlumnosPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Alumnos</h1>
        <button type="button" className="admin-btn admin-btn--primary">
          Exportar CRM
        </button>
      </header>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Fecha integracion</th>
              <th>Pago</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', opacity: 0.5 }}>
                Sin alumnos todavía
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
