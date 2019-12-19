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
import { CoreContentLinksModuleIndexHandler } from '@core/contentlinks/classes/module-index-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModGlossaryProvider } from './glossary';

/**
 * Handler to treat links to glossary index.
 */
@Injectable()
export class AddonModGlossaryIndexLinkHandler extends CoreContentLinksModuleIndexHandler {
    name = 'AddonModGlossaryIndexLinkHandler';

    constructor(courseHelper: CoreCourseHelperProvider, protected glossaryProvider: AddonModGlossaryProvider) {
        super(courseHelper, 'AddonModGlossary', 'glossary', 'g');
    }
}
