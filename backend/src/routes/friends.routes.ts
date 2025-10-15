import { Router } from 'express';
import * as friendsController from '../controllers/friends.controller';
import * as locationController from '../controllers/location.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all friends routes
router.use(authenticateToken);

// Friend request routes
router.post('/requests', friendsController.sendFriendRequest);
router.get('/requests', friendsController.listFriendRequests);
router.post('/requests/:id/accept', friendsController.acceptFriendRequest);
router.post('/requests/:id/decline', friendsController.declineFriendRequest);

// Friends management routes
router.get('/', friendsController.listFriends);
router.patch('/:friendId', friendsController.updateFriend);
router.delete('/:friendId', friendsController.removeFriend);

// Location routes
router.get('/locations', locationController.getFriendsLocations);

export default router;