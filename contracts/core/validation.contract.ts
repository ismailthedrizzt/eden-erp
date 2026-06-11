import { z } from 'zod'

export const uuidString = z.string().uuid()
export const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const isoDateTimeString = z.string().datetime({ offset: true }).or(z.string().datetime())

export const safeApiErrorSchema = z.object({
  ok: z.literal(false),
  message: z.string().min(1),
  code: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
})

export const successResponseSchema = z.object({
  ok: z.boolean().optional(),
  data: z.unknown().optional(),
  meta: z.unknown().optional(),
  warnings: z.array(z.string()).optional(),
})
