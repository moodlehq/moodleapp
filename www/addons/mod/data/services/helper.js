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

angular.module('mm.addons.mod_data')

/**
 * Helper to gather some common functions for database.
 *
 * @module mm.addons.mod_data
 * @ngdoc service
 * @name $mmaModDataHelper
 */
.factory('$mmaModDataHelper', function($mmaModData, $mmaModDataFieldsDelegate) {

    var self = {
            searchOther: {
                'fn': 'firstname',
                'ln': 'lastname'
            }
        };

    /**
     * Displays Advanced Search Fields.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#displayAdvancedSearchFields
     * @param {String} template Template HMTL.
     * @param {Array}  fields   Fields that defines every content in the entry.
     * @return {String}         Generated HTML.
     */
    self.displayAdvancedSearchFields = function(template, fields) {
        var replace;

        // Replace the fields found on template.
        angular.forEach(fields, function(field) {
            replace = "[[" + field.name + "]]";
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            replace = new RegExp(replace);

            // Replace field by a generic directive.
            var render = '<mma-mod-data-field mode="search" field="fields['+ field.id + ']"></mma-mod-data-field>';
            template = template.replace(replace, render);
        });

        // Not pluginable other search elements.
        angular.forEach(self.searchOther, function(field, name) {
            replace = new RegExp("##" + field + "##");

            // Replace field by the text input.
            var render = '<input type="text" name="' + name + '" placeholder="{{ \'mma.mod_data.author' + field + '\' | translate }}">';
            template = template.replace(replace, render);
        });
        return template;
    };

    /**
     * Retrieve the entered data in search in a form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getSearchDataFromForm
     * @param  {Object} form     Form (DOM element).
     * @param  {Array}  fields   Fields that defines every content in the entry.
     * @return {Object}          Object with the answers.
     */
    self.getSearchDataFromForm = function(form, fields) {
        if (!form || !form.elements) {
            return {};
        }

        var searchedData = {};

        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore submit inputs.
            if (!name || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                if (typeof searchedData[name] == "undefined") {
                    searchedData[name] = {};
                }
                searchedData[name][element.value] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    searchedData[name] = element.value;
                }
            } else {
                searchedData[name] = element.value;
            }
        });

        // Filter and translate fields to each field plugin.
        var advancedSearch = [];
        angular.forEach(fields, function(field) {
            var fieldData = $mmaModDataFieldsDelegate.getFieldSearchData(field, searchedData);
            if (fieldData) {
                angular.forEach(fieldData, function(data) {
                    // WS wants values in Json format.
                    advancedSearch.push({
                        name: data.name,
                        value: JSON.stringify(data.value)
                    });
                });
            }
        });

        // Not pluginable other search elements.
        angular.forEach(self.searchOther, function(field, name) {
            if (searchedData[name]) {
                // WS wants values in Json format.
                advancedSearch.push({
                    name: name,
                    value: JSON.stringify(searchedData[name])
                });
            }
        });

        return advancedSearch;
    };

    /**
     * Add a prefix to all rules in a CSS string.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#prefixCSS
     * @param {String} css      CSS code to be prefixed.
     * @param {String} prefix   Prefix css selector.
     * @return {String}         Prefixed CSS.
     */
    self.prefixCSS = function(css, prefix) {
        if (!css) {
            return "";
        }
        // Remove comments first.
        var regExp = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm;
        css = css.replace(regExp, "");
        // Add prefix.
        regExp = /([^]*?)({[^]*?}|,)/g;
        return css.replace(regExp, prefix + " $1 $2");
    };


    /**
     * Get page info related to an entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getPageInfoByEntry
     * @param  {Number}    dataId          Data ID.
     * @param  {Number}    entryId         Entry ID.
     * @param  {Number}    groupId         Group ID.
     * @param  {String}    siteId          Site ID. Current if not defined.
     * @return {Promise}        Containing page number, if has next and have following page.
     */
    self.getPageInfoByEntry = function(dataId, entryId, groupId, siteId) {
        return self.getAllEntriesIds(dataId, groupId, siteId).then(function(entries) {
            for (var index in entries) {
                if (entries[index] == entryId) {
                    index = parseInt(index, 10);
                    return {
                        previousId: entries[index - 1] || false,
                        nextId: entries[index + 1] || false,
                        entryId: entryId,
                        page: index + 1, // Parsed to natural language.
                        numEntries: entries.length
                    };
                }
            }
            return false;
        });
    };

    /**
     * Get page info related to an entry by page number.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getPageInfoByPage
     * @param  {Number}    dataId          Data ID.
     * @param  {Number}    page            Page number.
     * @param  {Number}    groupId         Group ID.
     * @param  {String}    siteId          Site ID. Current if not defined.
     * @return {Promise}        Containing page number, if has next and have following page.
     */
    self.getPageInfoByPage = function(dataId, page, groupId, siteId) {
        return self.getAllEntriesIds(dataId, groupId, siteId).then(function(entries) {
            var index = parseInt(page, 10) - 1,
                entryId = entries[index];
            if (entryId) {
                return {
                    previousId: entries[index - 1] || false,
                    nextId: entries[index + 1] || false,
                    entryId: entryId,
                    page: page, // Parsed to natural language.
                    numEntries: entries.length
                };
            }
            return false;
        });
    };

    /**
     * Fetch all entries and return it's Id
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getAllEntriesIds
     * @param  {Number}    dataId          Data ID.
     * @param  {Number}    groupId         Group ID.
     * @param  {String}    siteId          Site ID. Current if not defined.
     * @return {Promise}        Containing and array of EntryId.
     */
    self.getAllEntriesIds = function(dataId, groupId, siteId) {
        return $mmaModData.fetchAllEntries(dataId, groupId, undefined, undefined, undefined, undefined, true, undefined, siteId)
                .then(function(entries) {
            return entries.map(function(entry) {
                return entry.id;
            });
        });
    };


    return self;
});
