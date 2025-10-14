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

import { Component, OnInit, signal, Type, viewChild, WritableSignal } from '@angular/core';

import {
    CoreCourseOverview,
    CoreCourseGetOverviewInformationWSHeader,
    CoreCourseOverviewInformation,
    CoreCourseOverviewActivity,
    CoreCourseOverviewItem,
} from '@features/course/services/course-overview';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { ModFeature, ModArchetype, ModPurpose } from '@addons/mod/constants';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreObject } from '@singletons/object';
import { IonAccordionGroup } from '@ionic/angular';
import { CoreCourse } from '@features/course/services/course';
import { toSignal } from '@angular/core/rxjs-interop';
import { CoreScreen } from '@services/screen';
import { map } from 'rxjs';
import { CoreCourseOverviewContentType } from '@features/course/constants';

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

    readonly loaded = signal(false);
    readonly modTypes = signal<OverviewModType[]>([]);

    readonly accordionGroup = viewChild<IonAccordionGroup>('modTypesAccordion');

    readonly isTablet = toSignal(CoreScreen.layoutObservable.pipe(map(() => CoreScreen.isTablet)), { requireSync: true });
    protected courseId!: number;
    protected logView: () => void;

    protected static readonly RESOURCES_NAME = 'resource';

    constructor() {
        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(CoreCourseOverview.logView(this.courseId));

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
            const purposes: Record<string, ModPurpose | undefined> = {};

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
                    if (!modFullNames[CoreCourseOverviewPage.RESOURCES_NAME]) {
                        modFullNames[CoreCourseOverviewPage.RESOURCES_NAME] = Translate.instant('core.resources');
                    }
                } else {
                    modFullNames[mod.modname] = mod.modplural;
                }

                brandedIcons[mod.modname] = mod.branded;
                purposes[mod.modname] = mod.purpose;

                // If this is not a theme image, leave it undefined to avoid having specific activity icons.
                if (CoreUrl.isThemeImageUrl(mod.modicon)) {
                    modIcons[mod.modname] = mod.modicon;
                }
            });

            // Sort the modnames alphabetically.
            modFullNames = CoreObject.sortValues(modFullNames);

            const modTypes = await Promise.all(Object.keys(modFullNames).map(async (modName): Promise<OverviewModType> => {
                const iconModName = modName === CoreCourseOverviewPage.RESOURCES_NAME ? 'page' : modName;

                const icon = await CoreCourseModuleDelegate.getModuleIconSrc(iconModName, modIcons[iconModName]);

                return {
                    icon,
                    iconModName,
                    name: modFullNames[modName],
                    modName,
                    modNameTranslated: modName === CoreCourseOverviewPage.RESOURCES_NAME ?
                        modFullNames[modName] : CoreCourseModuleHelper.translateModuleName(modName, modFullNames[modName]),
                    branded: brandedIcons[iconModName],
                    purpose: purposes[iconModName],
                    loaded: signal(false),
                    overview: signal<OverviewInformation | undefined>(undefined),
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
        await CorePromiseUtils.ignoreErrors(Promise.all([
            CoreCourse.invalidateSections(this.courseId),
            CoreCourseOverview.invalidateCourseOverviews(this.courseId),
        ]));

        // Collapse the accordion when refreshing.
        const accordionGroup = this.accordionGroup();
        if (accordionGroup) {
            accordionGroup.value = undefined;
        }

        try {
            await this.loadModTypes();
        } finally {
            refresher.complete();
        }
    }

    /**
     * An accordion has been expanded or collapsed.
     *
     * @param modName Mod name that was expanded, undefined if collapsed and none expanded.
     */
    modTypeAccordionChanged(modName?: string): void {
        const modType = modName && this.modTypes().find((modType) => modType.modName === modName);
        if (!modType) {
            return;
        }

        this.loadActivities(modType);
    }

    /**
     * Load activities for a specific mod type if needed.
     *
     * @param modType Type to load.
     */
    async loadActivities(modType: OverviewModType): Promise<void> {
        if (modType.loaded()) {
            // Already loaded, nothing to do.
            return;
        }

        try {
            const overview = await CoreCourseOverview.getInformation(this.courseId, modType.modName);

            const formattedOverview = await this.formatOverview(modType.modName, overview);

            modType.overview.set(formattedOverview);
            modType.loaded.set(true);

            CorePromiseUtils.ignoreErrors(CoreCourse.logViewModuleInstanceList(this.courseId, modType.modName));
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error getting activities.' });
        }
    }

    /**
     * Format the overview information to include data to render it.
     *
     * @param modName Module name the overview belongs to.
     * @param overview Overview to format.
     * @returns Formatted overview.
     */
    protected async formatOverview(modName: string, overview: CoreCourseOverviewInformation): Promise<OverviewInformation> {
        const keysToRemove = new Set<string>();
        let isSupportedInApp = true;

        const headers = overview.headers.map((header) => ({
            ...header,
            classes:[
                'ion-text-' + (header.align ?? 'start').trim(), // Convert alignment value to Ionic CSS class.
            ],
            hasContent: false,
        }));

        const activities = await Promise.all(overview.activities.map(async (activity) => {
            // Only render the items that have a header. The other items are probably empty so the header is not displayed.
            const itemsToRender = await Promise.all(headers.map(async (header) => {
                // Search by name along with key because in some cases the key can be empty (see MDL-86146).
                const item = activity.items.find(item => item.key === header.key || item.name === header.name);
                if (!item) {
                    // Item not found, render an empty item. It can happen that some activities don't return certain items.
                    return this.getEmptyOverviewItem(header.key, header.name, header.classes);
                }

                // Get the data to render the item.
                const content = await CoreCourseModuleDelegate.getOverviewItemContent(modName, item, activity, this.courseId);

                if (content === undefined) {
                    // The app doesn't know how to render the item, mark the mod type as not supported and render an empty item.
                    keysToRemove.add(header.key);
                    isSupportedInApp = false;

                    return this.getEmptyOverviewItem(header.key, header.name, header.classes);
                }

                if ('component' in content || content.content !== null) {
                    header.hasContent = true;
                }

                return {
                    ...item,
                    component: 'component' in content ? content.component : null,
                    componentData: ('componentData' in content ? content.componentData : undefined) ?? {
                        courseId: this.courseId,
                        activity,
                        item,
                    },
                    content: 'content' in content ? content.content : null,
                    classes: header.classes.concat(content.classes ?? []),
                };
            }));

            const nameItemToRender = itemsToRender.find(item => item.key === 'name') ??
                itemsToRender.find(item => item.contenttype === CoreCourseOverviewContentType.ACTIVITY_NAME);

            return {
                ...activity,
                nameItemToRender,
                itemsToRender,
                isExpanded: signal(false),
                hasItemsBesidesName: itemsToRender.some(item => item !== nameItemToRender),
            };
        }));

        // If the WebService returns a header it means that at least 1 activity has content for that item. However, the app could
        // return null content for a certain item in all activities to hide that item. Hide the items without content.
        headers.forEach((header) => {
            if (!header.hasContent) {
                keysToRemove.add(header.key);
            }
        });

        if (keysToRemove.size) {
            // Remove the unsupported columns for each activity.
            activities.forEach((activity) => {
                activity.itemsToRender = activity.itemsToRender.filter((item) => !keysToRemove.has(item.key ?? ''));
                activity.hasItemsBesidesName = activity.itemsToRender.some(item => item !== activity.nameItemToRender);
            });
        }

        return {
            ...overview,
            isSupportedInApp,
            headers: headers.filter(header => !keysToRemove.has(header.key)),
            activities,
        };
    }

    /**
     * Get an empty overview item.
     *
     * @param key Key of the item.
     * @param name Name of the item.
     * @param headerClasses Classes of the header.
     * @returns Empty overview item.
     */
    protected getEmptyOverviewItem(key: string, name: string, headerClasses: string[]): OverviewItemToRender {
        return {
            key,
            name,
            contenttype: 'basic',
            contentjson: '{"value":null,"datatype":"NULL"}',
            extrajson: '{}',
            parsedData: { value: null, datatype: 'NULL' },
            content: null,
            classes: headerClasses,
        };
    }

    /**
     * Helper function to cast to the proper type in the template.
     *
     * @param modType Variable to cast.
     * @returns Casted variable.
     */
    toModType(modType: OverviewModType): OverviewModType {
        return modType;
    }

    /**
     * Toggle the expansion of an activity.
     *
     * @param overview Overview the activity belongs to.
     * @param activity Activity to toggle.
     */
    toggleActivity(overview: OverviewInformation, activity: OverviewActivity): void {
        overview.activities.forEach((act) => {
            if (act.cmid === activity.cmid) {
                act.isExpanded.update(isExpanded => !isExpanded);
            } else {
                act.isExpanded.set(false);
            }
        });
    }

}

type OverviewModType = {
    icon: string;
    name: string;
    modName: string;
    iconModName: string;
    modNameTranslated: string;
    branded?: boolean;
    purpose?: ModPurpose;
    loaded: WritableSignal<boolean>;
    overview: WritableSignal<OverviewInformation | undefined>;
};

type OverviewInformation = Omit<CoreCourseOverviewInformation, 'activities' | 'headers'> & {
    isSupportedInApp: boolean;
    headers: OverviewHeader[];
    activities: OverviewActivity[];
};

/**
 * Overview information for an activity.
 */
type OverviewHeader = CoreCourseGetOverviewInformationWSHeader & {
    classes: string[];
    hasContent: boolean;
};

/**
 * Overview information for an activity.
 */
type OverviewActivity = CoreCourseOverviewActivity & {
    nameItemToRender?: OverviewItemToRender;
    itemsToRender: OverviewItemToRender[];
    isExpanded: WritableSignal<boolean>;
    hasItemsBesidesName: boolean;
};

type OverviewItemToRender = CoreCourseOverviewItem & {
    component?: Type<unknown> | null;
    componentData?: Record<string, unknown>;
    content: string | null;
    classes?: string[];
};
