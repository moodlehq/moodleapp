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
import { CoreCourses, CoreEnrolledCourseData, CoreCourseSearchedData } from '@features/courses/services/courses';
import { CoreCourse } from '@features/course/services/course';
import {
    CoreGrades,
    CoreGradesGradeItem,
    CoreGradesGradeOverview,
    CoreGradesTable,
    CoreGradesTableColumn,
    CoreGradesTableItemNameColumn,
    CoreGradesTableRow,
} from '@features/grades/services/grades';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreMenuItem, CoreUtils } from '@services/utils/utils';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton, Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreCourseHelper } from '@features/course/services/course-helper';

/**
 * Service that provides some features regarding grades information.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesHelperProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreGradesHelperProvider');
    }

    /**
     * Formats a row from the grades table te be rendered in a page.
     *
     * @param tableRow JSON object representing row of grades table data.
     * @return Formatted row object.
     */
    protected formatGradeRow(tableRow: CoreGradesTableRow): CoreGradesFormattedRow {
        const row: CoreGradesFormattedRow = {
            rowclass: '',
        };
        for (const name in tableRow) {
            const column: CoreGradesTableColumn = tableRow[name];

            if (column.content === undefined || column.content === null) {
                continue;
            }

            let content = String(column.content);

            if (name == 'itemname') {
                this.setRowIcon(row, content);
                row.link = this.getModuleLink(content);
                row.rowclass += column.class.indexOf('hidden') >= 0 ? ' hidden' : '';
                row.rowclass += column.class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                content = content.replace(/<\/span>/gi, '\n');
                content = CoreTextUtils.cleanTags(content);
            } else {
                content = CoreTextUtils.replaceNewLines(content, '<br>');
            }

            if (content == '&nbsp;') {
                content = '';
            }

            row[name] = content.trim();
        }

        return row;
    }

    /**
     * Formats a row from the grades table to be rendered in one table.
     *
     * @param tableRow JSON object representing row of grades table data.
     * @return Formatted row object.
     */
    protected formatGradeRowForTable(tableRow: CoreGradesTableRow): CoreGradesFormattedTableRow {
        const row: CoreGradesFormattedTableRow = {};
        for (let name in tableRow) {
            const column: CoreGradesTableColumn = tableRow[name];

            if (column.content === undefined || column.content === null) {
                continue;
            }

            let content = String(column.content);

            if (name == 'itemname') {
                const itemNameColumn = <CoreGradesTableItemNameColumn> column;

                row.id = parseInt(itemNameColumn.id.split('_')[1], 10);
                row.colspan = itemNameColumn.colspan;
                row.rowspan = tableRow.leader?.rowspan || 1;

                this.setRowIcon(row, content);
                row.rowclass = itemNameColumn.class.indexOf('leveleven') < 0 ? 'odd' : 'even';
                row.rowclass += itemNameColumn.class.indexOf('hidden') >= 0 ? ' hidden' : '';
                row.rowclass += itemNameColumn.class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                content = content.replace(/<\/span>/gi, '\n');
                content = CoreTextUtils.cleanTags(content);
                name = 'gradeitem';
            } else {
                content = CoreTextUtils.replaceNewLines(content, '<br>');
            }

            if (content == '&nbsp;') {
                content = '';
            }

            row[name] = content.trim();
        }

        return row;
    }

    /**
     * Removes suffix formatted to compatibilize data from table and items.
     *
     * @param item Grade item to format.
     * @return Grade item formatted.
     */
    protected formatGradeItem(item: CoreGradesGradeItem): CoreGradesFormattedItem {
        for (const name in item) {
            const index = name.indexOf('formatted');
            if (index > 0) {
                item[name.substr(0, index)] = item[name];
            }
        }

        return item;
    }

    /**
     * Formats the response of gradereport_user_get_grades_table to be rendered.
     *
     * @param table JSON object representing a table with data.
     * @return Formatted HTML table.
     */
    formatGradesTable(table: CoreGradesTable): CoreGradesFormattedTable {
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
        formatted.rows = table.tabledata.map(row => this.formatGradeRowForTable(row));

        // Get a row with some info.
        let normalRow = formatted.rows.find(
            row =>
                row.itemtype != 'leader' &&
                (typeof row.grade != 'undefined' || typeof row.percentage != 'undefined'),
        );

        // Decide if grades or percentage is being shown on phones.
        if (normalRow && typeof normalRow.grade != 'undefined') {
            columns.grade = true;
        } else if (normalRow && typeof normalRow.percentage != 'undefined') {
            columns.percentage = true;
        } else {
            normalRow = formatted.rows.find((e) => e.itemtype != 'leader');
            columns.grade = true;
        }

        for (const colName in columns) {
            if (normalRow && typeof normalRow[colName] != 'undefined') {
                formatted.columns.push({
                    name: colName,
                    colspan: colName == 'gradeitem' ? maxDepth : 1,
                    hiddenPhone: !columns[colName],
                });
            }
        }

        return formatted;
    }

    /**
     * Get course data for grades since they only have courseid.
     *
     * @param grades Grades to get the data for.
     * @return Promise always resolved. Resolve param is the formatted grades.
     */
    async getGradesCourseData(grades: CoreGradesGradeOverview[]): Promise<CoreGradesGradeOverviewWithCourseData[]> {
        // Obtain courses from cache to prevent network requests.
        let coursesWereMissing = false;

        try {
            const courses = await CoreCourses.getUserCourses(undefined, undefined, CoreSitesReadingStrategy.ONLY_CACHE);
            const coursesMap = CoreUtils.arrayToObject(courses, 'id');

            coursesWereMissing = this.addCourseData(grades, coursesMap);
        } catch {
            coursesWereMissing = true;
        }

        // If any course wasn't found, make a network request.
        if (coursesWereMissing) {
            const coursesPromise = CoreCourses.isGetCoursesByFieldAvailable()
                ? CoreCourses.getCoursesByField('ids', grades.map((grade) => grade.courseid).join(','))
                : CoreCourses.getUserCourses(undefined, undefined, CoreSitesReadingStrategy.PREFER_NETWORK);

            const courses = await coursesPromise;
            const coursesMap =
                CoreUtils.arrayToObject(courses as Record<string, unknown>[], 'id') as
                    Record<string, CoreEnrolledCourseData> |
                    Record<string, CoreCourseSearchedData>;

            this.addCourseData(grades, coursesMap);
        }

        return (grades as Record<string, unknown>[])
            .filter(grade => 'courseFullName' in grade) as CoreGradesGradeOverviewWithCourseData[];
    }

    /**
     * Adds course data to grades.
     *
     * @param grades Array of grades to populate.
     * @param courses HashMap of courses to read data from.
     * @return Boolean indicating if some courses were not found.
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
     * Get an specific grade item.
     *
     * @param courseId ID of the course to get the grades from.
     * @param gradeId Grade ID.
     * @param userId ID of the user to get the grades from. If not defined use site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise to be resolved when the grades are retrieved.
     */
    async getGradeItem(
        courseId: number,
        gradeId: number,
        userId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesFormattedRow | null> {
        const grades = await CoreGrades.getCourseGradesTable(courseId, userId, siteId, ignoreCache);

        if (!grades) {
            throw new CoreError('Couldn\'t get grade item');
        }

        return this.getGradesTableRow(grades, gradeId);
    }

    /**
     * Returns the label of the selected grade.
     *
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade value.
     * @return Selected grade label.
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
     * @return Promise to be resolved when the grades are retrieved.
     */
    async getGradeModuleItems(
        courseId: number,
        moduleId: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesFormattedItem[] | CoreGradesFormattedRow[]> {
        const grades = await CoreGrades.getGradeItems(courseId, userId, groupId, siteId, ignoreCache);

        if (!grades) {
            throw new CoreError('Couldn\'t get grade module items');
        }

        if ('tabledata' in grades) {
            // 3.1 Table format.
            return this.getModuleGradesTableRows(grades, moduleId);
        }

        return grades.filter((item) => item.cmid == moduleId).map((item) => this.formatGradeItem(item));
    }

    /**
     * Returns the value of the selected grade.
     *
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade label.
     * @return Selected grade value.
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
     * @return URL linking to the module.
     */
    protected getModuleLink(text: string): string | false {
        const el = CoreDomUtils.toDom(text)[0];
        const link = el.attributes['href'] ? el.attributes['href'].value : false;

        if (!link || link.indexOf('/mod/') < 0) {
            return false;
        }

        return link;
    }

    /**
     * Get a row from the grades table.
     *
     * @param table JSON object representing a table with data.
     * @param gradeId Grade Object identifier.
     * @return Formatted HTML table.
     */
    getGradesTableRow(table: CoreGradesTable, gradeId: number): CoreGradesFormattedRow | null {
        if (table.tabledata) {
            const selectedRow = table.tabledata.find(
                (row) =>
                    row.itemname &&
                    row.itemname.id &&
                    row.itemname.id.substr(0, 3) == 'row' &&
                    parseInt(row.itemname.id.split('_')[1], 10) == gradeId,
            );

            if (selectedRow) {
                return this.formatGradeRow(selectedRow);
            }
        }

        return null;
    }

    /**
     * Get the rows related to a module from the grades table.
     *
     * @param table JSON object representing a table with data.
     * @param moduleId Grade Object identifier.
     * @return Formatted HTML table.
     */
    getModuleGradesTableRows(table: CoreGradesTable, moduleId: number): CoreGradesFormattedRow[] {
        if (!table.tabledata) {
            return [];
        }

        // Find href containing "/mod/xxx/xxx.php".
        const regex = /href="([^"]*\/mod\/[^"|^/]*\/[^"|^.]*\.php[^"]*)/;

        return table.tabledata.filter((row) => {
            if (row.itemname && row.itemname.content) {
                const matches = row.itemname.content.match(regex);

                if (matches && matches.length) {
                    const hrefParams = CoreUrlUtils.extractUrlParams(matches[1]);

                    return hrefParams && parseInt(hrefParams.id) === moduleId;
                }
            }

            return false;
        }).map((row) => this.formatGradeRow(row));
    }

    /**
     * Go to view grades.
     *
     * @param courseId Course ID to view.
     * @param userId User to view. If not defined, current user.
     * @param moduleId Module to view. If not defined, view all course grades.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async goToGrades(
        courseId: number,
        userId?: number,
        moduleId?: number,
        siteId?: string,
    ): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        const site = await CoreSites.getSite(siteId);

        siteId = site.id;
        const currentUserId = site.getUserId();

        try {
            if (!moduleId) {
                throw new CoreError('Invalid moduleId');
            }

            // Try to open the module grade directly. Check if it's possible.
            const grades = await CoreGrades.isGradeItemsAvailable(siteId);

            if (!grades) {
                throw new CoreError('No grades found.');
            }

            // Can get grades. Do it.
            const items = await CoreGrades.getGradeItems(courseId, userId, undefined, siteId);

            // Find the item of the module.
            const item = Array.isArray(items) && items.find((item) => moduleId == item.cmid);

            if (!item) {
                throw new CoreError('Grade item not found.');
            }

            // Open the item directly.
            const gradeId = item.id;

            await CoreUtils.ignoreErrors(
                CoreNavigator.navigateToSitePath(`/grades/${courseId}/${gradeId}`, {
                    siteId,
                    params: { userId },
                }),
            );
        } catch (error) {
            try {
                // Cannot get grade items or there's no need to.
                if (userId && userId != currentUserId) {
                    // View another user grades. Open the grades page directly.
                    await CoreUtils.ignoreErrors(
                        CoreNavigator.navigateToSitePath(`/grades/${courseId}`, {
                            siteId,
                            params: { userId },
                        }),
                    );
                }

                // View own grades. Check if we already are in the course index page.
                if (CoreCourse.currentViewIsCourse(courseId)) {
                    // Current view is this course, just select the grades tab.
                    CoreCourse.selectCourseTab('CoreGrades');

                    return;
                }

                // Open the course with the grades tab selected.
                await CoreCourseHelper.getAndOpenCourse(courseId, { selectedTab: 'CoreGrades' }, siteId);
            } catch (error) {
                // Cannot get course for some reason, just open the grades page.
                await CoreNavigator.navigateToSitePath(`/grades/${courseId}`, { siteId });
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
     * @return Promise to be resolved when the grades are invalidated.
     */
    async invalidateGradeModuleItems(courseId: number, userId?: number, groupId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const enabled = await CoreGrades.isGradeItemsAvailable(siteId);

        return enabled
            ? CoreGrades.invalidateCourseGradesItemsData(courseId, userId, groupId, siteId)
            : CoreGrades.invalidateCourseGradesData(courseId, userId, siteId);
    }

    /**
     * Parses the image and sets it to the row.
     *
     * @param row Formatted grade row object.
     * @param text HTML where the image will be rendered.
     * @return Row object with the image.
     */
    protected setRowIcon<T extends CoreGradesFormattedRowCommonData>(row: T, text: string): T {
        text = text.replace('%2F', '/').replace('%2f', '/');
        if (text.indexOf('/agg_mean') > -1) {
            row.itemtype = 'agg_mean';
            row.image = 'assets/img/grades/agg_mean.png';
            row.iconAlt = Translate.instant('core.grades.aggregatemean');
        } else if (text.indexOf('/agg_sum') > -1) {
            row.itemtype = 'agg_sum';
            row.image = 'assets/img/grades/agg_sum.png';
            row.iconAlt = Translate.instant('core.grades.aggregatesum');
        } else if (text.indexOf('/outcomes') > -1 || text.indexOf('fa-tasks') > -1) {
            row.itemtype = 'outcome';
            row.icon = 'fas-chart-pie';
            row.iconAlt = Translate.instant('core.grades.outcome');
        } else if (text.indexOf('i/folder') > -1 || text.indexOf('fa-folder') > -1) {
            row.itemtype = 'category';
            row.icon = 'fas-cubes';
            row.iconAlt = Translate.instant('core.grades.category');
        } else if (text.indexOf('/manual_item') > -1 || text.indexOf('fa-square-o') > -1) {
            row.itemtype = 'manual';
            row.icon = 'far-square';
            row.iconAlt = Translate.instant('core.grades.manualitem');
        } else if (text.indexOf('/calc') > -1 || text.indexOf('fa-calculator') > -1) {
            row.itemtype = 'calc';
            row.icon = 'fas-calculator';
            row.iconAlt = Translate.instant('core.grades.calculatedgrade');
        } else if (text.indexOf('/mod/') > -1) {
            const module = text.match(/mod\/([^/]*)\//);
            if (typeof module?.[1] != 'undefined') {
                row.itemtype = 'mod';
                row.itemmodule = module[1];
                row.iconAlt = CoreCourse.translateModuleName(row.itemmodule) || '';
                row.image = CoreCourse.getModuleIconSrc(
                    module[1],
                    CoreDomUtils.convertToElement(text).querySelector('img')?.getAttribute('src') ?? undefined,
                );
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

        return row;
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
     * @return Array with objects with value and label to create a propper HTML select.
     */
    async makeGradesMenu(
        gradingType?: number,
        moduleId?: number,
        defaultLabel: string = '',
        defaultValue: string | number = '',
        scale?: string,
    ): Promise<CoreGradesMenuItem[]> {
        if (typeof gradingType == 'undefined') {
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
                    label: i + ' / ' + gradingType,
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
     * @return Whether the param is a CoreGradesGradeItem.
     */
    isGradeItem(item: CoreGradesGradeItem | CoreGradesFormattedRow): item is CoreGradesGradeItem {
        return 'outcomeid' in item;
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
    colspan?: number;
    gradeitem?: string; // The item returned data.
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
