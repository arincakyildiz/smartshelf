import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createMatchRequest, getRequests, getRequestMatches
} from '../controllers/matchingController';

const router = Router();

router.use(authenticate);
router.post('/match-request', asyncHandler(createMatchRequest));
router.get('/requests', asyncHandler(getRequests));
router.get('/requests/:id/matches', asyncHandler(getRequestMatches));

export default router;
