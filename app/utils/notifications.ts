import { ID } from 'appwrite';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, message: string): Promise<void> {
  try {
    await client.messages.create({
      body: message,
      to,
      from: process.env.TWILIO_PHONE_NUMBER
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error('Failed to send SMS');
  }
}

export interface UtilNotification {
  id: string;
  type: 'withdrawal' | 'system' | 'error';
  title: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

export async function createNotification(
  database: any,
  data: Omit<UtilNotification, 'id' | 'timestamp' | 'read'>
): Promise<void> {
  try {
    await database.createDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
      ID.unique(),
      {
        ...data,
        timestamp: new Date().toISOString(),
        read: false
      }
    );
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
}

export async function markNotificationAsRead(
  database: any,
  notificationId: string
): Promise<void> {
  try {
    await database.updateDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
      notificationId,
      {
        read: true
      }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
}

export async function deleteNotification(
  database: any,
  notificationId: string
): Promise<void> {
  try {
    await database.deleteDocument(
      process.env.NEXT_PUBLIC_DATABASE_ID!,
      process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS!,
      notificationId
    );
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
} 