import { firebaseService } from '../config/firebase';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';
import mongoose from 'mongoose';

export class NotificationService {
    private static instance: NotificationService;

    private constructor() {}

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Send friend request received notification
     */
    public async sendFriendRequestNotification(
        toUserId: string,
        fromUserId: string,
        fromUserName: string
    ): Promise<void> {
        try {
            const toUser = await userModel.findById(new mongoose.Types.ObjectId(toUserId));
            if (!toUser?.fcmToken) {
                logger.info(`No FCM token for user ${toUserId}, skipping notification`);
                return;
            }

            const title = 'New Friend Request';
            const body = `${fromUserName} sent you a friend request`;

            const sent = await firebaseService.sendNotification(
                toUser.fcmToken,
                title,
                body,
                {
                    type: 'friend_request_received',
                    fromUserId,
                    fromUserName
                }
            );

            if (sent) {
                logger.info(`📲 Sent friend request notification to ${toUser.name}`);
            }
        } catch (error) {
            logger.error('Error sending friend request notification:', error);
        }
    }

    /**
     * Send friend request accepted notification
     */
    public async sendFriendRequestAcceptedNotification(
        toUserId: string,
        fromUserId: string,
        fromUserName: string
    ): Promise<void> {
        try {
            const toUser = await userModel.findById(new mongoose.Types.ObjectId(toUserId));
            if (!toUser?.fcmToken) {
                logger.info(`No FCM token for user ${toUserId}, skipping notification`);
                return;
            }

            const title = 'Friend Request Accepted';
            const body = `${fromUserName} accepted your friend request`;

            const sent = await firebaseService.sendNotification(
                toUser.fcmToken,
                title,
                body,
                {
                    type: 'friend_request_accepted',
                    fromUserId,
                    fromUserName
                }
            );

            if (sent) {
                logger.info(`📲 Sent friend request accepted notification to ${toUser.name}`);
            }
        } catch (error) {
            logger.error('Error sending friend request accepted notification:', error);
        }
    }
}

export const notificationService = NotificationService.getInstance();