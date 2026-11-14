import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SiteFooterComponent } from '../components/site-footer/site-footer.component';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, SiteFooterComponent],
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  protected readonly highlights = [
    { key: 'build', icon: 'pi-box' },
    { key: 'p2p', icon: 'pi-wifi' },
    { key: 'tools', icon: 'pi-wrench' },
  ];
}
