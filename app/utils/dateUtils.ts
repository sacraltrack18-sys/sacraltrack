// Date utility functions to replace date-fns
export const formatDistanceToNow = (
  date: Date | string,
  options?: { addSuffix?: boolean },
): string => {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - targetDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  const addSuffix = options?.addSuffix !== false;

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) {
    const text = `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
    return addSuffix ? `${text} ago` : text;
  }
  if (diffInHours < 24) {
    const text = `${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
    return addSuffix ? `${text} ago` : text;
  }
  if (diffInDays < 7) {
    const text = `${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
    return addSuffix ? `${text} ago` : text;
  }
  if (diffInWeeks < 4) {
    const text = `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""}`;
    return addSuffix ? `${text} ago` : text;
  }
  if (diffInMonths < 12) {
    const text = `${diffInMonths} month${diffInMonths > 1 ? "s" : ""}`;
    return addSuffix ? `${text} ago` : text;
  }
  const text = `${diffInYears} year${diffInYears > 1 ? "s" : ""}`;
  return addSuffix ? `${text} ago` : text;
};

export const formatDistance = (
  date1: Date | string,
  date2: Date | string,
  options?: { addSuffix?: boolean },
): string => {
  const startDate = typeof date1 === "string" ? new Date(date1) : date1;
  const endDate = typeof date2 === "string" ? new Date(date2) : date2;
  const diffInMs = Math.abs(endDate.getTime() - startDate.getTime());
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  let result = "";
  if (diffInMinutes < 1) result = "less than a minute";
  else if (diffInMinutes < 60)
    result = `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
  else if (diffInHours < 24)
    result = `${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
  else if (diffInDays < 7)
    result = `${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
  else if (diffInWeeks < 4)
    result = `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""}`;
  else if (diffInMonths < 12)
    result = `${diffInMonths} month${diffInMonths > 1 ? "s" : ""}`;
  else result = `${diffInYears} year${diffInYears > 1 ? "s" : ""}`;

  if (options?.addSuffix) {
    const isPast = endDate.getTime() > startDate.getTime();
    return isPast ? `${result} ago` : `in ${result}`;
  }

  return result;
};

export const format = (date: Date | string, formatString: string): string => {
  const targetDate = typeof date === "string" ? new Date(date) : date;

  // Handle common format patterns
  switch (formatString) {
    case "MMM dd, yyyy":
      return targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    case "dd/MM/yyyy":
      return targetDate.toLocaleDateString("en-GB");
    case "MM/dd/yyyy":
      return targetDate.toLocaleDateString("en-US");
    case "yyyy-MM-dd":
      return targetDate.toISOString().split("T")[0];
    case "HH:mm":
      return targetDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    case "HH:mm:ss":
      return targetDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    case "h:mm a":
      return targetDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    case "MMMM dd, yyyy":
      return targetDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "MMM dd":
      return targetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "yyyy":
      return targetDate.getFullYear().toString();
    case "MMM":
      return targetDate.toLocaleDateString("en-US", { month: "short" });
    case "MMMM":
      return targetDate.toLocaleDateString("en-US", { month: "long" });
    case "dd":
      return targetDate.getDate().toString().padStart(2, "0");
    case "MM":
      return (targetDate.getMonth() + 1).toString().padStart(2, "0");
    case "PPP":
      return targetDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "PP":
      return targetDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "P":
      return targetDate.toLocaleDateString("en-US");
    default:
      // Fallback to ISO string for unknown formats
      return targetDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }
};

// Additional utility functions
export const isToday = (date: Date | string): boolean => {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  return targetDate.toDateString() === today.toDateString();
};

export const isYesterday = (date: Date | string): boolean => {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return targetDate.toDateString() === yesterday.toDateString();
};

export const formatTimeAgo = (date: Date | string): string => {
  const targetDate = typeof date === "string" ? new Date(date) : date;

  if (isToday(targetDate)) {
    return targetDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (isYesterday(targetDate)) {
    return "Yesterday";
  }

  return formatDistanceToNow(targetDate);
};
