"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { account, ID } from "@/libs/AppWriteClient";
import { User, UserContextTypes } from "../types";
import { useRouter } from "next/navigation";
import useGetProfileByUserId from "../hooks/useGetProfileByUserId";
import useCreateProfile from "../hooks/useCreateProfile";
import { clearUserCache } from "../utils/cacheUtils";

// Custom event for authentication state changes
export const AUTH_STATE_CHANGE_EVENT = "auth_state_change";

// Global counters to limit API calls
let sessionCheckCount = 0;
let lastSessionCheckTime = 0;
const MAX_SESSION_CHECKS_PER_MINUTE = 10;
const SESSION_CHECK_THROTTLE_MS = 60000; // 1 minute
let concurrentSessionChecks = 0;
const MAX_CONCURRENT_CHECKS = 2;

// Function to dispatch authentication state change event
export const dispatchAuthStateChange = (userData: User | null) => {
  // Обновляем временную метку кэша для сброса URL изображений
  if (typeof window !== "undefined") {
    const timestamp = Date.now();
    window.localStorage.setItem("cache_timestamp", timestamp.toString());
  }

  // Создаем и отправляем пользовательское событие
  const event = new CustomEvent(AUTH_STATE_CHANGE_EVENT, {
    detail: { user: userData },
  });
  window.dispatchEvent(event);
  console.log(
    "Auth state change event dispatched:",
    userData ? "User logged in" : "User logged out",
  );
};

const UserContext = createContext<UserContextTypes | null>(null);

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const checkingRef = React.useRef<boolean>(false);

  const checkUser = async (): Promise<User | null> => {
    // Implement global throttling - limit total API calls to Appwrite
    const now = Date.now();
    if (now - lastSessionCheckTime < SESSION_CHECK_THROTTLE_MS) {
      if (sessionCheckCount >= MAX_SESSION_CHECKS_PER_MINUTE) {
        console.log(
          `Too many session checks (${sessionCheckCount}) in the past minute, throttling...`,
        );
        return user || null; // Return current user state instead of checking again
      }
    } else {
      // Reset counter after throttle period
      sessionCheckCount = 0;
      lastSessionCheckTime = now;
    }

    // Limit concurrent session checks
    if (concurrentSessionChecks >= MAX_CONCURRENT_CHECKS) {
      console.log(
        `Max concurrent session checks (${MAX_CONCURRENT_CHECKS}) reached, skipping...`,
      );
      return user || null;
    }

    // Add debouncing with ref variable
    if (checkingRef.current) {
      return user || null;
    }

    // Set flags to prevent duplicate checks
    checkingRef.current = true;
    concurrentSessionChecks++;
    sessionCheckCount++;

    // Release lock after timeout
    setTimeout(() => {
      checkingRef.current = false;
      concurrentSessionChecks = Math.max(0, concurrentSessionChecks - 1);
    }, 1000);

    try {
      // Check for existing session without calling getSession('current')
      // which can cause a 401 error for guests
      try {
        // Add googleAuthInProgress flag check
        const isGoogleAuthInProgress =
          typeof window !== "undefined" &&
          window.sessionStorage &&
          window.sessionStorage.getItem("googleAuthInProgress") === "true";

        // If Google auth is in progress, add additional delay before checking session
        if (isGoogleAuthInProgress) {
          console.log("Google auth in progress, delaying session check");
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Use account.get() directly, which will throw an error if no session exists
        const currentUser = await account.get();

        if (!currentUser) {
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }

        // In production, only important logs
        if (process.env.NODE_ENV === "development") {
          console.log("User account:", currentUser);
        }

        // In production, only important logs
        if (process.env.NODE_ENV === "development") {
          console.log("Getting user profile...");
        }

        const profile = await useGetProfileByUserId(currentUser.$id);

        // In production, only important logs
        if (process.env.NODE_ENV === "development") {
          console.log("User profile:", profile);
        }

        const userData = {
          id: currentUser.$id,
          name: currentUser.name,
          bio: profile?.bio,
          image: profile?.image,
        };

        // In production, only important logs
        if (process.env.NODE_ENV === "development") {
          console.log("Setting user data:", userData);
        }

        // Store userId in localStorage for friend features
        if (typeof window !== "undefined" && userData.id) {
          localStorage.setItem("userId", userData.id);
        }

        setUser(userData);

        // Dispatch auth state change event with new user data
        dispatchAuthStateChange(userData);

        // Force router refresh to update all components
        router.refresh();

        return userData;
      } catch (error: any) {
        // Check if Google auth is in progress
        const isGoogleAuthInProgress =
          typeof window !== "undefined" &&
          window.sessionStorage &&
          window.sessionStorage.getItem("googleAuthInProgress") === "true";

        // If error 401, user is not authenticated - this is a normal situation
        if (
          error?.code === 401 ||
          (error?.message && error?.message.includes("missing scope"))
        ) {
          // Show error in console only if NOT during Google auth process
          if (!isGoogleAuthInProgress) {
            console.log("User not authenticated:", error?.message);
          }
          setUser(null);
          dispatchAuthStateChange(null);
          return null;
        }

        // If Google auth is in progress, don't log other errors
        // to avoid unnecessary console messages
        if (isGoogleAuthInProgress) {
          console.log("Authentication in progress, suppressing error logs");
          return null;
        }

        // Log other errors
        console.error("Error checking user authentication:", error);
        setUser(null);
        dispatchAuthStateChange(null);
        return null;
      }
    } catch (error) {
      console.error("Error in checkUser:", error);
      setUser(null);
      dispatchAuthStateChange(null);
      return null;
    } finally {
      // Make sure to decrement count on error too
      concurrentSessionChecks = Math.max(0, concurrentSessionChecks - 1);
    }
  };

  useEffect(() => {
    // Check user on component mount
    checkUser();

    // Set up an interval to periodically check user session
    // Увеличиваем интервал проверки с 1 минуты до 5 минут
    const authCheckInterval = setInterval(
      () => {
        checkUser();
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    return () => clearInterval(authCheckInterval);
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log("Starting registration process...");

      // Validate inputs
      if (!name || !email || !password) {
        throw new Error("All fields are required");
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      // Password validation
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Проверяем соединение с Appwrite API и валидность переменных окружения
      console.log(
        "[DEBUG] Checking Appwrite connection and environment variables",
      );
      console.log(
        "[DEBUG] NEXT_PUBLIC_APPWRITE_URL:",
        process.env.NEXT_PUBLIC_APPWRITE_URL,
      );
      console.log(
        "[DEBUG] NEXT_PUBLIC_ENDPOINT:",
        process.env.NEXT_PUBLIC_ENDPOINT,
      );
      console.log(
        "[DEBUG] NEXT_PUBLIC_DATABASE_ID:",
        process.env.NEXT_PUBLIC_DATABASE_ID,
      );
      console.log(
        "[DEBUG] NEXT_PUBLIC_COLLECTION_ID_PROFILE:",
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
      );

      // Не проверяем существующую сессию здесь, так как это вызывает ошибку guests missing scope

      console.log("Creating user account...");
      const userId = ID.unique();
      const promise = await account.create(userId, email, password, name);
      console.log("[DEBUG] Account created successfully:", promise?.$id);

      console.log("Creating email session...");
      const session = await account.createEmailSession(email, password);
      console.log("[DEBUG] Email session created successfully:", session.$id);

      console.log("Creating user profile...");
      try {
        // Используем SVG изображение вместо ID в хранилище
        const profileImagePath = "/images/placeholders/user-placeholder.svg";

        // Проверяем переменные окружения перед созданием профиля
        if (
          !process.env.NEXT_PUBLIC_DATABASE_ID ||
          !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
        ) {
          console.error(
            "[DEBUG] Missing environment variables:",
            !process.env.NEXT_PUBLIC_DATABASE_ID
              ? "NEXT_PUBLIC_DATABASE_ID"
              : "",
            !process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
              ? "NEXT_PUBLIC_COLLECTION_ID_PROFILE"
              : "",
          );
          throw new Error(
            "Missing required environment variables for profile creation",
          );
        }

        // Проверяем валидность userId
        if (!userId || typeof userId !== "string") {
          console.error("[DEBUG] Invalid userId:", userId);
          throw new Error("Invalid user ID for profile creation");
        }

        // Выводим дополнительную информацию
        console.log(
          "[DEBUG] Creating profile with image path:",
          profileImagePath,
        );
        console.log(
          "[DEBUG] Database ID:",
          process.env.NEXT_PUBLIC_DATABASE_ID,
        );
        console.log(
          "[DEBUG] Collection ID:",
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE,
        );

        const profileResult = await useCreateProfile(
          userId,
          name,
          profileImagePath,
          "",
        );
        console.log("[DEBUG] Profile created successfully:", profileResult);
        console.log("[DEBUG] Profile created successfully for user:", userId);
      } catch (profileError: any) {
        console.error("[DEBUG] Error creating profile:", profileError);
        console.error("[DEBUG] Error details:", {
          code: profileError.code,
          message: profileError.message,
          type: profileError.type,
          response: profileError.response,
        });

        // Если профиль не удалось создать, удаляем аккаунт чтобы не оставлять "осиротевший" аккаунт
        try {
          await account.deleteSession("current");
          console.log("[DEBUG] Session deleted after profile creation failed");
        } catch (deleteError) {
          console.error(
            "[DEBUG] Error deleting session after profile creation failed:",
            deleteError,
          );
        }

        throw new Error(
          "Failed to create user profile. Please try again later.",
        );
      }

      console.log("Checking user status...");
      const userData = await checkUser();
      console.log("[DEBUG] User data after checkUser:", userData);

      // Force router refresh
      router.refresh();

      console.log("Registration completed successfully");
      return userData;
    } catch (error: any) {
      console.error("Registration error details:", error);

      // Более подробное логирование
      if (error.response) {
        console.error("[DEBUG] Full error response:", error.response);
      }

      console.error("[DEBUG] Error details:", {
        code: error.code,
        message: error.message,
        type: error.type,
      });

      // Handle specific AppWrite error codes
      if (
        error.code === 429 ||
        (error.message && error.message.toLowerCase().includes("rate limit"))
      ) {
        throw new Error(
          "Too many registration attempts. Please try again later.",
        );
      }

      if (error.code === 409) {
        throw new Error("Email already exists. Try logging in instead.");
      }

      // Re-throw the error with a clear message
      throw new Error(
        error.message || "Registration failed. Please try again.",
      );
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("[UserContext] Starting login process");

      // Clear previous user cache before login
      clearUserCache();

      await account.createEmailSession(email, password);
      console.log("[UserContext] Email session created successfully");

      // Check user and update UI with retry mechanism
      let userData = await checkUser();
      console.log("[UserContext] Initial checkUser result:", userData);

      // If no user data returned, retry once after a short delay
      if (!userData) {
        console.log("[UserContext] No user data, retrying after 500ms");
        await new Promise((resolve) => setTimeout(resolve, 500));
        userData = await checkUser();
        console.log("[UserContext] Retry checkUser result:", userData);
      }

      if (userData) {
        // Мгновенно обновляем состояние пользователя
        setUser(userData);

        // Немедленно отправляем событие об изменении состояния
        dispatchAuthStateChange(userData);
        console.log(
          "[UserContext] User state updated and event dispatched immediately:",
          userData,
        );

        // Дополнительное событие для гарантии обновления UI
        setTimeout(() => {
          dispatchAuthStateChange(userData);
          console.log("[UserContext] Secondary auth state change event dispatched");
        }, 100);

        // Force router refresh
        router.refresh();

        return userData;
      } else {
        throw new Error("Failed to retrieve user data after login");
      }
    } catch (error) {
      console.error("[UserContext] Login error:", error);
      // Ensure user state is cleared on error
      setUser(null);
      dispatchAuthStateChange(null);
      return null;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);

      // Dispatch auth state change with null user
      dispatchAuthStateChange(null);

      // Clear user ID from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("userId");
      }

      // Clear user data cache
      clearUserCache();

      // Force router refresh
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <UserContext.Provider
      value={
        {
          user,
          register,
          login,
          logout,
          checkUser,
        } as unknown as UserContextTypes
      }
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;

export const useUser = () => useContext(UserContext);
