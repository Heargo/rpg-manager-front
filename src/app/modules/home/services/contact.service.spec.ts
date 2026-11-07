import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactService, WEB3FORMS_URL } from './contact.service';

describe('ContactService', () => {
  const body = {
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hi',
    access_key: 'k',
  };

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      service: TestBed.inject(ContactService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('errors on a 2xx answer with success: false', () => {
    const { service, http } = setup();
    const onError = vi.fn();
    service.send(body).subscribe({ error: onError });
    http.expectOne(WEB3FORMS_URL).flush({ success: false });
    expect(onError).toHaveBeenCalled();
  });

  it('completes on success: true', () => {
    const { service, http } = setup();
    const onNext = vi.fn();
    service.send(body).subscribe(onNext);
    http.expectOne(WEB3FORMS_URL).flush({ success: true });
    expect(onNext).toHaveBeenCalled();
  });
});
