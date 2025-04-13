import { useState } from 'react';
import { account } from '@/libs/AppWriteClient';
import { toast } from 'react-hot-toast';

interface EmailVerificationState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

interface VerificationResult {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const useAppwriteEmailVerification = () => {
  const [state, setState] = useState<EmailVerificationState>({
    loading: false,
    success: false,
    error: null
  });

  /**
   * Отправляет запрос на верификацию email через Appwrite
   * @param redirectUrl - URL для перенаправления после подтверждения email
   */
  const sendVerification = async (redirectUrl: string = window.location.origin): Promise<VerificationResult> => {
    setState({ loading: true, success: false, error: null });
    
    try {
      console.log('Sending email verification request with redirect URL:', redirectUrl);
      
      // Get current user to verify they are logged in
      try {
        const currentUser = await account.get();
        console.log('Current user for verification:', {
          userId: currentUser.$id,
          email: currentUser.email,
          emailVerification: currentUser.emailVerification,
        });
        
        // If already verified, return success
        if (currentUser.emailVerification) {
          console.log('Email is already verified, no need to send verification email');
          toast.success('Your email is already verified!');
          return {
            loading: false,
            success: true,
            error: null
          };
        }
      } catch (userError) {
        console.error('Failed to get current user:', userError);
        throw new Error('Please ensure you are logged in to verify your email');
      }
      
      // Create a verification URL with the correct parameter
      console.log('Creating verification with redirect URL:', redirectUrl);
      const result = await account.createVerification(redirectUrl);
      console.log('Verification creation response:', result);
      
      console.log('Email verification request sent successfully');
      
      setState({
        loading: false,
        success: true,
        error: null
      });
      
      toast.success('Verification email sent! Please check your inbox and spam folder.');
      
      return {
        loading: false,
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error sending email verification:', error);
      
      let errorMessage = 'Failed to send verification email';
      
      // Check for specific Appwrite error codes
      if (error.code) {
        switch (error.code) {
          case 401:
            errorMessage = 'Authentication required. Please login again.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = error.message || 'Failed to send verification email';
        }
      }
      
      setState({
        loading: false,
        success: false,
        error: errorMessage
      });
      
      toast.error(errorMessage);
      
      return {
        loading: false,
        success: false,
        error: errorMessage
      };
    }
  };

  /**
   * Подтверждает email с использованием токена и id пользователя
   * @param userId - ID пользователя
   * @param secret - Секретный токен из ссылки верификации
   */
  const confirmVerification = async (userId: string, secret: string): Promise<VerificationResult> => {
    setState({ loading: true, success: false, error: null });
    
    try {
      console.log('Confirming email verification...');
      // Подтверждаем верификацию
      await account.updateVerification(userId, secret);
      
      console.log('Email verification confirmed successfully');
      
      setState({
        loading: false,
        success: true,
        error: null
      });
      
      toast.success('Email verified successfully!');
      
      return {
        loading: false,
        success: true,
        error: null
      };
    } catch (error: any) {
      console.error('Error confirming email verification:', error);
      
      const errorMessage = error.message || 'Failed to confirm email verification';
      
      setState({
        loading: false,
        success: false,
        error: errorMessage
      });
      
      toast.error(errorMessage);
      
      return {
        loading: false,
        success: false,
        error: errorMessage
      };
    }
  };

  /**
   * Проверяет статус верификации email текущего пользователя
   */
  const checkEmailVerification = async (): Promise<boolean> => {
    try {
      const currentUser = await account.get();
      return currentUser.emailVerification;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  };

  return {
    sendVerification,
    confirmVerification,
    checkEmailVerification,
    loading: state.loading,
    success: state.success,
    error: state.error
  };
};

export default useAppwriteEmailVerification; 