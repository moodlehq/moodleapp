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

import { Component, OnInit, signal } from '@angular/core';

import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { ModFeature, ModArchetype } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreObject } from '@singletons/object';

/**
 * Page that displays an overview of all activities in a course.
 */
@Component({
    selector: 'page-core-course-overview',
    templateUrl: 'overview.html',
    styleUrl: 'overview.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreCourseOverviewPage implements OnInit {

    loaded = signal(false);
    modTypes = signal<OverviewModType[]>([]);

    protected courseId!: number;
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(CoreCourse.logViewOverview(this.courseId));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_courseformat_view_overview_information',
                name: Translate.instant('core.activities'),
                url: `/course/overview.php?id=${this.courseId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteParam('courseId');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        try {
            await this.loadModTypes();
        } finally {
            this.loaded.set(true);
        }
    }

    /**
     * Load mod types used in the course.
     */
    protected async loadModTypes(): Promise<void> {
        try {
            const sections = await CoreCourse.getSections(this.courseId, false, true);

            const archetypes: Record<string, number> = {};
            const modIcons: Record<string, string> = {};
            let modFullNames: Record<string, string> = {};
            const brandedIcons: Record<string, boolean|undefined> = {};

            const modules = CoreCourse.getSectionsModules(sections, {
                ignoreSection: section => !CoreCourseHelper.canUserViewSection(section),
                ignoreModule: mod => !CoreCourseHelper.canUserViewModule(mod) || !CoreCourseModuleHelper.moduleHasView(mod),
            });

            modules.forEach((mod) => {
                if (archetypes[mod.modname] !== undefined) {
                    return;
                }

                // Get the archetype of the module type.
                archetypes[mod.modname] = CoreCourseModuleDelegate.supportsFeature<number>(
                    mod.modname,
                    ModFeature.MOD_ARCHETYPE,
                    ModArchetype.OTHER,
                );

                // Get the full name of the module type.
                if (archetypes[mod.modname] === ModArchetype.RESOURCE) {
                    // All resources are gathered in a single "Resources" option.
                    if (!modFullNames['resources']) {
                        modFullNames['resources'] = Translate.instant('core.resources');
                    }
                } else {
                    modFullNames[mod.modname] = mod.modplural;
                }

                brandedIcons[mod.modname] = mod.branded;

                // If this is not a theme image, leave it undefined to avoid having specific activity icons.
                if (CoreUrl.isThemeImageUrl(mod.modicon)) {
                    modIcons[mod.modname] = mod.modicon;
                }
            });

            // Sort the modnames alphabetically.
            modFullNames = CoreObject.sortValues(modFullNames);

            const modTypes = await Promise.all(Object.keys(modFullNames).map(async (modName): Promise<OverviewModType> => {
                const iconModName = modName === 'resources' ? 'page' : modName;

                const icon = await CoreCourseModuleDelegate.getModuleIconSrc(iconModName, modIcons[iconModName]);

                return {
                    icon,
                    iconModName,
                    name: modFullNames[modName],
                    modName,
                    branded: brandedIcons[iconModName],
                };
            }));

            this.modTypes.set(modTypes);

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting activities.' });
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refreshData(refresher: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreCourse.invalidateSections(this.courseId));

        try {
            await this.loadModTypes();
        } finally {
            refresher.complete();
        }
    }

}

type OverviewModType = {
    icon: string;
    name: string;
    modName: string;
    iconModName: string;
    branded?: boolean;
};
