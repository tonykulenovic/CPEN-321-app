import * as admin from 'firebase-admin';
import * as path from 'path';
import logger from '../utils/logger.util';

class FirebaseService {
    private static instance: FirebaseService;
    private app: admin.app.App | null = null;

    private constructor() {}

    public static getInstance(): FirebaseService {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }

    public initialize(): void {
        try {
            if (!this.app) {
                // Use the firebase.json service account file
                const config = {
                    credential: admin.credential.cert(path.join(__dirname, '../../firebase.json')),
                    projectId: 'cpen-321-900e0'
                };

                this.app = admin.initializeApp(config);
                logger.info('✅ Firebase Admin SDK initialized with service account');
            }
        } catch (error) {
            logger.error('❌ Failed to initialize Firebase:', error);
            logger.warn('Push notifications will be disabled');
        }
    }

    public getMessaging(): admin.messaging.Messaging | null {
        if (!this.app) {
            logger.warn('Firebase not initialized - cannot send notifications');
            return null;
        }
        return admin.messaging();
    }

    public async sendNotification(
        token: string,
        title: string,
        body: string,
        data?: { [key: string]: string }
    ): Promise<boolean> {
        const messaging = this.getMessaging();
        if (!messaging) {
            logger.warn('Firebase messaging not available');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                token,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    notification: {
                        channelId: 'friend_activity_channel',
                        priority: 'high',
                        defaultSound: true,
                    },
                },
            };

            logger.info(`📤 Attempting to send notification to token: ${token.substring(0, 30)}...`);
            logger.info(`   Title: ${title}`);
            logger.info(`   Body: ${body}`);
            
            const response = await messaging.send(message);
            logger.info(`✅ Successfully sent message: ${response}`);
            return true;
        } catch (error: any) {
            logger.error('❌ Error sending notification:', error);
            logger.error(`   Error code: ${error.code || 'N/A'}`);
            logger.error(`   Error message: ${error.message || 'N/A'}`);
            
            // Log specific Firebase error codes
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
                logger.error('   → FCM token is invalid or expired. User needs to re-login.');
            } else if (error.code === 'messaging/invalid-argument') {
                logger.error('   → Invalid message format. Check notification payload.');
            }
            
            return false;
        }
    }

    public async sendMulticastNotification(
        tokens: string[],
        title: string,
        body: string,
        data?: { [key: string]: string }
    ): Promise<number> {
        const messaging = this.getMessaging();
        if (!messaging || tokens.length === 0) {
            logger.warn('Firebase messaging not available or no tokens provided');
            return 0;
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    notification: {
                        channelId: 'friend_activity_channel',
                        priority: 'high',
                        defaultSound: true,
                    },
                },
            };

            const response = await messaging.sendEachForMulticast(message);
            logger.info(`Successfully sent ${response.successCount} notifications out of ${tokens.length}`);
            
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        logger.warn(`Failed to send notification to token ${tokens[idx]}: ${resp.error}`);
                    }
                });
            }

            return response.successCount;
        } catch (error) {
            logger.error('Error sending multicast notification:', error);
            return 0;
        }
    }
}

export const firebaseService = FirebaseService.getInstance();