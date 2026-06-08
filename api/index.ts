import { webHandler } from './_lib/webHandler.js'
import affiliatesMarkPaid from './_affiliates/mark-paid.js'
import affiliatesMe from './_affiliates/me.js'
import affiliatesRecordSale from './_affiliates/record-sale.js'
import affiliatesStats from './_affiliates/stats.js'
import invitePreview from './_invite/preview.js'
import inviteSignup from './_invite/signup.js'
import price from './_price.js'
import coachProfile from './_coach/profile.js'
import coachEnroll from './_coach/enroll.js'
import coachSetupSummary from './_coach/setup-summary.js'
import coachCron from './_coach/cron.js'
import alumnos from './_alumnos/index.js'
import alumnosActivate from './_alumnos/activate.js'
import whatsappWebhook from './_whatsapp/webhook.js'
import polarCheckout from './_polar/checkout.js'
import polarWebhook from './_polar/webhook.js'

type RouteHandler = (req: Request) => Promise<Response>

const routes = new Map<string, RouteHandler>([
  ['/api/affiliates/mark-paid', affiliatesMarkPaid as unknown as RouteHandler],
  ['/api/affiliates/me', affiliatesMe as unknown as RouteHandler],
  ['/api/affiliates/record-sale', affiliatesRecordSale as unknown as RouteHandler],
  ['/api/affiliates/stats', affiliatesStats as unknown as RouteHandler],
  ['/api/invite/preview', invitePreview as unknown as RouteHandler],
  ['/api/invite/signup', inviteSignup as unknown as RouteHandler],
  ['/api/price', price as unknown as RouteHandler],
  ['/api/coach/profile', coachProfile as unknown as RouteHandler],
  ['/api/coach/enroll', coachEnroll as unknown as RouteHandler],
  ['/api/coach/setup-summary', coachSetupSummary as unknown as RouteHandler],
  ['/api/coach/cron', coachCron as unknown as RouteHandler],
  ['/api/alumnos', alumnos as unknown as RouteHandler],
  ['/api/alumnos/activate', alumnosActivate as unknown as RouteHandler],
  ['/api/whatsapp/webhook', whatsappWebhook as unknown as RouteHandler],
  ['/api/polar/checkout', polarCheckout as unknown as RouteHandler],
  ['/api/polar/webhook', polarWebhook as unknown as RouteHandler],
])

async function router(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/\/$/, '') || '/'
  const handler = routes.get(pathname)
  if (!handler) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return handler(request)
}

export default webHandler(router)
