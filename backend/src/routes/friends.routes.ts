import { Router } from 'express';
import * as friendsController from '../controllers/friends.controller';
import * as locationController from '../controllers/location.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all friends routes
router.use(authenticateToken);

// Friend request routes
router.post('/requests', (req, res) => void friendsController.sendFriendRequest(req, res));
router.get('/requests', (req, res) => void friendsController.listFriendRequests(req, res));
router.post('/requests/:id/accept', (req, res) => void friendsController.acceptFriendRequest(req, res));
router.post('/requests/:id/decline', (req, res) => void friendsController.declineFriendRequest(req, res));

// Friends management routes
router.get('/', (req, res) => void friendsController.listFriends(req, res));
router.patch('/:friendId', (req, res) => void friendsController.updateFriend(req, res));
router.delete('/:friendId', (req, res) => void friendsController.removeFriend(req, res));

// Location routes
router.get('/locations', (req, res) => void locationController.getFriendsLocations(req, res));

export default router;