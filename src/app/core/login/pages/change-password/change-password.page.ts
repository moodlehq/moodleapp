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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreLoginHelper } from '@core/login/services/login.helper';
import { Translate } from '@singletons/core.singletons';

/**
 * Page that shows instructions to change the password.
 */
@Component({
    selector: 'page-core-login-change-password',
    templateUrl: 'change-password.html',
})
export class CoreLoginChangePasswordPage {

    changingPassword = false;
    logoutLabel: string;

    constructor() {
        this.logoutLabel = CoreLoginHelper.instance.getLogoutLabel();
    }

    /**
     * Show a help modal.
     */
    showHelp(): void {
        CoreDomUtils.instance.showAlert(
            Translate.instance.instant('core.help'),
            Translate.instance.instant('core.login.changepasswordhelp'),
        );
    }

    /**
     * Open the change password page in a browser.
     */
    openChangePasswordPage(): void {
        CoreLoginHelper.instance.openInAppForEdit(
            CoreSites.instance.getCurrentSiteId(),
            '/login/change_password.php',
            undefined,
            true,
        );
        this.changingPassword = true;
    }

    /**
     * Login the user.
     */
    login(): void {
        CoreLoginHelper.instance.goToSiteInitialPage();
        this.changingPassword = false;
    }

    /**
     * Logout the user.
     */
    logout(): void {
        CoreSites.instance.logout();
        this.changingPassword = false;
    }

}
