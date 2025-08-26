import { Router } from 'express';
import { getCaptcha } from '../abuse/middleware.js';

const router = Router();
router.get('/new', getCaptcha);
export default router;
