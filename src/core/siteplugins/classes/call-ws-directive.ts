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

import { Input, OnInit, OnDestroy, ElementRef, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitePluginsProvider } from '../providers/siteplugins';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { Subscription } from 'rxjs';

/**
 * Base class for directives that need to call a WS.
 */
export class CoreSitePluginsCallWSBaseDirective implements OnInit, OnDestroy {
    @Input() name: string; // The name of the WS to call.
    @Input() params: any; // The params for the WS call.
    @Input() preSets: any; // The preSets for the WS call.
    @Input() useOtherDataForWS: any[]; // Whether to include other data in the params for the WS.
                                       // @see CoreSitePluginsProvider.loadOtherDataInArgs.
    @Input() form: string; // ID or name to identify a form. The form will be obtained from document.forms.
                           // If supplied and form is found, the form data will be retrieved and sent to the WS.
    @Output() onSuccess: EventEmitter<any> = new EventEmitter<any>(); // Sends the result when the WS call succeeds.
    @Output() onError: EventEmitter<any> = new EventEmitter<any>(); // Sends the error when the WS call fails.
    @Output() onDone: EventEmitter<void> = new EventEmitter<void>(); // Notifies when the WS call is done (either success or fail).

    protected element: HTMLElement;
    protected invalidateObserver: Subscription;

    constructor(element: ElementRef, protected translate: TranslateService, protected domUtils: CoreDomUtilsProvider,
            protected sitePluginsProvider: CoreSitePluginsProvider,
            protected parentContent: CoreSitePluginsPluginContentComponent) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
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
        const params = this.getParamsForWS();

        return this.sitePluginsProvider.callWS(this.name, params, this.preSets).then((result) => {
            this.onSuccess.emit(result);

            return this.wsCallSuccess(result);
        }).catch((error) => {
            this.onError.emit(error);

            return Promise.reject(error);
        }).finally(() => {
            this.onDone.emit();
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
            params = this.sitePluginsProvider.loadOtherDataInArgs(params, this.parentContent.otherData, this.useOtherDataForWS);
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

        return this.sitePluginsProvider.invalidateCallWS(this.name, params, this.preSets);
    }

    /**
     * Directive destroyed.
     */
    ngOnDestroy(): void {
        this.invalidateObserver && this.invalidateObserver.unsubscribe();
    }
}
