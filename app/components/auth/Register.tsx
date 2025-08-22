import { useState, useEffect } from "react";
import TextInput from "../TextInput";
import { ShowErrorObject } from "@/app/types";
import { useUser } from "@/app/context/user";
import { useGeneralStore } from "@/app/stores/general";
import { BiLoaderCircle } from "react-icons/bi";
import { FcGoogle } from "react-icons/fc";
import {
  FiMail,
  FiUser,
  FiLock,
  FiX,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiAlertCircle,
  FiShield,
  FiInfo,
} from "react-icons/fi";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import { account } from "@/libs/AppWriteClient";
import { toast } from "react-hot-toast";
import { clearUserCache } from "@/app/utils/cacheUtils";
import {
  detectBrowser,
  needsEnhancedAuth,
  buildGoogleOAuthUrl,
  handleEnhancedAuth,
} from "./googleOAuthUtils";
import { clearAllAuthFlags } from "@/app/utils/authCleanup";
import { showToast } from "@/app/utils/toast";

// Password strength checker
const checkPasswordStrength = (password: string) => {
  const checks = [
    { test: password.length >= 8, label: "At least 8 characters" },
    { test: /[A-Z]/.test(password), label: "One uppercase letter" },
    { test: /[a-z]/.test(password), label: "One lowercase letter" },
    { test: /\d/.test(password), label: "One number" },
    {
      test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      label: "One special character",
    },
  ];

  const passed = checks.filter((check) => check.test).length;
  const strength = passed < 2 ? "weak" : passed < 4 ? "medium" : "strong";

  return { checks, strength, score: passed };
};



export default function Register() {
  const { setIsLoginOpen, setIsRegisterOpen } = useGeneralStore();
  const contextUser = useUser();

  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<ShowErrorObject | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number>(0);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  // Check if user is temporarily blocked
  useEffect(() => {
    const checkBlockStatus = () => {
      const blockTime = localStorage.getItem("registerBlockTime");
      const attemptCount = localStorage.getItem("registerAttempts");

      if (attemptCount) {
        setAttempts(parseInt(attemptCount));
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
              localStorage.removeItem("registerBlockTime");
              localStorage.removeItem("registerAttempts");
              setAttempts(0);
              clearInterval(countdown);
            } else {
              setBlockTimeLeft(newTimeLeft);
            }
          }, 1000);

          return () => clearInterval(countdown);
        } else {
          localStorage.removeItem("registerBlockTime");
          localStorage.removeItem("registerAttempts");
          setIsBlocked(false);
          setAttempts(0);
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
        console.log("Auth state change detected, user registered/logged in, closing register modal");
        setIsRegisterOpen(false);
      }
    };

    // Добавляем слушатель события
    window.addEventListener('auth_state_change', handleAuthStateChange as EventListener);

    // Также проверяем текущее состояние пользователя при монтировании
    if (contextUser?.user) {
      console.log("User already logged in, closing register modal");
      setIsRegisterOpen(false);
    }

    // Очистка слушателя при размонтировании
    return () => {
      window.removeEventListener('auth_state_change', handleAuthStateChange as EventListener);
    };
  }, [contextUser?.user, setIsRegisterOpen]);

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
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;

    if (!name) {
      setError({ type: "name", message: "Name is required" });
      isError = true;
    } else if (!nameRegex.test(name)) {
      setError({
        type: "name",
        message: "Name must be 2-50 characters and contain only letters",
      });
      isError = true;
    } else if (!email) {
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
    } else if (password.length < 8) {
      setError({
        type: "password",
        message: "Password must be at least 8 characters",
      });
      isError = true;
    } else if (password !== confirmPassword) {
      setError({
        type: "confirmPassword",
        message: "Passwords do not match",
      });
      isError = true;
    } else if (!agreeToTerms) {
      setError({
        type: "terms",
        message: "Please agree to the terms and conditions",
      });
      isError = true;
    }

    // Check password strength
    const strength = checkPasswordStrength(password);
    if (strength.score < 3) {
      setError({
        type: "password",
        message: "Password is too weak. Please use a stronger password.",
      });
      isError = true;
    }

    return isError;
  };

  const handleGoogleRegister = async () => {
    if (googleLoading || loading) return;

    if (isBlocked) {
      showToast(
        "error",
        `Registration temporarily blocked. Try again in ${formatTimeLeft(blockTimeLeft)}`,
      );
      return;
    }

    try {
      setGoogleLoading(true);

      // Show loading toast
      const loadingToastId = showToast(
        "loading",
        "Redirecting to Google registration...",
        {
          id: "google-register-redirect",
          duration: 15000,
        },
      );

      const browserInfo = detectBrowser();
      console.log("[GoogleRegister] Browser info:", browserInfo);

      if (typeof window !== "undefined") {
        clearAllAuthFlags();
        sessionStorage.setItem("googleAuthInProgress", "true");
        sessionStorage.setItem("authType", "register");
        const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
        sessionStorage.setItem("googleAuthExpiryTime", expiryTime.toString());
        sessionStorage.setItem("authBrowserInfo", JSON.stringify(browserInfo));

        // Special handling for iPhone/iOS
        if (browserInfo.isIOS || browserInfo.isMobileSafari) {
          sessionStorage.setItem("iOSAuthAttempt", "true");
          sessionStorage.setItem("iOSAuthTimestamp", Date.now().toString());
          sessionStorage.setItem("iOSRetry", "false");

          // Enhanced iOS parameters
          sessionStorage.setItem("iOSUserAgent", browserInfo.userAgent);
          sessionStorage.setItem(
            "iOSVersion",
            browserInfo.version || "unknown",
          );
        }
      }

      if (!process.env.NEXT_PUBLIC_APP_URL) {
        throw new Error("APP_URL configuration is missing");
      }
      if (!process.env.NEXT_PUBLIC_APPWRITE_URL) {
        throw new Error("APPWRITE_URL configuration is missing");
      }

      setIsRegisterOpen(false);

      // Check and clear existing session
      try {
        const session = await account.getSession("current");
        if (session) {
          console.log("[GoogleRegister] Clearing existing session");
          await account.deleteSession("current");
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (sessionError) {
        console.log("[GoogleRegister] No existing session to clear");
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
      const successUrl = `${baseUrl}/auth/google/success`;
      const failureUrl = `${baseUrl}/auth/google/fail`;

      toast.dismiss("google-register-redirect");
      showToast("success", "Redirecting to Google... Please wait", {
        duration: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      // Enhanced OAuth for mobile browsers and iPhone
      if (needsEnhancedAuth(browserInfo)) {
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
            state: `register_${Date.now()}`,
          });

          console.log("[GoogleRegister] Using enhanced OAuth URL:", oauthUrl);

          // Enhanced iOS handling
          if (browserInfo.isIOS) {
            // For iOS, use the enhanced auth handler
            await handleEnhancedAuth(browserInfo, oauthUrl);
          } else {
            // For other enhanced browsers
            if (browserInfo.isDesktopSafari || browserInfo.isMobileSafari) {
              localStorage.setItem(
                "authRedirectAttempt",
                Date.now().toString(),
              );
              localStorage.setItem("safariAuthUrl", oauthUrl);
            }

            window.location.href = oauthUrl;
          }
        } catch (error) {
          console.error("[GoogleRegister] Enhanced auth error:", error);
          clearAllAuthFlags();
          throw error;
        }
      } else {
        // Standard OAuth for desktop browsers
        try {
          await account.createOAuth2Session("google", successUrl, failureUrl);
        } catch (error) {
          console.error("[GoogleRegister] Standard OAuth error:", error);
          throw error;
        }
      }
    } catch (error: any) {
      console.error("[GoogleRegister] Registration error:", error);
      clearAllAuthFlags();
      setGoogleLoading(false);

      // Track failed attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("registerAttempts", newAttempts.toString());

      // Block after 3 failed attempts for 10 minutes
      if (newAttempts >= 3) {
        const blockTime = Date.now() + 10 * 60 * 1000; // 10 minutes
        localStorage.setItem("registerBlockTime", blockTime.toString());
        setIsBlocked(true);
        setBlockTimeLeft(10 * 60);
      }

      let errorMessage = "Failed to start Google registration.";

      if (error.code === 400) {
        errorMessage =
          "Invalid OAuth configuration. Please contact support or try email registration.";
      } else if (error.code === 401) {
        errorMessage = "Authentication failed. Please try again.";
      } else if (error.code === 429) {
        errorMessage =
          "Too many requests. Please wait a few minutes before trying again.";
      } else if (error.code === 503) {
        errorMessage =
          "Google authentication service is temporarily unavailable. Please try email registration.";
      } else if (
        error.message &&
        error.message.toLowerCase().includes("network")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      showToast("error", errorMessage);

      // Reopen register modal after a delay
      setTimeout(() => {
        setIsRegisterOpen(true);
      }, 2000);
    }
  };

  const register = async () => {
    if (isBlocked) {
      showToast(
        "error",
        `Registration temporarily blocked. Try again in ${formatTimeLeft(blockTimeLeft)}`,
      );
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastAttemptTime < 3000) {
      showToast("warning", "Please wait a moment before trying again.");
      return;
    }

    let isError = validate();
    if (isError) return;
    if (!contextUser) return;

    try {
      setLoading(true);
      setLastAttemptTime(now);

      // Show loading toast
      const loadingToastId = showToast("loading", "Creating your account...", {
        id: "register-loading",
      });

      // Закрываем модальное окно МГНОВЕННО при нажатии кнопки регистрации
      setIsRegisterOpen(false);

      await contextUser.register(name, email, password);

      toast.dismiss("register-loading");
      showToast("success", "Account created successfully! 🎉");

      setRegistrationSuccess(true);
      setLoading(false);

      // Reset attempts on success
      setAttempts(0);
      localStorage.removeItem("registerAttempts");
      localStorage.removeItem("registerBlockTime");

      // Send welcome email
      setTimeout(async () => {
        try {
          const verifyUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/verify`
            : `${window.location.origin}/verify`;
          await account.createVerification(verifyUrl);
          showToast(
            "success",
            "Welcome email sent! Please check your inbox to verify your account.",
          );
        } catch (emailError) {
          console.log("Verification email not sent:", emailError);
        }
      }, 1000);

      // Модальное окно уже закрыто мгновенно при нажатии кнопки
      console.log("Registration completed successfully");
    } catch (error: any) {
      console.error("[Register Error]:", error);
      setLoading(false);
      toast.dismiss("register-loading");

      // Track failed attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem("registerAttempts", newAttempts.toString());

      // Block after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        const blockTime = Date.now() + 15 * 60 * 1000; // 15 minutes
        localStorage.setItem("registerBlockTime", blockTime.toString());
        setIsBlocked(true);
        setBlockTimeLeft(15 * 60);
        showToast(
          "error",
          "Too many failed attempts. Registration temporarily locked for 15 minutes.",
        );
        return;
      }

      let errorMessage = "Registration failed. Please try again.";

      if (error.code === 409 || error.message?.includes("already exists")) {
        errorMessage =
          "This email is already registered. Try logging in instead.";
        setTimeout(() => {
          const switchToLogin = confirm(
            "This email is already registered. Would you like to log in instead?",
          );
          if (switchToLogin) {
            setIsLoginOpen(true);
          }
        }, 2000);
      } else if (error.code === 429) {
        errorMessage =
          "Too many registration attempts. Please try again later.";
      } else if (error.code === 400) {
        if (error.message?.includes("password")) {
          errorMessage = "Password does not meet requirements.";
        } else if (error.message?.includes("email")) {
          errorMessage = "Please enter a valid email address.";
        } else {
          errorMessage = "Please check your information and try again.";
        }
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage = "Network error. Please check your connection.";
      }

      showToast("error", errorMessage);

      // Show remaining attempts warning
      if (newAttempts >= 3 && newAttempts < 5) {
        setTimeout(() => {
          showToast(
            "warning",
            `Warning: ${5 - newAttempts} attempts remaining before temporary lockout.`,
          );
        }, 1500);
      }
    }
  };

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading && !googleLoading) {
      setIsRegisterOpen(false);
    }
  };

  const switchToLogin = () => {
    setIsLoginOpen(true);
  };

  const passwordStrength = checkPasswordStrength(password);

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
        className="w-full max-w-[420px] relative max-h-[90vh] overflow-y-auto"
      >
        <motion.div
          className="relative w-full bg-[#1E1F2E] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(32,221,187,0.15)]"
          whileHover={{ boxShadow: "0 0 50px rgba(32,221,187,0.2)" }}
          transition={{ duration: 0.3 }}
        >
          {/* Close Button */}
          <button
            onClick={() => setIsRegisterOpen(false)}
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
                Join the Journey!
              </motion.h1>
              <motion.p
                className="text-[#818BAC]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Create your account and start exploring
              </motion.p>

              {/* Block warning */}
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
                        Registration locked for {formatTimeLeft(blockTimeLeft)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attempts warning */}
              <AnimatePresence>
                {attempts >= 3 && attempts < 5 && !isBlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <FiAlertCircle />
                      <span>{5 - attempts} attempts remaining</span>
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
              {/* Name Input */}
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <TextInput
                  string={name}
                  placeholder="Full Name"
                  onUpdate={setName}
                  inputType="text"
                  error={showError("name")}
                  className={`
                    w-full bg-[#14151F]/60 border-2
                    ${error?.type === "name" ? "border-red-500" : "border-[#2A2B3F]"}
                    rounded-xl p-4 pl-12 text-white placeholder-[#818BAC]/50
                    focus:border-[#20DDBB] focus:bg-[#14151F]/80
                    transition-all duration-300
                    group-hover:border-[#20DDBB]/50
                  `}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <FiUser className="text-[#818BAC] group-hover:text-[#20DDBB] transition-colors duration-300" />
                </div>
              </motion.div>

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
                  onUpdate={(value) => {
                    setPassword(value);
                    setShowPasswordStrength(value.length > 0);
                  }}
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

              {/* Password Strength Indicator */}
              <AnimatePresence>
                {showPasswordStrength && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-[#14151F]/40 rounded-xl border border-[#2A2B3F]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FiShield className="text-[#20DDBB]" />
                      <span className="text-sm font-medium text-white">
                        Password Strength:{" "}
                        <span
                          className={
                            passwordStrength.strength === "weak"
                              ? "text-red-400"
                              : passwordStrength.strength === "medium"
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {passwordStrength.strength.toUpperCase()}
                        </span>
                      </span>
                    </div>

                    <div className="space-y-2">
                      {passwordStrength.checks.map((check, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className={`w-3 h-3 rounded-full flex items-center justify-center ${
                              check.test ? "bg-green-500" : "bg-red-500"
                            }`}
                          >
                            {check.test && (
                              <FiCheck className="w-2 h-2 text-white" />
                            )}
                          </div>
                          <span
                            className={
                              check.test ? "text-green-400" : "text-red-400"
                            }
                          >
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirm Password Input */}
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <TextInput
                  string={confirmPassword}
                  placeholder="Confirm Password"
                  onUpdate={setConfirmPassword}
                  inputType={showConfirmPassword ? "text" : "password"}
                  error={showError("confirmPassword")}
                  className={`
                    w-full bg-[#14151F]/60 border-2
                    ${error?.type === "confirmPassword" ? "border-red-500" : "border-[#2A2B3F]"}
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#818BAC] hover:text-[#20DDBB] transition-colors duration-300"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="text-xl" />
                  ) : (
                    <FiEye className="text-xl" />
                  )}
                </button>
              </motion.div>

              {/* Terms and Conditions */}
              <motion.div
                className="flex items-start gap-3"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <button
                  type="button"
                  onClick={() => setAgreeToTerms(!agreeToTerms)}
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                    transition-all duration-300
                    ${
                      agreeToTerms
                        ? "bg-[#20DDBB] border-[#20DDBB]"
                        : "border-[#2A2B3F] hover:border-[#20DDBB]/50"
                    }
                  `}
                >
                  {agreeToTerms && <FiCheck className="w-3 h-3 text-white" />}
                </button>
                <div className="text-sm text-[#818BAC] leading-relaxed">
                  I agree to the{" "}
                  <button className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 underline">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 underline">
                    Privacy Policy
                  </button>
                </div>
              </motion.div>

              {/* Error display for terms */}
              {showError("terms") && (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <FiAlertCircle />
                  {showError("terms")}
                </div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="mt-8 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {/* Register Button */}
              <motion.button
                disabled={loading || isBlocked}
                onClick={register}
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
                      <span>Create Account</span>
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

              {/* Google Register Button */}
              <motion.button
                onClick={handleGoogleRegister}
                disabled={loading || googleLoading || isBlocked}
                whileHover={{
                  scale: loading || googleLoading || isBlocked ? 1 : 1.02,
                }}
                whileTap={{
                  scale: loading || googleLoading || isBlocked ? 1 : 0.98,
                }}
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
                    {googleLoading ? "Redirecting..." : "Continue with Google"}
                  </span>
                </div>
              </motion.button>
            </motion.div>

            {/* Footer Links */}
            <motion.div
              className="mt-6 text-center space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-[#818BAC] text-sm">
                Already have an account?{" "}
                <button
                  onClick={switchToLogin}
                  className="text-[#20DDBB] hover:text-[#8A2BE2] transition-colors duration-300 font-medium"
                >
                  Log in
                </button>
              </p>

              {/* Troubleshooting section */}
              <div className="text-xs">
                <button
                  onClick={() => {
                    clearUserCache();
                    showToast(
                      "success",
                      "Authentication state cleared. Please try again.",
                    );
                  }}
                  className="text-[#818BAC] hover:text-[#20DDBB] text-xs underline transition-colors duration-300"
                >
                  Having trouble? Click here to clear auth state
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Success notification */}
      <AnimatePresence>
        {registrationSuccess && (
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
                <p className="font-medium">Welcome aboard! 🎉</p>
                <p className="text-sm opacity-90">
                  Check your email to verify your account
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
