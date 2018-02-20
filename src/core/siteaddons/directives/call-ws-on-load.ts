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
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreSiteAddonsProvider } from '../providers/siteaddons';
import { CoreSiteAddonsCallWSBaseDirective } from '../classes/call-ws-directive';
import { CoreSiteAddonsAddonContentComponent } from '../components/addon-content/addon-content';

/**
 * Directive to call a WS as soon as its loaded.
 * This directive is meant for actions to do in the background, like calling logging WebServices.
 *
 * If you want to call a WS when the user clicks on a certain element, @see CoreSiteAddonsCallWSDirective.
 *
 * @see CoreSiteAddonsCallWSBaseDirective.
 *
 * Example usage:
 *
 * <span core-site-addons-call-ws-on-load name="mod_certificate_view_certificate" [params]="{certificateid: <% certificate.id %>}"
 *     [preSets]="{getFromCache: 0, saveToCache: 0}"></span>
 */
@Directive({
    selector: '[core-site-addons-call-ws-on-load]'
})
export class CoreSiteAddonsCallWSOnLoadDirective extends CoreSiteAddonsCallWSBaseDirective implements OnInit {

    constructor(element: ElementRef, translate: TranslateService, domUtils: CoreDomUtilsProvider,
            siteAddonsProvider: CoreSiteAddonsProvider, @Optional() parentContent: CoreSiteAddonsAddonContentComponent) {
        super(element, translate, domUtils, siteAddonsProvider, parentContent);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        // Call the WS immediately.
        this.callWS().catch(() => {
            // Ignore errors.
        });
    }
}
