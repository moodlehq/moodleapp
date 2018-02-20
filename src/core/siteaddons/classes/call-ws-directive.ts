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

import { Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreSiteAddonsProvider } from '../providers/siteaddons';
import { CoreSiteAddonsAddonContentComponent } from '../components/addon-content/addon-content';
import { Subscription } from 'rxjs';

/**
 * Base class for directives to call a WS when the element is clicked.
 *
 * The directives that inherit from this class will call a WS method when the element is clicked.
 */
export class CoreSiteAddonsCallWSBaseDirective implements OnInit, OnDestroy {
    @Input() name: string; // The name of the WS to call.
    @Input() params: any; // The params for the WS call.
    @Input() preSets: any; // The preSets for the WS call.
    @Input() confirmMessage: string; // Message to confirm the action. If not supplied, no confirmation. If empty, default message.
    @Input() useOtherDataForWS: any[]; // Whether to include other data in the params for the WS.
                                       // @see CoreSiteAddonsProvider.loadOtherDataInArgs.
    @Input() form: string; // ID or name to identify a form. The form will be obtained from document.forms.
                           // If supplied and form is found, the form data will be retrieved and sent to the WS.

    protected element: HTMLElement;
    protected invalidateObserver: Subscription;

    constructor(element: ElementRef, protected translate: TranslateService, protected domUtils: CoreDomUtilsProvider,
            protected siteAddonsProvider: CoreSiteAddonsProvider, protected parentContent: CoreSiteAddonsAddonContentComponent) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();

            if (typeof this.confirmMessage != 'undefined') {
                // Ask for confirm.
                this.domUtils.showConfirm(this.confirmMessage || this.translate.instant('core.areyousure')).then(() => {
                    this.callWS();
                }).catch(() => {
                    // User cancelled, ignore.
                });
            } else {
                this.callWS();
            }
        });

        if (this.parentContent && this.parentContent.invalidateObservable) {
            this.invalidateObserver = this.parentContent.invalidateObservable.subscribe(() => {
                this.invalidate();
            });
        }
    }

    /**
     * Call a WS.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected callWS(): Promise<any> {
        const modal = this.domUtils.showModalLoading(),
            params = this.getParamsForWS();

        return this.siteAddonsProvider.callWS(this.name, params, this.preSets).then((result) => {
            return this.wsCallSuccess(result);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.serverconnection', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Get the params for the WS call.
     *
     * @return {any} Params.
     */
    protected getParamsForWS(): any {
        let params = this.params || {};

        if (this.parentContent) {
            params = this.siteAddonsProvider.loadOtherDataInArgs(params, this.parentContent.otherData, this.useOtherDataForWS);
        }

        if (this.form && document.forms[this.form]) {
            params = Object.assign(params, this.domUtils.getDataFromForm(document.forms[this.form]));
        }

        return params;
    }

    /**
     * Function called when the WS call is successful.
     *
     * @param {any} result Result of the WS call.
     */
    protected wsCallSuccess(result: any): void {
        // Function to be overridden.
    }

    /**
     * Invalidate the WS call.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidate(): Promise<any> {
        const params = this.getParamsForWS();

        return this.siteAddonsProvider.invalidateCallWS(this.name, params, this.preSets);
    }

    /**
     * Directive destroyed.
     */
    ngOnDestroy(): void {
        this.invalidateObserver && this.invalidateObserver.unsubscribe();
    }
}
