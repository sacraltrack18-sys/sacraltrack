import { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { toast } from 'react-hot-toast';

export default function useFirebasePhoneAuth() {
  const [verifier, setVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (verifier) {
        verifier.clear();
      }
    };
  }, [verifier]);

  const setupRecaptcha = async (buttonId: string): Promise<boolean> => {
    try {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }

      // Clear any existing verifier
      if (verifier) {
        verifier.clear();
      }

      // Create new RecaptchaVerifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
          toast.success('Верификация reCAPTCHA успешна');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          toast.error('reCAPTCHA истекла, попробуйте снова');
          reset();
        }
      });

      await recaptchaVerifier.render();
      setVerifier(recaptchaVerifier);
      return true;
    } catch (error: any) {
      console.error('Error setting up reCAPTCHA:', error);
      toast.error(error.message || 'Failed to setup verification');
      return false;
    }
  };

  const sendVerificationCode = async (phoneNumber: number, buttonId: string): Promise<boolean> => {
    try {
      setLoading(true);

      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }

      // Format phone number to E.164 format
      const formattedPhone = phoneNumber.toString().startsWith('+') 
        ? phoneNumber.toString() 
        : `+${phoneNumber}`;

      // Setup reCAPTCHA if not already set up
      if (!verifier) {
        const success = await setupRecaptcha(buttonId);
        if (!success) {
          throw new Error('Failed to setup reCAPTCHA');
        }
      }

      // Send verification code
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier!);
      setConfirmationResult(confirmation);
      toast.success('Код верификации отправлен');
      return true;
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      let errorMessage = 'Failed to send verification code';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'Неверный формат номера телефона';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Слишком много попыток. Попробуйте позже';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'Ошибка проверки reCAPTCHA';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      reset();
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string): Promise<boolean> => {
    try {
      setLoading(true);

      if (!confirmationResult) {
        throw new Error('No verification code was sent');
      }

      const result = await confirmationResult.confirm(code);
      
      if (result.user) {
        toast.success('Номер телефона успешно подтвержден');
        return true;
      } else {
        throw new Error('Failed to verify code');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      
      let errorMessage = 'Failed to verify code';
      
      // Handle specific Firebase error codes
      switch (error.code) {
        case 'auth/invalid-verification-code':
          errorMessage = 'Неверный код верификации';
          break;
        case 'auth/code-expired':
          errorMessage = 'Код верификации истек';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (verifier) {
      verifier.clear();
    }
    setVerifier(null);
    setConfirmationResult(null);
  };

  return {
    sendVerificationCode,
    verifyCode,
    loading,
    reset
  };
} 