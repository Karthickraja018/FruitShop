import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency: string = "₹") => {
  return `${currency}${amount.toLocaleString("en-IN")}`;
};

export const formatWeight = (qty: number, unit: string) => {
  if (unit === "kg") {
    if (qty < 1 && qty > 0) {
      return `${qty * 1000} g`;
    }
    return `${qty} kg`;
  }
  return `${qty} ${unit}`;
};
