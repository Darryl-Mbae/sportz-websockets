import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

// GET /:id/commentary - list commentary for a match
commentaryRouter.get("/", async (req, res) => {
    // validate params
    const paramsResult = matchIdParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues });
    }

    // validate query
    const queryResult = listCommentaryQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
        return res.status(400).json({ error: 'Invalid query parameters.', details: queryResult.error.issues });
    }

    const limit = Math.min(queryResult.data.limit ?? 10, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, paramsResult.data.id))
            .orderBy((desc(commentary.createdAt)))
            .limit(limit);

        return res.status(200).json({ data });
    } catch (err) {
        console.error('Failed to fetch commentary:', err);
        return res.status(500).json({ error: 'Failed to fetch commentary.', details: JSON.stringify(err) });
    }
});

// POST /:id/commentary - add commentary entry for a match
commentaryRouter.post('/', async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({ error: 'Invalid match ID.', details: paramsResult.error.issues });
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);

    if (!bodyResult.success) {
        return res.status(400).json({ error: 'Invalid commentary payload.', details: bodyResult.error.issues });
    }

    try {
        const { minute, ...rest } = bodyResult.data;
        const [result] = await db.insert(commentary).values({
            matchId: paramsResult.data.id,
            minute,
            ...rest
        }).returning();

        if(res.app.locals.broadcastCommentary) {
            res.app.locals.broadcastCommentary(result.matchId, result);
        }

        res.status(201).json({ data: result });
    } catch (error) {
        console.error('Failed to create commentary:', error);
        res.status(500).json({ error: 'Failed to create commentary.' });
    }
});


