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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { Md5 } from 'ts-md5';

import { CoreSitePluginsCallWSOnClickBaseDirective } from '../classes/call-ws-click-directive';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { CoreSitePlugins } from '../services/siteplugins';

/**
 * Directive to call a WS when the element is clicked and load a new content passing the WS result as args. This new content
 * can be displayed in a new page or in the same page (only if current page is already displaying a site plugin content).
 *
 * If you don't need to load some new content when done, @see CoreSitePluginsCallWSDirective.
 *
 * @see CoreSitePluginsCallWSOnClickBaseDirective.
 *
 * Example usages:
 *
 * A button to get some data from the server without using cache, showing default confirm and displaying a new page:
 *
 * <ion-button core-site-plugins-call-ws-new-content name="mod_certificate_get_issued_certificates"
 *             [params]="{certificateid: <% certificate.id %>}" [preSets]="{getFromCache: 0, saveToCache: 0}" confirmMessage
 *             title="<% certificate.name %>" component="mod_certificate" method="mobile_issues_view"
 *             [args]="{cmid: <% cmid %>, courseid: <% courseid %>}">
 *     {{ 'plugin.mod_certificate_coursecertificate.getissued' | translate }}
 * </ion-button>
 *
 * A button to get some data from the server using cache, without confirm, displaying new content in same page and using
 * userid from otherdata:
 *
 * <ion-button core-site-plugins-call-ws-new-content name="mod_certificate_get_issued_certificates"
 *             [params]="{certificateid: <% certificate.id %>}" component="mod_certificate" method="mobile_issues_view"
 *             [args]="{cmid: <% cmid %>, courseid: <% courseid %>}" samePage="true" [useOtherData]="['userid']">
 *     {{ 'plugin.mod_certificate_coursecertificate.getissued' | translate }}
 * </ion-button>
 */
@Directive({
    selector: '[core-site-plugins-call-ws-new-content]',
})
export class CoreSitePluginsCallWSNewContentDirective extends CoreSitePluginsCallWSOnClickBaseDirective {

    @Input() component?: string; // The component of the new content. If not provided, use the same component as current page.
    @Input() method?: string; // The method to get the new content. If not provided, use the same method as current page.
    @Input() args?: Record<string, unknown>; // The params to get the new content.
    @Input() title?: string; // The title to display with the new content. Only if samePage=false.
    @Input() samePage?: boolean | string; // Whether to display the content in same page or open a new one. Defaults to new page.
    @Input() useOtherData?: string[] | unknown; // Whether to include other data in the args.
    @Input() form?: string; // ID or name to identify a form. The form data will be retrieved and sent to the WS.
    // JS variables to pass to the new page so they can be used in the template or JS.
    // If true is supplied instead of an object, all initial variables from current page will be copied.
    @Input() jsData?: Record<string, unknown> | boolean;
    @Input() newContentPreSets?: CoreSiteWSPreSets; // The preSets for the WS call of the new content.
    @Input() ptrEnabled?: boolean | string; // Whether PTR should be enabled in the new page. Defaults to true.

    constructor(
        element: ElementRef,
        @Optional() parentContent: CoreSitePluginsPluginContentComponent,
    ) {
        super(element, parentContent);
    }

    /**
     * @inheritdoc
     */
    protected wsCallSuccess(result: unknown): void {
        let args = this.args || {};

        if (this.parentContent) {
            args = CoreSitePlugins.loadOtherDataInArgs(this.args, this.parentContent.otherData, this.useOtherData);
        }

        // Add the properties from the WS call result to the args.
        args = Object.assign(args, result);

        let jsData = this.jsData || {};
        if (jsData === true) {
            jsData = this.parentContent?.data || {};
        }

        if (CoreUtils.isTrueOrOne(this.samePage)) {
            // Update the parent content (if it exists).
            this.parentContent?.updateContent(args, this.component, this.method, jsData, this.newContentPreSets);
        } else {
            const component = this.component || this.parentContent?.component;
            const method = this.method || this.parentContent?.method;
            const hash = <string> Md5.hashAsciiStr(JSON.stringify(args));

            CoreNavigator.navigateToSitePath(`siteplugins/content/${component}/${method}/${hash}`, {
                params: {
                    title: this.title || this.parentContent?.pageTitle,
                    args,
                    initResult: this.parentContent?.initResult,
                    jsData,
                    preSets: this.newContentPreSets,
                    ptrEnabled: this.ptrEnabled,
                },
            });
        }
    }

}
