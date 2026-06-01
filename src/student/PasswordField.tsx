import { useId, useState, type ChangeEvent } from 'react'

type PasswordFieldProps = {
  id?: string
  name?: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  disabled?: boolean
}

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.2 4.2M7.2 7.4C5.5 8.6 4 10.2 3 12c0 0 3.5 7 9 7 1.8 0 3.4-.5 4.8-1.3M14 9.2c.9.5 1.6 1.3 2 2.3M21 12s-1.2 2.4-3.5 4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PasswordField({
  id: idProp,
  name,
  label,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  disabled,
}: PasswordFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const [visible, setVisible] = useState(false)

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  return (
    <div className="student-auth__field">
      <label htmlFor={id}>{label}</label>
      <div className="student-auth__password-wrap">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onInputChange}
          required={required}
          minLength={minLength}
          disabled={disabled}
        />
        <button
          type="button"
          className="student-auth__password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  )
}
