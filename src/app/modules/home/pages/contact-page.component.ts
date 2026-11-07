import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from '@openng/optimus-ui/button';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TextareaModule } from '@openng/optimus-ui/textarea';
import { ContactBusiness } from '../business/contact.business';

@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TextareaModule,
  ],
  providers: [ContactBusiness],
  template: `
    <div class="main-container page">
      <h1>{{ 'contact.title' | transloco }}</h1>
      <p class="hint">{{ 'contact.intro' | transloco }}</p>
      @if (!contact.available) {
        <p-message data-test="contact-unavailable" severity="info">
          {{ 'contact.unavailable' | transloco }}
        </p-message>
      } @else {
        <form (submit)="$event.preventDefault(); contact.submit()" novalidate>
          <label for="contact-name">{{ 'contact.name' | transloco }}</label>
          <input
            pInputText
            id="contact-name"
            data-test="contact-name"
            autocomplete="name"
            [value]="contact.name()"
            (input)="contact.name.set($any($event.target).value)"
          />
          @if (contact.submitted() && !contact.nameValid()) {
            <small class="error">{{
              'contact.nameRequired' | transloco
            }}</small>
          }
          <label for="contact-email">{{ 'contact.email' | transloco }}</label>
          <input
            pInputText
            id="contact-email"
            type="email"
            data-test="contact-email"
            autocomplete="email"
            [value]="contact.email()"
            (input)="contact.email.set($any($event.target).value)"
          />
          @if (contact.submitted() && !contact.emailValid()) {
            <small class="error">{{
              'contact.emailInvalid' | transloco
            }}</small>
          }
          <label for="contact-message">{{
            'contact.message' | transloco
          }}</label>
          <textarea
            pTextarea
            id="contact-message"
            rows="6"
            data-test="contact-message"
            [value]="contact.message()"
            (input)="contact.message.set($any($event.target).value)"
          ></textarea>
          @if (contact.submitted() && !contact.messageValid()) {
            <small class="error">{{
              'contact.messageRequired' | transloco
            }}</small>
          }
          <div>
            <button
              pButton
              type="submit"
              data-test="contact-submit"
              [disabled]="contact.status() === 'sending'"
            >
              {{ 'contact.send' | transloco }}
            </button>
          </div>
          @if (contact.status() === 'success') {
            <p-message data-test="contact-success" severity="success">
              {{ 'contact.success' | transloco }}
            </p-message>
          }
          @if (contact.status() === 'error') {
            <p-message data-test="contact-error" severity="error">
              {{ 'contact.error' | transloco }}
            </p-message>
          }
        </form>
      }
    </div>
  `,
  styles: `
    .page {
      max-width: 40rem;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h1,
    .hint {
      margin: 0;
    }
    .hint {
      color: var(--p-text-muted-color);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .error {
      color: var(--p-red-500);
    }
  `,
})
export class ContactPageComponent {
  protected readonly contact = inject(ContactBusiness);
}
