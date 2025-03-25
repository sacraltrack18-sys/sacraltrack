import { useState } from 'react';
import { 
  PhoneAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult 
} from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { toast } from 'react-hot-toast';

type PhoneAuthState = {
  verificationId: string | null;
  confirmationResult: ConfirmationResult | null;
  loading: boolean;
};

const useFirebasePhoneAuth = () => {
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [phoneAuthState, setPhoneAuthState] = useState<PhoneAuthState>({
    verificationId: null,
    confirmationResult: null,
    loading: false,
  });

  // Initialize reCAPTCHA verifier
  const initRecaptchaVerifier = (buttonId: string) => {
    try {
      if (!recaptchaVerifier) {
        const verifier = new RecaptchaVerifier(auth, buttonId, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved, allow sending verification code
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            toast.error('reCAPTCHA expired. Please try again.');
          }
        });
        setRecaptchaVerifier(verifier);
        return verifier;
      }
      return recaptchaVerifier;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      toast.error('Failed to initialize security verification. Please try again.');
      return null;
    }
  };

  // Send verification code to phone number
  const sendVerificationCode = async (phoneNumber: number, buttonId: string) => {
    try {
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      // Format phone number to E.164 format if it's not already
      const formattedPhoneNumber = phoneNumber.toString().startsWith('+') 
        ? phoneNumber.toString() 
        : `+${phoneNumber}`;
      
      // Initialize reCAPTCHA verifier if not already initialized
      const verifier = initRecaptchaVerifier(buttonId);
      
      if (!verifier) {
        throw new Error('Failed to initialize reCAPTCHA');
      }
      
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, verifier);
      
      // Store confirmation result and verification ID
      setPhoneAuthState({
        verificationId: confirmationResult.verificationId,
        confirmationResult: confirmationResult,
        loading: false
      });
      
      toast.success('Verification code sent to your phone');
      return true;
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      let errorMessage = 'Failed to send verification code';
      
      // Parse Firebase error messages
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'Security verification failed. Please try again';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Verify code entered by user
  const verifyCode = async (code: string): Promise<boolean> => {
    try {
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      if (!phoneAuthState.confirmationResult) {
        throw new Error('No confirmation result found');
      }
      
      // Confirm verification code
      await phoneAuthState.confirmationResult.confirm(code);
      
      toast.success('Phone number successfully verified!');
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error: any) {
      console.error('Error verifying code:', error);
      let errorMessage = 'Invalid verification code';
      
      if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code has expired. Please request a new one';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Reset the state when needed
  const reset = () => {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      setRecaptchaVerifier(null);
    }
    
    setPhoneAuthState({
      verificationId: null,
      confirmationResult: null,
      loading: false
    });
  };

  return {
    sendVerificationCode,
    verifyCode,
    reset,
    loading: phoneAuthState.loading,
  };
};

export default useFirebasePhoneAuth; 