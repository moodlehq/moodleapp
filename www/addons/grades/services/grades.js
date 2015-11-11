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

angular.module('mm.addons.grades')

/**
 * Service to handle grades.
 *
 * @module mm.addons.grades
 * @ngdoc service
 * @name $mmaGrades
 */
.factory('$mmaGrades', function($q, $log, $mmSite, $mmText, $ionicPlatform, $translate, $mmCourse, $mmCourses) {

    $log = $log.getInstance('$mmaGrades');

    var self = {};

    /**
     * Formats the response of gradereport_user_get_grades_table to be rendered.
     *
     * @param  {Object}  table      JSON object representing a table with data.
     * @param  {Boolean} showSimple True if simple table should be shown, false for full table.
     * @return {Object}             Formatted HTML table.
     */
    function formatGradesTable(table, showSimple) {
        var formatted = {
            columns: [],
            rows: []
        };

        if (!table || !table.tables) {
            return formatted;
        }

        // Columns, by order.
        var columns = [ "itemname", "weight", "grade", "range", "percentage", "lettergrade", "rank",
                        "average", "feedback", "contributiontocoursetotal"];
        var returnedColumns = [];

        var tabledata = [];
        var maxDepth = 0;
        // Check columns returned (maybe some of the above).
        if (table.tables && table.tables[0] && table.tables[0]['tabledata']) {
            tabledata = table.tables[0]['tabledata'];
            maxDepth = table.tables[0]['maxdepth'];
            for (var el in tabledata) {
                // This is a typical row.
                if (!angular.isArray(tabledata[el]) && typeof(tabledata[el]["leader"]) === "undefined") {
                    for (var col in tabledata[el]) {
                        returnedColumns.push(col);
                    }
                    break;
                }
            }
        }

        if (returnedColumns.length > 0) {

            // Reduce the returned columns for phone version.
            if (showSimple) {
                returnedColumns = ["itemname", "grade"];
            }

            for (var el in columns) {
                var colName = columns[el];
                if (returnedColumns.indexOf(colName) > -1) {
                    var width = colName == "itemname" ? maxDepth : 1;
                    var column = {
                        id: colName,
                        name: colName,
                        width: width
                    };
                    formatted.columns.push(column);
                }
            }

            var name, rowspan, tclass, colspan, content, celltype, id, headers,j, img, colspanVal;

            var len = tabledata.length;
            for (var i = 0; i < len; i++) {
                var row = '';
                if (typeof(tabledata[i]['leader']) != "undefined") {
                    rowspan = tabledata[i]['leader']['rowspan'];
                    tclass = tabledata[i]['leader']['class'];
                    row += '<td class="' + tclass + '" rowspan="' + rowspan + '"></td>';
                }
                for (el in returnedColumns) {
                    name = returnedColumns[el];

                    if (typeof(tabledata[i][name]) != "undefined") {
                        tclass = (typeof(tabledata[i][name]['class']) != "undefined")? tabledata[i][name]['class'] : '';
                        colspan = (typeof(tabledata[i][name]['colspan']) != "undefined")? "colspan='"+tabledata[i][name]['colspan']+"'" : '';
                        content = (typeof(tabledata[i][name]['content']) != "undefined")? tabledata[i][name]['content'] : null;
                        celltype = (typeof(tabledata[i][name]['celltype']) != "undefined")? tabledata[i][name]['celltype'] : 'td';
                        id = (typeof(tabledata[i][name]['id']) != "undefined")? "id='" + tabledata[i][name]['id'] +"'" : '';
                        headers = (typeof(tabledata[i][name]['headers']) != "undefined")? "headers='" + tabledata[i][name]['headers'] + "'" : '';

                        if (typeof(content) != "undefined") {
                            img = getImgHTML(content);
                            content = content.replace(/<\/span>/gi, "\n");
                            content = $mmText.cleanTags(content);
                            content = content.replace("\n", "<br />");
                            content = img + " " + content;

                            row += "<" + celltype + " " + id + " " + headers + " " + "class='"+ tclass +"' " + colspan +">";
                            row += content;
                            row += "</" + celltype + ">";
                        }
                    }
                }
                formatted.rows.push(row);
            }
        }

        return formatted;
    }

    /**
     * Gets the HTML code to render the contents img.
     *
     * @param  {String} text HTML where the image will be rendered.
     * @return {String}      HTML code to render the image.
     */
    function getImgHTML(text) {
        var img = '';

        if (text.indexOf("/agg_mean") > -1) {
            img = '<img src="addons/grades/img/agg_mean.png" width="16">';
        } else if (text.indexOf("/agg_sum") > -1) {
            img = '<img src="addons/grades/img/agg_sum.png" width="16">';
        } else if (text.indexOf("/outcomes") > -1) {
            img = '<img src="addons/grades/img/outcomes.png" width="16">';
        } else if (text.indexOf("i/folder") > -1) {
            img = '<img src="addons/grades/img/folder.png" width="16">';
        } else if (text.indexOf("/manual_item") > -1) {
            img = '<img src="addons/grades/img/manual_item.png" width="16">';
        } else if (text.indexOf("/mod/") > -1) {
            var module = text.match(/mod\/([^\/]*)\//);
            if (typeof module[1] != "undefined") {
                var moduleSrc = $mmCourse.getModuleIconSrc(module[1]);
                img = '<img src="' + moduleSrc + '" width="16">';
            }
        }
        if (img) {
            img = '<span class="app-ico">' + img + '</span>';
        }
        return img;
    }

    /**
     * Translates the names of the grades table columns.
     *
     * @param  {Object} table Grades table.
     * @return {Promise}      Promise to be resolved with the translated table.
     */
    function translateGradesTable(table) {
        var columns = angular.copy(table.columns),
            promises = [];

        columns.forEach(function(column) {
            var promise = $translate('mma.grades.'+column.name).then(function(translated) {
                column.name = translated;
            });
            promises.push(promise);
        });

        return $q.all(promises).then(function() {
            return {
                columns: columns,
                rows: table.rows
            };
        });
    };

    /**
     * Returns whether or not the plugin is enabled for the current site.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return $mmSite.wsAvailable('gradereport_user_get_grades_table');
    };

    /**
     * Returns whether or not the grade addon is enabled for a certain course.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#isPluginEnabledForCourse
     * @param {Number} courseId Course ID.
     * @return {Promise}        Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabledForCourse = function(courseId) {
        if (!courseId) {
            return $q.reject();
        }

        return $mmCourses.getUserCourse(courseId, true).then(function(course) {
            if (course && typeof course.showgrades != 'undefined' && !course.showgrades) {
                return false;
            }
            return true;
        });
    };

    /**
     * Get the grades for a certain course.
     * For now we only support gradereport_user_get_grades_table. It returns the complete grades table.
     *
     * @module mm.addons.grades
     * @ngdoc method
     * @name $mmaGrades#getGradesTable
     * @param {Number} courseid ID of the course to get the grades from.
     * @param {Number} userid   ID of the user to get the grades from.
     * @param {Boolean} refresh True when we should not get the value from the cache.
     * @return {Promise}        Promise to be resolved when the grades table is retrieved.
     */
    self.getGradesTable = function(courseid, userid, refresh) {

        $log.debug('Get grades for course ' + courseid + ' and user ' + userid);

        var data = {
                courseid : courseid,
                userid   : userid
            },
            presets = {};
        if (refresh) {
            presets.getFromCache = false;
        }

        return $mmSite.read('gradereport_user_get_grades_table', data, presets).then(function(table) {
            table = formatGradesTable(table, !$ionicPlatform.isTablet());
            return translateGradesTable(table);
        });
    };

    return self;
});
