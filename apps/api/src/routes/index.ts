import { Router } from 'express';
import { authRouter } from './auth';
import { merchantsRouter } from './merchants';
import { referralsRouter } from './referrals';
import { ordersRouter } from './orders';
import { dashboardRouter } from './dashboard';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/merchants', merchantsRouter);
apiRouter.use('/referrals', referralsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/dashboard', dashboardRouter);
