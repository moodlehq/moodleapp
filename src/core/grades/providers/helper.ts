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
import { NavController } from 'ionic-angular';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreGradesProvider } from './grades';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * Service that provides some features regarding grades information.
 */
@Injectable()
export class CoreGradesHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private coursesProvider: CoreCoursesProvider,
            private gradesProvider: CoreGradesProvider, private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private urlUtils: CoreUrlUtilsProvider, private utils: CoreUtilsProvider,
            private linkHelper: CoreContentLinksHelperProvider, private courseHelper: CoreCourseHelperProvider) {
        this.logger = logger.getInstance('CoreGradesHelperProvider');
    }

    /**
     * Formats a row from the grades table te be rendered in a page.
     *
     * @param tableRow JSON object representing row of grades table data.
     * @return Formatted row object.
     */
    protected formatGradeRow(tableRow: any): any {
        const row = {};
        for (const name in tableRow) {
            if (typeof tableRow[name].content != 'undefined' && tableRow[name].content !== null) {
                let content = String(tableRow[name].content);

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
     * @param tableRow JSON object representing row of grades table data.
     * @return Formatted row object.
     */
    protected formatGradeRowForTable(tableRow: any): any {
        const row = {};
        for (let name in tableRow) {
            if (typeof tableRow[name].content != 'undefined' && tableRow[name].content !== null) {
                let content = String(tableRow[name].content);

                if (name == 'itemname') {
                    row['id'] = parseInt(tableRow[name].id.split('_')[1], 10);
                    row['colspan'] = tableRow[name].colspan;
                    row['rowspan'] = (tableRow['leader'] && tableRow['leader'].rowspan) || 1;

                    this.setRowIcon(row, content);
                    row['rowclass'] = tableRow[name].class.indexOf('leveleven') < 0 ? 'odd' : 'even';
                    row['rowclass'] += tableRow[name].class.indexOf('hidden') >= 0 ? ' hidden' : '';
                    row['rowclass'] += tableRow[name].class.indexOf('dimmed_text') >= 0 ? ' dimmed_text' : '';

                    content = content.replace(/<\/span>/gi, '\n');
                    content = this.textUtils.cleanTags(content);
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
     * @param item Grade item to format.
     * @return Grade item formatted.
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
     * @param table JSON object representing a table with data.
     * @return Formatted HTML table.
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
     * @param grades Grades to get the data for.
     * @return Promise always resolved. Resolve param is the formatted grades.
     */
    async getGradesCourseData(grades: any[]): Promise<any> {
        // Obtain courses from cache to prevent network requests.
        let coursesWereMissing;

        try {
            const courses = await this.coursesProvider.getUserCourses(undefined, undefined, CoreSitesReadingStrategy.OnlyCache);

            const coursesMap = this.utils.arrayToObject(courses, 'id');

            coursesWereMissing = this.addCourseData(grades, coursesMap);
        } catch (error) {
            coursesWereMissing = true;
        }

        // If any course wasn't found, make a network request.
        if (coursesWereMissing) {
            const coursesPromise = this.coursesProvider.isGetCoursesByFieldAvailable()
                ? this.coursesProvider.getCoursesByField('ids', grades.map((grade) => grade.courseid).join(','))
                : this.coursesProvider.getUserCourses(undefined, undefined, CoreSitesReadingStrategy.PreferNetwork);

            const courses = await coursesPromise;

            const coursesMap = this.utils.arrayToObject(courses, 'id');

            this.addCourseData(grades, coursesMap);
        }

        return grades.filter((grade) => grade.courseFullName !== undefined);
    }

    /**
     * Adds course data to grades.
     *
     * @param grades Array of grades to populate.
     * @param courses HashMap of courses to read data from.
     * @return Boolean indicating if some courses were not found.
     */
    protected addCourseData(grades: any[], courses: any): boolean {
        let someCoursesAreMissing = false;

        for (const grade of grades) {
            if (!(grade.courseid in courses)) {
                someCoursesAreMissing = true;

                continue;
            }

            grade.courseFullName = courses[grade.courseid].fullname;
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
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade value.
     * @return Selected grade label.
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
     * @param courseId ID of the course to get the grades from.
     * @param moduleId Module ID.
     * @param userId ID of the user to get the grades from. If not defined use site's current user.
     * @param groupId ID of the group to get the grades from. Not used for old gradebook table.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @return Promise to be resolved when the grades are retrieved.
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
     * @param grades Array with objects with value and label.
     * @param selectedGrade Selected grade label.
     * @return Selected grade value.
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
     * @param text HTML where the link is present.
     * @return URL linking to the module.
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
     * @param table JSON object representing a table with data.
     * @param gradeId Grade Object identifier.
     * @return Formatted HTML table.
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
     * @param table JSON object representing a table with data.
     * @param moduleId Grade Object identifier.
     * @return Formatted HTML table.
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
     * Go to view grades.
     *
     * @param courseId Course ID t oview.
     * @param userId User to view. If not defined, current user.
     * @param moduleId Module to view. If not defined, view all course grades.
     * @param navCtrl NavController to use.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    goToGrades(courseId: number, userId?: number, moduleId?: number, navCtrl?: NavController, siteId?: string): Promise<any> {

        const modal = this.domUtils.showModalLoading();
        let currentUserId;

        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.id;
            currentUserId = site.getUserId();

            if (moduleId) {
                // Try to open the module grade directly. Check if it's possible.
                return this.gradesProvider.isGradeItemsAvalaible(siteId).then((getGrades) => {
                    if (!getGrades) {
                        return Promise.reject(null);
                    }
                });
            } else {
                return Promise.reject(null);
            }

        }).then(() => {

            // Can get grades. Do it.
            return this.gradesProvider.getGradeItems(courseId, userId, undefined, siteId).then((items) => {
                // Find the item of the module.
                const item = items.find((item) => {
                    return moduleId == item.cmid;
                });

                if (item) {
                    // Open the item directly.
                    const pageParams: any = {
                        courseId: courseId,
                        userId: userId,
                        gradeId: item.id
                    };

                    return this.linkHelper.goInSite(navCtrl, 'CoreGradesGradePage', pageParams, siteId).catch(() => {
                        // Ignore errors.
                    });
                }

                return Promise.reject(null);
            });

        }).catch(() => {

            // Cannot get grade items or there's no need to.
            if (userId && userId != currentUserId) {
                // View another user grades. Open the grades page directly.
                const pageParams = {
                    course: {id: courseId},
                    userId: userId
                };

                return this.linkHelper.goInSite(navCtrl, 'CoreGradesCoursePage', pageParams, siteId).catch(() => {
                    // Ignore errors.
                });
            }

            // View own grades. Check if we already are in the course index page.
            if (this.courseProvider.currentViewIsCourse(navCtrl, courseId)) {
                // Current view is this course, just select the grades tab.
                this.courseProvider.selectCourseTab('CoreGrades');

                return;
            }

            // Open the course with the grades tab selected.
            return this.courseHelper.getCourse(courseId, siteId).then((result) => {
                const pageParams: any = {
                    course: result.course,
                    selectedTab: 'CoreGrades'
                };

                return this.linkHelper.goInSite(navCtrl, 'CoreCourseSectionPage', pageParams, siteId).catch(() => {
                    // Ignore errors.
                });
            });
        }).catch(() => {
            // Cannot get course for some reason, just open the grades page.
            return this.linkHelper.goInSite(navCtrl, 'CoreGradesCoursePage', {course: {id: courseId}}, siteId);
        }).finally(() => {
            modal.dismiss();
        });
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
     * @param row Formatted grade row object.
     * @param text HTML where the image will be rendered.
     * @return Row object with the image.
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
            row['icon'] = 'fa-tasks';
        } else if (text.indexOf('i/folder') > -1 || text.indexOf('fa-folder')  > -1) {
            row['itemtype'] = 'category';
            row['icon'] = 'fa-folder';
        } else if (text.indexOf('/manual_item') > -1 || text.indexOf('fa-square-o')  > -1) {
            row['itemtype'] = 'manual';
            row['icon'] = 'fa-square-o';
        } else if (text.indexOf('/mod/') > -1) {
            const module = text.match(/mod\/([^\/]*)\//);
            if (typeof module[1] != 'undefined') {
                row['itemtype'] = 'mod';
                row['itemmodule'] = module[1];
                row['image'] = this.courseProvider.getModuleIconSrc(module[1],
                    this.domUtils.convertToElement(text).querySelector('img').getAttribute('src'));
            }
        } else {
            if (row['rowspan'] && row['rowspan'] > 1) {
                row['itemtype'] = 'category';
                row['icon'] = 'fa-folder';
            } else if (text.indexOf('src=') > -1) {
                row['itemtype'] = 'unknown';
                const src = text.match(/src="([^"]*)"/);
                row['image'] = src[1];
            } else if (text.indexOf('<i ') > -1) {
                row['itemtype'] = 'unknown';
                const src = text.match(/<i class="(?:[^"]*?\s)?(fa-[a-z0-9-]+)/);
                row['icon'] = src ? src[1] : '';
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
    makeGradesMenu(gradingType: number, moduleId?: number, defaultLabel: string = '', defaultValue: any = '', scale?: string):
            Promise<any[]> {
        if (gradingType < 0) {
            if (scale) {
                return Promise.resolve(this.utils.makeMenuFromList(scale, defaultLabel, undefined, defaultValue));
            } else if (moduleId) {
                return this.courseProvider.getModuleBasicGradeInfo(moduleId).then((gradeInfo) => {
                    if (gradeInfo.scale) {
                        return this.utils.makeMenuFromList(gradeInfo.scale, defaultLabel, undefined,  defaultValue);
                    }

                    return [];
                });
            } else {
                return Promise.resolve([]);
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
