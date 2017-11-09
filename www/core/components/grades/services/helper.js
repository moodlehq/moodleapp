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

angular.module('mm.core.grades')

/**
 * Helper to gather some common functions for grades.
 *
 * @module mm.core.grades
 * @ngdoc service
 * @name $mmGradesHelper
 */
.factory('$mmGradesHelper', function($q, $mmText, $translate, $mmCourse, $sce, $mmUtil) {

    var self = {};

    /**
     * Formats the response of gradereport_user_get_grades_table to be rendered.
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#formatGradesTable
     * @param  {Object}  table          JSON object representing a table with data.
     * @param  {Boolean} forcePhoneView If we must force the phone view to display less columns.
     * @return {Object}             Formatted HTML table.
     */
    self.formatGradesTable = function(table, forcePhoneView) {
        var formatted = {
            columns: [],
            rows: []
        };

        // Columns, in order.
        var columns = {
            itemname: true,
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

        var returnedColumns = [];

        var tabledata = [];
        var maxDepth = 0;
        // Check columns returned (maybe some of the above).
        if (table['tabledata']) {
            tabledata = table['tabledata'];
            maxDepth = table['maxdepth'];
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

            // Reduce the returned columns for phone version. Add grade or percentage if needed.
            var columnAdded = false;
            for (var i = 0; i < tabledata.length && !columnAdded; i++) {
                if (typeof(tabledata[i]["grade"]) != "undefined" &&
                        typeof(tabledata[i]["grade"]["content"]) != "undefined") {
                    columns.grade = true;
                    columnAdded = true;
                } else if (typeof(tabledata[i]["percentage"]) != "undefined" &&
                        typeof(tabledata[i]["percentage"]["content"]) != "undefined") {
                    columns.percentage = true;
                    columnAdded = true;
                }
            }
            if (!columnAdded) {
                // Add one of those.
                columns.grade = true;
            }

            for (var colName in columns) {
                if (returnedColumns.indexOf(colName) > -1) {
                    var width = colName == "itemname" ? maxDepth : 1;
                    var column = {
                        id: colName,
                        name: colName,
                        width: width,
                        showAlways: columns[colName]
                    };
                    formatted.columns.push(column);
                }
            }

            var name, rowspan, tclass, colspan, content, celltype, id, headers, img;

            for (var i = 0; i < tabledata.length; i++) {
                var row = {};
                row.text = '';
                if (typeof(tabledata[i]['leader']) != "undefined") {
                    rowspan = tabledata[i]['leader']['rowspan'];
                    tclass = tabledata[i]['leader']['class'];
                    row.text += '<td class="' + tclass + '" rowspan="' + rowspan + '"></td>';
                }
                for (el in returnedColumns) {
                    name = returnedColumns[el];

                    if (forcePhoneView && !columns[name]) {
                        continue;
                    }

                    if (typeof(tabledata[i][name]) != "undefined") {
                        tclass = (typeof(tabledata[i][name]['class']) != "undefined")? tabledata[i][name]['class'] : '';
                        tclass += columns[name] ? '' : ' hidden-phone';
                        colspan = (typeof(tabledata[i][name]['colspan']) != "undefined")? "colspan='"+tabledata[i][name]['colspan']+"'" : '';
                        content = (typeof(tabledata[i][name]['content']) != "undefined")? tabledata[i][name]['content'] : null;
                        celltype = (typeof(tabledata[i][name]['celltype']) != "undefined")? tabledata[i][name]['celltype'] : 'td';
                        id = (typeof(tabledata[i][name]['id']) != "undefined")? "id='" + tabledata[i][name]['id'] +"'" : '';
                        headers = (typeof(tabledata[i][name]['headers']) != "undefined")? "headers='" + tabledata[i][name]['headers'] + "'" : '';

                        if (typeof(content) != "undefined") {
                            img = getImgHTML(content);
                            content = content.replace(/<\/span>/gi, "\n");
                            content = $mmText.cleanTags(content);
                            content = $mmText.replaceNewLines(content, '<br>');
                            content = img + " " + content;

                            row.text += "<" + celltype + " " + id + " " + headers + " " + "class='"+ tclass +"' " + colspan +">";
                            row.text += content;
                            row.text += "</" + celltype + ">";
                        }
                    }
                }

                if (row.text.length > 0) {
                    if (tabledata[i].itemname && tabledata[i].itemname.id && tabledata[i].itemname.id.substr(0, 3) == 'row') {
                        // Get Grade Object ID from itemname ID.
                        row.id = tabledata[i].itemname.id.split('_')[1];
                    }
                    // Trust the HTML.
                    row.text = $sce.trustAsHtml(row.text);
                }

                // Always add row to avoid rowspan errors.
                formatted.rows.push(row);
            }
        }

        return formatted;
    };

    /**
     * Get a row from the grades table.
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#getGradeRow
     * @param  {Object}  table      JSON object representing a table with data.
     * @param  {Number}  gradeid    Grade Object identifier.
     * @return {Object}             Formatted HTML table.
     */
    self.getGradeRow = function(table, gradeid) {
        var row = {},
            selectedRow = false;

        if (table['tabledata']) {
            var tabledata = table['tabledata'];

            for (var i = 0; i < tabledata.length; i++) {
                if (tabledata[i].itemname && tabledata[i].itemname.id && tabledata[i].itemname.id.substr(0, 3) == 'row') {
                    if (tabledata[i].itemname.id.split('_')[1] == gradeid) {
                        selectedRow = tabledata[i];
                        break;
                    }
                }
            }
        }

        if (!selectedRow) {
            return "";
        }

        for (var name in selectedRow) {
            if (typeof(selectedRow[name]) != "undefined" && typeof(selectedRow[name]['content']) != "undefined") {
                var content = selectedRow[name]['content'];

                if (name == 'itemname') {
                    var img = getImgHTML(content);

                    row.link = getModuleLink(content);

                    content = content.replace(/<\/span>/gi, "\n");
                    content = $mmText.cleanTags(content);
                    content = img + " " + content;
                } else {
                    content = $mmText.replaceNewLines(content, '<br>');
                }

                if (content == '&nbsp;') {
                    content = "";
                }

                row[name] = content.trim();
            }
        }

        return row;
    };

    /**
     * Gets the HTML code to render the contents img.
     *
     * @param  {String} text HTML where the image will be rendered.
     * @return {String}      HTML code to render the image.
     */
    function getImgHTML(text) {
        var img = '';
        text = text.replace("%2F", "/").replace("%2f", "/");

        if (text.indexOf("/agg_mean") > -1) {
            img = '<img src="core/components/grades/img/agg_mean.png" width="16">';
        } else if (text.indexOf("/agg_sum") > -1) {
            img = '<img src="core/components/grades/img/agg_sum.png" width="16">';
        } else if (text.indexOf("/outcomes") > -1) {
            img = '<img src="core/components/grades/img/outcomes.png" width="16">';
        } else if (text.indexOf("i/folder") > -1) {
            img = '<img src="core/components/grades/img/folder.png" width="16">';
        } else if (text.indexOf("/manual_item") > -1) {
            img = '<img src="core/components/grades/img/manual_item.png" width="16">';
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
     * Gets the link to the module for the selected grade.
     *
     * @param  {String} text HTML where the link is present.
     * @return {String}      URL linking to the module.
     */
    function getModuleLink(text) {
        var el = angular.element(text)[0],
            link = el.attributes['href'] ? el.attributes['href'].value : false;

        if (!link || link.indexOf("/mod/") < 0) {
            return false;
        }

        return link;
    }

    /**
     * Translates the names of the grades table columns.
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#translateGradesTable
     * @param  {Object} table Grades table.
     * @return {Promise}      Promise to be resolved with the translated table.
     */
    self.translateGradesTable = function(table) {
        var columns = angular.copy(table.columns),
            promises = [];

        columns.forEach(function(column) {
            var promise = $translate('mm.grades.'+column.name).then(function(translated) {
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
     * Creates an array that represents all the current grades that can be chosen using the given grading type.
     * Negative numbers are scales, zero is no grade, and positive numbers are maximum grades.
     *
     * Taken from make_grades_menu on moodlelib.php
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#makeGradesMenu
     * @param  {Number} gradingType     If positive, max grade you can provide. If negative, scale Id.
     * @param  {Number} moduleId        Module Id needed to retrieve the scale.
     * @param  {String} [defaultLabel]  Element that will become default option, if not defined, it won't be added.
     * @param  {Mixed}  [defaultValue]  Element that will become default option value. Default ''.
     * @param  {String} [scale]         Scale csv list String. If not provided, it will take it from the module grade info.
     * @return {Promise}                Array with objects with value and label to create a propper HTML select.
     */
    self.makeGradesMenu = function(gradingType, moduleId, defaultLabel, defaultValue, scale) {
        gradingType = parseInt(gradingType, 10);
        defaultValue = defaultValue || '';

        if (gradingType < 0) {
            if (scale) {
                return $q.when($mmUtil.makeMenuFromList(scale, defaultLabel, false, defaultValue));
            } else {
                return $mmCourse.getModuleBasicGradeInfo(moduleId).then(function(gradeInfo) {
                    if (gradeInfo.scale) {
                        return $mmUtil.makeMenuFromList(gradeInfo.scale, defaultLabel, false,  defaultValue);
                    }
                    return [];
                });
            }
        }

        if (gradingType > 0) {
            var grades = [];
            if (defaultLabel) {
                // Key as string to avoid resorting of the object.
                grades.push({
                    label: defaultLabel,
                    value: defaultValue
                });
            }
            for (var i = gradingType; i >= 0; i--) {
                 grades.push({
                    label: i +' / '+ gradingType,
                    value: i
                });
            }
            return $q.when(grades);
        }

        return $q.when([]);
    };

    /**
     * Returns the label of the selected grade.
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#getGradeLabelFromValue
     * @param  {Array}  grades          Array with objects with value and label.
     * @param  {Number} selectedGrade   Selected grade value.
     * @return {String}                 Selected grade label.
     */
    self.getGradeLabelFromValue = function(grades, selectedGrade) {
        selectedGrade = parseInt(selectedGrade, 10);

        if (!grades || !selectedGrade || selectedGrade <= 0) {
            return "";
        }

        for (var x in grades) {
            if (grades[x].value == selectedGrade) {
                return grades[x].label;
            }
        }

        return "";
    };

    /**
     * Returns the value of the selected grade.
     *
     * @module mm.core.grades
     * @ngdoc method
     * @name $mmGradesHelper#getGradeLabelFromValue
     * @param  {Array}  grades          Array with objects with value and label.
     * @param  {Number} selectedGrade   Selected grade label.
     * @return {Number}                 Selected grade value.
     */
    self.getGradeValueFromLabel = function(grades, selectedGrade) {
        if (!grades || !selectedGrade) {
            return 0;
        }

        for (var x in grades) {
            if (grades[x].label == selectedGrade) {
                return grades[x].value < 0 ? 0 : grades[x].value;
            }
        }

        return 0;
    };


    return self;
});
