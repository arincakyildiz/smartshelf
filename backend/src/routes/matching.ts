import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createMatchRequest, getRequests, getRequestMatches
} from '../controllers/matchingController';

const router = Router();

router.use(authenticate);
router.post('/match-request', createMatchRequest);
router.get('/requests', getRequests);
router.get('/requests/:id/matches', getRequestMatches);

export default router;
