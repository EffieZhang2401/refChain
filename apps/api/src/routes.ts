import { Router } from 'express';
import { merchantRouter } from './modules/merchants/merchant.router';
import { referralRouter } from './modules/referrals/referral.router';
import { orderRouter } from './modules/orders/order.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { authRouter } from './modules/auth/auth.router';

export const routes = Router();

routes.use('/auth', authRouter);
routes.use('/merchants', merchantRouter);
routes.use('/referrals', referralRouter);
routes.use('/orders', orderRouter);
routes.use('/dashboard', dashboardRouter);
