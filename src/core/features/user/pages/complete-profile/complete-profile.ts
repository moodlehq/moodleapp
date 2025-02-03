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

import { Component, OnDestroy } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreOpener } from '@singletons/opener';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that shows instructions to complete the profile.
 */
@Component({
    selector: 'page-core-user-complete-profile',
    templateUrl: 'complete-profile.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreUserCompleteProfilePage implements OnDestroy {

    editingProfile = false;
    logoutLabel: string;

    protected urlLoadedObserver?: CoreEventObserver;
    protected browserClosedObserver?: CoreEventObserver;

    constructor() {
        this.logoutLabel = CoreLoginHelper.getLogoutLabel();
    }

    /**
     * Show help modal.
     */
    showHelp(): void {
        CoreUserSupport.showHelp(
            Translate.instant('core.user.completeprofilehelp'),
            Translate.instant('core.user.completeprofilesupportsubject'),
        );
    }

    /**
     * Open the edit profile page in a browser.
     */
    openCompleteProfilePage(): void {
        CoreLoginHelper.openInAppForEdit(
            CoreSites.getCurrentSiteId(),
            '/user/edit.php',
            undefined,
            true,
        );
        this.editingProfile = true;
        this.detectProileEdited();
    }

    /**
     * Login the user.
     */
    login(): void {
        CoreNavigator.navigateToSiteHome();
        this.editingProfile = false;
    }

    /**
     * Logout the user.
     */
    logout(): void {
        CoreSites.logout();
        this.editingProfile = false;
    }

    /**
     * Try to detect if the user edited the profile in browser.
     */
    detectProileEdited(): void {
        if (this.urlLoadedObserver) {
            // Already listening (shouldn't happen).
            return;
        }

        this.urlLoadedObserver = CoreEvents.on(CoreEvents.IAB_LOAD_START, (event) => {
            if (event.url.match(/\/user\/preferences.php/)) {
                // Profile should be complete now.
                CoreOpener.closeInAppBrowser();
                this.login();
            }
        });

        this.browserClosedObserver = CoreEvents.on(CoreEvents.IAB_EXIT, () => {
            this.urlLoadedObserver?.off();
            this.browserClosedObserver?.off();
            delete this.urlLoadedObserver;
            delete this.browserClosedObserver;
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.urlLoadedObserver?.off();
        this.browserClosedObserver?.off();
    }

}
