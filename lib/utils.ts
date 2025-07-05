import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate une date timestamp Firebase en format court français
 * @param timestamp - Timestamp Firebase avec méthode toDate()
 * @returns Date formatée en français (ex: "5 juil 2025 à 13h53")
 */
export function formatDateShort(timestamp: { toDate: () => Date } | Date): string {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Noms des mois en français (abréviés)
  const monthNames = [
    'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
    'juil', 'août', 'sept', 'oct', 'nov', 'déc'
  ];
  
  return `${day} ${monthNames[month]} ${year}`;
}
