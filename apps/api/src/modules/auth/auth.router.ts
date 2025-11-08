import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';

export const authRouter = Router();

authRouter.get('/profile', requireAuth, (req, res) => {
  res.json(req.user);
});
