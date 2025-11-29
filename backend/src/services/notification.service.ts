import { firebaseService } from '../config/firebase';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';
import mongoose from 'mongoose';

export class NotificationService {
    private static instance: NotificationService | undefined;

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
                logger.info(`📭 [NOTIFY] No FCM token for user ${toUserId}, skipping friend request notification`);
                return;
            }
         
            const title = 'New Friend Request';
            const body = `${fromUserName} sent you a friend request`;

            await firebaseService.sendNotification(
                toUser.fcmToken,
                title,
                body,
                {
                    type: 'friend_request_received',
                    fromUserId,
                    fromUserName
                }
            );

        } catch (error) {
            logger.error('💥 [NOTIFY] Error sending friend request notification:', error);
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
        } catch (error) {
            logger.error('Error sending friend request accepted notification:', error);
        }
    }

    /**
     * Send location recommendation notification
     */
    public async sendLocationRecommendationNotification(
        toUserId: string,
        title: string,
        body: string,
        recommendationData: {
            pinId: string;
            mealType: string;
            distance: number;
            score: number;
        }
    ): Promise<boolean> {
        try {
            logger.info(`🔔 [NOTIFY] Location recommendation: ${title} → user ${toUserId}`);
            
            const toUser = await userModel.findById(new mongoose.Types.ObjectId(toUserId));
            if (!toUser?.fcmToken) {
                logger.info(`📭 [NOTIFY] No FCM token for user ${toUserId}, skipping recommendation notification`);
                return false;
            }

            const sent = await firebaseService.sendNotification(
                toUser.fcmToken,
                title,
                body,
                {
                    type: 'location_recommendation',
                    pinId: recommendationData.pinId,
                    mealType: recommendationData.mealType,
                    distance: recommendationData.distance.toString(),
                    score: recommendationData.score.toString(),
                }
            );

            return sent;
        } catch (error) {
            logger.error('💥 [NOTIFY] Error sending location recommendation notification:', error);
            return false;
        }
    }
}

export const notificationService = NotificationService.getInstance();