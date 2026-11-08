import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClassCatalogueBusiness } from '../../../class/business/class-catalogue.business';
import { ClassCataloguePageComponent } from '../../../class/pages/class-catalogue-page/class-catalogue-page.component';
import { SandboxClassCatalogueBusiness } from '../../business/sandbox-class-catalogue.business';

/** Tool: the class catalogue page on the sandbox world, in memory. Nothing is saved. */
@Component({
  selector: 'app-class-catalogue-tool-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClassCataloguePageComponent],
  providers: [{ provide: ClassCatalogueBusiness, useClass: SandboxClassCatalogueBusiness }],
  template: `<app-class-catalogue-page />`,
})
export class ClassCatalogueToolPageComponent {}
