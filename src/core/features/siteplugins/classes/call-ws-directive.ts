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

import { Input, OnInit, OnDestroy, ElementRef, Output, EventEmitter, Directive } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSitePluginsPluginContentComponent } from '../components/plugin-content/plugin-content';
import { CoreSitePlugins } from '../services/siteplugins';
import { CoreLogger } from '@singletons/logger';
import { CoreFormFields, CoreForms } from '@singletons/form';

/**
 * Base class for directives that need to call a WS.
 */
@Directive()
export class CoreSitePluginsCallWSBaseDirective implements OnInit, OnDestroy {

    @Input({ required: true }) name!: string; // The name of the WS to call.
    @Input() params?: Record<string, unknown>; // The params for the WS call.
    @Input() preSets?: CoreSiteWSPreSets; // The preSets for the WS call.
    @Input() useOtherDataForWS?: string[] | unknown; // Whether to include other data in the params for the WS.
    @Input() form?: string; // ID or name to identify a form. The form data will be retrieved and sent to the WS.
    @Output() onSuccess = new EventEmitter<unknown>(); // Sends the result when the WS call succeeds.
    @Output() onError = new EventEmitter<unknown>(); // Sends the error when the WS call fails.
    @Output() onDone = new EventEmitter<void>(); // Notifies when the WS call is done (either success or fail).

    protected logger: CoreLogger;
    protected element: HTMLElement;
    protected invalidateObserver?: Subscription;

    constructor(
        element: ElementRef,
        protected parentContent: CoreSitePluginsPluginContentComponent | null,
    ) {
        this.element = element.nativeElement || element;
        this.logger = CoreLogger.getInstance('CoreSitePluginsCallWS');
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.parentContent?.invalidateObservable) {
            return;
        }

        this.invalidateObserver = this.parentContent.invalidateObservable.subscribe(() => {
            this.invalidate();
        });
    }

    /**
     * Call a WS.
     *
     * @returns Promise resolved when done.
     */
    protected async callWS(): Promise<void> {
        try {
            const params = this.getParamsForWS();

            const result = await CoreSitePlugins.callWS(this.name, params, this.preSets);

            this.onSuccess.emit(result);

            // Don't block the promise with the success function.
            this.wsCallSuccess(result);
        } catch (error) {
            this.onError.emit(error);
            this.logger.error(`Error calling WS ${this.name}`, error);

            throw error;
        } finally {
            this.onDone.emit();
        }
    }

    /**
     * Get the params for the WS call.
     *
     * @returns Params.
     */
    protected getParamsForWS(): CoreFormFields {
        let params = this.params || {};

        if (this.parentContent) {
            params = CoreSitePlugins.loadOtherDataInArgs(params, this.parentContent.otherData, this.useOtherDataForWS);
        }

        if (this.form && document.forms[this.form]) {
            params = Object.assign(params, CoreForms.getDataFromForm(document.forms[this.form]));
        }

        return params;
    }

    /**
     * Function called when the WS call is successful.
     *
     * @param result Result of the WS call.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected wsCallSuccess(result: unknown): void | Promise<void> {
        // Function to be overridden.
    }

    /**
     * Invalidate the WS call.
     *
     * @returns Promise resolved when done.
     */
    invalidate(): Promise<void> {
        const params = this.getParamsForWS();

        return CoreSitePlugins.invalidateCallWS(this.name, params, this.preSets);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.invalidateObserver?.unsubscribe();
    }

}
