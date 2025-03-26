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
      console.log('Initializing reCAPTCHA verifier for button ID:', buttonId);
      
      // Проверяем, существует ли элемент
      const buttonElement = document.getElementById(buttonId);
      if (!buttonElement) {
        console.error(`Button element with ID ${buttonId} not found`);
        toast.error('Техническая ошибка при инициализации проверки. Попробуйте позже.');
        return null;
      }
      
      // Очищаем предыдущий верификатор, если он существует
      if (recaptchaVerifier) {
        console.log('Clearing existing reCAPTCHA verifier');
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
      
      // Создаем новый верификатор
      const verifier = new RecaptchaVerifier(auth, buttonId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved successfully');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          toast.error('Проверка безопасности истекла. Пожалуйста, попробуйте снова.');
        }
      });
      
      console.log('reCAPTCHA verifier initialized successfully');
      setRecaptchaVerifier(verifier);
      return verifier;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      toast.error('Не удалось инициализировать проверку безопасности. Пожалуйста, попробуйте снова.');
      return null;
    }
  };

  // Send verification code to phone number
  const sendVerificationCode = async (phoneNumber: number, buttonId: string) => {
    try {
      console.log(`Sending verification code to ${phoneNumber}`);
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      // Format phone number to E.164 format if it's not already
      const formattedPhoneNumber = phoneNumber.toString().startsWith('+') 
        ? phoneNumber.toString() 
        : `+${phoneNumber}`;
      
      console.log(`Formatted phone number: ${formattedPhoneNumber}`);
      
      // Initialize reCAPTCHA verifier if not already initialized
      const verifier = initRecaptchaVerifier(buttonId);
      
      if (!verifier) {
        throw new Error('Не удалось инициализировать reCAPTCHA');
      }
      
      // Send verification code
      console.log('Attempting to send verification code...');
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, verifier);
      console.log('Verification code sent successfully');
      
      // Store confirmation result and verification ID
      setPhoneAuthState({
        verificationId: confirmationResult.verificationId,
        confirmationResult: confirmationResult,
        loading: false
      });
      
      toast.success('Код верификации отправлен на ваш телефон');
      return true;
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      let errorMessage = 'Не удалось отправить код верификации';
      
      // Parse Firebase error messages
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Неверный формат номера телефона';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Слишком много попыток. Пожалуйста, попробуйте позже';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'Проверка безопасности не пройдена. Пожалуйста, попробуйте снова';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Verify code entered by user
  const verifyCode = async (code: string): Promise<boolean> => {
    try {
      console.log('Verifying code:', code);
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      if (!phoneAuthState.confirmationResult) {
        console.error('No confirmation result found');
        throw new Error('Не найден результат подтверждения');
      }
      
      // Confirm verification code
      console.log('Attempting to confirm verification code...');
      await phoneAuthState.confirmationResult.confirm(code);
      console.log('Code verified successfully');
      
      toast.success('Номер телефона успешно подтвержден!');
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error: any) {
      console.error('Error verifying code:', error);
      let errorMessage = 'Неверный код верификации';
      
      if (error.code === 'auth/code-expired') {
        errorMessage = 'Код верификации истек. Пожалуйста, запросите новый';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  // Reset the state when needed
  const reset = () => {
    console.log('Resetting Firebase Phone Auth state');
    if (recaptchaVerifier) {
      console.log('Clearing reCAPTCHA verifier');
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