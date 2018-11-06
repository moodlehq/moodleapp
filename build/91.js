webpackJsonp([91],{

/***/ 1808:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModDataEditPageModule", function() { return AddonModDataEditPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__core_comments_components_components_module__ = __webpack_require__(387);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__ = __webpack_require__(386);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_components_module__ = __webpack_require__(385);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__edit__ = __webpack_require__(1929);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};









var AddonModDataEditPageModule = /** @class */ (function () {
    function AddonModDataEditPageModule() {
    }
    AddonModDataEditPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_8__edit__["a" /* AddonModDataEditPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_7__components_components_module__["a" /* AddonModDataComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__["a" /* CoreCompileHtmlComponentModule */],
                __WEBPACK_IMPORTED_MODULE_5__core_comments_components_components_module__["a" /* CoreCommentsComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_8__edit__["a" /* AddonModDataEditPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModDataEditPageModule);
    return AddonModDataEditPageModule;
}());

//# sourceMappingURL=edit.module.js.map

/***/ }),

/***/ 1929:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModDataEditPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_groups__ = __webpack_require__(46);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__core_fileuploader_providers_fileuploader__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_data__ = __webpack_require__(60);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__providers_helper__ = __webpack_require__(197);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__providers_offline__ = __webpack_require__(148);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__providers_fields_delegate__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__components_components_module__ = __webpack_require__(385);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
















/**
 * Page that displays the view edit page.
 */
var AddonModDataEditPage = /** @class */ (function () {
    function AddonModDataEditPage(params, utils, groupsProvider, domUtils, fieldsDelegate, courseProvider, dataProvider, dataOffline, dataHelper, sitesProvider, navCtrl, translate, eventsProvider, fileUploaderProvider) {
        this.utils = utils;
        this.groupsProvider = groupsProvider;
        this.domUtils = domUtils;
        this.fieldsDelegate = fieldsDelegate;
        this.courseProvider = courseProvider;
        this.dataProvider = dataProvider;
        this.dataOffline = dataOffline;
        this.dataHelper = dataHelper;
        this.navCtrl = navCtrl;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.fileUploaderProvider = fileUploaderProvider;
        this.offlineActions = [];
        this.fields = {};
        this.fieldsArray = [];
        this.forceLeave = false; // To allow leaving the page without checking for changes.
        this.title = '';
        this.component = __WEBPACK_IMPORTED_MODULE_11__providers_data__["a" /* AddonModDataProvider */].COMPONENT;
        this.loaded = false;
        this.selectedGroup = 0;
        this.cssClass = '';
        this.cssTemplate = '';
        this.editFormRender = '';
        this.extraImports = [__WEBPACK_IMPORTED_MODULE_15__components_components_module__["a" /* AddonModDataComponentsModule */]];
        this.errors = {};
        this.module = params.get('module') || {};
        this.entryId = params.get('entryId') || null;
        this.courseId = params.get('courseId');
        this.selectedGroup = params.get('group') || 0;
        this.siteId = sitesProvider.getCurrentSiteId();
        this.title = this.module.name;
        this.editForm = new __WEBPACK_IMPORTED_MODULE_3__angular_forms__["c" /* FormGroup */]({});
    }
    /**
     * View loaded.
     */
    AddonModDataEditPage.prototype.ionViewDidLoad = function () {
        this.fetchEntryData();
    };
    /**
     * Check if we can leave the page or not and ask to confirm the lost of data.
     *
     * @return {boolean | Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModDataEditPage.prototype.ionViewCanLeave = function () {
        var _this = this;
        if (this.forceLeave) {
            return true;
        }
        var inputData = this.editForm.value;
        return this.dataHelper.hasEditDataChanged(inputData, this.fieldsArray, this.data.id, this.entry.contents).then(function (changed) {
            if (!changed) {
                return Promise.resolve();
            }
            // Show confirmation if some data has been modified.
            return _this.domUtils.showConfirm(_this.translate.instant('core.confirmcanceledit'));
        }).then(function () {
            // Delete the local files from the tmp folder.
            return _this.dataHelper.getEditTmpFiles(inputData, _this.fieldsArray, _this.data.id, _this.entry.contents).then(function (files) {
                _this.fileUploaderProvider.clearTmpFiles(files);
            });
        });
    };
    /**
     * Fetch the entry data.
     *
     * @return {Promise<any>}         Resolved when done.
     */
    AddonModDataEditPage.prototype.fetchEntryData = function () {
        var _this = this;
        return this.dataProvider.getDatabase(this.courseId, this.module.id).then(function (data) {
            _this.title = data.name || _this.title;
            _this.data = data;
            _this.cssClass = 'addon-data-entries-' + data.id;
            return _this.dataProvider.getDatabaseAccessInformation(data.id);
        }).then(function (accessData) {
            _this.cssTemplate = _this.dataHelper.prefixCSS(_this.data.csstemplate, '.' + _this.cssClass);
            if (_this.entryId) {
                return _this.groupsProvider.getActivityGroupInfo(_this.data.coursemodule, accessData.canmanageentries)
                    .then(function (groupInfo) {
                    _this.groupInfo = groupInfo;
                    // Check selected group is accessible.
                    if (groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
                        if (!groupInfo.groups.some(function (group) { return _this.selectedGroup == group.id; })) {
                            _this.selectedGroup = groupInfo.groups[0].id;
                        }
                    }
                });
            }
        }).then(function () {
            return _this.dataOffline.getEntryActions(_this.data.id, _this.entryId);
        }).then(function (actions) {
            _this.offlineActions = actions;
            return _this.dataProvider.getFields(_this.data.id);
        }).then(function (fieldsData) {
            _this.fieldsArray = fieldsData;
            _this.fields = _this.utils.arrayToObject(fieldsData, 'id');
            return _this.dataHelper.getEntry(_this.data, _this.entryId, _this.offlineActions);
        }).then(function (entry) {
            if (entry) {
                entry = entry.entry;
                // Index contents by fieldid.
                entry.contents = _this.utils.arrayToObject(entry.contents, 'fieldid');
            }
            else {
                entry = {
                    contents: {}
                };
            }
            return _this.dataHelper.applyOfflineActions(entry, _this.offlineActions, _this.fieldsArray);
        }).then(function (entryData) {
            _this.entry = entryData;
            _this.editFormRender = _this.displayEditFields();
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Saves data.
     *
     * @return {Promise<any>} Resolved when done.
     */
    AddonModDataEditPage.prototype.save = function () {
        var _this = this;
        var inputData = this.editForm.value;
        return this.dataHelper.hasEditDataChanged(inputData, this.fieldsArray, this.data.id, this.entry.contents).then(function (changed) {
            if (!changed) {
                if (_this.entryId) {
                    return _this.returnToEntryList();
                }
                // New entry, no changes means no field filled, warn the user.
                return Promise.reject('addon.mod_data.emptyaddform');
            }
            var modal = _this.domUtils.showModalLoading('core.sending', true);
            // Create an ID to assign files.
            var entryTemp = _this.entryId ? _this.entryId : -(new Date().getTime());
            return _this.dataHelper.getEditDataFromForm(inputData, _this.fieldsArray, _this.data.id, entryTemp, _this.entry.contents, _this.offline).catch(function (e) {
                if (!_this.offline) {
                    // Cannot submit in online, prepare for offline usage.
                    _this.offline = true;
                    return _this.dataHelper.getEditDataFromForm(inputData, _this.fieldsArray, _this.data.id, entryTemp, _this.entry.contents, _this.offline);
                }
                return Promise.reject(e);
            }).then(function (editData) {
                if (editData.length > 0) {
                    if (_this.entryId) {
                        return _this.dataProvider.editEntry(_this.data.id, _this.entryId, _this.courseId, editData, _this.fields, undefined, _this.offline);
                    }
                    return _this.dataProvider.addEntry(_this.data.id, entryTemp, _this.courseId, editData, _this.selectedGroup, _this.fields, undefined, _this.offline);
                }
                return false;
            }).then(function (result) {
                if (!result) {
                    // No field filled, warn the user.
                    return Promise.reject('addon.mod_data.emptyaddform');
                }
                // This is done if entry is updated when editing or creating if not.
                if ((_this.entryId && result.updated) || (!_this.entryId && result.newentryid)) {
                    var promises = [];
                    _this.entryId = _this.entryId || result.newentryid;
                    promises.push(_this.dataProvider.invalidateEntryData(_this.data.id, _this.entryId, _this.siteId));
                    promises.push(_this.dataProvider.invalidateEntriesData(_this.data.id, _this.siteId));
                    return Promise.all(promises).then(function () {
                        _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_11__providers_data__["a" /* AddonModDataProvider */].ENTRY_CHANGED, { dataId: _this.data.id, entryId: _this.entryId }, _this.siteId);
                    }).finally(function () {
                        return _this.returnToEntryList();
                    });
                }
                else {
                    _this.errors = {};
                    if (result.fieldnotifications) {
                        result.fieldnotifications.forEach(function (fieldNotif) {
                            var field = _this.fieldsArray.find(function (field) { return field.name == fieldNotif.fieldname; });
                            if (field) {
                                _this.errors[field.id] = fieldNotif.notification;
                            }
                        });
                    }
                    _this.jsData['errors'] = _this.errors;
                    setTimeout(function () {
                        _this.scrollToFirstError();
                    });
                }
            }).finally(function () {
                modal.dismiss();
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Cannot edit entry', true);
            return Promise.reject(null);
        });
    };
    /**
     * Set group to see the database.
     *
     * @param  {number}       groupId Group identifier to set.
     * @return {Promise<any>}         Resolved when done.
     */
    AddonModDataEditPage.prototype.setGroup = function (groupId) {
        this.selectedGroup = groupId;
        this.loaded = false;
        return this.fetchEntryData();
    };
    /**
     * Displays Edit Search Fields.
     *
     * @return {string}  Generated HTML.
     */
    AddonModDataEditPage.prototype.displayEditFields = function () {
        if (!this.data.addtemplate) {
            return '';
        }
        this.jsData = {
            fields: this.fields,
            contents: this.entry.contents,
            form: this.editForm,
            data: this.data,
            errors: this.errors
        };
        var replace, render, template = this.data.addtemplate;
        // Replace the fields found on template.
        this.fieldsArray.forEach(function (field) {
            replace = '[[' + field.name + ']]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');
            // Replace field by a generic directive.
            render = '<addon-mod-data-field-plugin mode="edit" [field]="fields[' + field.id + ']"\
                [value]="contents[' + field.id + ']" [form]="form" [database]="data" [error]="errors[' + field.id + ']">\
                </addon-mod-data-field-plugin>';
            template = template.replace(replace, render);
            // Replace the field id tag.
            replace = '[[' + field.name + '#id]]';
            replace = replace.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
            replace = new RegExp(replace, 'gi');
            template = template.replace(replace, 'field_' + field.id);
        });
        return template;
    };
    /**
     * Return to the entry list (previous page) discarding temp data.
     *
     * @return {Promise<any>}  Resolved when done.
     */
    AddonModDataEditPage.prototype.returnToEntryList = function () {
        var _this = this;
        var inputData = this.editForm.value;
        return this.dataHelper.getEditTmpFiles(inputData, this.fieldsArray, this.data.id, this.entry.contents).then(function (files) {
            _this.fileUploaderProvider.clearTmpFiles(files);
        }).finally(function () {
            // Go back to entry list.
            _this.forceLeave = true;
            _this.navCtrl.pop();
        });
    };
    /**
     * Scroll to first error or to the top if not found.
     */
    AddonModDataEditPage.prototype.scrollToFirstError = function () {
        if (!this.domUtils.scrollToElementBySelector(this.content, '.addon-data-error')) {
            this.domUtils.scrollToTop(this.content);
        }
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonModDataEditPage.prototype, "content", void 0);
    AddonModDataEditPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-data-edit',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/edit/edit.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n        <ion-buttons end>\n            <button ion-button clear (click)="save()" [attr.aria-label]="\'core.save\' | translate">\n                {{ \'core.save\' | translate }}\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-loading [hideUntil]="loaded">\n        <ion-item text-wrap *ngIf="groupInfo && (groupInfo.separateGroups || groupInfo.visibleGroups)">\n            <ion-label id="addon-data-groupslabel" *ngIf="groupInfo.separateGroups">{{ \'core.groupsseparate\' | translate }}</ion-label>\n            <ion-label id="addon-data-groupslabel" *ngIf="groupInfo.visibleGroups">{{ \'core.groupsvisible\' | translate }}</ion-label>\n            <ion-select [(ngModel)]="selectedGroup" (ionChange)="setGroup(selectedGroup)" aria-labelledby="addon-data-groupslabel" interface="popover">\n                <ion-option *ngFor="let groupOpt of groupInfo.groups" [value]="groupOpt.id">{{groupOpt.name}}</ion-option>\n            </ion-select>\n        </ion-item>\n\n        <div class="addon-data-contents {{cssClass}}">\n            <style *ngIf="cssTemplate">\n                {{ cssTemplate }}\n            </style>\n\n            <form (ngSubmit)="save()" [formGroup]="editForm">\n                <core-compile-html [text]="editFormRender" [jsData]="jsData" [extraImports]="extraImports"></core-compile-html>\n            </form>\n        </div>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/edit/edit.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_4__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_groups__["a" /* CoreGroupsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_14__providers_fields_delegate__["a" /* AddonModDataFieldsDelegate */],
            __WEBPACK_IMPORTED_MODULE_10__core_course_providers_course__["a" /* CoreCourseProvider */], __WEBPACK_IMPORTED_MODULE_11__providers_data__["a" /* AddonModDataProvider */],
            __WEBPACK_IMPORTED_MODULE_13__providers_offline__["a" /* AddonModDataOfflineProvider */], __WEBPACK_IMPORTED_MODULE_12__providers_helper__["a" /* AddonModDataHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_6__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */],
            __WEBPACK_IMPORTED_MODULE_8__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_9__core_fileuploader_providers_fileuploader__["a" /* CoreFileUploaderProvider */]])
    ], AddonModDataEditPage);
    return AddonModDataEditPage;
}());

//# sourceMappingURL=edit.js.map

/***/ })

});
//# sourceMappingURL=91.js.map