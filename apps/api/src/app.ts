import express from 'express'
import cors from 'cors'
import { authRouter } from './modules/auth/auth.routes'
import { cartRouter } from './modules/cart/cart.routes'
import { itemRouter } from './modules/items/item.routes'
import { orderRouter } from './modules/orders/order.routes'
import { sessionRouter } from './modules/sessions/session.routes'
import { settlementRouter } from './modules/settlements/settlement.routes'
import { streakRouter } from './modules/streaks/streak.routes'
import { errorHandler } from './middleware/error-handler'

export function createApp() {
  const app = express()

  app.use(cors({ origin: '*', exposedHeaders: ['Content-Type'] }))
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/items', itemRouter)
  app.use('/api/order', orderRouter)
  app.use('/api/orders', orderRouter)
  app.use('/api/sessions', sessionRouter)
  app.use('/api/sessions/:code/cart', cartRouter)
  app.use('/api/sessions/:code/settlement', settlementRouter)
  app.use('/api/users', streakRouter)
  app.use(errorHandler)

  return app
}
