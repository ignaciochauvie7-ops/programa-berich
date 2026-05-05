/**
 * En `npm run dev`, la ruta /programa se abre sin Supabase ni cuenta: es solo para
 * maquetar y revisar contenido. En `vite build` / producción siempre aplica login + permisos.
 */
export const isStudentUiDevPreview = import.meta.env.DEV
