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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { TranslateService } from '@ngx-translate/core';
import { CoreCoursesProvider } from '../../courses/providers/courses';
import { CoreCourseProvider } from '../../course/providers/course';
import { CoreGradesProvider } from './grades';
import { CoreTextUtilsProvider } from '../../../providers/utils/text';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';

/**
 * Service that provides some features regarding grades information.
 */
@Injectable()
export class CoreGradesHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private coursesProvider: CoreCoursesProvider,
            private gradesProvider: CoreGradesProvider, private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService) {
        this.logger = logger.getInstance('CoreGradesHelperProvider');
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
            return this.getGradeRow(row);
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
     * Get a row from the grades table.
     *
     * @param  {any}  tableRow JSON object representing row of grades table data.
     * @return {any}           Formatted row object.
     */
    getGradeRow(tableRow: any): any {
        const row = {};
        for (let name in tableRow) {
            if (typeof(tableRow[name].content) != 'undefined') {
                let content = tableRow[name].content;

                if (name == 'itemname') {
                    this.setRowIcon(row, content);
                    row['link'] = this.getModuleLink(content);
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
     * Get course data for grades since they only have courseid.
     *
     * @param  {Object[]} grades  Grades to get the data for.
     * @return {Promise<any>}         Promise always resolved. Resolve param is the formatted grades.
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
                    grade.coursefullname = indexedCourses[grade.courseid].fullname;
                }
            });

            return grades;
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
}
