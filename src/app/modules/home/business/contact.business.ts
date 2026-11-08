import { Injectable, computed, inject, signal } from '@angular/core';
import { CONTACT_KEY } from '../../../core/constants/contact-key';
import { ContactService } from '../services/contact.service';

export type ContactStatus = 'idle' | 'sending' | 'success' | 'error';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class ContactBusiness {
  private readonly service = inject(ContactService);
  private readonly key = inject(CONTACT_KEY);

  readonly available = this.key !== '';
  readonly name = signal('');
  readonly email = signal('');
  readonly message = signal('');
  readonly status = signal<ContactStatus>('idle');
  readonly submitted = signal(false);

  readonly nameValid = computed(() => this.name().trim().length > 0);
  readonly emailValid = computed(() => EMAIL.test(this.email().trim()));
  readonly messageValid = computed(() => this.message().trim().length > 0);
  readonly valid = computed(
    () => this.nameValid() && this.emailValid() && this.messageValid(),
  );

  submit(): void {
    this.submitted.set(true);
    if (!this.available || !this.valid() || this.status() === 'sending') return;
    this.status.set('sending');
    this.service
      .send({
        name: this.name().trim(),
        email: this.email().trim(),
        message: this.message().trim(),
        access_key: this.key,
      })
      .subscribe({
        next: () => {
          this.status.set('success');
          this.name.set('');
          this.email.set('');
          this.message.set('');
          this.submitted.set(false);
        },
        error: () => this.status.set('error'),
      });
  }
}
