import { useState } from 'react';
import { toast } from 'react-hot-toast';

type PhoneAuthState = {
  verificationId: string | null;
  loading: boolean;
  phoneNumber: string | null;
};

/**
 * Hook for handling phone authentication via Twilio Verify API.
 * This replaces the previous Firebase implementation.
 */
const useTwilioPhoneAuth = () => {
  const [phoneAuthState, setPhoneAuthState] = useState<PhoneAuthState>({
    verificationId: null,
    loading: false,
    phoneNumber: null
  });

  /**
   * Форматирует номер телефона в международный формат E.164
   * 
   * @param phoneNumber - Номер телефона для форматирования
   * @returns Отформатированный телефонный номер
   */
  const formatPhoneNumber = (phoneNumber: number | string): string => {
    // Преобразуем в строку, если это число
    const phoneStr = phoneNumber.toString().trim();
    
    // Удаляем все не-цифры, кроме + в начале
    const digitsOnly = phoneStr.startsWith('+') 
      ? '+' + phoneStr.substring(1).replace(/\D/g, '')
      : phoneStr.replace(/\D/g, '');
    
    // Добавляем + в начало, если его еще нет
    return digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
  };

  /**
   * Sends a verification code to the specified phone number.
   * 
   * @param phoneNumber - The phone number to send the verification code to
   * @returns Promise that resolves to true if the verification code was sent successfully
   */
  const sendVerificationCode = async (phoneNumber: number | string): Promise<boolean> => {
    try {
      console.log(`Sending verification code to ${phoneNumber}`);
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      // Format phone number to E.164 format
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
      
      console.log(`Formatted phone number: ${formattedPhoneNumber}`);
      
      // Validate phone number format (basic check for E.164 format)
      if (!formattedPhoneNumber.match(/^\+[1-9]\d{6,14}$/)) {
        throw new Error('Invalid phone number format. Please include country code and all digits.');
      }
      
      // Make API call to your backend endpoint that will use Twilio Verify API
      const response = await fetch('/api/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: formattedPhoneNumber,
          channel: 'sms' // or 'call' for voice verification
        })
      });
      
      // Для отладки
      console.log('Response status:', response.status);
      
      // Проверка на ошибки сети
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Проверка на ошибки в данных
      if (!data.success || !data.verificationId) {
        throw new Error('Invalid response from verification service');
      }
      
      console.log('Verification code sent successfully, ID:', data.verificationId);
      
      // Store verification ID from Twilio response
      setPhoneAuthState({
        verificationId: data.verificationId,
        loading: false,
        phoneNumber: formattedPhoneNumber
      });
      
      toast.success('Verification code sent to your phone');
      return true;
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      let errorMessage = 'Failed to send verification code';
      
      // Handle different error cases
      if (error.message?.includes('Invalid phone number')) {
        errorMessage = error.message;
      } else if (error.message?.includes('parameter')) {
        errorMessage = 'Invalid phone number format';
      } else if (error.message?.includes('too many')) {
        errorMessage = 'Too many attempts. Please try again later';
      } else if (error.message?.includes('service')) {
        errorMessage = 'Verification service not configured properly';
      } else if (error.message?.includes('auth') || error.message?.includes('credentials')) {
        errorMessage = 'Authentication error. Please check Twilio credentials';
      } else if (error.message?.includes('network') || !navigator.onLine) {
        errorMessage = 'Network error. Please check your internet connection';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  /**
   * Verifies the code entered by the user.
   * 
   * @param code - The verification code entered by the user
   * @returns Promise that resolves to true if the code was verified successfully
   */
  const verifyCode = async (code: string): Promise<boolean> => {
    try {
      console.log('Verifying code:', code);
      setPhoneAuthState(prev => ({ ...prev, loading: true }));
      
      // Validate input
      if (!code || code.length < 4) {
        throw new Error('Please enter a valid verification code');
      }
      
      // Check for verification ID
      if (!phoneAuthState.verificationId && !phoneAuthState.phoneNumber) {
        console.error('No verification ID or phone number found');
        throw new Error('Verification session not found. Please request a new code');
      }
      
      // Prepare request body
      const requestBody: any = { code };
      
      // Use either verificationId or phoneNumber
      if (phoneAuthState.verificationId) {
        requestBody.verificationId = phoneAuthState.verificationId;
      } else if (phoneAuthState.phoneNumber) {
        requestBody.phoneNumber = phoneAuthState.phoneNumber;
      }
      
      // Make API call to your backend endpoint that will use Twilio Verify API
      const response = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      // Для отладки
      console.log('Response status:', response.status);
      
      // Проверка на ошибки сети
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      // Validate response
      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }
      
      console.log('Code verified successfully');
      toast.success('Phone number successfully verified!');
      setPhoneAuthState({
        verificationId: null,
        loading: false,
        phoneNumber: null
      });
      return true;
    } catch (error: any) {
      console.error('Error verifying code:', error);
      let errorMessage = 'Invalid verification code';
      
      if (error.message?.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'Verification session not found. Please request a new code';
      } else if (error.message?.includes('network') || !navigator.onLine) {
        errorMessage = 'Network error. Please check your internet connection';
      }
      
      toast.error(errorMessage);
      setPhoneAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  /**
   * Resets the phone authentication state.
   */
  const reset = () => {
    console.log('Resetting Twilio Phone Auth state');
    setPhoneAuthState({
      verificationId: null,
      loading: false,
      phoneNumber: null
    });
  };

  return {
    sendVerificationCode,
    verifyCode,
    reset,
    loading: phoneAuthState.loading,
  };
};

export default useTwilioPhoneAuth; 