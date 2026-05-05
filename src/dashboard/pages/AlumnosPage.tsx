import { students } from '../mockData'

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
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.firstName}</td>
                <td>{student.lastName}</td>
                <td>{student.email}</td>
                <td>{student.joinedAt}</td>
                <td>{student.paid}</td>
                <td>
                  <span className="admin-pill">{student.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
