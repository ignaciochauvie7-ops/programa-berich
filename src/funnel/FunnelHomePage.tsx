import './funnel.css'

export function FunnelHomePage() {
  return (
    <main className="funnel-home">
      <div className="funnel-video-block">
        <div className="funnel-video-wrap">
          <iframe
            className="funnel-video"
            src="https://player.vimeo.com/video/1197374050?autoplay=1&muted=1&playsinline=1&title=0&byline=0&portrait=0&dnt=1"
            title="Recurso gratuito — Método Berich"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
        <p className="funnel-video-sound-hint">Tocá el video para activar el sonido</p>
      </div>

      <a className="funnel-cta" href="/quiz">
        Ir al formulario
      </a>
    </main>
  )
}
