webpackJsonp([79],{

/***/ 1820:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModForumNewDiscussionPageModule", function() { return AddonModForumNewDiscussionPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__new_discussion__ = __webpack_require__(1941);
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






var AddonModForumNewDiscussionPageModule = /** @class */ (function () {
    function AddonModForumNewDiscussionPageModule() {
    }
    AddonModForumNewDiscussionPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__new_discussion__["a" /* AddonModForumNewDiscussionPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__new_discussion__["a" /* AddonModForumNewDiscussionPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModForumNewDiscussionPageModule);
    return AddonModForumNewDiscussionPageModule;
}());

//# sourceMappingURL=new-discussion.module.js.map

/***/ }),

/***/ 1941:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModForumNewDiscussionPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_groups__ = __webpack_require__(46);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_sync__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__core_fileuploader_providers_fileuploader__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_split_view_split_view__ = __webpack_require__(104);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__components_rich_text_editor_rich_text_editor_ts__ = __webpack_require__(940);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__providers_forum__ = __webpack_require__(110);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__providers_offline__ = __webpack_require__(147);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__providers_helper__ = __webpack_require__(194);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17__providers_sync__ = __webpack_require__(195);
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};


















/**
 * Page that displays the new discussion form.
 */
var AddonModForumNewDiscussionPage = /** @class */ (function () {
    function AddonModForumNewDiscussionPage(navParams, navCtrl, translate, domUtils, eventsProvider, groupsProvider, sitesProvider, syncProvider, uploaderProvider, textUtils, utils, forumProvider, forumOffline, forumSync, forumHelper, svComponent) {
        this.navCtrl = navCtrl;
        this.translate = translate;
        this.domUtils = domUtils;
        this.eventsProvider = eventsProvider;
        this.groupsProvider = groupsProvider;
        this.sitesProvider = sitesProvider;
        this.syncProvider = syncProvider;
        this.uploaderProvider = uploaderProvider;
        this.textUtils = textUtils;
        this.utils = utils;
        this.forumProvider = forumProvider;
        this.forumOffline = forumOffline;
        this.forumSync = forumSync;
        this.forumHelper = forumHelper;
        this.svComponent = svComponent;
        this.component = __WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].COMPONENT;
        this.messageControl = new __WEBPACK_IMPORTED_MODULE_1__angular_forms__["b" /* FormControl */]();
        this.groupsLoaded = false;
        this.showGroups = false;
        this.hasOffline = false;
        this.canCreateAttachments = true; // Assume we can by default.
        this.canPin = false;
        this.showForm = false;
        this.groups = [];
        this.newDiscussion = {
            subject: '',
            message: null,
            groupId: 0,
            subscribe: true,
            pin: false,
            files: []
        };
        this.isDestroyed = false;
        this.courseId = navParams.get('courseId');
        this.cmId = navParams.get('cmId');
        this.forumId = navParams.get('forumId');
        this.timeCreated = navParams.get('timeCreated');
    }
    /**
     * Component being initialized.
     */
    AddonModForumNewDiscussionPage.prototype.ngOnInit = function () {
        var _this = this;
        this.fetchDiscussionData().finally(function () {
            _this.groupsLoaded = true;
        });
    };
    /**
     * User entered the page that contains the component.
     */
    AddonModForumNewDiscussionPage.prototype.ionViewDidEnter = function () {
        var _this = this;
        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_17__providers_sync__["a" /* AddonModForumSyncProvider */].AUTO_SYNCED, function (data) {
            if (data.forumId == _this.forumId && data.userId == _this.sitesProvider.getCurrentSiteUserId()) {
                _this.domUtils.showAlertTranslated('core.notice', 'core.contenteditingsynced');
                _this.returnToDiscussions();
            }
        }, this.sitesProvider.getCurrentSiteId());
        // Trigger view event, to highlight the current opened discussion in the split view.
        this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].VIEW_DISCUSSION_EVENT, {
            forumId: this.forumId,
            discussion: -this.timeCreated
        }, this.sitesProvider.getCurrentSiteId());
    };
    /**
     * Fetch if forum uses groups and the groups it uses.
     *
     * @param  {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModForumNewDiscussionPage.prototype.fetchDiscussionData = function (refresh) {
        var _this = this;
        return this.groupsProvider.getActivityGroupMode(this.cmId).then(function (mode) {
            var promises = [];
            if (mode === __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */].SEPARATEGROUPS || mode === __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */].VISIBLEGROUPS) {
                promises.push(_this.groupsProvider.getActivityAllowedGroups(_this.cmId).then(function (forumGroups) {
                    var promise;
                    if (mode === __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */].VISIBLEGROUPS) {
                        // We need to check which of the returned groups the user can post to.
                        promise = _this.validateVisibleGroups(forumGroups);
                    }
                    else {
                        // WS already filters groups, no need to do it ourselves. Add "All participants" if needed.
                        promise = _this.addAllParticipantsOption(forumGroups, true);
                    }
                    return promise.then(function (forumGroups) {
                        if (forumGroups.length > 0) {
                            _this.groups = forumGroups;
                            // Do not override group id.
                            _this.newDiscussion.groupId = _this.newDiscussion.groupId || forumGroups[0].id;
                            _this.showGroups = true;
                        }
                        else {
                            var message = mode === __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */].SEPARATEGROUPS ?
                                'addon.mod_forum.cannotadddiscussionall' : 'addon.mod_forum.cannotadddiscussion';
                            return Promise.reject(_this.translate.instant(message));
                        }
                    });
                }));
            }
            else {
                _this.showGroups = false;
                // Use the canAddDiscussion WS to check if the user can add attachments and pin discussions.
                promises.push(_this.forumProvider.canAddDiscussionToAll(_this.forumId).then(function (response) {
                    _this.canPin = !!response.canpindiscussions;
                    _this.canCreateAttachments = !!response.cancreateattachment;
                }).catch(function () {
                    // Ignore errors, use default values.
                }));
            }
            // Get forum.
            promises.push(_this.forumProvider.getForum(_this.courseId, _this.cmId).then(function (forum) {
                _this.forum = forum;
            }));
            // If editing a discussion, get offline data.
            if (_this.timeCreated && !refresh) {
                _this.syncId = _this.forumSync.getForumSyncId(_this.forumId);
                promises.push(_this.forumSync.waitForSync(_this.syncId).then(function () {
                    // Do not block if the scope is already destroyed.
                    if (!_this.isDestroyed) {
                        _this.syncProvider.blockOperation(__WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].COMPONENT, _this.syncId);
                    }
                    return _this.forumOffline.getNewDiscussion(_this.forumId, _this.timeCreated).then(function (discussion) {
                        _this.hasOffline = true;
                        discussion.options = discussion.options || {};
                        _this.newDiscussion.groupId = discussion.groupid ? discussion.groupid : _this.newDiscussion.groupId;
                        _this.newDiscussion.subject = discussion.subject;
                        _this.newDiscussion.message = discussion.message;
                        _this.newDiscussion.subscribe = discussion.options.discussionsubscribe;
                        _this.newDiscussion.pin = discussion.options.discussionpinned;
                        _this.messageControl.setValue(discussion.message);
                        // Treat offline attachments if any.
                        if (discussion.options.attachmentsid && discussion.options.attachmentsid.offline) {
                            return _this.forumHelper.getNewDiscussionStoredFiles(_this.forumId, _this.timeCreated).then(function (files) {
                                _this.newDiscussion.files = files;
                            });
                        }
                    });
                }));
            }
            return Promise.all(promises);
        }).then(function () {
            if (!_this.originalData) {
                // Initialize original data.
                _this.originalData = {
                    subject: _this.newDiscussion.subject,
                    message: _this.newDiscussion.message,
                    files: _this.newDiscussion.files.slice(),
                };
            }
            _this.showForm = true;
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.errorgetgroups', true);
            _this.showForm = false;
        });
    };
    /**
     * Validate which of the groups returned by getActivityAllowedGroups in visible groups should be shown to post to.
     *
     * @param  {any[]} forumGroups Forum groups.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModForumNewDiscussionPage.prototype.validateVisibleGroups = function (forumGroups) {
        var _this = this;
        // We first check if the user can post to all the groups.
        return this.forumProvider.canAddDiscussionToAll(this.forumId).catch(function () {
            // The call failed, let's assume he can't.
            return {
                status: false,
                canpindiscussions: false,
                cancreateattachment: true
            };
        }).then(function (response) {
            _this.canPin = !!response.canpindiscussions;
            _this.canCreateAttachments = !!response.cancreateattachment;
            if (response.status) {
                // The user can post to all groups, add the "All participants" option and return them all.
                return _this.addAllParticipantsOption(forumGroups, false);
            }
            else {
                // The user can't post to all groups, let's check which groups he can post to.
                var promises_1 = [];
                var filtered_1 = [];
                forumGroups.forEach(function (group) {
                    promises_1.push(_this.forumProvider.canAddDiscussion(_this.forumId, group.id).catch(function () {
                        /* The call failed, let's return true so the group is shown. If the user can't post to
                           it an error will be shown when he tries to add the discussion. */
                        return {
                            status: true
                        };
                    }).then(function (response) {
                        if (response.status) {
                            filtered_1.push(group);
                        }
                    }));
                });
                return Promise.all(promises_1).then(function () {
                    return filtered_1;
                });
            }
        });
    };
    /**
     * Filter forum groups, returning only those that are inside user groups.
     *
     * @param  {any[]} forumGroups Forum groups.
     * @param  {any[]} userGroups User groups.
     * @return {any[]} Filtered groups.
     */
    AddonModForumNewDiscussionPage.prototype.filterGroups = function (forumGroups, userGroups) {
        var filtered = [];
        var userGroupsIds = userGroups.map(function (g) { return g.id; });
        forumGroups.forEach(function (fg) {
            if (userGroupsIds.indexOf(fg.id) > -1) {
                filtered.push(fg);
            }
        });
        return filtered;
    };
    /**
     * Add the "All participants" option to a list of groups if the user can add a discussion to all participants.
     *
     * @param  {any[]}   groups Groups.
     * @param  {boolean} check  True to check if the user can add a discussion to all participants.
     * @return {Promise<any[]>} Promise resolved with the list of groups.
     */
    AddonModForumNewDiscussionPage.prototype.addAllParticipantsOption = function (groups, check) {
        var _this = this;
        if (!this.forumProvider.isAllParticipantsFixed()) {
            // All participants has a bug, don't add it.
            return Promise.resolve(groups);
        }
        var promise;
        if (check) {
            // We need to check if the user can add a discussion to all participants.
            promise = this.forumProvider.canAddDiscussionToAll(this.forumId).then(function (response) {
                _this.canPin = !!response.canpindiscussions;
                _this.canCreateAttachments = !!response.cancreateattachment;
                return response.status;
            }).catch(function () {
                // The call failed, let's assume he can't.
                return false;
            });
        }
        else {
            // No need to check, assume the user can.
            promise = Promise.resolve(true);
        }
        return promise.then(function (canAdd) {
            if (canAdd) {
                groups.unshift({
                    courseid: _this.courseId,
                    id: -1,
                    name: _this.translate.instant('core.allparticipants')
                });
            }
            return groups;
        });
    };
    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    AddonModForumNewDiscussionPage.prototype.refreshGroups = function (refresher) {
        var _this = this;
        var promises = [
            this.groupsProvider.invalidateActivityGroupMode(this.cmId),
            this.groupsProvider.invalidateActivityAllowedGroups(this.cmId),
            this.forumProvider.invalidateCanAddDiscussion(this.forumId),
        ];
        Promise.all(promises).finally(function () {
            _this.fetchDiscussionData(true).finally(function () {
                refresher.complete();
            });
        });
    };
    /**
     * Convenience function to update or return to discussions depending on device.
     *
     * @param {number} [discussionId] Id of the new discussion.
     */
    AddonModForumNewDiscussionPage.prototype.returnToDiscussions = function (discussionId) {
        var data = {
            forumId: this.forumId,
            cmId: this.cmId,
            discussionId: discussionId,
        };
        this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].NEW_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());
        // Delete the local files from the tmp folder.
        this.uploaderProvider.clearTmpFiles(this.newDiscussion.files);
        if (this.svComponent && this.svComponent.isOn()) {
            // Empty form.
            this.hasOffline = false;
            this.newDiscussion.subject = '';
            this.newDiscussion.message = null;
            this.newDiscussion.files = [];
            this.messageEditor.clearText();
            this.originalData = this.utils.clone(this.newDiscussion);
            // Trigger view event, to highlight the current opened discussion in the split view.
            this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].VIEW_DISCUSSION_EVENT, {
                forumId: this.forumId,
                discussion: 0
            }, this.sitesProvider.getCurrentSiteId());
        }
        else {
            this.originalData = null; // Avoid asking for confirmation.
            this.navCtrl.pop();
        }
    };
    /**
     * Message changed.
     *
     * @param {string} text The new text.
     */
    AddonModForumNewDiscussionPage.prototype.onMessageChange = function (text) {
        this.newDiscussion.message = text;
    };
    /**
     * Add a new discussion.
     */
    AddonModForumNewDiscussionPage.prototype.add = function () {
        var _this = this;
        var forumName = this.forum.name;
        var subject = this.newDiscussion.subject;
        var message = this.newDiscussion.message;
        var pin = this.newDiscussion.pin;
        var groupId = this.newDiscussion.groupId;
        var attachments = this.newDiscussion.files;
        var discTimecreated = this.timeCreated || Date.now();
        var options = {
            discussionsubscribe: !!this.newDiscussion.subscribe
        };
        var saveOffline = false;
        if (!subject) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptysubject', true);
            return;
        }
        if (!message) {
            this.domUtils.showErrorModal('addon.mod_forum.erroremptymessage', true);
            return;
        }
        var modal = this.domUtils.showModalLoading('core.sending', true);
        var promise;
        // Add some HTML to the message if needed.
        message = this.textUtils.formatHtmlLines(message);
        // Upload attachments first if any.
        if (attachments.length) {
            promise = this.forumHelper.uploadOrStoreNewDiscussionFiles(this.forumId, discTimecreated, attachments, false)
                .catch(function () {
                // Cannot upload them in online, save them in offline.
                saveOffline = true;
                return _this.forumHelper.uploadOrStoreNewDiscussionFiles(_this.forumId, discTimecreated, attachments, true);
            });
        }
        else {
            promise = Promise.resolve();
        }
        promise.then(function (attach) {
            if (attach) {
                options.attachmentsid = attach;
            }
            if (pin) {
                options.discussionpinned = true;
            }
            if (saveOffline) {
                // Save discussion in offline.
                return _this.forumOffline.addNewDiscussion(_this.forumId, forumName, _this.courseId, subject, message, options, groupId, discTimecreated).then(function () {
                    // Don't return anything.
                });
            }
            else {
                // Try to send it to server.
                // Don't allow offline if there are attachments since they were uploaded fine.
                return _this.forumProvider.addNewDiscussion(_this.forumId, forumName, _this.courseId, subject, message, options, groupId, undefined, discTimecreated, !attachments.length);
            }
        }).then(function (discussionId) {
            if (discussionId) {
                // Data sent to server, delete stored files (if any).
                _this.forumHelper.deleteNewDiscussionStoredFiles(_this.forumId, discTimecreated);
            }
            _this.returnToDiscussions(discussionId);
        }).catch(function (message) {
            _this.domUtils.showErrorModalDefault(message, 'addon.mod_forum.cannotcreatediscussion', true);
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Discard an offline saved discussion.
     */
    AddonModForumNewDiscussionPage.prototype.discard = function () {
        var _this = this;
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(function () {
            var promises = [];
            promises.push(_this.forumOffline.deleteNewDiscussion(_this.forumId, _this.timeCreated));
            promises.push(_this.forumHelper.deleteNewDiscussionStoredFiles(_this.forumId, _this.timeCreated).catch(function () {
                // Ignore errors, maybe there are no files.
            }));
            return Promise.all(promises).then(function () {
                _this.returnToDiscussions();
            });
        }).catch(function () {
            // Cancelled.
        });
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModForumNewDiscussionPage.prototype.ionViewCanLeave = function () {
        var _this = this;
        var promise;
        if (this.forumHelper.hasPostDataChanged(this.newDiscussion, this.originalData)) {
            // Show confirmation if some data has been modified.
            promise = this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        }
        else {
            promise = Promise.resolve();
        }
        return promise.then(function () {
            // Delete the local files from the tmp folder.
            _this.uploaderProvider.clearTmpFiles(_this.newDiscussion.files);
        });
    };
    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    AddonModForumNewDiscussionPage.prototype.ionViewWillLeave = function () {
        this.syncObserver && this.syncObserver.off();
    };
    /**
     * Page destroyed.
     */
    AddonModForumNewDiscussionPage.prototype.ngOnDestroy = function () {
        if (this.syncId) {
            this.syncProvider.unblockOperation(__WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */].COMPONENT, this.syncId);
        }
        this.isDestroyed = true;
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_13__components_rich_text_editor_rich_text_editor_ts__["a" /* CoreRichTextEditorComponent */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_13__components_rich_text_editor_rich_text_editor_ts__["a" /* CoreRichTextEditorComponent */])
    ], AddonModForumNewDiscussionPage.prototype, "messageEditor", void 0);
    AddonModForumNewDiscussionPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-forum-new-discussion',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/forum/pages/new-discussion/new-discussion.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title>{{ \'addon.mod_forum.addanewdiscussion\' | translate }}</ion-title>\n        <ion-buttons end>\n            <!-- The context menu will be added in here. -->\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="groupsLoaded" (ionRefresh)="refreshGroups($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n\n    <core-loading [hideUntil]="groupsLoaded">\n        <ion-list *ngIf="showForm">\n            <ion-item>\n                <ion-label stacked>{{ \'addon.mod_forum.subject\' | translate }}</ion-label>\n                <ion-input type="text" [placeholder]="\'addon.mod_forum.subject\' | translate" [(ngModel)]="newDiscussion.subject"></ion-input>\n            </ion-item>\n            <ion-item>\n                <ion-label stacked>{{ \'addon.mod_forum.message\' | translate }}</ion-label>\n                <core-rich-text-editor item-content [control]="messageControl" (contentChanged)="onMessageChange($event)" [placeholder]="\'addon.mod_forum.message\' | translate" name="addon_mod_forum_new_discussion" [component]="component" [componentId]="forum.cmid"></core-rich-text-editor>\n            </ion-item>\n            <ion-item *ngIf="showGroups">\n                <ion-label id="addon-mod-forum-groupslabel">{{ \'addon.mod_forum.group\' | translate }}</ion-label>\n                <ion-select [(ngModel)]="newDiscussion.groupId" aria-labelledby="addon-mod-forum-groupslabel" interface="popover">\n                    <ion-option *ngFor="let group of groups" [value]="group.id">{{ group.name }}</ion-option>\n                </ion-select>\n            </ion-item>\n            <ion-item>\n                <ion-label>{{ \'addon.mod_forum.discussionsubscription\' | translate }}</ion-label>\n                <ion-toggle [(ngModel)]="newDiscussion.subscribe"></ion-toggle>\n            </ion-item>\n            <ion-item *ngIf="canPin">\n                <ion-label>{{ \'addon.mod_forum.discussionpinned\' | translate }}</ion-label>\n                <ion-toggle [(ngModel)]="newDiscussion.pin"></ion-toggle>\n            </ion-item>\n            <core-attachments *ngIf="canCreateAttachments && forum && forum.maxattachments > 0" [files]="newDiscussion.files" [maxSize]="forum.maxbytes" [maxSubmissions]="forum.maxattachments" [component]="component" [componentId]="forum.cmid" [allowOffline]="true"></core-attachments>\n            <ion-item>\n                <ion-row>\n                    <ion-col>\n                        <button ion-button block (click)="add()" [disabled]="newDiscussion.subject == \'\' || newDiscussion.message == null">{{ \'addon.mod_forum.posttoforum\' | translate }}</button>\n                    </ion-col>\n                    <ion-col *ngIf="hasOffline">\n                        <button ion-button block color="light" (click)="discard()">{{ \'core.discard\' | translate }}</button>\n                    </ion-col>\n                </ion-row>\n            </ion-item>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/forum/pages/new-discussion/new-discussion.html"*/,
        }),
        __param(15, Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["N" /* Optional */])()),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2_ionic_angular__["s" /* NavParams */],
            __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["c" /* TranslateService */],
            __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_events__["a" /* CoreEventsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_groups__["a" /* CoreGroupsProvider */],
            __WEBPACK_IMPORTED_MODULE_6__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_7__providers_sync__["a" /* CoreSyncProvider */],
            __WEBPACK_IMPORTED_MODULE_11__core_fileuploader_providers_fileuploader__["a" /* CoreFileUploaderProvider */],
            __WEBPACK_IMPORTED_MODULE_9__providers_utils_text__["a" /* CoreTextUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_10__providers_utils_utils__["a" /* CoreUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_14__providers_forum__["a" /* AddonModForumProvider */],
            __WEBPACK_IMPORTED_MODULE_15__providers_offline__["a" /* AddonModForumOfflineProvider */],
            __WEBPACK_IMPORTED_MODULE_17__providers_sync__["a" /* AddonModForumSyncProvider */],
            __WEBPACK_IMPORTED_MODULE_16__providers_helper__["a" /* AddonModForumHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_12__components_split_view_split_view__["a" /* CoreSplitViewComponent */]])
    ], AddonModForumNewDiscussionPage);
    return AddonModForumNewDiscussionPage;
}());

//# sourceMappingURL=new-discussion.js.map

/***/ })

});
//# sourceMappingURL=79.js.map