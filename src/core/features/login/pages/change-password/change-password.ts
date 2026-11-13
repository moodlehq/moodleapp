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
 * Page that shows instructions to change the password.
 */
@Component({
    selector: 'page-core-login-change-password',
    templateUrl: 'change-password.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreLoginChangePasswordPage {

    changingPassword = false;
    logoutLabel: string;

    constructor() {
        this.logoutLabel = CoreLoginHelper.getLogoutLabel();
    }

    /**
     * Show help modal.
     */
    showHelp(): void {
        CoreUserSupport.showHelp(
            Translate.instant('core.login.changepasswordhelp'),
            Translate.instant('core.login.changepasswordsupportsubject'),
        );
    }

    /**
     * Open the change password page in a browser.
     */
    async openChangePasswordPage(): Promise<void> {
        const inAppBrowser = await CoreLoginHelper.openInAppForEdit(
            CoreSites.getCurrentSiteId(),
            '/login/change_password.php',
            undefined,
            true,
        );
        if (!inAppBrowser) {
            return;
        }

        this.changingPassword = true;

        // Try to detect if the user changed the password in the browser.
        inAppBrowser.onLoaded((event) => {
            if (event.url.match(/\/login\/change_password\.php.*return=1/)) {
                // Password has changed, close the IAB now.
                inAppBrowser.close();
                this.login();

                return;
            }

            if (!event.url.match(/\/login\/change_password\.php/)) {
                return;
            }

            // Use a script to check if the user changed the password, in some platforms we cannot tell using the URL.
            inAppBrowser.executeScript(`
                if (
                    document.querySelector('input[type="password"]') === null &&
                    document.querySelector('button[type="submit"]') !== null
                ) {
                    window.mobileApp.postMessage(JSON.stringify({detail: { passwordChanged: true } }));
                }
            `);
        });

        inAppBrowser.onMessage((event) => {
            if (event.data?.passwordChanged) {
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
        this.changingPassword = false;
    }

    /**
     * Logout the user.
     */
    logout(): void {
        CoreSites.logout();
        this.changingPassword = false;
    }

}
