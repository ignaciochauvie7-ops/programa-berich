type Props = { text?: string }

export function BodyText({ text }: Props) {
  if (!text?.trim()) return null
  const lines = text.split('\n')
  return (
    <div className="funnel-body">
      {lines.map((line, i) => (
        <p key={i}>{line || '\u00a0'}</p>
      ))}
    </div>
  )
}
