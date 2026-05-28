import { Router } from 'express';
import { getLocations, createLocation, updateLocation, transferLocation } from '../controllers/location.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getLocations);
router.post('/', authenticate, createLocation);
router.put('/:id', authenticate, updateLocation);
router.post('/transfer', authenticate, transferLocation);

export default router;
