import TextInput from "../TextInput";
import { useState, useEffect } from "react";
import { ShowErrorObject } from "@/app/types";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { BiLoaderCircle } from "react-icons/bi";
import { FcGoogle } from "react-icons/fc";
import {
  FiMail,
  FiLock,
  FiX,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import { account } from "@/libs/AppWriteClient";
import { toast } from "react-hot-toast";
import {
  detectBrowser,
  needsEnhancedAuth,
  buildGoogleOAuthUrl,
} from "./googleOAuthUtils";
import { clearAllAuthFlags } from "@/app/utils/authCleanup";

// Custom toast styling function
const showToast = (
  type: "success" | "error" | "loading",
  message: string,
  options = {},
) => {
  const baseStyle = {
    background: "linear-gradient(135deg, #1E1F2E 0%, #272B43 100%)",
    color: "#fff",
    borderRadius: "16px",
    border: "1px solid rgba(32, 221, 187, 0.2)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
    padding: "16px 20px",
    fontSize: "14px",
    fontWeight: "500",
    ...options,
  };

  const iconStyles = {
    success: { borderLeft: "4px solid #20DDBB", icon: "✅" },
    error: { borderLeft: "4px solid #EF4444", icon: "❌" },
    loading: { borderLeft: "4px solid #8A2BE2", icon: "⏳" },
  };

  return toast[type](message, {
    duration: type === "loading" ? Infinity : 5000,
    style: { ...baseStyle, ...iconStyles[type] },
    icon: iconStyles[type].icon,
    ...options,
  });
};

export default function Login() {
  const { setIsLoginOpen, setIsRegisterOpen } = useGeneralStore();
  const contextUser = useUser();

  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<ShowErrorObject | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number>(0);

  // Check if user is temporarily blocked
  useEffect(() => {
    const checkBlockStatus = () => {
      const blockTime = localStorage.getItem("loginBlockTime");
      const attempts = localStorage.getItem("loginAttempts");

      if (attempts) {
        setLoginAttempts(parseInt(attempts));
      }

      if (blockTime) {
        const blockEnd = parseInt(blockTime);
        if (Date.now() < blockEnd) {
          setIsBlocked(true);
          const timeLeft = Math.ceil((blockEnd - Date.now()) / 1000);
          setBlockTimeLeft(timeLeft);

          const countdown = setInterval(() => {
            const newTimeLeft = Math.ceil((blockEnd - Date.now()) / 1000);
            if (newTimeLeft <= 0) {
              setIsBlocked(false);
              setBlockTimeLeft(0);
              localStorage.removeItem("loginBlockTime");
              localStorage.removeItem("loginAttempts");
              setLoginAttempts(0);
              clearInterval(countdown);
            } else {
              setBlockTimeLeft(newTimeLeft);
            }
          }, 1000);

          return () => clearInterval(countdown);
        } else {
          localStorage.removeItem("loginBlockTime");
          localStorage.removeItem("loginAttempts");
          setIsBlocked(false);
          setLoginAttempts(0);
        }
      }
    };
    checkBlockStatus();
  }, []);

  // Слушатель событий аутентификации для автоматического закрытия модального окна
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      const { user } = event.detail;
      if (user) {
        console.log("Auth state change detected, user logged in, closing login modal");
        setIsLoginOpen(false);
      }
    };

    // Добавляем слушатель события
    window.addEventListener('auth_state_change', handleAuthStateChange as EventListener);

    // Также проверяем текущее состояние пользователя при монтировании
    if (contextUser?.user) {
      console.log("User already logged in, closing login modal");
      setIsLoginOpen(false);
    }

    // Очистка слушателя при размонтировании
    return () => {
      window.removeEventListener('auth_state_change', handleAuthStateChange as EventListener);
    };
  }, [contextUser?.user, setIsLoginOpen]);

  // Format time remaining for block
  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const showError = (type: string) => {
    if (error && Object.entries(error).length > 0 && error?.type == type) {
      return error.message;
    }
    return "";
  };

  const validate = () => {
    setError(null);
    let isError = false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setError({ type: "email", message: "Email is required" });
      isError = true;
    } else if (!emailRegex.test(email)) {
      setError({
        type: "email",
        message: "Please enter a valid email address",
      });
      isError = true;
    } else if (!password) {
      setError({ type: "password", message: "Password is required" });
      isError = true;
    } else if (password.length < 6) {
      setError({
        type: "password",
        message: "Password must be at least 6 characters",
      });
      isError = true;
    }
    return isError;
  };

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) return;

    try {
      setGoogleLoading(true);

      // Show loading toast
      const loadingToastId = showToast(
        "loading",
        "Redirecting to Google login...",
        {
          id: "google-redirect",
          duration: 10000,
        },
      );

      const browserInfo = detectBrowser();
      const enhanced = needsEnhancedAuth(browserInfo);

      if (typeof window !== "undefined") {
        clearAllAuthFlags();
        sessionStorage.setItem("googleAuthInProgress", "true");
        const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
        sessionStorage.setItem("googleAuthExpiryTime", expiryTime.toString());
        sessionStorage.setItem("authBrowserInfo", JSON.stringify(browserInfo));

        // Special handling for iPhone/iOS
        if (browserInfo.isIOS || browserInfo.isMobileSafari) {
          sessionStorage.setItem("iOSAuthAttempt", "true");
          sessionStorage.setItem("iOSAuthTimestamp", Date.now().toString());
          // Add iOS specific parameters
          sessionStorage.setItem("iOSRetry", "false");
        }

        console.log("[GoogleLogin] Browser info:", browserInfo);
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const successUrl = `${appUrl}/auth/google/success`;
      const failureUrl = `${appUrl}/auth/google/fail`;

      if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
        toast.dismiss("google-redirect");
        showToast(
          "error",
          "Authentication service is not configured. Please contact support.",
        );
        throw new Error("Appwrite configuration is missing");
      }

      setIsLoginOpen(false);

      // Check for existing session
      try {
        const session = await account.getSession("current");
        if (session) {
          toast.dismiss("google-redirect");
          showToast("success", "Already logged in! Redirecting...");
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
          return;
        }
      } catch (sessionError) {
        console.log(
          "[GoogleLogin] No existing session found, proceeding with OAuth",
        );
      }

      // Enhanced OAuth for mobile browsers and iPhone
      if (enhanced) {
        try {
          const appwriteEndpoint =
            process.env.NEXT_PUBLIC_APPWRITE_URL ||
            "https://cloud.appwrite.io/v1";
          const projectId = process.env.NEXT_PUBLIC_ENDPOINT || "";

          const oauthUrl = buildGoogleOAuthUrl({
            appwriteEndpoint,
            projectId,
            successUrl,
            failureUrl,
            browserInfo,
          });

          // Special handling for Safari and iOS
          if (
            browserInfo.isDesktopSafari ||
            browserInfo.isMobileSafari ||
            browserInfo.isIOS
          ) {
            localStorage.setItem("authRedirectAttempt", Date.now().toString());
            localStorage.setItem("safariAuthUrl", oauthUrl);

            // For iOS, add additional handling
            if (browserInfo.isIOS) {
              // Try to open in same tab first
              window.location.href = oauthUrl;
              return;
            }

            console.log(
              "[GoogleLogin] Safari/iOS detected, using enhanced redirect",
            );
          }

          console.log("[GoogleLogin] Using enhanced OAuth URL:", oauthUrl);

          // Add error handling for redirect failure
          const redirectTimeout = setTimeout(() => {
            toast.dismiss("google-redirect");
            showToast(
              "error",
              "Redirect is taking longer than expected. Please try again.",
            );
            setGoogleLoading(false);
            clearAllAuthFlags();
          }, 15000); // 15 seconds timeout

          // Clear timeout if page unloads (successful redirect)
          window.addEventListener("beforeunload", () => {
            clearTimeout(redirectTimeout);
          });

          window.location.href = oauthUrl;
        } catch (error) {
          console.error("[GoogleLogin] Error starting OAuth session:", error);
          toast.dismiss("google-redirect");
          showToast(
            "error",
            "Failed to start Google authentication. Please try email login instead.",
          );
          setGoogleLoading(false);
          clearAllAuthFlags();
        }
      } else {
        // Standard OAuth for desktop browsers
        try {
          await account.createOAuth2Session("google", successUrl, failureUrl);
        } catch (error) {
          console.error("[GoogleLogin] Standard OAuth error:", error);
          toast.dismiss("google-redirect");

          let errorMessage = "Failed to start Google authentication.";
          if (error.code === 429) {
            errorMessage =
              "Too many attempts. Please wait a few minutes before trying again.";
          } else if (error.code === 503) {
            errorMessage =
              "Google authentication service is temporarily unavailable.";
          }

          showToast("error", errorMessage);
          setGoogleLoading(false);
          clearAllAuthFlags();
        }
      }
    } catch (error) {
      console.error("[GoogleLogin] General error:", error);
      toast.dismiss("google-redirect");
      showToast(
        "error",
        "Failed to login with Google. Please try email login instead.",
      );
      setGoogleLoading(false);
      clearAllAuthFlags();
    }
  };

  const login = async () => {
    if (isBlocked) {
      showToast(
        "error",
        `Account locked. Try again in ${formatTimeLeft(blockTimeLeft)}`,
      );
      return;
    }

    let isError = validate();
    if (isError) return;
    if (!contextUser) return;

    try {
      setLoading(true);

      // Show loading toast
      const loadingToastId = showToast("loading", "Signing you in...", {
        id: "login-loading",
      });

      // Закрываем модальное окно МГНОВЕННО при нажатии кнопки логина
      setIsLoginOpen(false);

      await contextUser.login(email, password);

      toast.dismiss("login-loading");
      setLoading(false);
      setLoginAttempts(0);
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("loginBlockTime");

      console.log("Login completed successfully");
      showToast("success", `Welcome back! 🎉`);
    } catch (error: any) {
      console.error("[Login Error]:", error);
      setLoading(false);
      toast.dismiss("login-loading");

      // Track failed attempts
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      localStorage.setItem("loginAttempts", newAttempts.toString());

      // Block user after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        const blockTime = Date.now() + 15 * 60 * 1000; // 15 minutes
        localStorage.setItem("loginBlockTime", blockTime.toString());
        setIsBlocked(true);
        setBlockTimeLeft(15 * 60);
        showToast(
          "error",
          "Too many failed attempts. Account temporarily locked for 15 minutes.",
        );
        return;
      }

      // Handle specific error cases
      let errorMessage = "Login failed. Please try again.";

      if (error.code === 401) {
        if (error.message?.includes("Invalid credentials")) {
          errorMessage =
            "Invalid email or password. Please check your credentials.";
        } else if (
          error.message?.includes("user_not_found") ||
          error.message?.includes("User not found")
        ) {
          errorMessage = `This email is not registered. Would you like to sign up instead?`;

          // Show option to switch to register
          setTimeout(() => {
            const switchToRegister = confirm(
              "This email is not registered. Would you like to create an account?",
            );
            if (switchToRegister) {
              setIsRegisterOpen(true);
            }
          }, 2000);
        } else {
          errorMessage = "Invalid email or password.";
        }
      } else if (error.code === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.code === 400) {
        errorMessage = "Please enter valid email and password.";
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("email_not_verified")) {
        errorMessage = "Please verify your email before logging in.";
        setTimeout(() => {
          setError({
            type: "general",
            message: "Check your email for verification link",
          });
        }, 2000);
      }

      showToast("error", errorMessage);

      // Show remaining attempts warning
      if (newAttempts >= 3 && newAttempts < 5) {
        setTimeout(() => {
          showToast(
            "error",
            `Warning: ${5 - newAttempts} attempts remaining before temporary lockout.`,
          );
        }, 1000);
      }
    }
  };

  const sendVerificationEmail = async () => {
    if (!email) {
      setError({
        type: "email",
        message: "Please enter your email address first",
      });
      return;
    }

    try {
      setLoading(true);

      const verifyUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/verify`
        : `${window.location.origin}/verify`;

      await account.createVerification(verifyUrl);
      setIsEmailSent(true);

      showToast(
        "success",
        "Verification email sent! Please check your inbox and spam folder.",
      );

      setTimeout(() => {
        setIsLoginOpen(false);
      }, 3000);
    } catch (error: any) {
      console.error("Email verification error:", error);

      let errorMessage = "Failed to send verification email";
      if (error.code === 429) {
        errorMessage =
          "Too many requests. Please wait before requesting another verification email.";
      } else if (error.code === 401) {
        errorMessage = "Please log in first to request email verification.";
      }

      showToast("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordRecovery = async () => {
    if (!email) {
      setError({ type: "email", message: "Please enter your email address" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError({
        type: "email",
        message: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : window.location.origin;
      const resetUrl = `${baseUrl}/reset-password`;

      await account.createRecovery(email, resetUrl);

      showToast(
        "success",
        "Password reset instructions sent to your email! 📧",
      );
      setResetEmailSent(true);
      setShowForgotPassword(false);

      setTimeout(() => {
        setIsLoginOpen(false);
      }, 2000);
    } catch (error: any) {
      console.error("Password recovery error:", error);

      let errorMessage = "Failed to send recovery email";

      if (error.code === 429) {
        errorMessage = "Too many attempts. Please try again in a few minutes.";
      } else if (error.code === 400) {
        errorMessage = "Please enter a valid email address.";
      } else if (
        error.code === 404 ||
        error.message?.includes("user_not_found")
      ) {
        errorMessage = "No account found with this email address.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      }

      showToast("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleForgotPassword = () => {
    setShowForgotPassword(!showForgotPassword);
    setError(null);
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading && !googleLoading) {
      setIsLoginOpen(false);
    }
  };

  const switchToRegister = () => {
    setIsRegisterOpen(true);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClickOutside}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-[420px] relative"
      >
        <motion.div
          className="relative w-full bg-[#1E1F2E] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(32,221,187,0.15)]"
          whileHover={{ boxShadow: "0 0 50px rgba(32,221,187,0.2)" }}
          transition={{ duration: 0.3 }}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsLoginOpen(false)}
            disabled={loading || googleLoading}
            className="absolute top-4 right-4 z-10 text-[#818BAC] hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <FiX className="text-2xl" />
          </button>

          {/* Animated Border */}
          <div className="absolute inset-0 p-[1.5px] rounded-3xl">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[#20DDBB] via-[#8A2BE2] to-[#20DDBB] rounded-3xl"
              style={{ backgroundSize: "200% 100%" }}
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>

          <div className="relative p-8 bg-[#1E1F2E] rounded-[22px] m-[1.5px]">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex justify-center mb-6"
              >
                <div className="relative w-20 h-20">
                  <motion.div
                    className="absolute inset-0 bg-[#20DDBB]/20 rounded-full blur-xl"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#20DDBB]/30 bg-gradient-to-br from-[#20DDBB]/10 to-[#8A2BE2]/10">
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <BsMusicNoteBeamed className="text-3xl text-[#20DDBB]" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.h1
                className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome Back!
              </motion.h1>
              <motion.p
                className="text-[#818BAC]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Continue your musical journey
              </motion.p>

              {/* Security warning for blocked users */}
              <AnimatePresence>
                {isBlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <FiAlertCircle />
                      <span>
                        Account locked for {formatTimeLeft(blockTimeLeft)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login attempts warning */}
              <AnimatePresence>
                {loginAttempts >= 3 && loginAttempts < 5 && !isBlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <FiAlertCircle />
                      <span>{5 - loginAttempts} attempts remaining</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Form */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {showForgotPassword ? (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Reset Password
                    </h2>
                    <p className="text-[#818BAC] text-sm">
                      Enter your email address and we'll send you instructions
                      to reset your password
                    </p>
                  </div>

                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <TextInput
                      string={email}
                      placeholder="Email"
                      onUpdate={setEmail}
                      inputType="email"
                      error={showError("email")}
                      className={`
                                                w-full bg-[#14151F]/60 border-2
                                                ${error?.type === "email" ? "border-red-500" : "border-[#2A2B3F]"}
                                                rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                                                focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                                transition-all duration-300
                                                group-hover:border-[#20DDBB]/50
                                            `}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FiMail className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                    </div>
                  </motion.div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={toggleForgotPassword}
                      className="flex-1 py-3 px-4 border border-[#2A2B3F] text-[#818BAC] rounded-xl
                                            hover:bg-[#2A2B3F]/50 hover:text-white transition-all duration-300"
                      disabled={loading}
                    >
                      Back to Login
                    </button>

                    <motion.button
                      onClick={sendPasswordRecovery}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="
                                                flex-1 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2]
                                                text-white py-3 px-4 rounded-xl font-medium
                                                relative overflow-hidden group
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                            "
                      disabled={loading}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                      <div className="relative flex items-center justify-center">
                        {loading ? (
                          <BiLoaderCircle className="animate-spin text-xl" />
                        ) : (
                          <span>Send Reset Link</span>
                        )}
                      </div>
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  {/* Email Input */}
                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <TextInput
                      string={email}
                      placeholder="Email"
                      onUpdate={setEmail}
                      inputType="email"
                      error={showError("email")}
                      className={`
                                                w-full bg-[#14151F]/60 border-2
                                                ${error?.type === "email" ? "border-red-500" : "border-[#2A2B3F]"}
                                                rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                                                focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                                transition-all duration-300
                                                group-hover:border-[#20DDBB]/50
                                            `}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FiMail className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                    </div>
                  </motion.div>

                  {/* Password Input */}
                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <TextInput
                      string={password}
                      placeholder="Password"
                      onUpdate={setPassword}
                      inputType={showPassword ? "text" : "password"}
                      error={showError("password")}
                      className={`
                                                w-full bg-[#14151F]/60 border-2
                                                ${error?.type === "password" ? "border-red-500" : "border-[#2A2B3F]"}
                                                rounded-xl p-4 pl-12 pr-12 text-white placeholder-[#818BAC]/50
                                                focus:border-[#20DDBB] focus:bg-[#14151F]/80
                                                transition-all duration-300
                                                group-hover:border-[#20DDBB]/50
                                            `}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <FiLock className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#818BAC] hover:text-[#20DDBB] transition-colors duration-300"
                    >
                      {showPassword ? (
                        <FiEyeOff className="text-xl" />
                      ) : (
                        <FiEye className="text-xl" />
                      )}
                    </button>
                  </motion.div>

                  <div className="text-right">
                    <button
                      onClick={toggleForgotPassword}
                      className="text-[#20DDBB] hover:text-[#8A2BE2] text-sm transition-colors duration-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="mt-8 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {!showForgotPassword && (
                <>
                  {/* Login Button */}
                  <motion.button
                    disabled={loading || isBlocked}
                    onClick={login}
                    whileHover={{ scale: loading || isBlocked ? 1 : 1.02 }}
                    whileTap={{ scale: loading || isBlocked ? 1 : 0.98 }}
                    className="
                                            relative w-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2]
                                            text-white py-4 rounded-xl font-semibold
                                            overflow-hidden group
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        "
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <BiLoaderCircle className="animate-spin text-2xl" />
                      ) : (
                        <>
                          <span>Log In</span>
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            →
                          </motion.div>
                        </>
                      )}
                    </div>
                  </motion.button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2A2B3F]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 text-[#818BAC] bg-[#1E1F2E]">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google Login Button */}
                  <motion.button
                    onClick={handleGoogleLogin}
                    disabled={loading || googleLoading}
                    whileHover={{ scale: loading || googleLoading ? 1 : 1.02 }}
                    whileTap={{ scale: loading || googleLoading ? 1 : 0.98 }}
                    className="
                                            w-full flex items-center justify-center gap-3 px-4 py-3
                                            bg-[#14151F]/60 hover:bg-[#14151F]/80
                                            text-white rounded-xl font-medium
                                            border-2 border-[#2A2B3F] hover:border-[#20DDBB]/50
                                            transition-all duration-300
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            relative overflow-hidden group
                                        "
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/10 to-[#8A2BE2]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative flex items-center gap-3">
                      {googleLoading ? (
                        <BiLoaderCircle className="animate-spin text-xl" />
                      ) : (
                        <FcGoogle className="text-xl" />
                      )}
                      <span>
                        {googleLoading
                          ? "Redirecting..."
                          : "Continue with Google"}
                      </span>
                    </div>
                  </motion.button>
                </>
              )}
            </motion.div>

            {/* Footer Links */}
            {!showForgotPassword && (
              <motion.div
                className="mt-6 text-center space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={sendVerificationEmail}
                  disabled={loading}
                  className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 text-sm font-medium disabled:opacity-50"
                >
                  Need to verify your email?
                </button>

                <p className="text-[#818BAC] text-sm">
                  Don't have an account?{" "}
                  <button
                    onClick={switchToRegister}
                    className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Success notification */}
      <AnimatePresence>
        {isEmailSent && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] text-white p-6 rounded-2xl shadow-lg backdrop-blur-xl max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FiCheck className="text-xl" />
              </div>
              <div>
                <p className="font-medium">Email sent!</p>
                <p className="text-sm opacity-90">
                  Check your inbox for verification
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset email sent notification */}
      <AnimatePresence>
        {resetEmailSent && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2] text-white p-6 rounded-2xl shadow-lg backdrop-blur-xl max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <FiMail className="text-xl" />
              </div>
              <div>
                <p className="font-medium">Reset link sent!</p>
                <p className="text-sm opacity-90">
                  Check your email for instructions
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
