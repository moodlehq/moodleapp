// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component } from '@angular/core';

import { CoreConfig } from '@services/config';
import { CoreOpener } from '@static/opener';
import { GET_STARTED_URL, ONBOARDING_DONE } from '@features/login/constants';
import { ModalController } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreConstants } from '@/core/constants';

/**
 * Component that displays onboarding help regarding the CoreLoginSitePage.
 */
@Component({
    selector: 'core-login-site-onboarding',
    templateUrl: 'site-onboarding.html',
    styleUrls: ['site-onboarding.scss', '../../login.scss'],
    imports: [
        CoreSharedModule,
    ],
})
export class CoreLoginSiteOnboardingComponent {

    step = 0;
    appName = CoreConstants.CONFIG.appname;

    /**
     * Go to next step.
     *
     * @param e Click event.
     */
    next(e: Event): void {
        e.stopPropagation();

        this.step++;
    }

    /**
     * Go to previous step.
     *
     * @param e Click event.
     */
    previous(e: Event): void {
        e.stopPropagation();

        if (this.step == 0) {
            ModalController.dismiss();
        } else {
            this.step--;
        }
    }

    /**
     * Close modal.
     *
     * @param e Click event.
     */
    skip(e: Event): void {
        e.stopPropagation();

        this.saveOnboardingDone();
        ModalController.dismiss();
    }

    /**
     * Create a site.
     *
     * @param e Click event.
     */
    gotoWeb(e: Event): void {
        e.stopPropagation();

        this.saveOnboardingDone();

        CoreOpener.openInBrowser(GET_STARTED_URL, { showBrowserWarning: false });

        ModalController.dismiss();
    }

    /**
     * Saves the onboarding has finished.
     */
    protected saveOnboardingDone(): void {
        CoreConfig.set(ONBOARDING_DONE, 1);
    }

}
