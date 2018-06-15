// (C) Copyright 2015 Martin Dougiamas
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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreGradesProvider } from './grades';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Service that provides some features regarding grades information.
 */
@Injectable()
export class CoreGradesHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private coursesProvider: CoreCoursesProvider,
            private gradesProvider: CoreGradesProvider, private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private urlUtils: CoreUrlUtilsProvider, private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreGradesHelperProvider');
    }

    /**
     * Formats a row from the grades table te be rendered in a page.
     *
     * @param  {any}  tableRow JSON object representing row of grades table data.
     * @return {any}           Formatted row object.
     */
    protected formatGradeRow(tableRow: any): any {
        const row = {};
        for (const name in tableRow) {
            if (typeof(tableRow[name].content) != 'undefined') {
                let content = tableRow[name].content;

                if (name == 'itemname') {
                    this.setRowIcon(row, content);
                    row['link'] = this.getModuleLink(content);
                    row['rowclass'] += tableRow[name].class.indexOf('hidden') >= 0 ? ' hidden' : '';
                    row['rowclass'] += tableRow[name].class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                    content = content.replace(/<\/span>/gi, '\n');
                    content = this.textUtils.cleanTags(content);
                } else {
                    content = this.textUtils.replaceNewLines(content, '<br>');
                }

                if (content == '&nbsp;') {
                    content = '';
                }

                row[name] = content.trim();
            }
        }

        return row;
    }

    /**
     * Formats a row from the grades table to be rendered in one table.
     *
     * @param  {any}  tableRow JSON object representing row of grades table data.
     * @return {any}           Formatted row object.
     */
    protected formatGradeRowForTable(tableRow: any): any {
        const row = {};
        for (let name in tableRow) {
            if (typeof(tableRow[name].content) != 'undefined') {
                let content = tableRow[name].content;

                if (name == 'itemname') {
                    this.setRowIcon(row, content);
                    row['rowclass'] = tableRow[name].class.indexOf('leveleven') < 0 ? 'odd' : 'even';
                    row['rowclass'] += tableRow[name].class.indexOf('hidden') >= 0 ? ' hidden' : '';
                    row['rowclass'] += tableRow[name].class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                    content = content.replace(/<\/span>/gi, '\n');
                    content = this.textUtils.cleanTags(content);

                    row['id'] = parseInt(tableRow[name].id.split('_')[1], 10);
                    row['colspan'] = tableRow[name].colspan;
                    row['rowspan'] = (tableRow['leader'] && tableRow['leader'].rowspan) || 1;
                    name = 'gradeitem';
                } else {
                    content = this.textUtils.replaceNewLines(content, '<br>');
                }

                if (content == '&nbsp;') {
                    content = '';
                }

                row[name] = content.trim();
            }
        }

        return row;
    }

    /**
     * Removes suffix formatted to compatibilize data from table and items.
     *
     * @param  {any} item Grade item to format.
     * @return {any}      Grade item formatted.
     */
    protected formatGradeItem(item: any): any {
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
     * @param  {any}  table          JSON object representing a table with data.
     * @return {any}             Formatted HTML table.
     */
    formatGradesTable(table: any): any {
        const maxDepth = table.maxdepth,
            formatted = {
                columns: [],
                rows: []
            },
            // Columns, in order.
            columns = {
                gradeitem: true,
                weight: false,
                grade: false,
                range: false,
                percentage: false,
                lettergrade: false,
                rank: false,
                average: false,
                feedback: false,
                contributiontocoursetotal: false
            };
        formatted.rows = table.tabledata.map((row: any) => {
            return this.formatGradeRowForTable(row);
        }).filter((row: any) => {
            return typeof row.gradeitem !== 'undefined';
        });

        // Get a row with some info.
        let normalRow = formatted.rows.find((e) => {
            return e.itemtype != 'leader' && (typeof e.grade != 'undefined' || typeof e.percentage != 'undefined');
        });

        // Decide if grades or percentage is being shown on phones.
        if (normalRow && typeof normalRow.grade != 'undefined') {
            columns.grade = true;
        } else if (normalRow && typeof normalRow.percentage != 'undefined') {
            columns.percentage = true;
        } else {
            normalRow = formatted.rows.find((e) => {
                return e.itemtype != 'leader';
            });
            columns.grade = true;
        }

        for (const colName in columns) {
            if (typeof normalRow[colName] != 'undefined') {
                formatted.columns.push({
                    name: colName,
                    colspan: colName == 'gradeitem' ? maxDepth : 1,
                    hiddenPhone: !columns[colName]
                });
            }
        }

        return formatted;
    }

    /**
     * Get course data for grades since they only have courseid.
     *
     * @param  {any} grades    Grades to get the data for.
     * @return {Promise<any>}  Promise always resolved. Resolve param is the formatted grades.
     */
    getGradesCourseData(grades: any): Promise<any> {
        // Using cache for performance reasons.
        return this.coursesProvider.getUserCourses(true).then((courses) => {
            const indexedCourses = {};
            courses.forEach((course) => {
                indexedCourses[course.id] = course;
            });

            grades.forEach((grade) => {
                if (typeof indexedCourses[grade.courseid] != 'undefined') {
                    grade.courseFullName = indexedCourses[grade.courseid].fullname;
                }
            });

            return grades;
        });
    }

    /**
     * Get an specific grade item.
     *
     * @param  {number}  courseId             ID of the course to get the grades from.
     * @param  {number}  gradeId              Grade ID.
     * @param  {number}  [userId]             ID of the user to get the grades from. If not defined use site's current user.
     * @param  {string}  [siteId]             Site ID. If not defined, current site.
     * @param  {boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}                Promise to be resolved when the grades are retrieved.
     */
    getGradeItem(courseId: number, gradeId: number, userId?: number, siteId?: string, ignoreCache: boolean = false): Promise<any> {

        return this.gradesProvider.getCourseGradesTable(courseId, userId, siteId, ignoreCache).then((grades) => {
            if (grades) {
                return this.getGradesTableRow(grades, gradeId);
            }

            return Promise.reject(null);
        });
    }

    /**
     * Returns the label of the selected grade.
     *
     * @param {any[]} grades Array with objects with value and label.
     * @param {number} selectedGrade Selected grade value.
     * @return {string} Selected grade label.
     */
    getGradeLabelFromValue(grades: any[], selectedGrade: number): string {
        selectedGrade = Number(selectedGrade);

        if (!grades || !selectedGrade || selectedGrade <= 0) {
            return '';
        }

        for (const x in grades) {
            if (grades[x].value == selectedGrade) {
                return grades[x].label;
            }
        }

        return '';
    }

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @param  {number}  courseId             ID of the course to get the grades from.
     * @param  {number}  moduleId             Module ID.
     * @param  {number}  [userId]             ID of the user to get the grades from. If not defined use site's current user.
     * @param  {number}  [groupId]            ID of the group to get the grades from. Not used for old gradebook table.
     * @param  {string}  [siteId]             Site ID. If not defined, current site.
     * @param  {boolean} [ignoreCache=false]  True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>}                Promise to be resolved when the grades are retrieved.
     */
    getGradeModuleItems(courseId: number, moduleId: number, userId?: number, groupId?: number, siteId?: string,
            ignoreCache: boolean = false): Promise<any> {

        return this.gradesProvider.getGradeItems(courseId, userId, groupId, siteId, ignoreCache).then((grades) => {
            if (grades) {
                if (typeof grades.tabledata != 'undefined') {
                    // Table format.
                    return this.getModuleGradesTableRows(grades, moduleId);
                } else {
                    return grades.filter((item) => {
                        return item.cmid == moduleId;
                    }).map((item) => {
                        return this.formatGradeItem(item);
                    });
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Returns the value of the selected grade.
     *
     * @param {any[]} grades Array with objects with value and label.
     * @param {string} selectedGrade Selected grade label.
     * @return {number} Selected grade value.
     */
    getGradeValueFromLabel(grades: any[], selectedGrade: string): number {
        if (!grades || !selectedGrade) {
            return 0;
        }

        for (const x in grades) {
            if (grades[x].label == selectedGrade) {
                return grades[x].value < 0 ? 0 : grades[x].value;
            }
        }

        return 0;
    }

    /**
     * Gets the link to the module for the selected grade.
     *
     * @param  {string} text HTML where the link is present.
     * @return {string | false}      URL linking to the module.
     */
    protected getModuleLink(text: string): string | false {
        const el = this.domUtils.toDom(text)[0],
            link = el.attributes['href'] ? el.attributes['href'].value : false;

        if (!link || link.indexOf('/mod/') < 0) {
            return false;
        }

        return link;
    }

    /**
     * Get a row from the grades table.
     *
     * @param  {any}   table    JSON object representing a table with data.
     * @param  {number} gradeId Grade Object identifier.
     * @return {any}            Formatted HTML table.
     */
    getGradesTableRow(table: any, gradeId: number): any {
        if (table.tabledata) {
            const selectedRow = table.tabledata.find((row) => {
                return row.itemname && row.itemname.id && row.itemname.id.substr(0, 3) == 'row' &&
                    parseInt(row.itemname.id.split('_')[1], 10) == gradeId;
            });

            if (selectedRow) {
                return this.formatGradeRow(selectedRow);
            }
        }

        return '';
    }

    /**
     * Get the rows related to a module from the grades table.
     *
     * @param  {any}   table     JSON object representing a table with data.
     * @param  {number} moduleId Grade Object identifier.
     * @return {any}             Formatted HTML table.
     */
    getModuleGradesTableRows(table: any, moduleId: number): any {

        if (table.tabledata) {
            // Find href containing "/mod/xxx/xxx.php".
            const regex = /href="([^"]*\/mod\/[^"|^\/]*\/[^"|^\.]*\.php[^"]*)/;

            return table.tabledata.filter((row) => {
                if (row.itemname && row.itemname.content) {
                    const matches = row.itemname.content.match(regex);

                    if (matches && matches.length) {
                        const hrefParams = this.urlUtils.extractUrlParams(matches[1]);

                        return hrefParams && hrefParams.id == moduleId;
                    }
                }

                return false;
            }).map((row) => {
                return this.formatGradeRow(row);
            });
        }

        return [];
    }

    /**
     * Invalidate the grade items for a certain module.
     *
     * @param  {number}  courseId     ID of the course to invalidate the grades.
     * @param  {number}  [userId]     ID of the user to invalidate. If not defined use site's current user.
     * @param  {number}  [groupId]    ID of the group to invalidate. Not used for old gradebook table.
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise}              Promise to be resolved when the grades are invalidated.
     */
    invalidateGradeModuleItems(courseId: number, userId?: number, groupId?: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return this.gradesProvider.isGradeItemsAvalaible(siteId).then((enabled) => {
                if (enabled) {
                    return this.gradesProvider.invalidateCourseGradesItemsData(courseId, userId, groupId, siteId);
                } else {
                    return this.gradesProvider.invalidateCourseGradesData(courseId, userId, siteId);
                }
            });
        });
    }

    /**
     * Parses the image and sets it to the row.
     *
     * @param  {any} row  Formatted grade row object.
     * @param  {string} text HTML where the image will be rendered.
     * @return {any}      Row object with the image.
     */
    protected setRowIcon(row: any, text: string): any {
        text = text.replace('%2F', '/').replace('%2f', '/');

        if (text.indexOf('/agg_mean') > -1) {
            row['itemtype'] = 'agg_mean';
            row['image'] = 'assets/img/grades/agg_mean.png';
        } else if (text.indexOf('/agg_sum') > -1) {
            row['itemtype'] = 'agg_sum';
            row['image'] = 'assets/img/grades/agg_sum.png';
        } else if (text.indexOf('/outcomes') > -1 || text.indexOf('fa-tasks')  > -1) {
            row['itemtype'] = 'outcome';
            row['image'] = 'assets/img/grades/outcomes.png';
        } else if (text.indexOf('i/folder') > -1 || text.indexOf('fa-folder')  > -1) {
            row['itemtype'] = 'category';
            row['icon'] = 'folder';
        } else if (text.indexOf('/manual_item') > -1 || text.indexOf('fa-square-o')  > -1) {
            row['itemtype'] = 'manual';
            row['icon'] = 'square-outline';
        } else if (text.indexOf('/mod/') > -1) {
            const module = text.match(/mod\/([^\/]*)\//);
            if (typeof module[1] != 'undefined') {
                row['itemtype'] = 'mod';
                row['itemmodule'] = module[1];
                row['image'] = this.courseProvider.getModuleIconSrc(module[1]);
            }
        } else if (text.indexOf('src=') > -1) {
            const src = text.match(/src="([^"]*)"/);
            row['image'] = src[1];
        }

        return row;
    }

    /**
     * Creates an array that represents all the current grades that can be chosen using the given grading type.
     * Negative numbers are scales, zero is no grade, and positive numbers are maximum grades.
     *
     * Taken from make_grades_menu on moodlelib.php
     *
     * @param  {number} gradingType     If positive, max grade you can provide. If negative, scale Id.
     * @param  {number} moduleId        Module Id needed to retrieve the scale.
     * @param  {string} [defaultLabel]  Element that will become default option, if not defined, it won't be added.
     * @param  {any}    [defaultValue]  Element that will become default option value. Default ''.
     * @param  {string} [scale]         Scale csv list String. If not provided, it will take it from the module grade info.
     * @return {Promise<any[]>}         Array with objects with value and label to create a propper HTML select.
     */
    makeGradesMenu(gradingType: number, moduleId: number, defaultLabel: string = '', defaultValue: any = '', scale?: string):
            Promise<any[]> {
        if (gradingType < 0) {
            if (scale) {
                return Promise.resolve(this.utils.makeMenuFromList(scale, defaultLabel, undefined, defaultValue));
            } else {
                return this.courseProvider.getModuleBasicGradeInfo(moduleId).then((gradeInfo) => {
                    if (gradeInfo.scale) {
                        return this.utils.makeMenuFromList(gradeInfo.scale, defaultLabel, undefined,  defaultValue);
                    }

                    return [];
                });
            }
        }

        if (gradingType > 0) {
            const grades = [];
            if (defaultLabel) {
                // Key as string to avoid resorting of the object.
                grades.push({
                    label: defaultLabel,
                    value: defaultValue
                });
            }
            for (let i = gradingType; i >= 0; i--) {
                 grades.push({
                    label: i + ' / ' + gradingType,
                    value: i
                });
            }

            return Promise.resolve(grades);
        }

        return Promise.resolve([]);
    }
}
