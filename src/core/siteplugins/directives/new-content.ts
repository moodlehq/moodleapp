// (C) Copyright 2015 Martin Dougiamas
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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from '../providers/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';

/**
 * Directive to display a new site plugin content when clicked. This new content can be displayed in a new page or in the
 * current page (only if the current page is already displaying a site plugin content).
 *
 * Example usages:
 *
 * A button to go to a new content page:
 *
 * <button ion-button core-site-plugins-new-content title="<% certificate.name %>" component="mod_certificate"
 *             method="mobile_issues_view" [args]="{cmid: <% cmid %>, courseid: <% courseid %>}">
 *     {{ 'plugin.mod_certificate_coursecertificate.viewissued' | translate }}
 * </button>
 *
 * A button to load new content in current page using a param from otherdata:
 *
 * <button ion-button core-site-plugins-new-content component="mod_certificate" method="mobile_issues_view"
 *         [args]="{cmid: <% cmid %>, courseid: <% courseid %>}" samePage="true" [useOtherData]="['userid']">
 *     {{ 'plugin.mod_certificate_coursecertificate.viewissued' | translate }}
 * </button>
 */
@Directive({
    selector: '[core-site-plugins-new-content]'
})
export class CoreSitePluginsNewContentDirective implements OnInit {
    @Input() component: string; // The component of the new content. If not provided, use the same component as current page.
    @Input() method: string; // The method to get the new content. If not provided, use the same method as current page.
    @Input() args: any; // The params to get the new content.
    @Input() title: string; // The title to display with the new content. Only if samePage=false.
    @Input() samePage: boolean | string; // Whether to display the content in same page or open a new one. Defaults to new page.
    @Input() useOtherData: any[]; // Whether to include other data in the args. @see CoreSitePluginsProvider.loadOtherDataInArgs.
    @Input() form: string; // ID or name to identify a form. The form will be obtained from document.forms.
                           // If supplied and form is found, the form data will be retrieved and sent to the new content.
    @Input() jsData: any; // JS variables to pass to the new page so they can be used in the template or JS.
                          // If true is supplied instead of an object, all initial variables from current page will be copied.
    @Input() preSets: any; // The preSets for the WS call of the new content.

    protected element: HTMLElement;

    constructor(element: ElementRef, protected utils: CoreUtilsProvider, @Optional() protected navCtrl: NavController,
            @Optional() protected parentContent: CoreSitePluginsPluginContentComponent, protected domUtils: CoreDomUtilsProvider,
            protected sitePluginsProvider: CoreSitePluginsProvider) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();

            let args = this.args || {};

            if (this.parentContent) {
                args = this.sitePluginsProvider.loadOtherDataInArgs(this.args, this.parentContent.otherData, this.useOtherData);
            }

            if (this.form && document.forms[this.form]) {
                args = Object.assign(args, this.domUtils.getDataFromForm(document.forms[this.form]));
            }

            if (this.utils.isTrueOrOne(this.samePage)) {
                // Update the parent content (if it exists).
                if (this.parentContent) {
                    this.parentContent.updateContent(args, this.component, this.method, this.jsData);
                }
            } else {
                let jsData = this.jsData;
                if (jsData === true) {
                    jsData = this.parentContent && this.parentContent.data || {};
                }

                this.navCtrl.push('CoreSitePluginsPluginPage', {
                    title: this.title,
                    component: this.component || (this.parentContent && this.parentContent.component),
                    method: this.method || (this.parentContent && this.parentContent.method),
                    args: args,
                    initResult: this.parentContent && this.parentContent.initResult,
                    jsData: jsData,
                    preSets: this.preSets
                });
            }
        });
    }
}
