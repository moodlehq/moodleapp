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

import { Input, OnInit, ElementRef, Directive } from '@angular/core';

import { CoreErrorHelper } from '@services/error-helper';
import { Translate } from '@singletons';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { CoreSitePluginsCallWSBaseDirective } from './call-ws-directive';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Base class for directives to call a WS when the element is clicked.
 *
 * The directives that inherit from this class will call a WS method when the element is clicked.
 */
@Directive()
export class CoreSitePluginsCallWSOnClickBaseDirective extends CoreSitePluginsCallWSBaseDirective implements OnInit {

    @Input() confirmMessage?: string; // Message to confirm the action. If not supplied, no confirmation. If empty, default message.
    @Input({ transform: toBoolean }) showError = true; // Whether to show an error message if the WS call fails.

    constructor(
        element: ElementRef,
        parentContent: CoreSitePluginsPluginContentComponent | null,
    ) {
        super(element, parentContent);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.element.addEventListener('click', async (ev: Event) => {
            ev.preventDefault();
            ev.stopPropagation();

            if (this.confirmMessage !== undefined) {
                // Ask for confirm.
                try {
                    await CoreAlerts.confirm(this.confirmMessage || Translate.instant('core.areyousure'));
                } catch {
                    // User cancelled, stop.
                    return;
                }
            }

            this.callWS();
        });
    }

    /**
     * @inheritdoc
     */
    protected async callWS(): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            await super.callWS();
        } catch (error) {
            if (this.showError) {
                CoreAlerts.showError(error, {
                    default: Translate.instant('core.serverconnection', {
                        details: CoreErrorHelper.getErrorMessageFromError(error) ?? 'Unknown error',
                    }),
                });
            }
        } finally {
            modal.dismiss();
        }
    }

}
