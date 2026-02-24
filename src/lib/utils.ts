/**
 * Returns a color class based on how close the reminder date is.
 * Green → Yellow → Orange → Red as it approaches.
 */
export function getReminderColor(reminderDate: string | null): {
  bg: string;
  text: string;
  dot: string;
  label: string;
} {
  if (!reminderDate) {
    return { bg: "", text: "", dot: "", label: "" };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const reminder = new Date(reminderDate);
  reminder.setHours(0, 0, 0, 0);

  const diffMs = reminder.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-500",
      label: `${Math.abs(diffDays)}d overdue`,
    };
  }
  if (diffDays === 0) {
    return {
      bg: "bg-red-50",
      text: "text-red-600",
      dot: "bg-red-500",
      label: "Today",
    };
  }
  if (diffDays <= 2) {
    return {
      bg: "bg-orange-50",
      text: "text-orange-600",
      dot: "bg-orange-400",
      label: `${diffDays}d left`,
    };
  }
  if (diffDays <= 5) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-600",
      dot: "bg-amber-400",
      label: `${diffDays}d left`,
    };
  }
  if (diffDays <= 10) {
    return {
      bg: "bg-lime-50",
      text: "text-lime-600",
      dot: "bg-lime-400",
      label: `${diffDays}d left`,
    };
  }
  return {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-400",
    label: `${diffDays}d left`,
  };
}

/**
 * Format a date string to a readable short format
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}