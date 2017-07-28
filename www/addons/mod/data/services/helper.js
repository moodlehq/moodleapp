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
.factory('$mmaModDataHelper', function($mmaModData, $mmaModDataFieldsDelegate, $q, mmaModDataComponent, $mmFileUploader, $mmSite,
        $mmaModDataOffline, $mmFS, $mmFileUploaderHelper, $mmSitesManager, $translate) {

    var self = {
            searchOther: {
                'fn': 'firstname',
                'ln': 'lastname'
            }
        };

    /**
     * Displays fields for being shown.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#displayShowFields
     * @param {String} template   Template HMTL.
     * @param {Array}  fields     Fields that defines every content in the entry.
     * @param {Object} entry      Entry.
     * @param {String} mode       Mode list or show.
     * @param {Object} actions    Actions that can be performed to the record.
     * @return {String}           Generated HTML.
     */
    self.displayShowFields = function(template, fields, entry, mode, actions) {
        if (!template) {
            return "";
        }

        var replace, render;

        // Replace the fields found on template.
        angular.forEach(fields, function(field) {
            replace = "[[" + field.name + "]]";
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            render = '<mma-mod-data-field field="fields['+ field.id + ']" value="entries['+ entry.id +'].contents['+ field.id +
                        ']" mode="'+mode+'" database="data" view-action="gotoEntry('+ entry.id +')"></mma-mod-data-field>';
            template = template.replace(replace, render);
        });

        angular.forEach(actions, function(enabled, action) {
            replace = new RegExp("##" + action + "##", 'gi');
            if (enabled) {
                if (action == 'moreurl') {
                    // Render more url directly because it can be part of an HTML attribute.
                    render = $mmSite.getURL() + '/mod/data/view.php?d={{data.id}}&rid=' + entry.id;
                } else if (action == 'approvalstatus') {
                    render = $translate.instant('mma.mod_data.' + (entry.approved ? 'approved' : 'notapproved'));
                } else {
                    render = '<mma-mod-data-action action="' + action + '" entry="entries['+ entry.id +
                                ']" mode="'+mode+'" database="data"></mma-mod-data-action>';
                }
                template = template.replace(replace, render);
            } else {
                template = template.replace(replace, "");
            }
        });

        return template;
    };

    /**
     * Returns an object with all the actions that the user can do over the record.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getActions
     * @param {Object}  database     Database activity.
     * @param {Object}  accessInfo   Access info to the activity.
     * @param {Object}  record       Entry or record where the actions will be performed.
     * @return {Object}              Keyed with the action names and boolean to evalute if it can or cannot be done.
     */
    self.getActions = function(database, accessInfo, record) {
        var replacements = {};

        replacements.more = true;
        replacements.moreurl = true;
        replacements.user = true;
        replacements.userpicture = true;
        replacements.timeadded = true;
        replacements.timemodified = true;

        replacements.edit = record.canmanageentry && !record.deleted; // This already checks capabilities and readonly period.
        replacements.delete = record.canmanageentry;
        replacements.approve = database.approval && accessInfo.canapprove && !record.approved && !record.deleted;
        replacements.disapprove = database.approval && accessInfo.canapprove && record.approved && !record.deleted;

        replacements.approvalstatus = database.approval;
        replacements.comments = database.comments;

        // Unsupported actions.
        replacements.delcheck = false;
        replacements.export = false;

        return replacements;
    };

    /**
     * Returns the record with the offline actions applied.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#applyOfflineActions
     * @param  {Object} record         Entry to modify.
     * @param  {Object} offlineActions Offline data with the actions done.
     * @param  {Object} fields         Entry defined fields indexed by fieldid.
     * @return {Object}                Modified entry.
     */
    self.applyOfflineActions = function(record, offlineActions, fields) {
        var promises  = [];
        angular.forEach(offlineActions, function(action) {
            switch (action.action) {
                case 'approve':
                    record.approved = true;
                    break;
                case 'disapprove':
                    record.approved = false;
                    break;
                case 'delete':
                    record.deleted = true;
                    break;
                case 'add':
                case 'edit':
                    var offlineContents = {};
                    angular.forEach(action.fields, function(offlineContent) {
                        if (typeof offlineContents[offlineContent.fieldid] == "undefined") {
                            offlineContents[offlineContent.fieldid] = {};
                        }

                        if (offlineContent.subfield) {
                            offlineContents[offlineContent.fieldid][offlineContent.subfield] = JSON.parse(offlineContent.value);
                        } else {
                            offlineContents[offlineContent.fieldid][''] = JSON.parse(offlineContent.value);
                        }
                    });

                    // Override field contents.
                    angular.forEach(fields, function(field) {
                        if ($mmaModDataFieldsDelegate.hasFiles(field)) {
                            promises.push(self.getStoredFiles(record.dataid, record.id, field.id).then(function(offlineFiles) {
                                record.contents[field.id] = $mmaModDataFieldsDelegate.overrideData(field, record.contents[field.id],
                                        offlineContents[field.id], offlineFiles);
                            }));
                        } else {
                            record.contents[field.id] = $mmaModDataFieldsDelegate.overrideData(field, record.contents[field.id],
                                    offlineContents[field.id]);
                        }
                    });
                    break;
            }
        });
        return $q.all(promises).then(function() {
            return record;
        });
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
        if (!template) {
            return "";
        }

        var replace;

        // Replace the fields found on template.
        angular.forEach(fields, function(field) {
            replace = "[[" + field.name + "]]";
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            var render = '<mma-mod-data-field mode="search" field="fields['+ field.id + ']"></mma-mod-data-field>';
            template = template.replace(replace, render);
        });

        // Not pluginable other search elements.
        angular.forEach(self.searchOther, function(field, name) {
            replace = new RegExp("##" + field + "##", 'gi');

            // Replace field by the text input.
            var render = '<input type="text" name="' + name + '" placeholder="{{ \'mma.mod_data.author' + field + '\' | translate }}">';
            template = template.replace(replace, render);
        });
        return template;
    };

    /**
     * Return the form data.
     *
     * @param  {Object} form Form (DOM element).
     * @return {Object}      Data retrieved from form.
     */
    function getFormData(form) {
        var formData = {};

        angular.forEach(form.elements, function(element) {
            var name = element.name || '';
            // Ignore submit inputs.
            if (!name || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                if (typeof formData[name] == "undefined") {
                    formData[name] = {};
                }
                formData[name][element.value] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    formData[name] = element.value;
                }
            } else {
                formData[name] = element.value;
            }
        });

        return formData;
    }

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

        var searchedData = getFormData(form);

        // Filter and translate fields to each field plugin.
        var advancedSearch = [];
        angular.forEach(fields, function(field) {
            var fieldData = $mmaModDataFieldsDelegate.getFieldSearchData(field, searchedData);
            if (fieldData) {
                angular.forEach(fieldData, function(data) {
                    data.value = JSON.stringify(data.value);
                    // WS wants values in Json format.
                    advancedSearch.push(data);
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
     * Displays Edit Search Fields.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#displayEditFields
     * @param {String} template   Template HMTL.
     * @param {Array}  fields     Fields that defines every content in the entry.
     * @param {Array}  [contents] Contents for the editing entry (if editing).
     * @return {String}         Generated HTML.
     */
    self.displayEditFields = function(template, fields) {
        if (!template) {
            return "";
        }

        var replace;

        // Replace the fields found on template.
        angular.forEach(fields, function(field) {
            replace = "[[" + field.name + "]]";
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            replace = new RegExp(replace, 'gi');

            // Replace field by a generic directive.
            var render = '<mma-mod-data-field mode="edit" field="fields['+ field.id + ']" value="entry.contents['+ field.id + ']" database="data" error="errors['+ field.id + ']"></mma-mod-data-field>';
            template = template.replace(replace, render);

            // Replace the field id tag.
            replace = "[[" + field.name + "#id]]";
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            replace = new RegExp(replace, 'gi');

            template = template.replace(replace, 'field_'+ field.id);
        });

        return template;
    };

    /**
     * Retrieve the entered data in the edit form.
     * We don't use ng-model because it doesn't detect changes done by JavaScript.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getEditDataFromForm
     * @param  {Object}  form            Form (DOM element).
     * @param  {Array}   fields          Fields that defines every content in the entry.
     * @param  {Number}  [dataId]        Database Id. If set, files will be uploaded and itemId set.
     * @param  {Number}  entryId         Entry Id.
     * @param  {Object}  entryContents   Original entry contents indexed by field id.
     * @param  {Boolean} offline         True to prepare the data for an offline uploading, false otherwise.
     * @param  {String}  [siteId]        Site ID. If not defined, current site.
     * @return {Promise}                 That contains object with the answers.
     */
    self.getEditDataFromForm = function(form, fields, dataId, entryId, entryContents, offline, siteId) {
        if (!form || !form.elements) {
            return $q.when({});
        }

        siteId = siteId || $mmSite.getId();

        var formData = getFormData(form);

        // Filter and translate fields to each field plugin.
        var edit = [],
            promises = [];
        angular.forEach(fields, function(field) {
            promises.push($q.when($mmaModDataFieldsDelegate.getFieldEditData(field, formData, entryContents[field.id]))
                    .then(function (fieldData) {
                if (fieldData) {
                    var proms = [];

                    angular.forEach(fieldData, function(data) {
                        var dataProm;

                        // Upload Files if asked.
                        if (dataId && data.files) {
                            dataProm = self.uploadOrStoreFiles(dataId, 0, entryId, data.fieldid, data.files, offline, siteId).then(function(filesResult) {
                                delete data.files;
                                data.value = filesResult;
                            });
                        } else {
                            dataProm = $q.when();
                        }

                        proms.push(dataProm.then(function() {
                            if (data.value) {
                                data.value = JSON.stringify(data.value);
                            }
                            if (typeof data.subfield == "undefined") {
                                data.subfield = "";
                            }

                            // WS wants values in Json format.
                            edit.push(data);
                        }));
                    });

                    return $q.all(proms);
                }
            }));
        });

        return $q.all(promises).then(function() {
            return edit;
        });
    };

    /**
     * Retrieve the temp files to be updated.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getEditTmpFiles
     * @param  {Object}  form            Form (DOM element).
     * @param  {Array}   fields          Fields that defines every content in the entry.
     * @param  {Number}  [dataId]        Database Id. If set, fils will be uploaded and itemId set.
     * @param  {Object}   entryContents  Original entry contents indexed by field id.
     * @return {Promise}                 That contains object with the files.
     */
    self.getEditTmpFiles = function(form, fields, dataId, entryContents) {
        if (!form || !form.elements) {
            return $q.when([]);
        }

        var formData = getFormData(form);

        // Filter and translate fields to each field plugin.
        var promises = [];
        angular.forEach(fields, function(field) {
            promises.push(
                $q.when($mmaModDataFieldsDelegate.getFieldEditFiles(field, formData, entryContents[field.id]))
            );
        });

        return $q.all(promises).then(function(fieldsFiles) {
            var files = [];

            angular.forEach(fieldsFiles, function(fieldFiles) {
                files = files.concat(fieldFiles);
            });
            return files;
        });
    };

    /**
     * Check if data has been changed by the user.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#hasEditDataChanged
     * @param  {Object}  form           Form (DOM element).
     * @param  {Array}   fields         Fields that defines every content in the entry.
     * @param  {Number}  [dataId]       Database Id. If set, fils will be uploaded and itemId set.
     * @param  {Object}   entryContents Original entry contents indexed by field id.
     * @return {Promise}                True if changed, false if not.
     */
    self.hasEditDataChanged = function(form, fields, dataId, entryContents) {
        var inputData = getFormData(form),
            promises = [];

        angular.forEach(fields, function(field) {
            promises.push($mmaModDataFieldsDelegate.hasFieldDataChanged(field, inputData, entryContents[field.id]));
        });
        // Will reject on first change detected.
        return $q.all(promises).then(function() {
            // No changes.
            return false;
        }).catch(function() {
            // Has changes.
            return true;
        });
    };

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#uploadOrStoreFiles
     * @param  {Number}   dataId        Database ID.
     * @param  {Number}   [itemId]      Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param  {Number}   entryId       Entry ID or, if creating, timemodified.
     * @param  {Number}   fieldId       Field ID.
     * @param  {Object[]} files         List of files.
     * @param  {Boolean}  offline       True if files sould be stored for offline, false to upload them.
     * @param  {String}   [siteId]      Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved if success.
     */
    self.uploadOrStoreFiles = function(dataId, itemId, entryId, fieldId, files, offline, siteId) {
        if (files.length) {
            if (offline) {
                return self.storeFiles(dataId, entryId, fieldId, files, siteId);
            }
            return $mmFileUploader.uploadOrReuploadFiles(files, mmaModDataComponent, itemId, siteId);
        }
        return $q.when(0);
    };

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#storeFiles
     * @param  {Number}   dataId     Database ID.
     * @param  {Number}   entryId    Entry ID or, if creating, timemodified.
     * @param  {Number}   fieldId    Field ID.
     * @param  {Object[]} files      List of files.
     * @param  {String}   [siteId]   Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved if success, rejected otherwise.
     */
    self.storeFiles = function(dataId, entryId, fieldId, files, siteId) {
        // Get the folder where to store the files.
        return $mmaModDataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId).then(function(folderPath) {
            return $mmFileUploader.storeFilesToUpload(folderPath, files);
        });
    };

    /**
     * Delete stored attachment files for an entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#deleteStoredFiles
     * @param  {Number}   dataId     Database ID.
     * @param  {Number}   entryId    Entry ID or, if creating, timemodified.
     * @param  {Number}   fieldId    Field ID.
     * @param  {String}   [siteId]   Site ID. If not defined, current site.
     * @return {Promise}             Promise resolved when deleted.
     */
    self.deleteStoredFiles = function(dataId, entryId, fieldId, siteId) {
        return $mmaModDataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId).then(function(folderPath) {
            return $mmFS.removeDir(folderPath);
        });
    };

    /**
     * Get a list of stored attachment files for a new entry. See $mmaModDataHelper#storeFiles.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getStoredFiles
     * @param  {Number}   dataId     Database ID.
     * @param  {Number}   entryId    Entry ID or, if creating, timemodified.
     * @param  {Number}   fieldId    Field ID.
     * @param  {String} [siteId]     Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved with the files.
     */
    self.getStoredFiles = function(dataId, entryId, fieldId, siteId) {
        return $mmaModDataOffline.getEntryFieldFolder(dataId, entryId, fieldId, siteId).then(function(folderPath) {
            return $mmFileUploaderHelper.getStoredFiles(folderPath).catch(function() {
                // Ignore not found files.
                return [];
            });
        });
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
     * @param  {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}    [siteId]        Site ID. Current if not defined.
     * @return {Promise}                   Containing page number, if has next and have following page.
     */
    self.getPageInfoByEntry = function(dataId, entryId, groupId, forceCache, ignoreCache, siteId) {
        return self.getAllEntriesIds(dataId, groupId, forceCache, ignoreCache, siteId).then(function(entries) {
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
     * @param  {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}    [siteId]        Site ID. Current if not defined.
     * @return {Promise}                   Containing page number, if has next and have following page.
     */
    self.getPageInfoByPage = function(dataId, page, groupId, forceCache, ignoreCache, siteId) {
        return self.getAllEntriesIds(dataId, groupId, forceCache, ignoreCache, siteId).then(function(entries) {
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
     * @param  {Boolean}   [forceCache]    True to always get the value from cache, false otherwise. Default false.
     * @param  {Boolean}   [ignoreCache]   True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String}    [siteId]        Site ID. Current if not defined.
     * @return {Promise}                   Resolved with an array of entry ID.
     */
    self.getAllEntriesIds = function(dataId, groupId, forceCache, ignoreCache, siteId) {
        return $mmaModData.fetchAllEntries(dataId, groupId, undefined, undefined, undefined, forceCache, ignoreCache, siteId)
                .then(function(entries) {
            return entries.map(function(entry) {
                return entry.id;
            });
        });
    };

    /**
     * Get an online or offline entry.
     *
     * @module mm.addons.mod_data
     * @ngdoc method
     * @name $mmaModDataHelper#getEntry
     * @param  {Object} data             Database.
     * @param  {Number} entryId          Entry ID.
     * @param  {Object} [offlineActions] Offline data with the actions done. Required for offline entries.
     * @param  {String} [siteId]         Site ID. If not defined, current site.
     * @return {Promise}                 Promise resolved with the entry.
     */
    self.getEntry = function(data, entryId, offlineActions, siteId) {
        if (entryId > 0) {
            // It's an online entry, get it from WS.
            return $mmaModData.getEntry(data.id, entryId, siteId);
        }

        // It's an offline entry, search it in the offline actions.
        return $mmSitesManager.getSite(siteId).then(function(site) {
            for (var x in offlineActions) {
                if (offlineActions[x].action == 'add') {
                    var offlineEntry = offlineActions[x],
                        siteInfo = site.getInfo(),
                        entryData = {
                            id: offlineEntry.entryid,
                            canmanageentry: true,
                            approved: !data.approval || data.manageapproved,
                            dataid: offlineEntry.dataid,
                            groupid: offlineEntry.groupid,
                            timecreated: -offlineEntry.entryid,
                            timemodified: -offlineEntry.entryid,
                            userid: siteInfo.userid,
                            fullname: siteInfo.fullname,
                            contents: {}
                        };

                    return {entry: entryData};
                }
            }
        });
    };

    return self;
});
