import './funnel.css'

export function FunnelHomePage() {
  return (
    <main className="funnel-home">
      <div className="funnel-video-wrap">
        <iframe
          className="funnel-video"
          src="https://www.youtube.com/embed/3vhnogHLr1I"
          title="Metodo Berich"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <a className="funnel-cta" href="/quiz">
        Ir al formulario
      </a>
    </main>
  )
}
