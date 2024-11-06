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

import { Injectable, Type } from '@angular/core';

import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { makeSingleton } from '@singletons';

/**
 * Handler to support description question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDescriptionHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeDescription';
    type = 'qtype_description';

    /**
     * @inheritdoc
     */
    getBehaviour(): string {
        return 'informationitem';
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeDescriptionComponent } = await import('../../component/description');

        return AddonQtypeDescriptionComponent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    validateSequenceCheck(): boolean {
        // Descriptions don't have any answer so we'll always treat them as valid.
        return true;
    }

}

export const AddonQtypeDescriptionHandler = makeSingleton(AddonQtypeDescriptionHandlerService);
