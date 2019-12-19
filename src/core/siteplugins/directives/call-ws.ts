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

import { Directive, Input, ElementRef, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '../providers/siteplugins';
import { CoreSitePluginsCallWSOnClickBaseDirective } from '../classes/call-ws-click-directive';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';

/**
 * Directive to call a WS when the element is clicked. The action to do when the WS call is successful depends on the input data:
 * display a message, go back or refresh current view.
 *
 * If you want to load a new content when the WS call is done, @see CoreSitePluginsCallWSNewContentDirective.
 *
 * @see CoreSitePluginsCallWSOnClickBaseDirective.
 *
 * Example usages:
 *
 * A button to send some data to the server without using cache, displaying default messages and refreshing on success:
 *
 * <button ion-button core-site-plugins-call-ws name="mod_certificate_view_certificate"
 *             [params]="{certificateid: <% certificate.id %>}" [preSets]="{getFromCache: 0, saveToCache: 0}" confirmMessage
 *             successMessage refreshOnSuccess="true">
 *     {{ 'plugin.mod_certificate_coursecertificate.senddata' | translate }}
 * </button>
 *
 * A button to send some data to the server using cache, without confirm, going back on success and using userid from otherdata:
 *
 * <button ion-button core-site-plugins-call-ws name="mod_certificate_view_certificate"
 *             [params]="{certificateid: <% certificate.id %>}" goBackOnSuccess="true" [useOtherData]="['userid']">
 *     {{ 'plugin.mod_certificate_coursecertificate.senddata' | translate }}
 * </button>
 */
@Directive({
    selector: '[core-site-plugins-call-ws]'
})
export class CoreSitePluginsCallWSDirective extends CoreSitePluginsCallWSOnClickBaseDirective {
    @Input() successMessage: string; // Message to show on success. If not supplied, no message. If empty, default message.
    @Input() goBackOnSuccess: boolean | string; // Whether to go back if the WS call is successful.
    @Input() refreshOnSuccess: boolean | string; // Whether to refresh the current view if the WS call is successful.

    constructor(element: ElementRef, translate: TranslateService, domUtils: CoreDomUtilsProvider,
            sitePluginsProvider: CoreSitePluginsProvider, @Optional() parentContent: CoreSitePluginsPluginContentComponent,
            utils: CoreUtilsProvider, protected navCtrl: NavController) {
        super(element, translate, domUtils, sitePluginsProvider, parentContent, utils);
    }

    /**
     * Function called when the WS call is successful.
     *
     * @param result Result of the WS call.
     */
    protected wsCallSuccess(result: any): void {
        if (typeof this.successMessage != 'undefined') {
            // Display the success message.
            this.domUtils.showToast(this.successMessage || this.translate.instant('core.success'));
        }

        if (this.utils.isTrueOrOne(this.goBackOnSuccess)) {
            this.navCtrl.pop();
        } else if (this.utils.isTrueOrOne(this.refreshOnSuccess) && this.parentContent) {
            this.parentContent.refreshContent(true);
        }
    }
}
