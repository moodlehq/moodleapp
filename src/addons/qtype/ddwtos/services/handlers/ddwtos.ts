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

import { AddonQtypeGapSelectHandlerService } from '@addons/qtype/gapselect/services/handlers/gapselect';
import { Injectable, Type } from '@angular/core';

import { makeSingleton } from '@singletons';

/**
 * Handler to support drag-and-drop words into sentences question type.
 * This question type is a variation of gapselect.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDdwtosHandlerService extends AddonQtypeGapSelectHandlerService {

    name = 'AddonQtypeDdwtos';
    type = 'qtype_ddwtos';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeDdwtosComponent } = await import('../../component/ddwtos');

        return AddonQtypeDdwtosComponent;
    }

}

export const AddonQtypeDdwtosHandler = makeSingleton(AddonQtypeDdwtosHandlerService);
