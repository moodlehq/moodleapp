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

import { CoreLogger } from '@singletons/logger';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import {
    CoreCourses,
    CoreEnrolledCourseData,
    CoreCourseSearchedData,
    CoreCourseUserAdminOrNavOptionIndexed,
} from '@features/courses/services/courses';
import { CoreCourse } from '@features/course/services/course';
import {
    CoreGrades,
    CoreGradesGradeItem,
    CoreGradesGradeOverview,
    CoreGradesTable,
    CoreGradesTableColumn,
    CoreGradesTableItemNameColumn,
    CoreGradesTableLeaderColumn,
    CoreGradesTableRow,
} from '@features/grades/services/grades';
import { CoreText } from '@singletons/text';
import { CoreUrl } from '@singletons/url';
import { CoreMenuItem, CoreUtils } from '@singletons/utils';
import { CoreDom } from '@singletons/dom';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton, Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseAccess } from '@features/course/services/course-options-delegate';
import { CoreLoadings } from '@services/overlays/loadings';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreCourseAccessDataType } from '@features/course/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreArray } from '@singletons/array';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CORE_GRADES_COURSE_OPTION_NAME, GRADES_PAGE_NAME } from '../constants';

/**
 * Service that provides some features regarding grades information.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesHelperProvider {

    protected logger = CoreLogger.getInstance('CoreGradesHelperProvider');

    /**
     * Formats a row from the grades table to be rendered in one table.
     *
     * @param tableRow JSON object representing row of grades table data.
     * @param useLegacyLayout Whether to use the layout before 4.1.
     * @returns Formatted row object.
     */
    protected async formatGradeRowForTable(
        tableRow: CoreGradesTableRow,
        useLegacyLayout: boolean,
    ): Promise<CoreGradesFormattedTableRow> {
        const row: CoreGradesFormattedTableRow = {};

        // Add validation
        if (!tableRow) {
            this.logger.warn('formatGradeRowForTable: Received null/undefined tableRow');
            return row;
        }

        if (!useLegacyLayout && 'leader' in tableRow) {
            const row = {
                itemtype: 'leader',
                rowspan: tableRow.leader?.rowspan,
            };

            this.setRowStyleClasses(row, (tableRow.leader as CoreGradesTableLeaderColumn).class);

            return row;
        }

        for (let name in tableRow) {
            const column: CoreGradesTableColumn = tableRow[name];

            // Check if column exists
            if (!column || column.content === undefined || column.content === null) {
                continue;
            }

            let content = String(column.content);

            if (name === 'itemname') {
                const itemNameColumn = <CoreGradesTableItemNameColumn> column;

                // Handle id that might be a number or string
                if (itemNameColumn.id !== undefined && itemNameColumn.id !== null) {
                    if (typeof itemNameColumn.id === 'string' && itemNameColumn.id.includes('_')) {
                        row.id = parseInt(itemNameColumn.id.split('_')[1], 10);
                    } else if (typeof itemNameColumn.id === 'number') {
                        row.id = itemNameColumn.id;
                    } else {
                        row.id = parseInt(String(itemNameColumn.id), 10);
                    }
                } else {
                    this.logger.warn('formatGradeRowForTable: itemNameColumn.id is undefined');
                    row.id = 0;
                }
                
                row.colspan = itemNameColumn.colspan || 1;
                row.rowspan = tableRow.leader?.rowspan || 1;

                await this.setRowIconAndType(row, content);
                
                // Check if this is a category row based on content and class
                const lowerContent = content.toLowerCase();
                const isTotal = lowerContent.includes('total');
                const isCourseTotal = lowerContent.includes('course total');
                const isCategoryTotal = lowerContent.includes('category total');
                
                // Determine itemtype based on content and class
                if (isCourseTotal) {
                    row.itemtype = 'courseitem';  // Course total
                } else if (isCategoryTotal || (isTotal && itemNameColumn.class && itemNameColumn.class.includes('bagg'))) {
                    row.itemtype = 'categoryitem';  // Category total
                } else if (itemNameColumn.class && itemNameColumn.class.includes('category')) {
                    row.itemtype = 'category';  // Category header
                } else if (!row.itemtype && content && !isTotal) {
                    // If it has a name and it's not a total, it's likely a grade item
                    row.itemtype = 'mod';
                }
                
                // Ensure itemtype is set - default to 'item' if not set by setRowIconAndType
                if (!row.itemtype) {
                    row.itemtype = 'item';
                    this.logger.warn('[formatGradeRowForTable] Setting default itemtype for row:', row.id, 'content:', content);
                }
                
                this.setRowStyleClasses(row, itemNameColumn.class);
                row.rowclass += itemNameColumn.class.indexOf('hidden') >= 0 ? ' hidden' : '';
                row.rowclass += itemNameColumn.class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                if (!useLegacyLayout) {
                    // Remove the "title" of the row (activity name, 'Manual item', 'Aggregation', etc.).
                    content = content.replace(/<span[^>]+>.+?<\/span>/i, '');
                }

                content = content.replace(/<\/span>/gi, '\n');
                content = CoreText.cleanTags(content, { trim: true });
                name = 'gradeitem';
            } else if (name === 'grade') {
                // Add the pass/fail class if present.
                row.gradeClass = column.class.includes('gradepass') ? 'text-success' :
                    (column.class.includes('gradefail') ? 'text-danger' : '');

                if (content.includes('action-menu')) {
                    content = CoreText.processHTML(content, (element) => {
                        element.querySelector('.action-menu')?.parentElement?.remove();
                    });
                }

                if (content.includes('fa-check')) {
                    row.gradeIcon = 'fas-check';
                    row.gradeIconAlt = Translate.instant('core.grades.pass');
                    content = CoreText.cleanTags(content);
                } else if (content.includes('fa-times') || content.includes('fa-xmark')) {
                    row.gradeIcon = 'fas-xmark';
                    row.gradeIconAlt = Translate.instant('core.grades.fail');
                    content = CoreText.cleanTags(content);
                } else {
                    // Clean any other HTML tags from grade content
                    content = CoreText.cleanTags(content, { trim: true });
                }

                row.penalty = CoreGradesHelper.getPenaltyFromGrade(content);
            } else {
                content = CoreText.replaceNewLines(content, '<br>');
            }

            if (row.itemtype !== 'category') {
                row.expandable = true;
                row.expanded = false;
                row.detailsid = `grade-item-${row.id}-details`;
                row.ariaLabel = `${row.gradeitem} (${row.grade})`;
            }

            if (content == '&nbsp;') {
                content = '';
            }
            
            // Decode HTML entities for range column to fix double-encoding issue
            if (name === 'range' && content) {
                // Decode HTML entities like &ndash; to their actual characters
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                content = tempDiv.textContent || tempDiv.innerText || '';
            }

            row[name] = content.trim();
        }

        // Log if itemtype is not set
        if (!row.itemtype) {
            this.logger.warn('[formatGradeRowForTable] Row missing itemtype:', row);
        }

        return row;
    }

    /**
     * Removes suffix formatted to compatibilize data from table and items.
     *
     * @param item Grade item to format.
     * @returns Grade item formatted.
     */
    protected formatGradeItem(item: CoreGradesGradeItem): CoreGradesFormattedItem {
        for (const name in item) {
            const index = name.indexOf('formatted');
            if (index > 0) {
                item[name.substring(0, index)] = item[name];
            }
        }

        return item;
    }

    /**
     * Formats the response of gradereport_user_get_grades_table to be rendered.
     *
     * @param table JSON object representing a table with data.
     * @returns Formatted HTML table.
     */
    async formatGradesTable(table: CoreGradesTable): Promise<CoreGradesFormattedTable> {
        this.logger.debug('[formatGradesTable] Input table:', {
            courseid: table.courseid,
            userid: table.userid,
            maxdepth: table.maxdepth,
            tableDataLength: table.tabledata?.length || 0
        });
        
        const maxDepth = table.maxdepth;
        const formatted: CoreGradesFormattedTable = {
            columns: [],
            rows: [],
        };

        // Columns, in order.
        const columns = {
            gradeitem: true,
            weight: false,
            grade: false,
            range: false,
            percentage: false,
            lettergrade: false,
            rank: false,
            average: false,
            feedback: false,
            contributiontocoursetotal: false,
        };
        formatted.rows = await this.formatGradesTableRows(table.tabledata);
        this.logger.debug('[formatGradesTable] Formatted rows count:', formatted.rows.length);
        if (formatted.rows.length > 0) {
            this.logger.debug('[formatGradesTable] First formatted row:', formatted.rows[0]);
        }

        // Get a row with some info.
        let normalRow = formatted.rows.find(
            row =>
                row.itemtype !== 'leader' &&
                (row.grade !== undefined || row.percentage !== undefined),
        );

        // Decide if grades or percentage is being shown on phones.
        if (normalRow && normalRow.grade !== undefined) {
            columns.grade = true;
        } else if (normalRow && normalRow.percentage !== undefined) {
            columns.percentage = true;
        } else {
            normalRow = formatted.rows.find((e) => e.itemtype !== 'leader');
            columns.grade = true;
        }

        for (const colName in columns) {
            if (normalRow && normalRow[colName] !== undefined) {
                formatted.columns.push({
                    name: colName,
                    colspan: colName === 'gradeitem' ? maxDepth : 1,
                    hiddenPhone: !columns[colName],
                });
            }
        }

        this.logger.debug('[formatGradesTable] Final formatted table:', {
            columnsCount: formatted.columns.length,
            columns: formatted.columns.map(c => c.name),
            rowsCount: formatted.rows.length
        });

        return formatted;
    }

    /**
     * Format table rows.
     *
     * @param rows Unformatted rows.
     * @returns Formatted rows.
     */
    protected async formatGradesTableRows(rows: CoreGradesTableRow[]): Promise<CoreGradesFormattedTableRow[]> {
        const useLegacyLayout = !CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('4.1');
        const formattedRows = await Promise.all(rows.map(row => this.formatGradeRowForTable(row, useLegacyLayout)));

        if (!useLegacyLayout) {
            for (let index = 0; index < formattedRows.length - 1; index++) {
                const row = formattedRows[index];
                const previousRow = formattedRows[index - 1] ?? null;

                if (row.itemtype !== 'leader') {
                    continue;
                }

                row.colspan = previousRow.colspan;
                previousRow.rowclass = `${previousRow.rowclass ?? ''} ion-no-border`.trim();
            }
        }

        return formattedRows;
    }

    /**
     * Get course data for grades since they only have courseid.
     *
     * @param grades Grades to get the data for.
     * @returns Promise always resolved. Resolve param is the formatted grades.
     */
    async getGradesCourseData(grades: CoreGradesGradeOverview[]): Promise<CoreGradesGradeOverviewWithCourseData[]> {
        this.logger.debug(`Getting course data for ${grades.length} grades`);
        this.logger.debug('Grade course IDs:', grades.map(g => g.courseid));
        
        // Obtain courses from cache to prevent network requests.
        let coursesWereMissing = false;

        try {
            const courses = await CoreCourses.getUserCourses(undefined, undefined, CoreSitesReadingStrategy.ONLY_CACHE);
            const coursesMap = CoreArray.toObject(courses, 'id');
            
            this.logger.debug(`Found ${courses.length} courses in cache`);
            this.logger.debug('Cached course IDs:', Object.keys(coursesMap));

            coursesWereMissing = this.addCourseData(grades, coursesMap);
        } catch {
            coursesWereMissing = true;
            this.logger.debug('Cache miss, will fetch from network');
        }

        // If any course wasn't found, make a network request.
        if (coursesWereMissing) {
            this.logger.debug('Fetching missing courses from network');
            const courseIds = grades.map((grade) => grade.courseid).join(',');
            const courses = await CoreCourses.getCoursesByField('ids', courseIds);
            
            this.logger.debug(`Fetched ${courses.length} courses from network`);
            
            const coursesMap =
                CoreArray.toObject(courses as Record<string, unknown>[], 'id') as
                    Record<string, CoreEnrolledCourseData> |
                    Record<string, CoreCourseSearchedData>;

            this.addCourseData(grades, coursesMap);
        }

        const result = (grades as Record<string, unknown>[])
            .filter(grade => 'courseFullName' in grade) as CoreGradesGradeOverviewWithCourseData[];
            
        this.logger.debug(`Returning ${result.length} grades with course data`);
        if (result.length < grades.length) {
            this.logger.warn(`${grades.length - result.length} grades missing course data`);
        }

        return result;
    }

    /**
     * Adds course data to grades.
     *
     * @param grades Array of grades to populate.
     * @param courses HashMap of courses to read data from.
     * @returns Boolean indicating if some courses were not found.
     */
    protected addCourseData(
        grades: CoreGradesGradeOverview[],
        courses: Record<string, CoreEnrolledCourseData> | Record<string, CoreCourseSearchedData>,
    ): boolean {
        let someCoursesAreMissing = false;

        for (const grade of grades) {
            if (!(grade.courseid in courses)) {
                someCoursesAreMissing = true;

                continue;
            }

            (grade as CoreGradesGradeOverviewWithCourseData).courseFullName = courses[grade.courseid].fullname;
        }

        return someCoursesAreMissing;
    }

    /**
     * Returns the label of the selected grade.
     *
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade value.
     * @returns Selected grade label.
     */
    getGradeLabelFromValue(grades: CoreGradesMenuItem[], selectedGrade?: number): string {
        selectedGrade = Number(selectedGrade);

        if (!grades || !selectedGrade || selectedGrade <= 0) {
            return '';
        }

        const grade = grades.find((grade) => grade.value == selectedGrade);

        return grade ? grade.label : '';
    }

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @param courseId ID of the course to get the grades from.
     * @param moduleId Module ID.
     * @param userId ID of the user to get the grades from. If not defined use site's current user.
     * @param groupId ID of the group to get the grades from. Not used for old gradebook table.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the grades are retrieved.
     */
    async getGradeModuleItems(
        courseId: number,
        moduleId: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesFormattedItem[]> {
        const grades = await CoreGrades.getGradeItems(courseId, userId, groupId, siteId, ignoreCache);

        return grades.filter((item) => item.cmid == moduleId).map((item) => this.formatGradeItem(item));
    }

    /**
     * Returns the value of the selected grade.
     *
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade label.
     * @returns Selected grade value.
     */
    getGradeValueFromLabel(grades: CoreMenuItem[], selectedGrade?: string): number {
        if (!grades || !selectedGrade) {
            return 0;
        }

        const grade = grades.find((grade) => grade.label == selectedGrade);

        return !grade || grade.value < 0
            ? 0
            : grade.value;
    }

    /**
     * Gets the link to the module for the selected grade.
     *
     * @param text HTML where the link is present.
     * @returns URL linking to the module.
     */
    protected getModuleLink(text: string): string | false {
        const el = CoreDom.toDom(text)[0];
        const link = el.attributes['href'] ? el.attributes['href'].value : false;

        if (!link || link.indexOf('/mod/') < 0) {
            return false;
        }

        return link;
    }

    /**
     * Get module grades to display.
     *
     * @param courseId Course Id.
     * @param moduleId Module Id.
     * @returns Formatted table rows.
     */
    async getModuleGrades(courseId: number, moduleId: number): Promise<CoreGradesFormattedTableRow[] > {
        const table = await CoreGrades.getCourseGradesTable(courseId);

        if (!table.tabledata) {
            return [];
        }

        // Find href containing "/mod/xxx/xxx.php".
        const regex = /href="([^"]*\/mod\/[^"|^/]*\/[^"|^.]*\.php[^"]*)/;

        return this.formatGradesTableRows(table.tabledata.filter((row) => {
            if (row.itemname && row.itemname.content) {
                const matches = row.itemname.content.match(regex);

                if (matches && matches.length) {
                    const hrefParams = CoreUrl.extractUrlParams(matches[1]);

                    return hrefParams && parseInt(hrefParams.id) === moduleId;
                }
            }

            return false;
        }));
    }

    /**
     * Parse the penalty message from the grade HTML content.
     *
     * @param grade Grade to parse.
     * @returns The penalty message or undefined if not found.
     */
    getPenaltyFromGrade(grade?: string): string | undefined {
        if (!grade) {
            return undefined;
        }

        const template = document.createElement('template');
        template.innerHTML = grade;
        const icon = template.content.querySelector<HTMLElement>('.penalty-indicator-icon');

        return icon?.title;
    }

    /**
     * Go to view grades.
     *
     * @param courseId Course ID to view.
     * @param userId User to view. If not defined, current user.
     * @param moduleId Module to view. If not defined, view all course grades.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async goToGrades(
        courseId: number,
        userId?: number,
        moduleId?: number,
        siteId?: string,
    ): Promise<void> {
        const modal = await CoreLoadings.show();

        const site = await CoreSites.getSite(siteId);

        siteId = site.id;
        const currentUserId = site.getUserId();

        try {
            if (!moduleId) {
                throw new CoreError('Invalid moduleId');
            }

            // Try to open the module grade directly.
            const items = await CoreGrades.getGradeItems(courseId, userId, undefined, siteId);

            // Find the item of the module.
            const item = Array.isArray(items) && items.find((item) => moduleId == item.cmid);

            if (!item) {
                throw new CoreError('Grade item not found.');
            }

            // Open the item directly.
            const gradeId = item.id;

            await CorePromiseUtils.ignoreErrors(
                CoreNavigator.navigateToSitePath(
                    `/${GRADES_PAGE_NAME}/${courseId}`,
                    { params: { gradeId }, siteId },
                ),
            );
        } catch {
            try {
                // Cannot get grade items or there's no need to.
                if (userId && userId !== currentUserId) {
                    // View another user grades. Open the grades page directly.
                    await CorePromiseUtils.ignoreErrors(
                        CoreNavigator.navigateToSitePath(`/${GRADES_PAGE_NAME}/${courseId}`, { siteId }),
                    );
                }

                // Open the course with the grades tab selected.
                await CoreCourseHelper.getAndOpenCourse(courseId, { selectedTab: CORE_GRADES_COURSE_OPTION_NAME }, siteId);
            } catch {
                // Cannot get course for some reason, just open the grades page.
                await CoreNavigator.navigateToSitePath(`/${GRADES_PAGE_NAME}/${courseId}`, { siteId });
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Invalidate the grade items for a certain module.
     *
     * @param courseId ID of the course to invalidate the grades.
     * @param userId ID of the user to invalidate. If not defined use site's current user.
     * @param groupId ID of the group to invalidate. Not used for old gradebook table.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the grades are invalidated.
     */
    async invalidateGradeModuleItems(courseId: number, userId?: number, groupId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        return CoreGrades.invalidateCourseGradesItemsData(courseId, userId, groupId, siteId);
    }

    /**
     * Set row style classes.
     *
     * @param row Row.
     * @param classes Unformatted classes.
     */
    protected setRowStyleClasses(row: CoreGradesFormattedTableRow, classes: string): void {
        const level = parseInt(classes.match(/(?:^|\s)level(\d+)(?:$|\s)/)?.[1] ?? '0');

        row.rowclass = `${row.rowclass ?? ''} ${level % 2 === 0 ? 'even' : 'odd'}`.trim();

        if (classes.match(/(^|\s)(category|bagg(b|t))($|\s)/)) {
            row.rowclass += ' core-bold';
            // If the class contains 'category' or aggregation indicators, it's likely a category
            if (!row.itemtype || row.itemtype === 'item') {
                row.itemtype = 'category';
            }
        }
    }

    /**
     * Parses the image and sets it to the row.
     *
     * @param row Row.
     * @param text Row content.
     */
    protected async setRowIconAndType(row: CoreGradesFormattedRowCommonData, text: string): Promise<void> {
        text = text.replace('%2F', '/').replace('%2f', '/');
        if (text.indexOf('/agg_mean') > -1) {
            row.itemtype = 'agg_mean';
            row.icon = 'moodle-agg-mean';
            row.iconAlt = Translate.instant('core.grades.aggregatemean');
        } else if (text.indexOf('/agg_sum') > -1) {
            row.itemtype = 'agg_sum';
            row.icon = 'moodle-agg-sum';
            row.iconAlt = Translate.instant('core.grades.aggregatesum');
        } else if (
            text.indexOf('/outcomes') > -1 ||
            text.indexOf('fa-tasks') > -1 ||
            text.indexOf('fa-list-check') > -1
        ) {
            row.itemtype = 'outcome';
            row.icon = 'fas-list-check';
            row.iconAlt = Translate.instant('core.grades.outcome');
        } else if (text.indexOf('i/folder') > -1 || text.indexOf('fa-folder') > -1 || text.indexOf('category-content') > -1) {
            row.itemtype = 'category';
            row.icon = 'fas-folder';
            row.iconAlt = Translate.instant('core.grades.category');
        } else if (
            text.indexOf('/manual_item') > -1 ||
            text.indexOf('fa-square-o') > -1 ||
            text.indexOf('fa-pencil-square-o') > -1 ||
            text.indexOf('fa-pen-to-square') > -1
        ) {
            row.itemtype = 'manual';
            row.icon = 'fas-pen-to-square';
            row.iconAlt = Translate.instant('core.grades.manualitem');
        } else if (text.indexOf('/calc') > -1 || text.indexOf('fa-calculator') > -1) {
            row.itemtype = 'calc';
            row.icon = 'fas-calculator';
            row.iconAlt = Translate.instant('core.grades.calculatedgrade');
        } else if (text.indexOf('/mod/') > -1) {
            const module = text.match(/mod\/([^/]*)\//);
            const modname = module?.[1];

            if (modname !== undefined) {
                const modicon = convertTextToHTMLElement(text).querySelector('img')?.getAttribute('src') ?? undefined;

                row.itemtype = 'mod';
                row.itemmodule = modname;
                row.iconAlt = CoreCourseModuleHelper.translateModuleName(row.itemmodule) || '';
                row.image = await CoreCourseModuleDelegate.getModuleIconSrc(modname, modicon);
            }
        } else {
            if (row.rowspan && row.rowspan > 1) {
                row.itemtype = 'category';
                row.icon = 'fas-cubes';
                row.iconAlt = Translate.instant('core.grades.category');
            } else if (text.indexOf('src=') > -1) {
                row.itemtype = 'unknown';
                const src = text.match(/src="([^"]*)"/);
                row.image = src?.[1];
                row.iconAlt = Translate.instant('core.unknown');
            } else if (text.indexOf('<i ') > -1) {
                row.itemtype = 'unknown';
                const src = text.match(/<i class="(?:[^"]*?\s)?(fa-[a-z0-9-]+)/);
                row.icon = src ? src[1] : '';
                row.iconAlt = Translate.instant('core.unknown');
            }
        }
    }

    /**
     * Creates an array that represents all the current grades that can be chosen using the given grading type.
     * Negative numbers are scales, zero is no grade, and positive numbers are maximum grades.
     *
     * Taken from make_grades_menu on moodlelib.php
     *
     * @param gradingType If positive, max grade you can provide. If negative, scale Id.
     * @param moduleId Module ID. Used to retrieve the scale items when they are not passed as parameter.
     *                 If the user does not have permision to manage the activity an empty list is returned.
     * @param defaultLabel Element that will become default option, if not defined, it won't be added.
     * @param defaultValue Element that will become default option value. Default ''.
     * @param scale Scale csv list String. If not provided, it will take it from the module grade info.
     * @returns Array with objects with value and label to create a propper HTML select.
     */
    async makeGradesMenu(
        gradingType?: number,
        moduleId?: number,
        defaultLabel: string = '',
        defaultValue: string | number = '',
        scale?: string,
    ): Promise<CoreGradesMenuItem[]> {
        if (gradingType === undefined) {
            return [];
        }

        if (gradingType < 0) {
            if (scale) {
                return CoreUtils.makeMenuFromList(scale, defaultLabel, undefined, defaultValue);
            }

            if (moduleId) {
                const gradeInfo = await CoreCourse.getModuleBasicGradeInfo(moduleId);
                if (gradeInfo && gradeInfo.scale) {
                    return CoreUtils.makeMenuFromList(gradeInfo.scale, defaultLabel, undefined, defaultValue);
                }
            }

            return [];
        }

        if (gradingType > 0) {
            const grades: CoreGradesMenuItem[] = [];

            if (defaultLabel) {
                // Key as string to avoid resorting of the object.
                grades.push({
                    label: defaultLabel,
                    value: defaultValue,
                });
            }

            for (let i = gradingType; i >= 0; i--) {
                grades.push({
                    label: `${i} / ${gradingType}`,
                    value: i,
                });
            }

            return grades;
        }

        return [];
    }

    /**
     * Type guard to check if the param is a CoreGradesGradeItem.
     *
     * @param item Param to check.
     * @returns Whether the param is a CoreGradesGradeItem.
     */
    isGradeItem(item: CoreGradesGradeItem | CoreGradesFormattedRow): item is CoreGradesGradeItem {
        return 'outcomeid' in item;
    }

    /**
     * Check whether to show the gradebook to this user.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @returns Whether to show the gradebook to this user.
     */
    async showGradebook(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): Promise<boolean> {
        if (accessData && accessData.type === CoreCourseAccessDataType.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions?.grades !== undefined) {
            return navOptions.grades;
        }

        return CoreGrades.isPluginEnabledForCourse(courseId);
    }

}

export const CoreGradesHelper = makeSingleton(CoreGradesHelperProvider);

export type CoreGradesFormattedItem = CoreGradesGradeItem & {
    weight?: string; // Weight.
    grade?: string; // The grade formatted.
    range?: string; // Range formatted.
    percentage?: string; // Percentage.
    lettergrade?: string; // Letter grade.
    average?: string; // Grade average.
};

export type CoreGradesFormattedRowCommonData = {
    icon?: string;
    rowclass?: string;
    itemtype?: string;
    image?: string;
    itemmodule?: string;
    iconAlt?: string;
    rowspan?: number;
    weight?: string; // Weight column.
    grade?: string; // Grade column.
    range?: string;// Range column.
    percentage?: string; // Percentage column.
    lettergrade?: string; // Lettergrade column.
    rank?: string; // Rank column.
    average?: string; // Average column.
    feedback?: string; // Feedback column.
    contributiontocoursetotal?: string; // Contributiontocoursetotal column.
};

export type CoreGradesFormattedRow = CoreGradesFormattedRowCommonData & {
    link?: string | false;
    itemname?: string; // The item returned data.
};

export type CoreGradesFormattedTable = {
    columns: CoreGradesFormattedTableColumn[];
    rows: CoreGradesFormattedTableRow[];
};

export type CoreGradesFormattedTableRow = CoreGradesFormattedRowCommonData & {
    id?: number;
    detailsid?: string;
    colspan?: number;
    gradeitem?: string; // The item returned data.
    ariaLabel?: string;
    expandable?: boolean;
    expanded?: boolean;
    gradeClass?: string;
    gradeIcon?: string;
    gradeIconAlt?: string;
    penalty?: string;
};

export type CoreGradesFormattedTableColumn = {
    name: string;
    colspan: number;
    hiddenPhone: boolean;
};

/**
 * Grade overview with course data added by CoreGradesHelperProvider#addCourseData method.
 */
export type CoreGradesGradeOverviewWithCourseData = CoreGradesGradeOverview & {
    courseFullName: string;
};

/**
 * Grade menu item created by CoreGradesHelperProvider#makeGradesMenu method.
 */
export type CoreGradesMenuItem = {
    label: string;
    value: string | number;
};
