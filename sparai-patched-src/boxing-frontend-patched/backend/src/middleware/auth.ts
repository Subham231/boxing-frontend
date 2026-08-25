import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// ---------------------------------------------------------------------------
// Verifies the Supabase access token sent in `Authorization: Bearer <token>`
// and attaches the real, server-verified user id to req.userId.
//
// This is the single most important security control in the whole payment
// flow: every payment-creation route uses req.userId (derived here) to
// decide whose account gets charged/upgraded — NEVER a userId taken from
// the request body, which a malicious client could set to any value to
// upgrade someone else's account or impersonate a user.
// ---------------------------------------------------------------------------

export interface AuthedRequest extends Request {
    userId?: string;
    userEmail?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Missing bearer token' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Auth service unavailable' });
        }

        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.userId = data.user.id;
        req.userEmail = data.user.email ?? undefined;
        next();
    } catch (err) {
        console.error('[auth] Unexpected error verifying token:', err);
        res.status(500).json({ error: 'Auth verification failed' });
    }
}
