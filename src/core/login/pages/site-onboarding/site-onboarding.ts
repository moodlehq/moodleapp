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
import { IonicPage, ViewController } from 'ionic-angular';
import { CoreUtils } from '@providers/utils/utils';
import { CoreConfig } from '@providers/config';
import { CoreLoginHelperProvider } from '../../providers/helper';

/**
 * Component that displays onboarding help regarding the CoreLoginSitePage.
 */
@IonicPage({ segment: 'core-login-site-onboarding' })
@Component({
    selector: 'page-core-login-site-onboarding',
    templateUrl: 'site-onboarding.html',
})
export class CoreLoginSiteOnboardingPage {

    step = 0;

    constructor(
            protected viewCtrl: ViewController,
            ) {}

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
            this.viewCtrl.dismiss();
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
        this.viewCtrl.dismiss();
    }

    /**
     * Create a site.
     *
     * @param e Click event.
     */
    gotoWeb(e: Event): void {
        e.stopPropagation();

        this.saveOnboardingDone();

        CoreUtils.instance.openInBrowser('https://moodle.com/getstarted/');

        this.viewCtrl.dismiss();
    }

    /**
     * Saves the onboarding has finished.
     */
    protected saveOnboardingDone(): void {
        CoreConfig.instance.set(CoreLoginHelperProvider.ONBOARDING_DONE, 1);
    }
}
