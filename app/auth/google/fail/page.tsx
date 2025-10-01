"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiRefreshCw, FiHome, FiMail } from "react-icons/fi";
import { clearAllAuthFlags } from "../../../utils/authCleanup";
import { clearUserCache } from "../../../utils/cacheUtils";
import { useGeneralStore } from "../../../stores/general";
import { toast } from "react-hot-toast";

// Error messages mapping
const ERROR_MESSAGES = {
  access_denied: "You cancelled the Google authentication process.",
  invalid_request: "Invalid authentication request. Please try again.",
  unauthorized_client: "Authentication service configuration error.",
  unsupported_response_type: "Authentication method not supported.",
  invalid_scope: "Invalid authentication scope.",
  server_error: "Google authentication server error. Please try again later.",
  temporarily_unavailable: "Google authentication is temporarily unavailable.",
  network_error:
    "Network connection error. Please check your internet connection.",
  timeout: "Authentication request timed out. Please try again.",
  popup_blocked: "Pop-up was blocked. Please allow pop-ups and try again.",
  default: "Google authentication failed. Please try again.",
};

interface AuthFailureParams {
  error?: string;
  error_description?: string;
  state?: string;
  error_uri?: string;
}

// Component that handles URL parameters and error processing
function AuthFailureHandler() {
  const searchParams = useSearchParams();
  const [errorDetails, setErrorDetails] = useState<AuthFailureParams>({});

  useEffect(() => {
    const processFailure = async () => {
      try {
        // Extract error parameters from URL
        const error = searchParams?.get("error") || undefined;
        const errorDescription =
          searchParams?.get("error_description") || undefined;
        const state = searchParams?.get("state") || undefined;
        const errorUri = searchParams?.get("error_uri") || undefined;

        setErrorDetails({
          error,
          error_description: errorDescription,
          state,
          error_uri: errorUri,
        });

        // Log the failure for debugging
        console.error("[GoogleAuth] Authentication failed:", {
          error,
          errorDescription,
          state,
          userAgent: navigator.userAgent.substring(0, 200),
          timestamp: new Date().toISOString(),
        });

        // Clear all authentication-related storage
        clearAllAuthFlags();
        clearUserCache();

        // Clear browser-specific auth flags
        if (typeof window !== "undefined") {
          // Clear sessionStorage auth flags
          const sessionKeys = [
            "googleAuthInProgress",
            "googleAuthExpiryTime",
            "authBrowserInfo",
            "iOSAuthAttempt",
            "iOSAuthTimestamp",
            "iOSAuthInProgress",
            "firefoxMobileAuth",
            "browserAuthRedirected",
            "authType",
          ];

          sessionKeys.forEach((key) => {
            sessionStorage.removeItem(key);
          });

          // Clear localStorage auth flags
          const localKeys = [
            "authRedirectAttempt",
            "safariAuthUrl",
            "safariAuthAttempt",
            "safariAuthInProgress",
            "browserAuthSessionId",
            "browserAuthProcessing",
            "browserAuthTimestamp",
            "browserAuthUserAgent",
          ];

          localKeys.forEach((key) => {
            localStorage.removeItem(key);
          });

          // Set failure flag for other components to check
          sessionStorage.setItem("googleAuthFailed", "true");
          sessionStorage.setItem(
            "googleAuthFailureTime",
            Date.now().toString(),
          );
        }

        // Show user-friendly error message
        const userMessage =
          ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ||
          ERROR_MESSAGES.default;

        toast.error(userMessage, {
          duration: 6000,
          style: {
            background: "linear-gradient(135deg, #1E1F2E 0%, #272B43 100%)",
            color: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderLeft: "4px solid #EF4444",
          },
        });
      } catch (processingError) {
        console.error(
          "[GoogleAuth] Error processing failure:",
          processingError,
        );

        // Fallback error handling
        toast.error("Authentication failed. Please try again.", {
          duration: 4000,
          style: {
            background: "linear-gradient(135deg, #1E1F2E 0%, #272B43 100%)",
            color: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderLeft: "4px solid #EF4444",
          },
        });
      }
    };

    processFailure();
  }, [searchParams]);

  return null;
}

// Main failure page component
export default function GoogleAuthFailurePage() {
  const router = useRouter();
  const { setIsLoginOpen, setIsRegisterOpen } = useGeneralStore();
  const [showDetails, setShowDetails] = useState(false);
  const [errorParams, setErrorParams] = useState<AuthFailureParams>({});

  useEffect(() => {
    // Extract error parameters for display
    const urlParams = new URLSearchParams(window.location.search);
    setErrorParams({
      error: urlParams.get("error") || undefined,
      error_description: urlParams.get("error_description") || undefined,
      state: urlParams.get("state") || undefined,
      error_uri: urlParams.get("error_uri") || undefined,
    });

    // Auto redirect to home after 10 seconds if no user interaction
    const autoRedirectTimer = setTimeout(() => {
      router.push("/");
    }, 10000);

    return () => clearTimeout(autoRedirectTimer);
  }, [router]);

  const handleRetryAuth = () => {
    // Clear any remaining auth state
    clearAllAuthFlags();
    clearUserCache();

    // Open login modal
    setIsLoginOpen(true);
    router.push("/");
  };

  const handleEmailAuth = () => {
    // Clear any remaining auth state
    clearAllAuthFlags();
    clearUserCache();

    // Open register modal for email registration
    setIsRegisterOpen(true);
    router.push("/");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const getErrorMessage = () => {
    const error = errorParams.error;
    return (
      ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] ||
      ERROR_MESSAGES.default
    );
  };

  const getErrorTitle = () => {
    const error = errorParams.error;

    switch (error) {
      case "access_denied":
        return "Authentication Cancelled";
      case "server_error":
        return "Server Error";
      case "network_error":
        return "Network Error";
      case "timeout":
        return "Request Timeout";
      default:
        return "Authentication Failed";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F23] via-[#1E1F2E] to-[#2A2B3F] flex items-center justify-center p-4">
      {/* Handle URL parameters */}
      <Suspense
        fallback={
          <div className="text-center text-[#818BAC]">
            Processing authentication result...
          </div>
        }
      >
        <AuthFailureHandler />
      </Suspense>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="w-full max-w-md"
      >
        <div className="relative bg-[#1E1F2E] rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.15)] border border-red-500/20">
          {/* Animated border */}
          <div className="absolute inset-0 p-[1.5px] rounded-3xl">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-3xl"
              style={{ backgroundSize: "200% 100%" }}
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
              }}
              transition={{
                duration: 4,
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
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                  delay: 0.2,
                }}
                className="flex justify-center mb-6"
              >
                <div className="relative w-20 h-20">
                  <motion.div
                    className="absolute inset-0 bg-red-500/20 rounded-full blur-xl"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                  />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                    <FiAlertTriangle className="text-3xl text-red-400" />
                  </div>
                </div>
              </motion.div>

              <motion.h1
                className="text-2xl font-bold text-white mb-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {getErrorTitle()}
              </motion.h1>

              <motion.p
                className="text-[#818BAC] mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {getErrorMessage()}
              </motion.p>

              {/* Error details toggle */}
              {(errorParams.error || errorParams.error_description) && (
                <motion.button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors duration-300 underline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {showDetails ? "Hide" : "Show"} technical details
                </motion.button>
              )}

              {/* Error details */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left"
                  >
                    <div className="text-xs text-red-300 space-y-2">
                      {errorParams.error && (
                        <div>
                          <span className="font-medium">Error:</span>{" "}
                          {errorParams.error}
                        </div>
                      )}
                      {errorParams.error_description && (
                        <div>
                          <span className="font-medium">Description:</span>{" "}
                          {errorParams.error_description}
                        </div>
                      )}
                      {errorParams.state && (
                        <div>
                          <span className="font-medium">State:</span>{" "}
                          {errorParams.state}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {/* Retry Google Auth */}
              <motion.button
                onClick={handleRetryAuth}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full bg-gradient-to-r from-[#20DDBB] to-[#8A2BE2]
                  text-white py-3 rounded-xl font-medium
                  relative overflow-hidden group
                "
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  <FiRefreshCw className="text-lg" />
                  <span>Try Again</span>
                </div>
              </motion.button>

              {/* Use Email Registration */}
              <motion.button
                onClick={handleEmailAuth}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full bg-[#14151F]/60 hover:bg-[#14151F]/80
                  text-white py-3 rounded-xl font-medium
                  border-2 border-[#2A2B3F] hover:border-[#20DDBB]/50
                  transition-all duration-300
                  relative overflow-hidden group
                "
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#20DDBB]/10 to-[#8A2BE2]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  <FiMail className="text-lg" />
                  <span>Use Email Instead</span>
                </div>
              </motion.button>

              {/* Go Home */}
              <motion.button
                onClick={handleGoHome}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  w-full bg-transparent
                  text-[#818BAC] hover:text-white py-3 rounded-xl font-medium
                  border border-[#2A2B3F] hover:border-[#818BAC]/50
                  transition-all duration-300
                "
              >
                <div className="flex items-center justify-center gap-2">
                  <FiHome className="text-lg" />
                  <span>Go Home</span>
                </div>
              </motion.button>
            </motion.div>

            {/* Auto redirect notice */}
            <motion.div
              className="mt-6 text-center text-xs text-[#818BAC]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              You'll be redirected to the homepage in a few seconds...
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
