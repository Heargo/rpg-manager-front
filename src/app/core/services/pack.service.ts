import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Loads pack files over HTTP. Raw JSON; validation is the business's job. */
@Injectable({ providedIn: 'root' })
export class PackService {
  private readonly http = inject(HttpClient);

  loadManifest(packId: string): Promise<unknown> {
    return this.loadJson(`packs/${packId}/pack.json`);
  }

  /** The registry of official packs. */
  loadRegistry(): Promise<unknown> {
    return this.loadJson('packs/index.json');
  }

  loadBlob(url: string): Promise<Blob> {
    return firstValueFrom(this.http.get(url, { responseType: 'blob' }));
  }

  loadJson(url: string): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(url));
  }
}
