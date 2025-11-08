import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { createOrderSchema } from './order.validators';
import { createOrder, listOrdersByMerchant } from './order.service';

export const orderRouter = Router();

orderRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const order = await createOrder(req.user!.id, input);
    res.status(201).json(order);
  })
);

orderRouter.get(
  '/merchant/:merchantId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await listOrdersByMerchant(req.user!.id, req.params.merchantId);
    res.json(orders);
  })
);
