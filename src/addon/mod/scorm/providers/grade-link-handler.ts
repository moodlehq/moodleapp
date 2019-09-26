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
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksModuleGradeHandler } from '@core/contentlinks/classes/module-grade-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * Handler to treat links to SCORM grade.
 */
@Injectable()
export class AddonModScormGradeLinkHandler extends CoreContentLinksModuleGradeHandler {
    name = 'AddonModScormGradeLinkHandler';
    canReview = false;

    constructor(courseHelper: CoreCourseHelperProvider, domUtils: CoreDomUtilsProvider, sitesProvider: CoreSitesProvider) {
        super(courseHelper, domUtils, sitesProvider, 'AddonModScorm', 'scorm');
    }
}
