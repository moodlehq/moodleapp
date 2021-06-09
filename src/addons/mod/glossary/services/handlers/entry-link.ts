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
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModGlossary } from '../glossary';
import { AddonModGlossaryModuleHandlerService } from './module';

/**
 * Handler to treat links to glossary entries.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryEntryLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModGlossaryEntryLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModGlossary';
    pattern = /\/mod\/glossary\/(showentry|view)\.php.*([&?](eid|g|mode|hook)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string) => {
                const modal = await CoreDomUtils.showModalLoading();

                try {
                    const entryId = params.mode == 'entry' ? Number(params.hook) : Number(params.eid);

                    const response = await AddonModGlossary.getEntry(entryId, { siteId });

                    const module = await CoreCourse.getModuleBasicInfoByInstance(
                        response.entry.glossaryid,
                        'glossary',
                        siteId,
                    );

                    await CoreNavigator.navigateToSitePath(
                        AddonModGlossaryModuleHandlerService.PAGE_NAME + `/entry/${entryId}`,
                        {
                            params: {
                                courseId: module.course,
                                cmId: module.id,
                            },
                            siteId,
                        },
                    );
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'addon.mod_glossary.errorloadingentry', true);
                } finally {
                    modal.dismiss();
                }
            },
        }];
    }

}

export const AddonModGlossaryEntryLinkHandler = makeSingleton(AddonModGlossaryEntryLinkHandlerService);
