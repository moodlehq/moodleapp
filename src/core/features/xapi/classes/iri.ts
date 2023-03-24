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

import { CoreSites } from '@services/sites';
import { CorePath } from '@singletons/path';

/**
 * xAPI IRI values generator.
 */
export class CoreXAPIIRI {

    /**
     * Generate a valid IRI element from a value and an optional type.
     *
     * @param value Value.
     * @param type Type (e.g. 'activity'). Defaults to 'element'.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    static async generate(value: string|number, type = 'element', siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        return CorePath.concatenatePaths(site.getURL(), `xapi/${type}/${value}`);
    }

    /**
     * Try to extract the original value from an IRI.
     *
     * @param iri IRI.
     * @param type Type (e.g. 'activity'). Defaults to 'element'.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    static async extract(iri: string, type = 'element', siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const baseUrl = CorePath.concatenatePaths(site.getURL(), `xapi/${type}/`);

        return iri.replace(baseUrl, '');
    }

}
