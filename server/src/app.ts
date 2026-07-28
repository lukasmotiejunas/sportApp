import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import { requireActiveSubscription } from './middleware/subscriptionGuard.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { membersRouter } from './routes/members.js';
import { coachesRouter } from './routes/coaches.js';
import { membershipPlansRouter } from './routes/membershipPlans.js';
import { trainingsRouter } from './routes/trainings.js';
import { trainingPlansRouter } from './routes/trainingPlans.js';
import { leaderboardsRouter } from './routes/leaderboards.js';
import { superAdminRouter } from './routes/superadmin.js';
import { signupRouter } from './routes/signup.js';
import { subscriptionRouter } from './routes/subscription.js';
import { profileRouter } from './routes/profile.js';
import { webhooksRouter } from './routes/webhooks.js';
import { webhooksConnectRouter } from './routes/webhooksConnect.js';
import { publicRouter } from './routes/public.js';
import { connectRouter } from './routes/connect.js';

const app = express();

// Behind Vercel's edge, TLS terminates before the Node function. Without
// trusting the proxy, req.protocol reports "http" and any URL we hand to
// Stripe (accountLinks, return_url) is rejected as "Livemode must be HTTPS".
app.set('trust proxy', 1);

app.use(cors());

// Stripe webhooks MUST see the raw body for signature verification. Mount the
// routers before express.json() so they can attach their own express.raw().
// Two separate destinations: platform (Lumo→clubs subs) and connect
// (member→club subs on connected accounts).
app.use('/webhooks', webhooksRouter);
app.use('/webhooks', webhooksConnectRouter);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public auth routes (login). /auth/me is protected inside the router.
app.use('/auth', authRouter);

// Public self-signup: prospective club owners buy a plan without an account.
app.use('/signup', signupRouter);

// Public per-club endpoints (member join flow). No auth.
app.use('/public', publicRouter);

// Everything below requires a valid token.
app.use('/superadmin', requireAuth, superAdminRouter);
// /users, /subscription and /profile are always reachable (even when the
// club is suspended) so the admin can log in and pay/reactivate/update their
// own credentials.
app.use('/users', requireAuth, usersRouter);
app.use('/subscription', requireAuth, subscriptionRouter);
app.use('/profile', requireAuth, profileRouter);
app.use('/connect', requireAuth, connectRouter);
// Club-scoped domain routes are blocked when the subscription is past_due or
// cancelled — see requireActiveSubscription.
app.use('/members', requireAuth, requireActiveSubscription, membersRouter);
app.use('/coaches', requireAuth, requireActiveSubscription, coachesRouter);
app.use(
  '/membership-plans',
  requireAuth,
  requireActiveSubscription,
  membershipPlansRouter,
);
app.use('/trainings', requireAuth, requireActiveSubscription, trainingsRouter);
app.use(
  '/training-plans',
  requireAuth,
  requireActiveSubscription,
  trainingPlansRouter,
);
app.use(
  '/leaderboards',
  requireAuth,
  requireActiveSubscription,
  leaderboardsRouter,
);

app.use(notFound);
app.use(errorHandler);

export default app;
