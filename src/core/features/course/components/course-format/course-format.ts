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
    ViewChild,
} from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import {
    CoreCourse,
    sectionContentIsModule,
} from '@features/course/services/course';
import {
    CoreCourseHelper,
    CoreCourseModuleData,
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AccordionGroupChangeEventDetail, IonContent } from '@ionic/angular';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseIndexSectionWithModule } from '../course-index/course-index';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseViewedModulesDBRecord } from '@features/course/services/database/course';
import { CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreCourseCourseIndexTourComponent } from '../course-index-tour/course-index-tour';
import { CoreDom } from '@singletons/dom';
import { CoreUserTourDirectiveOptions } from '@directives/user-tour';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ContextLevel } from '@/core/constants';
import { CoreModals } from '@services/modals';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreBlockComponentsModule } from '@features/block/components/components.module';
import { CoreSites } from '@services/sites';
import {
    CORE_COURSE_ALL_SECTIONS_ID,
    CORE_COURSE_ALL_SECTIONS_PREFERRED_PREFIX,
    CORE_COURSE_EXPANDED_SECTIONS_PREFIX,
    CORE_COURSE_STEALTH_MODULES_SECTION_ID,
} from '@features/course/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreInfiniteLoadingComponent } from '@components/infinite-loading/infinite-loading';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseSectionComponent, CoreCourseSectionToDisplay } from '../course-section/course-section';

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
    styleUrl: 'course-format.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseSectionComponent,
        CoreBlockComponentsModule,
    ],
})
export class CoreCourseFormatComponent implements OnInit, OnChanges, OnDestroy {

    static readonly LOAD_MORE_ACTIVITIES = 10; // How many activities should load each time showMoreActivities is called.

    @Input({ required: true }) course!: CoreCourseAnyCourseData; // The course to render.
    @Input() sections: CoreCourseSectionToDisplay[] = []; // List of course sections.
    @Input() initialSectionId?: number; // The section to load first (by ID).
    @Input() initialSectionNumber?: number; // The section to load first (by number).
    @Input() initialBlockInstanceId?: number; // The instance to focus.
    @Input() moduleId?: number; // The module ID to scroll to. Must be inside the initial selected section.
    @Input({ transform: toBoolean }) isGuest?: boolean; // If user is accessing using an ACCESS_GUEST enrolment method.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @ViewChildren(CoreDynamicComponent) dynamicComponents?: QueryList<CoreDynamicComponent<any>>;

    @ViewChild(CoreInfiniteLoadingComponent) infiteLoading?: CoreInfiniteLoadingComponent;

    accordionMultipleValue: string[] = [];

    // All the possible component classes.
    courseFormatComponent?: Type<unknown>;
    singleSectionComponent?: Type<unknown>;
    allSectionsComponent?: Type<unknown>;

    canLoadMore = false;
    lastShownSectionIndex = 0;
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
    selectedSection?: CoreCourseSectionToDisplay;
    previousSection?: CoreCourseSectionToDisplay;
    nextSection?: CoreCourseSectionToDisplay;
    allSectionsId = CORE_COURSE_ALL_SECTIONS_ID;
    stealthModulesSectionId = CORE_COURSE_STEALTH_MODULES_SECTION_ID;
    loaded = false;
    lastModuleViewed?: CoreCourseViewedModulesDBRecord;
    viewedModules: Record<number, boolean> = {};

    communicationRoomUrl?: string;

    protected selectTabObserver?: CoreEventObserver;
    protected modViewedObserver?: CoreEventObserver;
    protected lastCourseFormat?: string;
    protected viewedModulesInitialized = false;
    protected currentSite?: CoreSite;

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

        this.currentSite = CoreSites.getRequiredCurrentSite();

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

        this.modViewedObserver = CoreEvents.on(CoreEvents.COURSE_MODULE_VIEWED, (lastModuleViewed) => {
            if (lastModuleViewed.courseId !== this.course.id) {
                return;
            }

            this.viewedModules[lastModuleViewed.cmId] = true;
            if (!this.lastModuleViewed || lastModuleViewed.timeaccess > this.lastModuleViewed.timeaccess) {
                this.lastModuleViewed = lastModuleViewed;

                if (this.selectedSection && this.selectedSection.id !== this.allSectionsId) {
                    // Change section to display the one with the last viewed module
                    const lastViewedSection = this.getViewedModuleSection();
                    if (lastViewedSection && lastViewedSection.id !== this.selectedSection?.id) {
                        this.sectionChanged(lastViewedSection, this.lastModuleViewed.cmId);
                    }
                }
            }
            this.changeDetectorRef.markForCheck();
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: { [name: string]: SimpleChange }): Promise<void> {
        this.setInputData();

        if (changes.course && this.course) {
            // Course has changed, try to get the components.
            this.getComponents();

            this.displayCourseIndex = CoreCourseFormatDelegate.displayCourseIndex(this.course);
            this.displayBlocks = CoreCourseFormatDelegate.displayBlocks(this.course);

            this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(this.course.id);

            this.communicationRoomUrl = await CoreCourseHelper.getCourseCommunicationRoom(this.course);
        }

        if (changes.sections && this.sections) {
            await this.initializeExpandedSections();

            await this.treatSections(this.sections);
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
        if (!this.course || this.course.format === this.lastCourseFormat) {
            return;
        }

        // Format has changed or it's the first time, load all the components.
        this.lastCourseFormat = this.course.format;

        const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, this.sections);
        currentSectionData.section.highlighted = true;

        await Promise.all([
            this.loadCourseFormatComponent(),
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
     */
    protected async treatSections(sections: CoreCourseSectionToDisplay[]): Promise<void> {
        const hasAllSections = sections[0].id === CORE_COURSE_ALL_SECTIONS_ID;
        const hasSeveralSections = sections.length > 2 || (sections.length === 2 && !hasAllSections);

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
        } else if (this.initialSectionId || this.initialSectionNumber !== undefined) {
            // We have an input indicating the section ID to load. Search the section.
            const { section, parents } = CoreCourseHelper.findSection(this.sections, {
                id: this.initialSectionId,
                num: this.initialSectionNumber,
            });

            if (parents.length) {
                // The section is a subsection, load the root section.
                this.initialSectionId = parents[0].id;
                this.initialSectionNumber = undefined;

                this.setInputData();
            }

            // Don't load the section if it cannot be viewed by the user.
            const sectionToLoad = parents[0] ?? section;
            if (sectionToLoad && this.canViewSection(sectionToLoad)) {
                this.loaded = true;
                this.sectionChanged(sectionToLoad);
            }
        } else if (this.initialBlockInstanceId && this.displayBlocks && this.hasBlocks) {
            const { CoreBlockSideBlocksComponent } = await import('@features/block/components/side-blocks/side-blocks');

            CoreModals.openSideModal({
                component: CoreBlockSideBlocksComponent,
                componentProps: {
                    contextLevel: ContextLevel.COURSE,
                    instanceId: this.course.id,
                    initialBlockInstanceId: this.initialBlockInstanceId,
                },
            });
        }

        const allSectionsPreferred = await this.isAllSectionsPreferred();
        if (!this.loaded) {
            // No section specified, not found or not visible, load current section or the section with last module viewed.
            const currentSectionData = await CoreCourseFormatDelegate.getCurrentSection(this.course, sections);

            let section = currentSectionData.section;
            let moduleId: number | undefined;

            // If all sections is not preferred, load the last viewed module section.
            if (!allSectionsPreferred && this.lastModuleViewed) {
                if (!currentSectionData.forceSelected) {
                    // Search the section with the last module viewed.
                    const lastModuleSection = this.getViewedModuleSection();
                    section = lastModuleSection || section;
                    moduleId = lastModuleSection ? this.lastModuleViewed.cmId : undefined;
                } else {
                    const modules = CoreCourse.getSectionsModules([currentSectionData.section]);
                    if (modules.some(module => module.id === this.lastModuleViewed?.cmId)) {
                        // Last module viewed is inside the highlighted section.
                        moduleId = this.lastModuleViewed.cmId;
                    }
                }
            }

            this.loaded = true;
            this.sectionChanged(section, moduleId);
        }
    }

    /**
     * Initialize viewed modules.
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

        if (!this.lastModuleViewed) {
            return;
        }

        // Expand section and subsection of the last viewed module.
        const { section, parents } = CoreCourseHelper.findSection(this.sections, {
            id: this.lastModuleViewed.sectionId,
            moduleId: this.lastModuleViewed.cmId,
        });

        if (section) {
            parents.push(section);
        }
        parents.filter(section => section.id !== this.stealthModulesSectionId)
            .forEach(section => {
                this.setSectionExpanded(section);
            });
    }

    /**
     * Get the section of a viewed module. If the module is in a subsection, returns the root section.
     *
     * @returns Section, undefined if not found.
     */
    protected getViewedModuleSection(): CoreCourseSection | undefined {
        if (!this.lastModuleViewed) {
            return;
        }

        const { section, parents } = CoreCourseHelper.findSection(this.sections, {
            id: this.lastModuleViewed.sectionId,
            moduleId: this.lastModuleViewed.cmId,
        });
        const lastModuleSection: CoreCourseSection | undefined = parents[0] ?? section;

        return lastModuleSection?.id !== this.stealthModulesSectionId ? lastModuleSection : undefined;
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
            this.elementRef.nativeElement.querySelectorAll('.core-course-module-list-wrapper');

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

        const { CoreCourseCourseIndexComponent } = await import('@features/course/components/course-index/course-index');

        const data = await CoreModals.openModal<CoreCourseIndexSectionWithModule>({
            component: CoreCourseCourseIndexComponent,
            initialBreakpoint: 1,
            breakpoints: [0, 1],
            componentProps: {
                course: this.course,
                sections: this.sections,
                selectedId: selectedId,
            },
        });

        if (!data) {
            return;
        }

        const { section, parents } = CoreCourseHelper.findSection(this.sections, {
            moduleId: data.moduleId,
            id: data.moduleId === undefined ? data.sectionId : undefined,
        });

        // If a section is selected (no moduleId), or all sections are not displayed. Change section.
        if (!data.moduleId || !this.selectedSection || this.selectedSection.id !== this.allSectionsId) {
            // Select the root section.
            this.sectionChanged(parents[0] ?? section);
        }

        if (section) {
            // It's a subsection. Expand its parents too.
            for (let i = 0; i < parents.length; i++) {
                this.setSectionExpanded(parents[i]);
            }

            this.setSectionExpanded(section);

            // Scroll to the subsection (later it may be scrolled to the module).
            this.scrollInCourse(section.id, true);
        }

        if (!data.moduleId || !section) {
            return;
        }
        const module = <CoreCourseModuleData | undefined>
            section.contents.find((module) => sectionContentIsModule(module) && module.id === data.moduleId);
        if (!module) {
            return;
        }

        if (!module.handlerData) {
            module.handlerData =
                            await CoreCourseModuleDelegate.getModuleDataFor(module.modname, module, this.course.id);
        }

        if (CoreCourseHelper.canUserViewModule(module, section)) {
            this.scrollInCourse(module.id);

            module.handlerData?.action?.(data.event, module, module.course);
        }

        this.moduleId = data.moduleId;
    }

    /**
     * Open course downloads page.
     */
    async gotoCourseDownloads(): Promise<void> {
        const sectionId = this.selectedSection?.id !== this.allSectionsId ? this.selectedSection?.id : undefined;

        CoreNavigator.navigateToSitePath(
            `storage/${this.course.id}`,
            {
                params: {
                    title: this.course.fullname,
                    sectionId,
                    isGuest: this.isGuest,
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
    sectionChanged(newSection: CoreCourseSectionToDisplay, moduleId?: number): void {
        const previousValue = this.selectedSection;
        this.selectedSection = newSection;

        this.data.section = this.selectedSection;

        if (newSection.id !== this.allSectionsId) {
            this.setSectionExpanded(newSection);

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
            this.setAllSectionsPreferred(false);
        } else {
            this.previousSection = undefined;
            this.nextSection = undefined;
            this.lastShownSectionIndex = -1;
            this.showMoreActivities();
            this.setAllSectionsPreferred(true);
        }

        // Scroll to module if needed. Give more priority to the input.
        const moduleIdToScroll = this.moduleId && previousValue === undefined ? this.moduleId : moduleId;
        if (moduleIdToScroll) {
            this.scrollInCourse(moduleIdToScroll);
        }

        if (!previousValue || previousValue.id !== newSection.id) {
            // First load or section changed.
            if (!moduleIdToScroll) {
                this.content.scrollToTop(0);
            }

            this.logView(newSection.section, !previousValue);
        }
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Scroll to a certain module or section.
     *
     * @param id ID of the module or section to scroll to.
     * @param isSection Whether to scroll to a module or a subsection.
     */
    protected scrollInCourse(id: number, isSection = false): void {
        const elementId = isSection ? `#core-section-name-${id}` : `#core-course-module-${id}`;
        CoreDom.scrollToElement(this.elementRef.nativeElement, elementId,{ addYAxis: -10 });
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
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void, afterCompletionChange?: boolean): Promise<void> {
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
        let modulesLoaded = 0;
        while (this.lastShownSectionIndex < this.sections.length - 1 &&
            modulesLoaded < CoreCourseFormatComponent.LOAD_MORE_ACTIVITIES) {
            this.lastShownSectionIndex++;

            // Skip sections without content, with stealth modules or collapsed.
            if (!this.sections[this.lastShownSectionIndex].hasContent ||
                !this.sections[this.lastShownSectionIndex].contents ||
                !this.sections[this.lastShownSectionIndex].expanded) {
                continue;
            }

            const sectionModules = CoreCourse.getSectionsModules([this.sections[this.lastShownSectionIndex]]);

            modulesLoaded += sectionModules.reduce((total, module) =>
                !CoreCourseHelper.isModuleStealth(module, this.sections[this.lastShownSectionIndex]) ? total + 1 : total, 0);
        }

        this.canLoadMore = this.lastShownSectionIndex < this.sections.length - 1;

        infiniteComplete?.();
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

    /**
     * Log view.
     *
     * @param sectionNumber Section loaded (if any).
     * @param firstLoad Whether it's the first load when opening the course.
     */
    async logView(sectionNumber?: number, firstLoad = false): Promise<void> {
        await CorePromiseUtils.ignoreErrors(
            CoreCourse.logView(this.course.id, sectionNumber),
        );

        let extraParams = sectionNumber !== undefined ? `&section=${sectionNumber}` : '';
        if (firstLoad && sectionNumber !== undefined) {
            // If course is configured to show all sections in one page, don't include section in URL in first load.
            const courseDisplay = 'courseformatoptions' in this.course &&
                this.course.courseformatoptions?.find(option => option.name === 'coursedisplay');

            if (!courseDisplay || Number(courseDisplay.value) !== 0) {
                extraParams = '';
            }
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'core_course_view_course',
            name: this.course.fullname,
            data: { id: this.course.id, sectionnumber: sectionNumber, category: 'course' },
            url: `/course/view.php?id=${this.course.id}${extraParams}`,
        });
    }

    /**
     * Set all sections is preferred for the course.
     *
     * @param show Whether if all sections is preferred.
     */
    protected async setAllSectionsPreferred(show: boolean): Promise<void> {
        await this.currentSite?.setLocalSiteConfig(`${CORE_COURSE_ALL_SECTIONS_PREFERRED_PREFIX}${this.course.id}`, show ? 1 : 0);
    }

    /**
     * Check if all sections is preferred for the course.
     *
     * @returns Whether if all sections is preferred.
     */
    protected async isAllSectionsPreferred(): Promise<boolean> {
        const showAllSections =
            await this.currentSite?.getLocalSiteConfig<number>(`${CORE_COURSE_ALL_SECTIONS_PREFERRED_PREFIX}${this.course.id}`, 0);

        return !!showAllSections;
    }

    /**
     * Save expanded sections for the course.
     */
    protected async saveExpandedSections(): Promise<void> {
        const expandedSections = CoreCourseHelper.flattenSections(this.sections)
            .filter((section) => section.expanded && section.id > 0).map((section) => section.id);

        await this.currentSite?.setLocalSiteConfig(
            `${CORE_COURSE_EXPANDED_SECTIONS_PREFIX}${this.course.id}`,
            expandedSections.join(','),
        );
    }

    /**
     * Initializes the expanded sections for the course.
     */
    protected async initializeExpandedSections(): Promise<void> {
        const expandedSections = await CorePromiseUtils.ignoreErrors(
            this.currentSite?.getLocalSiteConfig<string>(`${CORE_COURSE_EXPANDED_SECTIONS_PREFIX}${this.course.id}`),
        );

        if (expandedSections === undefined) {
            this.accordionMultipleValue = [];

            // Expand all sections if not defined.
            CoreCourseHelper.flattenSections(this.sections).forEach((section) => {
                section.expanded = true;
                this.accordionMultipleValue.push(section.id.toString());
            });

            return;
        }

        this.accordionMultipleValue = expandedSections.split(',');

        CoreCourseHelper.flattenSections(this.sections).forEach((section) => {
            section.expanded = this.accordionMultipleValue.includes(section.id.toString());
        });
    }

    /**
     * Toogle the visibility of a section (expand/collapse).
     *
     * @param ev The event of the accordion.
     */
    accordionMultipleChange(ev: AccordionGroupChangeEventDetail): void {
        const sectionIds = ev.value as string[] | undefined;

        this.accordionMultipleValue = ev.value;

        const allSections = CoreCourseHelper.flattenSections(this.sections);
        allSections.forEach((section) => {
            section.expanded = false;
        });

        sectionIds?.forEach((sectionId) => {
            const section = allSections.find((section) => section.id === Number(sectionId));
            if (section) {
                section.expanded = true;
            }
        });

        // Save course expanded sections.
        this.saveExpandedSections();

        this.infiteLoading?.fireInfiniteScrollIfNeeded();
    }

    /**
     * Expands a section and save state.
     *
     * @param section The section to expand.
     */
    protected setSectionExpanded(section: CoreCourseSectionToDisplay): void {
        section.expanded = true;

        if (!this.accordionMultipleValue.includes(section.id.toString())) {
            // Force detect changes to update the view.
            this.accordionMultipleValue = [
                ...this.accordionMultipleValue,
                section.id.toString(),
            ];

            this.saveExpandedSections();
        }
    }

}
