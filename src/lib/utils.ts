import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric quantity to at most 2 decimal places, stripping trailing zeros */
export function fmtQty(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}
