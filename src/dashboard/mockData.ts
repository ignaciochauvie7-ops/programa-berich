export type FunnelItem = {
  id: string
  name: string
  slug: string
  status: 'Borrador' | 'Activo'
  updatedAt: string
}

export type ProgramItem = {
  id: string
  title: string
  lessons: number
  students: number
  visibility: 'Privado' | 'Publicado'
}

export type StudentItem = {
  id: string
  firstName: string
  lastName: string
  email: string
  joinedAt: string
  paid: string
  status: 'Activo' | 'Pendiente' | 'Pausado'
}

export const funnels: FunnelItem[] = [
  {
    id: 'f1',
    name: 'Programa Berich',
    slug: 'entrenamiento',
    status: 'Activo',
    updatedAt: 'Hoy 05:20',
  },
]

export const programs: ProgramItem[] = [
  {
    id: 'p1',
    title: 'Fundamentos de entrenamiento',
    lessons: 8,
    students: 134,
    visibility: 'Publicado',
  },
  {
    id: 'p2',
    title: 'Nutricion aplicada',
    lessons: 6,
    students: 98,
    visibility: 'Privado',
  },
]

export const students: StudentItem[] = [
  {
    id: 's1',
    firstName: 'Lucas',
    lastName: 'Perez',
    email: 'lucas.perez@email.com',
    joinedAt: '2026-04-28',
    paid: '2.390 UYU',
    status: 'Activo',
  },
  {
    id: 's2',
    firstName: 'Camila',
    lastName: 'Sosa',
    email: 'camila.sosa@email.com',
    joinedAt: '2026-04-30',
    paid: '59 USD',
    status: 'Pendiente',
  },
  {
    id: 's3',
    firstName: 'Nicolas',
    lastName: 'Diaz',
    email: 'nicolas.diaz@email.com',
    joinedAt: '2026-05-02',
    paid: '2.390 UYU',
    status: 'Pausado',
  },
]
