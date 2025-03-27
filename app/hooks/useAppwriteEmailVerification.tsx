import { useState } from 'react';
import { account } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';

export default function useAppwriteEmailVerification() {
  const [loading, setLoading] = useState(false);

  const sendVerification = async (url: string) => {
    try {
      setLoading(true);
      await account.createVerification(url);
      return true;
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const accountDetails = await account.get();
      return accountDetails.emailVerification;
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendVerification,
    checkEmailVerification,
    loading
  };
} 