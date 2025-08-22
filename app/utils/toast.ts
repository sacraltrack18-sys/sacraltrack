import { toast } from "react-hot-toast";

// Unified toast styling function for consistent UI across the app
export const showToast = (
  type: "success" | "error" | "loading" | "warning" | "info",
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
    maxWidth: "90vw",
    minWidth: "280px",
    margin: "0 16px",
    ...options,
  };

  const typeStyles = {
    success: { 
      borderLeft: "4px solid #20DDBB", 
      icon: "✅",
      iconTheme: { primary: '#20DDBB', secondary: '#FFFAEE' }
    },
    error: { 
      borderLeft: "4px solid #EF4444", 
      icon: "❌",
      iconTheme: { primary: '#EF4444', secondary: '#FFFAEE' }
    },
    loading: { 
      borderLeft: "4px solid #8A2BE2", 
      icon: "⏳",
      iconTheme: { primary: '#8A2BE2', secondary: '#FFFAEE' }
    },
    warning: { 
      borderLeft: "4px solid #F59E0B", 
      icon: "⚠️",
      iconTheme: { primary: '#F59E0B', secondary: '#FFFAEE' }
    },
    info: { 
      borderLeft: "4px solid #3B82F6", 
      icon: "ℹ️",
      iconTheme: { primary: '#3B82F6', secondary: '#FFFAEE' }
    },
  };

  const typeConfig = typeStyles[type];
  const toastType = type === "warning" || type === "info" ? "error" : type;

  return toast[toastType](message, {
    duration: type === "loading" ? Infinity : 4000,
    style: { ...baseStyle, ...typeConfig },
    icon: typeConfig.icon,
    iconTheme: typeConfig.iconTheme,
    position: "top-center",
    ...options,
  });
};

// Convenience methods for common toast types
export const successToast = (message: string, options = {}) => 
  showToast("success", message, options);

export const errorToast = (message: string, options = {}) => 
  showToast("error", message, options);

export const loadingToast = (message: string, options = {}) => 
  showToast("loading", message, options);

export const warningToast = (message: string, options = {}) => 
  showToast("warning", message, options);

export const infoToast = (message: string, options = {}) => 
  showToast("info", message, options);
