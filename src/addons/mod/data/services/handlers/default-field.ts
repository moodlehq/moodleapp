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

import { Injectable } from '@angular/core';
import { CoreFileEntry } from '@services/file-helper';
import { AddonModDataEntryField, AddonModDataSearchEntriesAdvancedFieldFormatted, AddonModDataSubfieldData } from '../data';
import { AddonModDataFieldHandler } from '../data-fields-delegate';

/**
 * Default handler used when a field plugin doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class AddonModDataDefaultFieldHandler implements AddonModDataFieldHandler {

    name = 'AddonModDataDefaultFieldHandler';
    type = 'default';

    /**
     * @inheritdoc
     */
    getFieldSearchData(): AddonModDataSearchEntriesAdvancedFieldFormatted[] {
        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldEditData(): AddonModDataSubfieldData[] {
        return [];
    }

    /**
     * @inheritdoc
     */
    hasFieldDataChanged(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    getFieldEditFiles(): CoreFileEntry[] {
        return [];
    }

    /**
     * @inheritdoc
     */
    getFieldsNotifications(): undefined {
        return;
    }

    /**
     * @inheritdoc
     */
    overrideData(originalContent: AddonModDataEntryField): AddonModDataEntryField {
        return originalContent;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
