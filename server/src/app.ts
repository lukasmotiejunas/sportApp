import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
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
import { webhooksRouter } from './routes/webhooks.js';

const app = express();

app.use(cors());

// Stripe webhooks MUST see the raw body for signature verification. Mount the
// router before express.json() so it can attach its own express.raw() parser.
app.use('/webhooks', webhooksRouter);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Public auth routes (login). /auth/me is protected inside the router.
app.use('/auth', authRouter);

// Public self-signup: prospective club owners buy a plan without an account.
app.use('/signup', signupRouter);

// Everything below requires a valid token.
app.use('/superadmin', requireAuth, superAdminRouter);
app.use('/users', requireAuth, usersRouter);
app.use('/members', requireAuth, membersRouter);
app.use('/coaches', requireAuth, coachesRouter);
app.use('/membership-plans', requireAuth, membershipPlansRouter);
app.use('/trainings', requireAuth, trainingsRouter);
app.use('/training-plans', requireAuth, trainingPlansRouter);
app.use('/leaderboards', requireAuth, leaderboardsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
