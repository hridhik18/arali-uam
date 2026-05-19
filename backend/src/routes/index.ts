import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { invitationsRouter } from './invitations.routes.js';
import { usersRouter } from './users.routes.js';
import { teamsRouter } from './teams.routes.js';
import { accountsRouter } from './accounts.routes.js';

export const router = Router();
router.use('/auth', authRouter);
router.use('/invitations', invitationsRouter);
router.use('/users', usersRouter);
router.use('/teams', teamsRouter);
router.use('/customer-accounts', accountsRouter);
