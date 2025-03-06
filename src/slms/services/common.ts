import { Injectable } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor() { }

  async setCustomStyles(): Promise<void> {
    const site = CoreSites.getRequiredCurrentSite();
    const siteConfig = await CorePromiseUtils.ignoreErrors(site.getPublicConfig());
    if (siteConfig) {
      if (siteConfig.theme_learner_primary_color) {
        document.documentElement.style.setProperty(`--primary`, siteConfig.theme_learner_primary_color);
        document.documentElement.style.setProperty(`--primary-tint`, siteConfig.theme_learner_primary_color+'1A');
        document.documentElement.style.setProperty(`--primary-shade`, siteConfig.theme_learner_primary_color);
      }
    }
  }

}
