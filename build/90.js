webpackJsonp([90],{

/***/ 1809:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModDataEntryPageModule", function() { return AddonModDataEntryPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__core_comments_components_components_module__ = __webpack_require__(387);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__ = __webpack_require__(386);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__components_components_module__ = __webpack_require__(385);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__entry__ = __webpack_require__(1930);
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









var AddonModDataEntryPageModule = /** @class */ (function () {
    function AddonModDataEntryPageModule() {
    }
    AddonModDataEntryPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_8__entry__["a" /* AddonModDataEntryPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_7__components_components_module__["a" /* AddonModDataComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_6__core_compile_components_compile_html_compile_html_module__["a" /* CoreCompileHtmlComponentModule */],
                __WEBPACK_IMPORTED_MODULE_5__core_comments_components_components_module__["a" /* CoreCommentsComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_8__entry__["a" /* AddonModDataEntryPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModDataEntryPageModule);
    return AddonModDataEntryPageModule;
}());

//# sourceMappingURL=entry.module.js.map

/***/ }),

/***/ 1930:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModDataEntryPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_groups__ = __webpack_require__(46);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_data__ = __webpack_require__(60);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_helper__ = __webpack_require__(197);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_offline__ = __webpack_require__(148);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_sync__ = __webpack_require__(260);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__providers_fields_delegate__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__components_components_module__ = __webpack_require__(385);
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
 * Page that displays the view entry page.
 */
var AddonModDataEntryPage = /** @class */ (function () {
    function AddonModDataEntryPage(params, utils, groupsProvider, domUtils, fieldsDelegate, courseProvider, dataProvider, dataOffline, dataHelper, sitesProvider, navCtrl, eventsProvider) {
        this.utils = utils;
        this.groupsProvider = groupsProvider;
        this.domUtils = domUtils;
        this.fieldsDelegate = fieldsDelegate;
        this.courseProvider = courseProvider;
        this.dataProvider = dataProvider;
        this.dataOffline = dataOffline;
        this.dataHelper = dataHelper;
        this.navCtrl = navCtrl;
        this.eventsProvider = eventsProvider;
        this.fields = {};
        this.title = '';
        this.moduleName = 'data';
        this.component = __WEBPACK_IMPORTED_MODULE_8__providers_data__["a" /* AddonModDataProvider */].COMPONENT;
        this.entryLoaded = false;
        this.selectedGroup = 0;
        this.offlineActions = [];
        this.hasOffline = false;
        this.cssTemplate = '';
        this.entryRendered = '';
        this.cssClass = '';
        this.extraImports = [__WEBPACK_IMPORTED_MODULE_13__components_components_module__["a" /* AddonModDataComponentsModule */]];
        this.module = params.get('module') || {};
        this.entryId = params.get('entryId') || null;
        this.courseId = params.get('courseId');
        this.selectedGroup = params.get('group') || 0;
        this.page = params.get('page') || null;
        this.siteId = sitesProvider.getCurrentSiteId();
        this.title = this.module.name;
        this.moduleName = this.courseProvider.translateModuleName('data');
    }
    /**
     * View loaded.
     */
    AddonModDataEntryPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.fetchEntryData();
        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_11__providers_sync__["a" /* AddonModDataSyncProvider */].AUTO_SYNCED, function (data) {
            if ((data.entryId == _this.entryId || data.offlineEntryId == _this.entryId) && _this.data.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    _this.navCtrl.pop();
                }
                else {
                    _this.entryId = data.entryid;
                    _this.entryLoaded = false;
                    _this.fetchEntryData(true);
                }
            }
        }, this.siteId);
        // Refresh entry on change.
        this.entryChangedObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_8__providers_data__["a" /* AddonModDataProvider */].ENTRY_CHANGED, function (data) {
            if (data.entryId == _this.entryId && _this.data.id == data.dataId) {
                if (data.deleted) {
                    // If deleted, go back.
                    _this.navCtrl.pop();
                }
                else {
                    _this.entryLoaded = false;
                    _this.fetchEntryData(true);
                }
            }
        }, this.siteId);
    };
    /**
     * Fetch the entry data.
     *
     * @param  {boolean}      refresh If refresh the current data or not.
     * @return {Promise<any>}         Resolved when done.
     */
    AddonModDataEntryPage.prototype.fetchEntryData = function (refresh) {
        var _this = this;
        var fieldsArray;
        return this.dataProvider.getDatabase(this.courseId, this.module.id).then(function (data) {
            _this.title = data.name || _this.title;
            _this.data = data;
            _this.cssClass = 'addon-data-entries-' + data.id;
            return _this.setEntryIdFromPage(data.id, _this.page, _this.selectedGroup).then(function () {
                return _this.dataProvider.getDatabaseAccessInformation(data.id);
            });
        }).then(function (accessData) {
            _this.access = accessData;
            return _this.groupsProvider.getActivityGroupInfo(_this.data.coursemodule, accessData.canmanageentries)
                .then(function (groupInfo) {
                _this.groupInfo = groupInfo;
                // Check selected group is accessible.
                if (groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
                    if (!groupInfo.groups.some(function (group) { return _this.selectedGroup == group.id; })) {
                        _this.selectedGroup = groupInfo.groups[0].id;
                    }
                }
                return _this.dataOffline.getEntryActions(_this.data.id, _this.entryId);
            });
        }).then(function (actions) {
            _this.offlineActions = actions;
            _this.hasOffline = !!actions.length;
            return _this.dataProvider.getFields(_this.data.id).then(function (fieldsData) {
                _this.fields = _this.utils.arrayToObject(fieldsData, 'id');
                return _this.dataHelper.getEntry(_this.data, _this.entryId, _this.offlineActions);
            });
        }).then(function (entry) {
            entry = entry.entry;
            _this.cssTemplate = _this.dataHelper.prefixCSS(_this.data.csstemplate, '.' + _this.cssClass);
            // Index contents by fieldid.
            entry.contents = _this.utils.arrayToObject(entry.contents, 'fieldid');
            fieldsArray = _this.utils.objectToArray(_this.fields);
            return _this.dataHelper.applyOfflineActions(entry, _this.offlineActions, fieldsArray);
        }).then(function (entryData) {
            _this.entry = entryData;
            var actions = _this.dataHelper.getActions(_this.data, _this.access, _this.entry);
            _this.entryRendered = _this.dataHelper.displayShowFields(_this.data.singletemplate, fieldsArray, _this.entry, 'show', actions);
            _this.showComments = actions.comments;
            var entries = {};
            entries[_this.entryId] = _this.entry;
            // Pass the input data to the component.
            _this.jsData = {
                fields: _this.fields,
                entries: entries,
                data: _this.data
            };
            return _this.dataHelper.getPageInfoByEntry(_this.data.id, _this.entryId, _this.selectedGroup).then(function (result) {
                _this.previousId = result.previousId;
                _this.nextId = result.nextId;
            });
        }).catch(function (message) {
            if (!refresh) {
                // Some call failed, retry without using cache since it might be a new activity.
                return _this.refreshAllData();
            }
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        }).finally(function () {
            _this.domUtils.scrollToTop(_this.content);
            _this.entryLoaded = true;
        });
    };
    /**
     * Go to selected entry without changing state.
     *
     * @param  {number}       entry Entry Id where to go.
     * @return {Promise<any>}       Resolved when done.
     */
    AddonModDataEntryPage.prototype.gotoEntry = function (entry) {
        this.entryId = entry;
        this.page = null;
        this.entryLoaded = false;
        return this.fetchEntryData();
    };
    /**
     * Refresh all the data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModDataEntryPage.prototype.refreshAllData = function () {
        var _this = this;
        var promises = [];
        promises.push(this.dataProvider.invalidateDatabaseData(this.courseId));
        if (this.data) {
            promises.push(this.dataProvider.invalidateEntryData(this.data.id, this.entryId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.data.coursemodule));
            promises.push(this.dataProvider.invalidateEntriesData(this.data.id));
        }
        return Promise.all(promises).finally(function () {
            return _this.fetchEntryData(true);
        });
    };
    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModDataEntryPage.prototype.refreshDatabase = function (refresher) {
        if (this.entryLoaded) {
            return this.refreshAllData().finally(function () {
                refresher && refresher.complete();
            });
        }
    };
    /**
     * Set group to see the database.
     *
     * @param  {number}       groupId Group identifier to set.
     * @return {Promise<any>}         Resolved when done.
     */
    AddonModDataEntryPage.prototype.setGroup = function (groupId) {
        var _this = this;
        this.selectedGroup = groupId;
        this.entryLoaded = false;
        return this.setEntryIdFromPage(this.data.id, 0, this.selectedGroup).then(function () {
            return _this.fetchEntryData();
        });
    };
    /**
     * Convenience function to translate page number to entry identifier.
     *
     * @param  {number}       dataId       Data Id.
     * @param  {number}       [pageNumber] Page number where to go
     * @param  {number}       group        Group Id to get the entry.
     * @return {Promise<any>}              Resolved when done.
     */
    AddonModDataEntryPage.prototype.setEntryIdFromPage = function (dataId, pageNumber, group) {
        var _this = this;
        if (typeof pageNumber == 'number') {
            return this.dataHelper.getPageInfoByPage(dataId, pageNumber, group).then(function (result) {
                _this.entryId = result.entryId;
                _this.page = null;
            });
        }
        return Promise.resolve();
    };
    /**
     * Component being destroyed.
     */
    AddonModDataEntryPage.prototype.ngOnDestroy = function () {
        this.syncObserver && this.syncObserver.off();
        this.entryChangedObserver && this.entryChangedObserver.off();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonModDataEntryPage.prototype, "content", void 0);
    AddonModDataEntryPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-data-entry',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/entry/entry.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="entryLoaded" (ionRefresh)="refreshDatabase($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="entryLoaded">\n        <!-- Database entries found to be synchronized -->\n        <div class="core-warning-card" icon-start *ngIf="hasOffline">\n            <ion-icon name="warning"></ion-icon>\n            {{ \'core.hasdatatosync\' | translate: {$a: moduleName} }}\n        </div>\n\n        <ion-item text-wrap *ngIf="groupInfo && (groupInfo.separateGroups || groupInfo.visibleGroups)">\n            <ion-label id="addon-data-groupslabel" *ngIf="groupInfo.separateGroups">{{ \'core.groupsseparate\' | translate }}</ion-label>\n            <ion-label id="addon-data-groupslabel" *ngIf="groupInfo.visibleGroups">{{ \'core.groupsvisible\' | translate }}</ion-label>\n            <ion-select [(ngModel)]="selectedGroup" (ionChange)="setGroup(selectedGroup)" aria-labelledby="addon-data-groupslabel" interface="popover">\n                <ion-option *ngFor="let groupOpt of groupInfo.groups" [value]="groupOpt.id">{{groupOpt.name}}</ion-option>\n            </ion-select>\n        </ion-item>\n\n        <div class="addon-data-contents {{cssClass}}">\n            <style *ngIf="cssTemplate">\n                {{ cssTemplate }}\n            </style>\n\n            <core-compile-html [text]="entryRendered" [jsData]="jsData" [extraImports]="extraImports"></core-compile-html>\n        </div>\n\n        <ion-item *ngIf="data && entry">\n            <core-comments contextLevel="module" [instanceId]="data.coursemodule" component="mod_data" [itemId]="entry.id" area="database_entry"></core-comments>\n        </ion-item>\n\n        <ion-grid *ngIf="previousId || nextId">\n            <ion-row align-items-center>\n                <ion-col *ngIf="previousId">\n                    <button ion-button block outline icon-start (click)="gotoEntry(previousId)">\n                        <ion-icon name="arrow-back" md="ios-arrow-back"></ion-icon>\n                        {{ \'core.previous\' | translate }}\n                    </button>\n                </ion-col>\n                <ion-col *ngIf="nextId">\n                    <button ion-button block icon-end (click)="gotoEntry(nextId)">\n                        {{ \'core.next\' | translate }}\n                        <ion-icon name="arrow-forward" md="ios-arrow-forward"></ion-icon>\n                    </button>\n                </ion-col>\n            </ion-row>\n        </ion-grid>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/data/pages/entry/entry.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_2__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_12__providers_fields_delegate__["a" /* AddonModDataFieldsDelegate */],
            __WEBPACK_IMPORTED_MODULE_7__core_course_providers_course__["a" /* CoreCourseProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_data__["a" /* AddonModDataProvider */],
            __WEBPACK_IMPORTED_MODULE_10__providers_offline__["a" /* AddonModDataOfflineProvider */], __WEBPACK_IMPORTED_MODULE_9__providers_helper__["a" /* AddonModDataHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_6__providers_events__["a" /* CoreEventsProvider */]])
    ], AddonModDataEntryPage);
    return AddonModDataEntryPage;
}());

//# sourceMappingURL=entry.js.map

/***/ })

});
//# sourceMappingURL=90.js.map