import { Router } from 'express'
import { prisma } from '../../db/prisma'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import { eventBus } from '../../patterns/event-bus'
import { asyncHandler, ok } from '../../shared/http'
import { createSessionSchema } from './session.schemas'
import { SessionRepository } from './session.repository'
import { SessionService } from './session.service'

export const sessionRepo = new SessionRepository(prisma)
export const sessionService = new SessionService(sessionRepo)
export const sessionRouter = Router()

sessionRouter.post(
  '/',
  authenticate,
  validateBody(createSessionSchema),
  asyncHandler(async (req, res) => {
    ok(res, await sessionService.createSession({ ...req.body, leaderId: req.user!.userId }), 201)
  })
)

sessionRouter.get('/my', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.getSessionsByLeader(req.user!.userId))))
sessionRouter.get('/joined', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.getSessionsByMember(req.user!.userId))))
sessionRouter.get('/:code', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.getSession(req.params.code))))
sessionRouter.post('/:code/join', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.joinSession(req.params.code, req.user!.userId))))
sessionRouter.post('/:code/lock', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.lockSession(req.params.code, req.user!.userId))))
sessionRouter.post('/:code/checkout', authenticate, asyncHandler(async (req, res) => ok(res, await sessionService.checkoutSession(req.params.code, req.user!.userId))))

sessionRouter.get(
  '/:code/events',
  asyncHandler(async (req, res) => {
    const session = await sessionService.getSession(req.params.code)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.flushHeaders()
    res.write(`event: CONNECTED\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`)

    const unsubscribe = eventBus.subscribe(session.id, (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    })

    req.on('close', unsubscribe)
  })
)
