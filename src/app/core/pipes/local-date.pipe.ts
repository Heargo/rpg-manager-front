import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageBusiness } from '../business/language.business';

export type LocalDateStyle = 'date' | 'dateTime';

const OPTIONS: Record<LocalDateStyle, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  dateTime: { dateStyle: 'short', timeStyle: 'short' },
};

/**
 * Dates in the app's language (Angular's DatePipe uses a fixed locale). Impure so it follows a language switch;
 * the formatter is cached per language and style.
 */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageBusiness);
  private readonly formatters = new Map<string, Intl.DateTimeFormat>();

  transform(value: number | Date | null | undefined, style: LocalDateStyle = 'date'): string {
    if (value === null || value === undefined) return '';
    const lang = this.language.$language();
    const key = `${lang}|${style}`;
    let formatter = this.formatters.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(lang, OPTIONS[style]);
      this.formatters.set(key, formatter);
    }
    return formatter.format(value);
  }
}
