import * as admin from 'firebase-admin';
import * as path from 'path';
import logger from '../utils/logger.util';

class FirebaseService {
    private static instance: FirebaseService | undefined;
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
        data?: Record<string, string>
    ): Promise<boolean> {
        const messaging = this.getMessaging();
        if (!messaging) {
            logger.warn('🚫 Firebase messaging not available - app not initialized');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                token,
                notification: {
                    title,
                    body,
                },
                data: data ?? {},
                android: {
                    notification: {
                        channelId: 'friend_activity_channel',
                        priority: 'high',
                        defaultSound: true,
                    },
                },
            };

            logger.info(`📤 [FCM] Attempting to send notification:`);
            logger.info(`   📱 Token: ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
            logger.info(`   📰 Title: "${title}"`);
            logger.info(`   💬 Body: "${body}"`);
            logger.info(`   📦 Data: ${JSON.stringify(data ?? {})}`);
            logger.info(`   🤖 Android Channel: friend_activity_channel`);
            
            const startTime = Date.now();
            const response = await messaging.send(message);
            const duration = Date.now() - startTime;
            
            logger.info(`✅ [FCM] Successfully sent notification in ${duration}ms`);
            logger.info(`   📧 Message ID: ${response}`);
            return true;
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string; details?: unknown };
            logger.error(`❌ [FCM] Error sending notification:`, error);
            logger.error(`   🔢 Error code: ${firebaseError.code ?? 'N/A'}`);
            logger.error(`   💬 Error message: ${firebaseError.message ?? 'N/A'}`);
            logger.error(`   📊 Error details: ${JSON.stringify(firebaseError.details ?? {})}`);
            
            // Log specific Firebase error codes with solutions
            if (firebaseError.code === 'messaging/invalid-registration-token' || 
                firebaseError.code === 'messaging/registration-token-not-registered') {
                logger.error('   🔧 → FCM token is invalid or expired. User needs to re-login.');
            } else if (firebaseError.code === 'messaging/invalid-argument') {
                logger.error('   🔧 → Invalid message format. Check notification payload.');
            } else if (firebaseError.code === 'messaging/authentication-error') {
                logger.error('   🔧 → Firebase authentication failed. Check service account.');
            } else if (firebaseError.code === 'messaging/invalid-data-payload-key') {
                logger.error('   🔧 → Invalid data payload. All values must be strings.');
            }
            
            return false;
        }
    }

    public async sendMulticastNotification(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>
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
                data: data ?? {},
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

            return Number(response.successCount);
        } catch (error) {
            logger.error('Error sending multicast notification:', error);
            return 0;
        }
    }
}

export const firebaseService = FirebaseService.getInstance();