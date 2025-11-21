import { Router } from 'express';
import { authRouter } from './auth';
import { userAuthRouter } from './userAuth';
import { merchantsRouter } from './merchants';
import { referralsRouter } from './referrals';
import { ordersRouter } from './orders';
import { dashboardRouter } from './dashboard';
import { pointsRouter } from './points';
import { userRouter } from './user';
import { userReferralRouter } from './userReferrals';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/user/auth', userAuthRouter);
apiRouter.use('/merchants', merchantsRouter);
apiRouter.use('/referrals', referralsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/points', pointsRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/user/referrals', userReferralRouter);
