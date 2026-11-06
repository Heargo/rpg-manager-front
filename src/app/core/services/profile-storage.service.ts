import { Injectable } from '@angular/core';

const PROFILE_STORAGE_KEY = 'profile';

/** Wrapper around localStorage and id generation for the profile. Returns raw values; parsing and rules live in the business. */
@Injectable({ providedIn: 'root' })
export class ProfileStorageService {
  read(): string | null {
    try {
      return localStorage.getItem(PROFILE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /** Returns false when the browser refuses to store (private mode, blocked storage). */
  write(value: string): boolean {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, value);
      return true;
    } catch {
      return false;
    }
  }

  newPlayerId(): string {
    return crypto.randomUUID();
  }
}
