webpackJsonp([55],{

/***/ 1846:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModWorkshopEditSubmissionPageModule", function() { return AddonModWorkshopEditSubmissionPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__edit_submission__ = __webpack_require__(1969);
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






var AddonModWorkshopEditSubmissionPageModule = /** @class */ (function () {
    function AddonModWorkshopEditSubmissionPageModule() {
    }
    AddonModWorkshopEditSubmissionPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__edit_submission__["a" /* AddonModWorkshopEditSubmissionPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__edit_submission__["a" /* AddonModWorkshopEditSubmissionPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModWorkshopEditSubmissionPageModule);
    return AddonModWorkshopEditSubmissionPageModule;
}());

//# sourceMappingURL=edit-submission.module.js.map

/***/ }),

/***/ 1969:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModWorkshopEditSubmissionPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sync__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_file_session__ = __webpack_require__(121);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_fileuploader_providers_fileuploader__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_workshop__ = __webpack_require__(108);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__providers_helper__ = __webpack_require__(134);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__providers_offline__ = __webpack_require__(117);
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
 * Page that displays the workshop edit submission.
 */
var AddonModWorkshopEditSubmissionPage = /** @class */ (function () {
    function AddonModWorkshopEditSubmissionPage(navParams, sitesProvider, fileUploaderProvider, workshopProvider, workshopOffline, workshopHelper, navCtrl, fileSessionprovider, syncProvider, textUtils, domUtils, fb, translate, eventsProvider) {
        this.fileUploaderProvider = fileUploaderProvider;
        this.workshopProvider = workshopProvider;
        this.workshopOffline = workshopOffline;
        this.workshopHelper = workshopHelper;
        this.navCtrl = navCtrl;
        this.fileSessionprovider = fileSessionprovider;
        this.syncProvider = syncProvider;
        this.textUtils = textUtils;
        this.domUtils = domUtils;
        this.fb = fb;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.submission = {
            id: 0,
            title: '',
            content: '',
            attachmentfiles: [],
        };
        this.loaded = false;
        this.component = __WEBPACK_IMPORTED_MODULE_11__providers_workshop__["a" /* AddonModWorkshopProvider */].COMPONENT;
        this.originalData = {};
        this.hasOffline = false;
        this.editing = false;
        this.forceLeave = false;
        this.isDestroyed = false;
        this.module = navParams.get('module');
        this.courseId = navParams.get('courseId');
        this.access = navParams.get('access');
        this.submissionId = navParams.get('submissionId');
        this.workshopId = this.module.instance;
        this.componentId = this.module.id;
        this.userId = sitesProvider.getCurrentSiteUserId();
        this.siteId = sitesProvider.getCurrentSiteId();
        this.editForm = new __WEBPACK_IMPORTED_MODULE_2__angular_forms__["c" /* FormGroup */]({});
        this.editForm.addControl('title', this.fb.control('', __WEBPACK_IMPORTED_MODULE_2__angular_forms__["h" /* Validators */].required));
        this.editForm.addControl('content', this.fb.control(''));
    }
    /**
     * Component being initialized.
     */
    AddonModWorkshopEditSubmissionPage.prototype.ngOnInit = function () {
        if (!this.isDestroyed) {
            // Block the workshop.
            this.syncProvider.blockOperation(this.component, this.workshopId);
        }
        this.fetchSubmissionData();
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModWorkshopEditSubmissionPage.prototype.ionViewCanLeave = function () {
        var _this = this;
        if (this.forceLeave) {
            return true;
        }
        var promise;
        // Check if data has changed.
        if (!this.hasDataChanged()) {
            promise = Promise.resolve();
        }
        else {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        }
        return promise.then(function () {
            if (_this.submission.attachmentfiles) {
                // Delete the local files from the tmp folder.
                _this.fileUploaderProvider.clearTmpFiles(_this.submission.attachmentfiles);
            }
        });
    };
    /**
     * Fetch the submission data.
     *
     * @return {Promise<void>} Resolved when done.
     */
    AddonModWorkshopEditSubmissionPage.prototype.fetchSubmissionData = function () {
        var _this = this;
        return this.workshopProvider.getWorkshop(this.courseId, this.module.id).then(function (workshopData) {
            _this.workshop = workshopData;
            if (_this.submissionId > 0) {
                _this.editing = true;
                return _this.workshopHelper.getSubmissionById(_this.workshopId, _this.submissionId).then(function (submissionData) {
                    _this.submission = submissionData;
                    var canEdit = (_this.userId == submissionData.authorid && _this.access.cansubmit &&
                        _this.access.modifyingsubmissionallowed);
                    if (!canEdit) {
                        // Should not happen, but go back if does.
                        _this.forceLeavePage();
                        return;
                    }
                });
            }
            else if (!_this.access.cansubmit || !_this.access.creatingsubmissionallowed) {
                // Should not happen, but go back if does.
                _this.forceLeavePage();
                return;
            }
        }).then(function () {
            return _this.workshopOffline.getSubmissions(_this.workshopId).then(function (submissionsActions) {
                if (submissionsActions && submissionsActions.length) {
                    _this.hasOffline = true;
                    var actions = _this.workshopHelper.filterSubmissionActions(submissionsActions, _this.editing ?
                        _this.submission.id : 0);
                    return _this.workshopHelper.applyOfflineData(_this.submission, actions);
                }
                else {
                    _this.hasOffline = false;
                }
            }).finally(function () {
                _this.originalData.title = _this.submission.title;
                _this.originalData.content = _this.submission.content;
                _this.originalData.attachmentfiles = [];
                _this.submission.attachmentfiles.forEach(function (file) {
                    var filename;
                    if (file.filename) {
                        filename = file.filename;
                    }
                    else {
                        // We don't have filename, extract it from the path.
                        filename = file.filepath[0] == '/' ? file.filepath.substr(1) : file.filepath;
                    }
                    _this.originalData.attachmentfiles.push({
                        filename: filename,
                        fileurl: file.fileurl
                    });
                });
            });
        }).then(function () {
            _this.editForm.controls['title'].setValue(_this.submission.title);
            _this.editForm.controls['content'].setValue(_this.submission.content);
            var submissionId = _this.submission.id || 'newsub';
            _this.fileSessionprovider.setFiles(_this.component, _this.workshopId + '_' + submissionId, _this.submission.attachmentfiles || []);
            _this.loaded = true;
        }).catch(function (message) {
            _this.loaded = false;
            _this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
            _this.forceLeavePage();
        });
    };
    /**
     * Force leaving the page, without checking for changes.
     */
    AddonModWorkshopEditSubmissionPage.prototype.forceLeavePage = function () {
        this.forceLeave = true;
        this.navCtrl.pop();
    };
    /**
     * Get the form input data.
     *
     * @return {any} Object with all the info.
     */
    AddonModWorkshopEditSubmissionPage.prototype.getInputData = function () {
        var submissionId = this.submission.id || 'newsub';
        var values = this.editForm.value;
        values['attachmentfiles'] = this.fileSessionprovider.getFiles(this.component, this.workshopId + '_' + submissionId) || [];
        return values;
    };
    /**
     * Check if data has changed.
     *
     * @return {boolean} True if changed or false if not.
     */
    AddonModWorkshopEditSubmissionPage.prototype.hasDataChanged = function () {
        if (!this.loaded) {
            return false;
        }
        var inputData = this.getInputData();
        if (!this.originalData || typeof this.originalData.title == 'undefined') {
            // There is no original data, assume it hasn't changed.
            return false;
        }
        if (this.originalData.title != inputData.title || this.originalData.content != inputData.content) {
            return true;
        }
        return this.fileUploaderProvider.areFileListDifferent(inputData.attachmentfiles, this.originalData.attachmentfiles);
    };
    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    AddonModWorkshopEditSubmissionPage.prototype.refreshSubmission = function (refresher) {
        var _this = this;
        if (this.loaded) {
            var promises = [];
            promises.push(this.workshopProvider.invalidateSubmissionData(this.workshopId, this.submission.id));
            promises.push(this.workshopProvider.invalidateSubmissionsData(this.workshopId));
            Promise.all(promises).finally(function () {
                return _this.fetchSubmissionData();
            }).finally(function () {
                refresher.complete();
            });
        }
    };
    /**
     * Save the submission.
     */
    AddonModWorkshopEditSubmissionPage.prototype.save = function () {
        var _this = this;
        // Check if data has changed.
        if (this.hasDataChanged()) {
            this.saveSubmission().then(function () {
                // Go back to entry list.
                _this.forceLeavePage();
            }).catch(function () {
                // Nothing to do.
            });
        }
        else {
            // Nothing to save, just go back.
            this.forceLeavePage();
        }
    };
    /**
     * Send submission and save.
     *
     * @return {Promise<any>} Resolved when done.
     */
    AddonModWorkshopEditSubmissionPage.prototype.saveSubmission = function () {
        var _this = this;
        var inputData = this.getInputData();
        if (!inputData.title) {
            this.domUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredtitle');
            return Promise.reject(null);
        }
        if (!inputData.content) {
            this.domUtils.showAlertTranslated('core.notice', 'addon.mod_workshop.submissionrequiredcontent');
            return Promise.reject(null);
        }
        var allowOffline = true, saveOffline = false;
        var modal = this.domUtils.showModalLoading('core.sending', true), submissionId = this.submission.id;
        // Add some HTML to the message if needed.
        inputData.content = this.textUtils.formatHtmlLines(inputData.content);
        // Upload attachments first if any.
        allowOffline = !inputData.attachmentfiles.length;
        return this.workshopHelper.uploadOrStoreSubmissionFiles(this.workshopId, this.submission.id, inputData.attachmentfiles, this.editing, saveOffline).catch(function () {
            // Cannot upload them in online, save them in offline.
            saveOffline = true;
            allowOffline = true;
            return _this.workshopHelper.uploadOrStoreSubmissionFiles(_this.workshopId, _this.submission.id, inputData.attachmentfiles, _this.editing, saveOffline);
        }).then(function (attachmentsId) {
            if (_this.editing) {
                if (saveOffline) {
                    // Save submission in offline.
                    return _this.workshopOffline.saveSubmission(_this.workshopId, _this.courseId, inputData.title, inputData.content, attachmentsId, submissionId, 'update').then(function () {
                        // Don't return anything.
                    });
                }
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return _this.workshopProvider.updateSubmission(_this.workshopId, submissionId, _this.courseId, inputData.title, inputData.content, attachmentsId, undefined, allowOffline);
            }
            if (saveOffline) {
                // Save submission in offline.
                return _this.workshopOffline.saveSubmission(_this.workshopId, _this.courseId, inputData.title, inputData.content, attachmentsId, submissionId, 'add').then(function () {
                    // Don't return anything.
                });
            }
            // Try to send it to server.
            // Don't allow offline if there are attachments since they were uploaded fine.
            return _this.workshopProvider.addSubmission(_this.workshopId, _this.courseId, inputData.title, inputData.content, attachmentsId, undefined, submissionId, allowOffline);
        }).then(function (newSubmissionId) {
            var data = {
                workshopId: _this.workshopId,
                cmId: _this.module.cmid
            };
            if (newSubmissionId && submissionId) {
                // Data sent to server, delete stored files (if any).
                _this.workshopOffline.deleteSubmissionAction(_this.workshopId, submissionId, _this.editing ? 'update' : 'add');
                _this.workshopHelper.deleteSubmissionStoredFiles(_this.workshopId, submissionId, _this.editing);
                data['submissionId'] = newSubmissionId;
            }
            var promise = newSubmissionId ? _this.workshopProvider.invalidateSubmissionData(_this.workshopId, newSubmissionId) :
                Promise.resolve();
            return promise.finally(function () {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_11__providers_workshop__["a" /* AddonModWorkshopProvider */].SUBMISSION_CHANGED, data, _this.siteId);
                // Delete the local files from the tmp folder.
                _this.fileUploaderProvider.clearTmpFiles(inputData.attachmentfiles);
            });
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'Cannot save submission');
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Component being destroyed.
     */
    AddonModWorkshopEditSubmissionPage.prototype.ngOnDestroy = function () {
        this.isDestroyed = true;
        this.syncProvider.unblockOperation(this.component, this.workshopId);
    };
    AddonModWorkshopEditSubmissionPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-workshop-edit-submission',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/workshop/pages/edit-submission/edit-submission.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'addon.mod_workshop.editsubmission\' | translate }}</ion-title>\n        <ion-buttons end>\n            <button ion-button clear (click)="save()" [attr.aria-label]="\'core.save\' | translate">\n                {{ \'core.save\' | translate }}\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="loaded" (ionRefresh)="refreshSubmission($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="loaded">\n        <form ion-list [formGroup]="editForm" *ngIf="workshop">\n            <ion-item text-wrap>\n                <ion-label stacked core-mark-required="true">{{ \'addon.mod_workshop.submissiontitle\' | translate }}</ion-label>\n                <ion-input name="title" type="text" [placeholder]="\'addon.mod_workshop.submissiontitle\' | translate" formControlName="title"></ion-input>\n            </ion-item>\n\n            <ion-item>\n                <ion-label stacked>{{ \'addon.mod_workshop.submissioncontent\' | translate }}</ion-label>\n                <core-rich-text-editor item-content [control]="editForm.controls[\'content\']" formControlName="content" [placeholder]="\'addon.mod_workshop.submissioncontent\' | translate"  name="content" [component]="component" [componentId]="componentId"></core-rich-text-editor>\n            </ion-item>\n\n            <core-attachments *ngIf="workshop.nattachments > 0" [files]="submission.attachmentfiles" [maxSize]="workshop.maxbytes" [maxSubmissions]="workshop.nattachments" [component]="component" [componentId]="workshop.cmid" allowOffline="true" [acceptedTypes]="workshop.submissionfiletypes"></core-attachments>\n        </form>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/workshop/pages/edit-submission/edit-submission.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_10__core_fileuploader_providers_fileuploader__["a" /* CoreFileUploaderProvider */],
            __WEBPACK_IMPORTED_MODULE_11__providers_workshop__["a" /* AddonModWorkshopProvider */], __WEBPACK_IMPORTED_MODULE_13__providers_offline__["a" /* AddonModWorkshopOfflineProvider */],
            __WEBPACK_IMPORTED_MODULE_12__providers_helper__["a" /* AddonModWorkshopHelperProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_7__providers_file_session__["a" /* CoreFileSessionProvider */], __WEBPACK_IMPORTED_MODULE_6__providers_sync__["a" /* CoreSyncProvider */],
            __WEBPACK_IMPORTED_MODULE_9__providers_utils_text__["a" /* CoreTextUtilsProvider */], __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__angular_forms__["a" /* FormBuilder */],
            __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_events__["a" /* CoreEventsProvider */]])
    ], AddonModWorkshopEditSubmissionPage);
    return AddonModWorkshopEditSubmissionPage;
}());

//# sourceMappingURL=edit-submission.js.map

/***/ })

});
//# sourceMappingURL=55.js.map