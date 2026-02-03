import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) throw new Error('ARCJET_KEY environment variable is not set.');

export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 }),
        ]

    }) : null

export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] }),
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 }),
        ]

    }) : null

/**
 * Create an Express-style middleware that enforces ArcJet protection on incoming HTTP requests.
 *
 * The middleware calls ArcJet to evaluate the request and:
 * - forwards the request (calls `next()`) when allowed or when ArcJet is not configured,
 * - responds with HTTP 429 and `{ error: 'Too Many Requests' }` when denied for rate limiting,
 * - responds with HTTP 403 and `{ error: 'Forbidden' }` for other denials,
 * - responds with HTTP 503 and `{ error: 'Service Unavailable' }` if an internal error occurs while evaluating the request.
 *
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void} An Express-compatible middleware function.
 */
export function securityMiddleware(){
    return async (req, res, next) => {
        if(!httpArcjet){
            return next();
        }
        try {
            const decision = await httpArcjet.protect(req);

            if (decision.isDenied) {
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({ error: 'Too Many Requests' });
                }
                return res.status(403).json({ error: 'Forbidden' });
            }

            
        }
        catch (err) {
            console.error('Arcjet middleware error:', err);
            return res.status(503).json({ error: 'Service Unavailable' });
        }

        next();
        
}}