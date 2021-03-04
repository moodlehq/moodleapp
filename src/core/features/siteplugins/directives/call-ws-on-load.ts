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

import { Directive, OnInit, ElementRef, Optional } from '@angular/core';

import { CoreSitePluginsCallWSBaseDirective } from '../classes/call-ws-directive';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';

/**
 * Directive to call a WS as soon as its loaded.
 * This directive is meant for actions to do in the background, like calling logging WebServices.
 *
 * If you want to call a WS when the user clicks on a certain element, @see CoreSitePluginsCallWSDirective.
 *
 * @see CoreSitePluginsCallWSBaseDirective.
 *
 * Example usage:
 *
 * <span core-site-plugins-call-ws-on-load name="mod_certificate_view_certificate" [params]="{certificateid: <% certificate.id %>}"
 *     [preSets]="{getFromCache: 0, saveToCache: 0}"></span>
 */
@Directive({
    selector: '[core-site-plugins-call-ws-on-load]',
})
export class CoreSitePluginsCallWSOnLoadDirective extends CoreSitePluginsCallWSBaseDirective implements OnInit {

    constructor(
        element: ElementRef,
        @Optional() parentContent: CoreSitePluginsPluginContentComponent,
    ) {
        super(element, parentContent);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        super.ngOnInit();

        // Call the WS immediately.
        this.callWS().catch(() => {
            // Ignore errors.
        });
    }

}
