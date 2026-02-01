import { z } from 'zod';

// MATCH_STATUS constant with lowercase values
export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
};

// Validates optional limit query param: coerced positive integer, max 100
export const listMatchesQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

// Validates route param { id }
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});



// Create match schema
export const createMatchSchema = z
  .object({
    sport: z.string().trim().min(1),
    homeTeam: z.string().trim().min(1),
    awayTeam: z.string().trim().min(1),
    startTime:z.iso.datetime(),
    endTime: z.iso.datetime(),
    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    // ensure endTime is after startTime
    try {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        // isoString refinement should have caught invalid formats, but guard anyway
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid startTime or endTime', path: ['startTime'] });
        return;
      }
      if (end.getTime() <= start.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'endTime must be after startTime', path: ['endTime'] });
      }
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date values' });
    }
  });

// Update scores schema
export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});
