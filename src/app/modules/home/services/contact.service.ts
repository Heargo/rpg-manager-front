import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  access_key: string;
}

/** Sends a contact message to Web3Forms. */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(body: ContactMessage): Observable<unknown> {
    return this.http.post<{ success?: boolean }>(WEB3FORMS_URL, body).pipe(
      map((response) => {
        // Web3Forms can answer 2xx with { success: false }.
        if (response?.success === false)
          throw new Error('Web3Forms rejected the message');
        return response;
      }),
    );
  }
}
