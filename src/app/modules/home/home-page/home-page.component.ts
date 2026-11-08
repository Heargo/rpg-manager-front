import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe, SiteFooterComponent],
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  protected readonly highlights = [
    { key: 'build', icon: 'pi-box' },
    { key: 'p2p', icon: 'pi-wifi' },
    { key: 'tools', icon: 'pi-wrench' },
  ];

  protected scrollToContent(content: HTMLElement): void {
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    content.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
}
