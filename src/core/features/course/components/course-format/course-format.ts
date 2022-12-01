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

import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy,
    SimpleChange,
    ViewChildren,
    QueryList,
    Type,
    ElementRef,
    ChangeDetectorRef,
} from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import {
    CoreCourse,
    CoreCourseModuleCompletionStatus,
    CoreCourseProvider,
} from '@features/course/services/course';
import {
    CoreCourseHelper,
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { IonContent, IonRefresher } from '@ionic/angular';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourseCourseIndexComponent, CoreCourseIndexSectionWithModule } from '../course-index/course-index';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseViewedModulesDBRecord } from '@features/course/services/database/course';
import { CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreCourseCourseIndexTourComponent } from '../course-index-tour/course-index-tour';
import { CoreDom } from '@singletons/dom';
import { CoreUserTourDirectiveOptions } from '@directives/user-tour';

/**
 * Component to display course contents using a certain format. If the format isn't found, use default one.
 *
 * The inputs of this component will be shared with the course format components. Please use CoreCourseFormatDelegate
 * to register your handler for course formats.
 *
 * Example usage:
 *
 * <core-course-format [course]="course" [sections]="sections"></core-course-format>
 */
@Component({
    selector: 'core-course-format',
    templateUrl: 'course-format.html',
    styleUrls: ['course-format.scss'],
})
export class CoreCourseFormatComponent implements OnInit, OnChanges, OnDestroy {

    static readonly LOAD_MORE_ACTIVITIES = 20; // How many activities should load each time showMoreActivities is called.

    @Input() course!: CoreCourseAnyCourseData; // The course to render.
    @Input() sections: CoreCourseSectionToDisplay[] = []; // List of course sections.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.

    @ViewChildren(CoreDynamicComponent) dynamicComponents?: QueryList<CoreDynamicComponent<any>>;

    // All the possible component classes.
    courseFormatComponent?: Type<unknown>;
    courseSummaryComponent?: Type<unknown>;
    singleSectionComponent?: Type<unknown>;
    allSectionsComponent?: Type<unknown>;

    canLoadMore = false;
    showSectionId = 0;
    data: Record<string, unknown> = {}; // Data to pass to the components.
    courseIndexTour: CoreUserTourDirectiveOptions = {
        id: 'course-index',
        component: CoreCourseCourseIndexTourComponent,
        side: CoreUserToursSide.Top,
        alignment: CoreUserToursAlignment.End,
        getFocusedElement: nativeButton => {
            const innerButton = Array.from(nativeButton.shadowRoot?.children ?? []).find(child => child.tagName === 'BUTTON');

            return innerButton as HTMLElement ?? nativeButton;
        },
    };

    displayCourseIndex = false;
    displayBlocks = false;
    hasBlocks = false;
    selectedSection?: CoreCourseSection;
    previousSection?: CoreCourseSection;
    nextSection?: CoreCourseSection;
    allSectionsId: number = CoreCourseProvider.ALL_SECTIONS_ID;
    stealthModulesSectionId: number = CoreCourseProvider.STEALTH_MODULES_SECTION_ID;
    loaded = false;
    highlighted?: string;
    lastModuleViewed?: CoreCourseViewedModulesDBRecord;
    viewedModules: Record<number, boolean> = {};
    completionStatusIncomplete = CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;

    protected selectTabObserver?: CoreEventObserver;
    protected modViewedObserver?: CoreEventObserver;
    protected lastCourseFormat?: string;
    protected viewedModulesInitialized = false;

    constructor(
        protected content: IonContent,
        protected elementRef: ElementRef,
        protected changeDetectorRef: ChangeDetectorRef,
    ) {
        // Pass this instance to all components so they can use its methods and properties.
        this.data.coreCourseFormatComponent = this;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (this.course === undefined) {
            CoreDomUtils.showErrorModal('Course not set');

            CoreNavigator.back();

            return;
        }

        // Listen for select course tab events to select the right section if needed.
        this.selectTabObserver = CoreEvents.on(CoreEvents.SELECT_COURSE_TAB, (data) => {
            if (data.name) {
                return;
            }

            let section: CoreCourseSection | undefined;

            if (data.sectionId !== undefined && this.sections) {
                section = this.sections.find((section) => section.id == data.sectionId);
            } else if (data.sectionNumber !== undefined && this.sections) {
                section = this.sections.find((section) => section.section == data.sectionNumber);
            }

            if (section) {
                this.sectionChanged(section);
            }
        });

        this.modViewedObserver = CoreEvents.on(CoreEvents.COURSE_MODULE_VIEWED, (data) => {
            if (data.courseId !== this.course.id) {
                return;
            }

            this.viewedModules[data.cmId] = true;
            if (!this.lastModuleViewed || data.timeaccess > this.lastModuleViewed.timeaccess) {
                this.lastModuleViewed = data;

                if (this.selectedSection && this.selectedSection.id !== this.allSectionsId) {
                    // Change section to display the one with the last viewed module
                    const lastViewedSection = this.getViewedModuleSection(this.sections, data);
                    if (lastViewedSection && lastViewedSection.id !== this.selectedSection?.id) {
                        this.sectionChanged(lastViewedSection, data.cmId);
                    }
                }
            }
            this.changeDetectorRef.markForCheck();
        });
    }

    /**
     * Detect changes on input properties.
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        this.setInputData();

        if (changes.course && this.course) {
            // Course has changed, try to get the components.
            this.getComponents();

            this.displayCourseIndex = CoreCourseFormatDelegate.displayCourseIndex(this.course);
            this.displayBlocks = CoreCourseFormatDelegate.displayBlocks(this.course);

            this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(this.course.id);
        }

        if (changes.sections && this.sections) {
            this.treatSections(this.sections);
        }
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Set the input data for components.
     */
    protected setInputData(): void {
        this.data.course = this.course;
        this.data.sections = this.sections;
        this.data.initialSectionId = this.initialSectionId;
        this.data.initialSectionNumber = this.initialSectionNumber;
        this.data.moduleId = this.moduleId;
    }

    /**
     * Get the components classes.
     */
    protected async getComponents(): Promise<void> {
        if (!this.course || this.course.format == this.lastCourseFormat) {
            return;
        }

        // Format has changed or it's the first time, load all the components.
        this.lastCourseFormat = this.course.format;

        this.highlighted = CoreCourseFormatDelegate.getSectionHightlightedName(this.course);
        const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, this.sections);
        currentSectionData.section.highlighted = true;

        await Promise.all([
            this.loadCourseFormatComponent(),
            this.loadCourseSummaryComponent(),
            this.loadSingleSectionComponent(),
            this.loadAllSectionsComponent(),
        ]);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Load course format component.
     *
     * @returns Promise resolved when done.
     */
    protected async loadCourseFormatComponent(): Promise<void> {
        this.courseFormatComponent = await CoreCourseFormatDelegate.getCourseFormatComponent(this.course);
    }

    /**
     * Load course summary component.
     *
     * @returns Promise resolved when done.
     */
    protected async loadCourseSummaryComponent(): Promise<void> {
        this.courseSummaryComponent = await CoreCourseFormatDelegate.getCourseSummaryComponent(this.course);
    }

    /**
     * Load single section component.
     *
     * @returns Promise resolved when done.
     */
    protected async loadSingleSectionComponent(): Promise<void> {
        this.singleSectionComponent = await CoreCourseFormatDelegate.getSingleSectionComponent(this.course);
    }

    /**
     * Load all sections component.
     *
     * @returns Promise resolved when done.
     */
    protected async loadAllSectionsComponent(): Promise<void> {
        this.allSectionsComponent = await CoreCourseFormatDelegate.getAllSectionsComponent(this.course);
    }

    /**
     * Treat received sections.
     *
     * @param sections Sections to treat.
     * @returns Promise resolved when done.
     */
    protected async treatSections(sections: CoreCourseSection[]): Promise<void> {
        const hasAllSections = sections[0].id == CoreCourseProvider.ALL_SECTIONS_ID;
        const hasSeveralSections = sections.length > 2 || (sections.length == 2 && !hasAllSections);

        await this.initializeViewedModules();

        if (this.selectedSection) {
            const selectedSection = this.selectedSection;
            // We have a selected section, but the list has changed. Search the section in the list.
            let newSection = sections.find(section => this.compareSections(section, selectedSection));

            if (!newSection) {
                // Section not found, calculate which one to use.
                const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, sections);
                newSection = currentSectionData.section;
            }

            this.sectionChanged(newSection);

            return;
        }

        // There is no selected section yet, calculate which one to load.
        if (!hasSeveralSections) {
            // Always load "All sections" to display the section title. If it isn't there just load the section.
            this.loaded = true;
            this.sectionChanged(sections[0]);
        } else if (this.initialSectionId || this.initialSectionNumber) {
            // We have an input indicating the section ID to load. Search the section.
            const section = sections.find((section) =>
                section.id == this.initialSectionId || (section.section && section.section == this.initialSectionNumber));

            // Don't load the section if it cannot be viewed by the user.
            if (section && this.canViewSection(section)) {
                this.loaded = true;
                this.sectionChanged(section);
            }
        }

        if (!this.loaded) {
            // No section specified, not found or not visible, load current section or the section with last module viewed.
            const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, sections);

            const lastModuleViewed = this.lastModuleViewed;
            let section = currentSectionData.section;
            let moduleId: number | undefined;

            if (!currentSectionData.forceSelected && lastModuleViewed) {
                // Search the section with the last module viewed.
                const lastModuleSection = this.getViewedModuleSection(sections, lastModuleViewed);

                section = lastModuleSection || section;
                moduleId = lastModuleSection ? lastModuleViewed?.cmId : undefined;
            } else if (lastModuleViewed && currentSectionData.section.modules.some(module => module.id === lastModuleViewed.cmId)) {
                // Last module viewed is inside the highlighted section.
                moduleId = lastModuleViewed.cmId;
            }

            this.loaded = true;
            this.sectionChanged(section, moduleId);
        }

        return;
    }

    /**
     * Initialize viewed modules.
     *
     * @returns Promise resolved when done.
     */
    protected async initializeViewedModules(): Promise<void> {
        if (this.viewedModulesInitialized) {
            return;
        }

        const viewedModules = await CoreCourse.getViewedModules(this.course.id);

        this.viewedModulesInitialized = true;
        this.lastModuleViewed = viewedModules[0];
        viewedModules.forEach(entry => {
            this.viewedModules[entry.cmId] = true;
        });
    }

    /**
     * Get the section of a viewed module.
     *
     * @param sections List of sections.
     * @param viewedModule Viewed module.
     * @returns Section, undefined if not found.
     */
    protected getViewedModuleSection(
        sections: CoreCourseSection[],
        viewedModule: CoreCourseViewedModulesDBRecord,
    ): CoreCourseSection | undefined {
        if (viewedModule.sectionId) {
            const lastModuleSection = sections.find(section => section.id === viewedModule.sectionId);

            if (lastModuleSection) {
                return lastModuleSection;
            }
        }

        // No sectionId or section not found. Search the module.
        return sections.find(
            section => section.modules.some(module => module.id === viewedModule.cmId),
        );
    }

    /**
     * Get selected section ID. If viewing all sections, use current scrolled section.
     *
     * @returns Section ID, undefined if not found.
     */
    protected async getSelectedSectionId(): Promise<number | undefined> {
        if (this.selectedSection?.id !== this.allSectionsId) {
            return this.selectedSection?.id;
        }

        // Check current scrolled section.
        const allSectionElements: NodeListOf<HTMLElement> =
            this.elementRef.nativeElement.querySelectorAll('section.core-course-module-list-wrapper');

        const scroll = await this.content.getScrollElement();
        const containerTop = scroll.getBoundingClientRect().top;

        const element = Array.from(allSectionElements).find((element) => {
            const position = element.getBoundingClientRect();

            // The bottom is inside the container or lower.
            return position.bottom >= containerTop;
        });

        return Number(element?.getAttribute('id')) || undefined;
    }

    /**
     * Display the course index modal.
     */
    async openCourseIndex(): Promise<void> {
        const selectedId = await this.getSelectedSectionId();

        const data = await CoreDomUtils.openModal<CoreCourseIndexSectionWithModule>({
            component: CoreCourseCourseIndexComponent,
            componentProps: {
                course: this.course,
                sections: this.sections,
                selectedId: selectedId,
            },
        });

        if (!data) {
            return;
        }
        const section = this.sections.find((section) => section.id == data.sectionId);
        if (!section) {
            return;
        }
        this.sectionChanged(section);

        if (!data.moduleId) {
            return;
        }
        const module = section.modules.find((module) => module.id == data.moduleId);
        if (!module) {
            return;
        }

        if (!module.handlerData) {
            module.handlerData =
                            await CoreCourseModuleDelegate.getModuleDataFor(module.modname, module, this.course.id);
        }

        if (CoreCourseHelper.canUserViewModule(module, section) && module.handlerData?.action) {
            module.handlerData.action(data.event, module, module.course);
        }

        this.moduleId = data.moduleId;
    }

    /**
     * Open course downloads page.
     */
    async gotoCourseDownloads(): Promise<void> {
        const selectedId = await this.getSelectedSectionId();

        CoreNavigator.navigateToSitePath(
            `storage/${this.course.id}`,
            {
                params: {
                    title: this.course.fullname,
                    sectionId: selectedId,
                },
            },
        );
    }

    /**
     * Function called when selected section changes.
     *
     * @param newSection The new selected section.
     * @param moduleId The module to scroll to.
     */
    sectionChanged(newSection: CoreCourseSection, moduleId?: number): void {
        const previousValue = this.selectedSection;
        this.selectedSection = newSection;
        this.data.section = this.selectedSection;

        if (newSection.id != this.allSectionsId) {
            // Select next and previous sections to show the arrows.
            const i = this.sections.findIndex((value) => this.compareSections(value, newSection));

            let j: number;
            for (j = i - 1; j >= 1; j--) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.previousSection = j >= 1 ? this.sections[j] : undefined;

            for (j = i + 1; j < this.sections.length; j++) {
                if (this.canViewSection(this.sections[j])) {
                    break;
                }
            }
            this.nextSection = j < this.sections.length ? this.sections[j] : undefined;
        } else {
            this.previousSection = undefined;
            this.nextSection = undefined;
            this.canLoadMore = false;
            this.showSectionId = 0;
            this.showMoreActivities();
        }

        // Scroll to module if needed. Give more priority to the input.
        const moduleIdToScroll = this.moduleId && previousValue === undefined ? this.moduleId : moduleId;
        if (moduleIdToScroll) {
            this.scrollToModule(moduleIdToScroll);
        }

        if (!previousValue || previousValue.id !== newSection.id) {
            // First load or section changed.
            if (!moduleIdToScroll) {
                this.content.scrollToTop(0);
            }

            CoreUtils.ignoreErrors(
                CoreCourse.logView(this.course.id, newSection.section, undefined, this.course.fullname),
            );
        }
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Scroll to a certain module.
     *
     * @param moduleId Module ID.
     */
    protected scrollToModule(moduleId: number): void {
        CoreDom.scrollToElement(
            this.elementRef.nativeElement,
            '#core-course-module-' + moduleId,
            { addYAxis: -10 },
        );
    }

    /**
     * Compare if two sections are equal.
     *
     * @param section1 First section.
     * @param section2 Second section.
     * @returns Whether they're equal.
     */
    compareSections(section1: CoreCourseSection, section2: CoreCourseSection): boolean {
        return section1 && section2 ? section1.id === section2.id : section1 === section2;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param afterCompletionChange Whether the refresh is due to a completion change.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
        const promises = this.dynamicComponents?.map(async (component) => {
            await component.callComponentMethod('doRefresh', refresher, done, afterCompletionChange);
        }) || [];

        if (this.course) {
            const courseId = this.course.id;
            promises.push(CoreCourse.invalidateCourseBlocks(courseId).then(async () => {
                this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(courseId);

                return;
            }));
        }

        await Promise.all(promises);

        refresher?.complete();
        done?.();
    }

    /**
     * Show more activities (only used when showing all the sections at the same time).
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    showMoreActivities(infiniteComplete?: () => void): void {
        this.canLoadMore = false;

        const sections = this.sections || [];
        let modulesLoaded = 0;
        let i: number;
        for (i = this.showSectionId + 1; i < sections.length; i++) {
            if (!sections[i].hasContent || !sections[i].modules) {
                continue;
            }

            modulesLoaded += sections[i].modules.reduce((total, module) =>
                !CoreCourseHelper.isModuleStealth(module, sections[i]) ? total + 1 : total, 0);

            if (modulesLoaded >= CoreCourseFormatComponent.LOAD_MORE_ACTIVITIES) {
                break;
            }
        }

        this.showSectionId = i;
        this.canLoadMore = i < sections.length;

        if (this.canLoadMore) {
            // Check if any of the following sections have any content.
            let thereAreMore = false;
            for (i++; i < sections.length; i++) {
                if (sections[i].hasContent && sections[i].modules && sections[i].modules?.length > 0) {
                    thereAreMore = true;
                    break;
                }
            }
            this.canLoadMore = thereAreMore;
        }

        infiniteComplete && infiniteComplete();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.selectTabObserver?.off();
        this.modViewedObserver?.off();
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        this.dynamicComponents?.forEach((component) => {
            component.callComponentMethod('ionViewDidEnter');
        });
    }

    /**
     * User left the page that contains the component.
     */
    ionViewDidLeave(): void {
        this.dynamicComponents?.forEach((component) => {
            component.callComponentMethod('ionViewDidLeave');
        });
    }

    /**
     * Check whether a section can be viewed.
     *
     * @param section The section to check.
     * @returns Whether the section can be viewed.
     */
    canViewSection(section: CoreCourseSection): boolean {
        return CoreCourseHelper.canUserViewSection(section) && !CoreCourseHelper.isSectionStealth(section);
    }

}

type CoreCourseSectionToDisplay = CoreCourseSection & {
    highlighted?: boolean;
};
