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

/**
 * Page that shows instructions to change the password.
 */
@Component({
    selector: 'page-core-login-change-password',
    templateUrl: 'change-password.html',
})
export class CoreLoginChangePasswordPage implements OnDestroy {

    changingPassword = false;
    logoutLabel: string;

    protected urlLoadedObserver?: CoreEventObserver;
    protected messageObserver?: CoreEventObserver;
    protected browserClosedObserver?: CoreEventObserver;

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
    openChangePasswordPage(): void {
        CoreLoginHelper.openInAppForEdit(
            CoreSites.getCurrentSiteId(),
            '/login/change_password.php',
            undefined,
            true,
        );
        this.changingPassword = true;
        this.detectPasswordChanged();
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

    /**
     * Try to detect if the user changed password in browser.
     */
    detectPasswordChanged(): void {
        if (this.urlLoadedObserver) {
            // Already listening (shouldn't happen).
            return;
        }

        this.urlLoadedObserver = CoreEvents.on(CoreEvents.IAB_LOAD_STOP, (event) => {
            if (event.url.match(/\/login\/change_password\.php.*return=1/)) {
                // Password has changed, close the IAB now.
                CoreOpener.closeInAppBrowser();
                this.login();

                return;
            }

            if (!event.url.match(/\/login\/change_password\.php/)) {
                return;
            }

            // Use a script to check if the user changed the password, in some platforms we cannot tell using the URL.
            CoreOpener.getInAppBrowserInstance()?.executeScript({
                code: `
                    if (
                        document.querySelector('input[type="password"]') === null &&
                        document.querySelector('button[type="submit"]') !== null
                    ) {
                        webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify({ passwordChanged: true }));
                    }
                `,
            });
        });

        this.messageObserver = CoreEvents.on(CoreEvents.IAB_MESSAGE, (data) => {
            if (data.passwordChanged) {
                CoreOpener.closeInAppBrowser();
                this.login();
            }
        });

        this.browserClosedObserver = CoreEvents.on(CoreEvents.IAB_EXIT, () => {
            this.urlLoadedObserver?.off();
            this.messageObserver?.off();
            this.browserClosedObserver?.off();

            delete this.urlLoadedObserver;
            delete this.messageObserver;
            delete this.browserClosedObserver;
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.urlLoadedObserver?.off();
        this.messageObserver?.off();
        this.browserClosedObserver?.off();
    }

}
