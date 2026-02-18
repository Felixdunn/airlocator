import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number | undefined, range?: { min: number; max: number }): string {
  if (value !== undefined) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (range) {
    return `${formatUSD(range.min)} - ${formatUSD(range.max)}`;
  }
  return "TBD";
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getTimeRemaining(deadline?: Date): string {
  if (!deadline) return "";
  
  const total = Date.parse(deadline.toString()) - Date.parse(new Date().toString());
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  
  if (total <= 0) return "Ended";
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return "Ending soon";
}

export function getFrictionColor(friction: "low" | "medium" | "high"): string {
  switch (friction) {
    case "low":
      return "text-green-600 bg-green-100 dark:bg-green-900/30";
    case "medium":
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    case "high":
      return "text-red-600 bg-red-100 dark:bg-red-900/30";
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
