import type { RepeatType } from '../../types/services/scheduled-expense.types';

/**
 * Interface for a scheduled expense occurrence
 */
export interface ScheduledOccurrence {
  dueDate: string;
}

/**
 * Service for generating recurring scheduled expense occurrences
 */
export class RecurrenceService {
  /**
   * Generate all occurrences between firstDueDate and endDate based on repeatType
   */
  static generateOccurrences(
    firstDueDate: string,
    endDate: string,
    repeatType: RepeatType
  ): ScheduledOccurrence[] {
    if (repeatType === 'none' || !repeatType) {
      return [{ dueDate: firstDueDate }];
    }

    const occurrences: ScheduledOccurrence[] = [];
    let currentDate = new Date(firstDueDate);
    const endDateTime = new Date(endDate);

    // Add first occurrence
    occurrences.push({ dueDate: this.formatDate(currentDate) });

    // Generate subsequent occurrences
    while (true) {
      currentDate = this.getNextDate(currentDate, repeatType);

      // Stop if we've passed the end date
      if (currentDate > endDateTime) {
        break;
      }

      occurrences.push({ dueDate: this.formatDate(currentDate) });

      // Safety check to prevent infinite loops (max 10 years of daily occurrences)
      if (occurrences.length > 3650) {
        throw new Error('Too many occurrences generated. Please check your date range.');
      }
    }

    return occurrences;
  }

  /**
   * Calculate the next date based on repeat type
   */
  private static getNextDate(currentDate: Date, repeatType: RepeatType): Date {
    const nextDate = new Date(currentDate);

    switch (repeatType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;

      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;

      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;

      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;

      default:
        throw new Error(`Invalid repeat type: ${repeatType}`);
    }

    return nextDate;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate that a repeat type is valid
   */
  static isValidRepeatType(repeatType: string): repeatType is RepeatType {
    return ['none', 'daily', 'weekly', 'biweekly', 'monthly'].includes(repeatType);
  }

  /**
   * Calculate the number of occurrences that will be generated
   */
  static countOccurrences(firstDueDate: string, endDate: string, repeatType: RepeatType): number {
    return this.generateOccurrences(firstDueDate, endDate, repeatType).length;
  }
}
