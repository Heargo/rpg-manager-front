import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Loads generator word lists from `public/i18n/generators/<lang>/`. Raw JSON; validation is the business's job. */
@Injectable({ providedIn: 'root' })
export class WordListService {
  private readonly http = inject(HttpClient);

  loadItemWords(lang: string): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(`i18n/generators/${lang}/items.json`));
  }
}
