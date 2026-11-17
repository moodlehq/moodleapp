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

import { CoreSites } from '@services/sites';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that shows instructions to complete the profile.
 */
@Component({
    selector: 'page-core-user-complete-profile',
    templateUrl: 'complete-profile.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreUserCompleteProfilePage {

    editingProfile = false;
    logoutLabel: string;

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
    async openCompleteProfilePage(): Promise<void> {
        const inAppBrowser = await CoreLoginHelper.openInAppForEdit(
            CoreSites.getCurrentSiteId(),
            '/user/edit.php',
            undefined,
            true,
        );

        if (!inAppBrowser) {
            return;
        }

        this.editingProfile = true;

        // Try to detect if the user edited the profile in browser.
        inAppBrowser.onLoaded((event) => {
            if (event.url.match(/\/user\/preferences.php/)) {
                // Profile should be complete now.
                inAppBrowser.close();
                this.login();
            }
        });
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

}
