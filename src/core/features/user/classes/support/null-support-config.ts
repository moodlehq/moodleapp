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

import { CoreUserSupportConfig } from './support-config';

/**
 * Null representation for a support config object.
 *
 * This class can be used in place of a functional support config when it's hasn't been possible
 * to obtain any site configuration to extract information about support.
 */
export class CoreUserNullSupportConfig extends CoreUserSupportConfig {

    /**
     * @inheritdoc
     */
    canContactSupport(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    getSupportPageLang(): string | null {
        return null;
    }

    /**
     * @inheritdoc
     */
    protected buildSupportPageUrl(): string {
        throw new Error('Can\'t build a support page url from a null config');
    }

}
