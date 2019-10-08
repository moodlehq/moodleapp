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
import { IonicPage } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Page that shows instructions to change the password.
 */
@IonicPage({ segment: 'core-login-change-password' })
@Component({
    selector: 'page-core-change-password',
    templateUrl: 'change-password.html',
})
export class CoreLoginChangePasswordPage {
    changingPassword = false;
    logoutLabel: string;

    constructor(private translate: TranslateService, private sitesProvider: CoreSitesProvider,
            private loginHelper: CoreLoginHelperProvider, private domUtls: CoreDomUtilsProvider) {
        this.logoutLabel = this.loginHelper.getLogoutLabel();
    }

    /**
     * Show a help modal.
     */
    showHelp(): void {
        this.domUtls.showAlert(this.translate.instant('core.help'), this.translate.instant('core.login.changepasswordhelp'));
    }

    /**
     * Open the change password page in a browser.
     */
    openChangePasswordPage(): void {
        this.loginHelper.openInAppForEdit(this.sitesProvider.getCurrentSiteId(), '/login/change_password.php', undefined, true);
        this.changingPassword = true;
    }

    /**
     * Login the user.
     */
    login(): void {
        this.loginHelper.goToSiteInitialPage();
        this.changingPassword = false;
    }

    /**
     * Logout the user.
     */
    logout(): void {
        this.sitesProvider.logout();
        this.changingPassword = false;
    }
}
