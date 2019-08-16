
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

import { Injectable, Injector } from '@angular/core';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { AddonQtypeDescriptionComponent } from '../component/description';

/**
 * Handler to support description question type.
 */
@Injectable()
export class AddonQtypeDescriptionHandler implements CoreQuestionHandler {
    name = 'AddonQtypeDescription';
    type = 'qtype_description';

    constructor() {
        // Nothing to do.
    }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param {any} question The question.
     * @param {string} behaviour The default behaviour.
     * @return {string} The behaviour to use.
     */
    getBehaviour(question: any, behaviour: string): string {
        return 'informationitem';
    }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        return AddonQtypeDescriptionComponent;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param {any} question The question.
     * @param {string} offlineSequenceCheck Sequence check stored in offline.
     * @return {boolean} Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: any, offlineSequenceCheck: string): boolean {
        // Descriptions don't have any answer so we'll always treat them as valid.
        return true;
    }
}
