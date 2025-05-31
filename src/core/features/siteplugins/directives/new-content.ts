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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { Md5 } from 'ts-md5';

import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreNavigator } from '@services/navigator';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { CoreSitePlugins } from '../services/siteplugins';
import { CoreForms } from '@singletons/form';
import { toBoolean } from '@/core/transforms/boolean';
import { ContextLevel } from '@/core/constants';

/**
 * Directive to display a new site plugin content when clicked. This new content can be displayed in a new page or in the
 * current page (only if the current page is already displaying a site plugin content).
 *
 * Example usages:
 *
 * A button to go to a new content page:
 *
 * <ion-button core-site-plugins-new-content title="<% certificate.name %>" component="mod_certificate"
 *             method="mobile_issues_view" [args]="{cmid: <% cmid %>, courseid: <% courseid %>}">
 *     {{ 'plugin.mod_certificate_coursecertificate.viewissued' | translate }}
 * </ion-button>
 *
 * A button to load new content in current page using a param from otherdata:
 *
 * <ion-button core-site-plugins-new-content component="mod_certificate" method="mobile_issues_view"
 *         [args]="{cmid: <% cmid %>, courseid: <% courseid %>}" samePage="true" [useOtherData]="['userid']">
 *     {{ 'plugin.mod_certificate_coursecertificate.viewissued' | translate }}
 * </ion-button>
 */
@Directive({
    selector: '[core-site-plugins-new-content]',
    standalone: true,
})
export class CoreSitePluginsNewContentDirective implements OnInit {

    @Input() component?: string; // The component of the new content. If not provided, use the same component as current page.
    @Input() method?: string; // The method to get the new content. If not provided, use the same method as current page.
    @Input() args?: Record<string, unknown>; // The params to get the new content.
    @Input() title?: string; // The title to display with the new content. Only if samePage=false.
    @Input({ transform: toBoolean }) samePage = false; // Whether to display the content in same page or open a new one.
    @Input() useOtherData?: string[] | unknown; // Whether to include other data in the args.
    @Input() form?: string; // ID or name to identify a form. The form data will be retrieved and sent to the WS.
    // JS variables to pass to the new page so they can be used in the template or JS.
    // If true is supplied instead of an object, all initial variables from current page will be copied.
    @Input() jsData?: Record<string, unknown> | boolean;
    @Input() preSets?: CoreSiteWSPreSets; // The preSets for the WS call of the new content.
    @Input() contextLevel?: ContextLevel; // The context level to filter the title in new page. If not set, try to reuse current.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) ptrEnabled = true; // Whether PTR should be enabled in the new page.

    protected element: HTMLElement;

    constructor(
        element: ElementRef,
        @Optional() protected parentContent: CoreSitePluginsPluginContentComponent,
    ) {
        this.element = element.nativeElement || element;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();

            let args = this.args || {};

            if (this.parentContent) {
                args = CoreSitePlugins.loadOtherDataInArgs(this.args, this.parentContent.otherData, this.useOtherData);
            }

            if (this.form && document.forms[this.form]) {
                args = Object.assign(args, CoreForms.getDataFromForm(document.forms[this.form]));
            }

            let jsData = this.jsData || {};
            if (jsData === true) {
                jsData = this.parentContent?.data || {};
            }

            if (this.samePage) {
                // Update the parent content (if it exists).
                this.parentContent?.updateContent(args, this.component, this.method, jsData, this.preSets);
            } else {
                const component = this.component || this.parentContent?.component;
                const method = this.method || this.parentContent?.method;
                const hash = Md5.hashAsciiStr(JSON.stringify(args));

                CoreNavigator.navigateToSitePath(`siteplugins/content/${component}/${method}/${hash}`, {
                    params: {
                        title: this.title || this.parentContent?.pageTitle,
                        args,
                        initResult: this.parentContent?.initResult,
                        jsData,
                        preSets: this.preSets,
                        ptrEnabled: this.ptrEnabled,
                        contextLevel: this.contextLevel ?? this.parentContent?.contextLevel,
                        contextInstanceId: this.contextInstanceId ?? this.parentContent?.contextInstanceId,
                        courseId: this.courseId ?? this.parentContent?.courseId ?? args.courseid,
                        stylesPath: this.parentContent?.stylesPath,
                    },
                });
            }
        });
    }

}
