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

import { ElementRef } from '@angular/core';
import { CoreEventFormAction, CoreEvents } from '@singletons/events';

/**
 * Singleton with helper functions for Forms.
 */
export class CoreForms {

    private static formIds: Record<string, number> = {};

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Get the data from a form. It will only collect elements that have a name.
     *
     * @param form The form to get the data from.
     * @returns Object with the data. The keys are the names of the inputs.
     */
    static getDataFromForm(form: HTMLFormElement): CoreFormFields {
        if (!form || !form.elements) {
            return {};
        }

        const data: CoreFormFields = {};

        for (let i = 0; i < form.elements.length; i++) {
            const element = <HTMLInputElement> form.elements[i];
            const name = element.name || '';

            // Ignore submit inputs.
            if (!name || element.type === 'submit' || element.tagName === 'BUTTON') {
                continue;
            }

            // Get the value.
            if (element.type === 'checkbox') {
                data[name] = !!element.checked;
            } else if (element.type === 'radio') {
                if (element.checked) {
                    data[name] = element.value;
                }
            } else {
                data[name] = element.value;
            }
        }

        return data;
    }

    /**
     * Trigger form cancelled event.
     *
     * @param formRef Form element.
     * @param siteId The site affected. If not provided, no site affected.
     */
    static triggerFormCancelledEvent(formRef?: ElementRef | HTMLFormElement | undefined, siteId?: string): void {
        if (!formRef) {
            return;
        }

        CoreEvents.trigger(CoreEvents.FORM_ACTION, {
            action: CoreEventFormAction.CANCEL,
            form: formRef.nativeElement || formRef,
        }, siteId);
    }

    /**
     * Trigger form submitted event.
     *
     * @param formRef Form element.
     * @param online Whether the action was done in offline or not.
     * @param siteId The site affected. If not provided, no site affected.
     */
    static triggerFormSubmittedEvent(formRef?: ElementRef | HTMLFormElement | undefined, online?: boolean, siteId?: string): void {
        if (!formRef) {
            return;
        }

        CoreEvents.trigger(CoreEvents.FORM_ACTION, {
            action: CoreEventFormAction.SUBMIT,
            form: formRef.nativeElement || formRef,
            online: !!online,
        }, siteId);
    }

    /**
     * Generate a unique id for a form input using the given name.
     *
     * @param name Form input name.
     * @returns Unique id.
     */
    static uniqueId(name: string): string {
        const count = CoreForms.formIds[name] ?? 0;

        return `${name}-${CoreForms.formIds[name] = count + 1}`;
    }

}

export type CoreFormFields<T = unknown> = Record<string, T>;
