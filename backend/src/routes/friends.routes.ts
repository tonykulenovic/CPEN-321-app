import { Router } from 'express';
import * as friendsController from '../controllers/friends.controller';
import * as locationController from '../controllers/location.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all friends routes
router.use(authenticateToken);

// Friend request routes
router.post('/requests', (req, res) => {
  friendsController.sendFriendRequest(req, res).catch(() => {});
});
router.get('/requests', (req, res) => {
  friendsController.listFriendRequests(req, res).catch(() => {});
});

router.post('/requests/:id/accept', (req, res) => {
  friendsController.acceptFriendRequest(req, res).catch(() => {});
});
router.post('/requests/:id/decline', (req, res) => {
  friendsController.declineFriendRequest(req, res).catch(() => {});
});

// Friends management routes
router.get('/', (req, res) => {
  friendsController.listFriends(req, res).catch(() => {});
});
router.patch('/:friendId', (req, res) => {
  friendsController.updateFriend(req, res).catch(() => {});
});
router.delete('/:friendId', (req, res) => {
  friendsController.removeFriend(req, res).catch(() => {});
});

// Location routes
router.get('/locations', (req, res) => {
  locationController.getFriendsLocations(req, res).catch(() => {});
});

export default router;