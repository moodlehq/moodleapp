webpackJsonp([102],{

/***/ 1795:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonMessagesDiscussionPageModule", function() { return AddonMessagesDiscussionPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__discussion__ = __webpack_require__(1916);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__ = __webpack_require__(67);
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







var AddonMessagesDiscussionPageModule = /** @class */ (function () {
    function AddonMessagesDiscussionPageModule() {
    }
    AddonMessagesDiscussionPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__discussion__["a" /* AddonMessagesDiscussionPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__discussion__["a" /* AddonMessagesDiscussionPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonMessagesDiscussionPageModule);
    return AddonMessagesDiscussionPageModule;
}());

//# sourceMappingURL=discussion.module.js.map

/***/ }),

/***/ 1916:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonMessagesDiscussionPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_messages__ = __webpack_require__(105);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_sync__ = __webpack_require__(394);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__core_user_providers_user__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_logger__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__classes_animations__ = __webpack_require__(938);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_ts_md5_dist_md5__ = __webpack_require__(112);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_ts_md5_dist_md5___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_13_ts_md5_dist_md5__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14_moment__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14_moment___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_14_moment__);
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
 * Page that displays a message discussion page.
 */
var AddonMessagesDiscussionPage = /** @class */ (function () {
    function AddonMessagesDiscussionPage(eventsProvider, sitesProvider, navParams, userProvider, navCtrl, messagesSync, domUtils, messagesProvider, logger, utils, appProvider, translate) {
        var _this = this;
        this.eventsProvider = eventsProvider;
        this.userProvider = userProvider;
        this.navCtrl = navCtrl;
        this.messagesSync = messagesSync;
        this.domUtils = domUtils;
        this.messagesProvider = messagesProvider;
        this.utils = utils;
        this.appProvider = appProvider;
        this.translate = translate;
        this.unreadMessageFrom = 0;
        this.messagesBeingSent = 0;
        this.pagesLoaded = 1;
        this.lastMessage = { text: '', timecreated: 0 };
        this.keepMessageMap = {};
        this.oldContentHeight = 0;
        this.loaded = false;
        this.showKeyboard = false;
        this.canLoadMore = false;
        this.messages = [];
        this.showDelete = false;
        this.canDelete = false;
        this.scrollBottom = true;
        this.viewDestroyed = false;
        this.siteId = sitesProvider.getCurrentSiteId();
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.logger = logger.getInstance('AddonMessagesDiscussionPage');
        this.userId = navParams.get('userId');
        this.showKeyboard = navParams.get('showKeyboard');
        // Refresh data if this discussion is synchronized automatically.
        this.syncObserver = eventsProvider.on(__WEBPACK_IMPORTED_MODULE_6__providers_sync__["a" /* AddonMessagesSyncProvider */].AUTO_SYNCED, function (data) {
            if (data.userId == _this.userId) {
                // Fetch messages.
                _this.fetchData();
                // Show first warning if any.
                if (data.warnings && data.warnings[0]) {
                    _this.domUtils.showErrorModal(data.warnings[0]);
                }
            }
        }, this.siteId);
    }
    /**
     * Adds a new message to the message list.
     *
     * @param {any} message Message to be added.
     * @param {boolean} [keep=true] If set the keep flag or not.
     */
    AddonMessagesDiscussionPage.prototype.addMessage = function (message, keep) {
        if (keep === void 0) { keep = true; }
        // Use smallmessage instead of message ID because ID changes when a message is read.
        message.hash = __WEBPACK_IMPORTED_MODULE_13_ts_md5_dist_md5__["Md5"].hashAsciiStr(message.smallmessage) + '#' + message.timecreated + '#' + message.useridfrom;
        if (typeof this.keepMessageMap[message.hash] === 'undefined') {
            // Message not added to the list. Add it now.
            this.messages.push(message);
        }
        // Message needs to be kept in the list.
        this.keepMessageMap[message.hash] = keep;
    };
    /**
     * Remove a message if it shouldn't be in the list anymore.
     *
     * @param {string} hash Hash of the message to be removed.
     */
    AddonMessagesDiscussionPage.prototype.removeMessage = function (hash) {
        if (this.keepMessageMap[hash]) {
            // Selected to keep it, clear the flag.
            this.keepMessageMap[hash] = false;
            return;
        }
        delete this.keepMessageMap[hash];
        var position = this.messages.findIndex(function (message) {
            return message.hash == hash;
        });
        if (position > 0) {
            this.messages.splice(position, 1);
        }
    };
    /**
     * Runs when the page has loaded. This event only happens once per page being created.
     * If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
     * Setup code for the page.
     */
    AddonMessagesDiscussionPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        // Disable the profile button if we're already coming from a profile.
        var backViewPage = this.navCtrl.getPrevious() && this.navCtrl.getPrevious().component.name;
        this.showProfileLink = !backViewPage || backViewPage !== 'CoreUserProfilePage';
        // Get the user profile to retrieve the user fullname and image.
        this.userProvider.getProfile(this.userId, undefined, true).then(function (user) {
            if (!_this.title) {
                _this.title = user.fullname;
            }
            _this.profileLink = user.profileimageurl;
        });
        // Synchronize messages if needed.
        this.messagesSync.syncDiscussion(this.userId).catch(function () {
            // Ignore errors.
        }).then(function (warnings) {
            if (warnings && warnings[0]) {
                _this.domUtils.showErrorModal(warnings[0]);
            }
            // Fetch the messages for the first time.
            return _this.fetchData().then(function () {
                if (!_this.title && _this.messages.length) {
                    // Didn't receive the fullname via argument. Try to get it from messages.
                    // It's possible that name cannot be resolved when no messages were yet exchanged.
                    if (_this.messages[0].useridto != _this.currentUserId) {
                        _this.title = _this.messages[0].usertofullname || '';
                    }
                    else {
                        _this.title = _this.messages[0].userfromfullname || '';
                    }
                }
            }).catch(function (error) {
                _this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            }).finally(function () {
                _this.checkCanDelete();
                _this.resizeContent();
                _this.loaded = true;
            });
        });
        // Recalculate footer position when keyboard is shown or hidden.
        this.keyboardObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_3__providers_events__["a" /* CoreEventsProvider */].KEYBOARD_CHANGE, function (kbHeight) {
            _this.content.resize();
        });
    };
    /**
     * Runs when the page has fully entered and is now the active page.
     * This event will fire, whether it was the first load or a cached page.
     */
    AddonMessagesDiscussionPage.prototype.ionViewDidEnter = function () {
        this.setPolling();
    };
    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    AddonMessagesDiscussionPage.prototype.ionViewWillLeave = function () {
        this.unsetPolling();
    };
    /**
     * Convenience function to fetch messages.
     * @return {Promise<any>} Resolved when done.
     */
    AddonMessagesDiscussionPage.prototype.fetchData = function () {
        var _this = this;
        this.logger.debug("Polling new messages for discussion with user '" + this.userId + "'");
        if (this.messagesBeingSent > 0) {
            // We do not poll while a message is being sent or we could confuse the user.
            // Otherwise, his message would disappear from the list, and he'd have to wait for the interval to check for messages.
            return Promise.reject(null);
        }
        else if (this.fetching) {
            // Already fetching.
            return Promise.reject(null);
        }
        this.fetching = true;
        // Wait for synchronization process to finish.
        return this.messagesSync.waitForSync(this.userId).then(function () {
            // Fetch messages. Invalidate the cache before fetching.
            return _this.messagesProvider.invalidateDiscussionCache(_this.userId).catch(function () {
                // Ignore errors.
            });
        }).then(function () {
            return _this.getDiscussion(_this.pagesLoaded);
        }).then(function (messages) {
            if (_this.viewDestroyed) {
                return Promise.resolve();
            }
            // Check if we are at the bottom to scroll it after render.
            _this.scrollBottom = _this.domUtils.getScrollHeight(_this.content) - _this.domUtils.getScrollTop(_this.content) ===
                _this.domUtils.getContentHeight(_this.content);
            if (_this.messagesBeingSent > 0) {
                // Ignore polling due to a race condition.
                return Promise.reject(null);
            }
            // Add new messages to the list and mark the messages that should still be displayed.
            messages.forEach(function (message) {
                _this.addMessage(message);
            });
            // Remove messages that shouldn't be in the list anymore.
            for (var hash in _this.keepMessageMap) {
                _this.removeMessage(hash);
            }
            // Sort the messages.
            _this.messagesProvider.sortMessages(_this.messages);
            // Notify that there can be a new message.
            _this.notifyNewMessage();
            // Mark retrieved messages as read if they are not.
            _this.markMessagesAsRead();
        }).finally(function () {
            _this.fetching = false;
        });
    };
    /**
     * Get a discussion. Can load several "pages".
     *
     * @param  {number}  pagesToLoad          Number of pages to load.
     * @param  {number}  [lfReceivedUnread=0] Number of unread received messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfReceivedRead=0]   Number of read received messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfSentUnread=0]     Number of unread sent messages already fetched, so fetch will be done from this.
     * @param  {number}  [lfSentRead=0]       Number of read sent messages already fetched, so fetch will be done from this.
     * @return {Promise<any>}  Resolved when done.
     */
    AddonMessagesDiscussionPage.prototype.getDiscussion = function (pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead) {
        var _this = this;
        if (lfReceivedUnread === void 0) { lfReceivedUnread = 0; }
        if (lfReceivedRead === void 0) { lfReceivedRead = 0; }
        if (lfSentUnread === void 0) { lfSentUnread = 0; }
        if (lfSentRead === void 0) { lfSentRead = 0; }
        // Only get offline messages if we're loading the first "page".
        var excludePending = lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0;
        // Get next messages.
        return this.messagesProvider.getDiscussion(this.userId, excludePending, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead).then(function (result) {
            pagesToLoad--;
            if (pagesToLoad > 0 && result.canLoadMore) {
                // More pages to load. Calculate new limit froms.
                result.messages.forEach(function (message) {
                    if (!message.pending) {
                        if (message.useridfrom == _this.userId) {
                            if (message.read) {
                                lfReceivedRead++;
                            }
                            else {
                                lfReceivedUnread++;
                            }
                        }
                        else {
                            if (message.read) {
                                lfSentRead++;
                            }
                            else {
                                lfSentUnread++;
                            }
                        }
                    }
                });
                // Get next messages.
                return _this.getDiscussion(pagesToLoad, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead)
                    .then(function (nextMessages) {
                    return result.messages.concat(nextMessages);
                });
            }
            else {
                // No more messages to load, return them.
                _this.canLoadMore = result.canLoadMore;
                return result.messages;
            }
        });
    };
    /**
     * Mark messages as read.
     */
    AddonMessagesDiscussionPage.prototype.markMessagesAsRead = function () {
        var _this = this;
        var readChanged = false;
        var promises = [];
        if (this.messagesProvider.isMarkAllMessagesReadEnabled()) {
            var messageUnreadFound = false;
            // Mark all messages at a time if one messages is unread.
            for (var x in this.messages) {
                var message = this.messages[x];
                // If an unread message is found, mark all messages as read.
                if (message.useridfrom != this.currentUserId && message.read == 0) {
                    messageUnreadFound = true;
                    break;
                }
            }
            if (messageUnreadFound) {
                this.setUnreadLabelPosition();
                promises.push(this.messagesProvider.markAllMessagesRead(this.userId).then(function () {
                    readChanged = true;
                    // Mark all messages as read.
                    _this.messages.forEach(function (message) {
                        message.read = 1;
                    });
                }));
            }
        }
        else {
            this.setUnreadLabelPosition();
            // Mark each message as read one by one.
            this.messages.forEach(function (message) {
                // If the message is unread, call this.messagesProvider.markMessageRead.
                if (message.useridfrom != _this.currentUserId && message.read == 0) {
                    promises.push(_this.messagesProvider.markMessageRead(message.id).then(function () {
                        readChanged = true;
                        message.read = 1;
                    }));
                }
            });
        }
        Promise.all(promises).finally(function () {
            if (readChanged) {
                _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_5__providers_messages__["a" /* AddonMessagesProvider */].READ_CHANGED_EVENT, {
                    userId: _this.userId
                }, _this.siteId);
            }
        });
    };
    /**
     * Notify the last message found so discussions list controller can tell if last message should be updated.
     */
    AddonMessagesDiscussionPage.prototype.notifyNewMessage = function () {
        var last = this.messages[this.messages.length - 1];
        var trigger = false;
        if (!last) {
            this.lastMessage = { text: '', timecreated: 0 };
            trigger = true;
        }
        else if (last.text !== this.lastMessage.text || last.timecreated !== this.lastMessage.timecreated) {
            this.lastMessage = { text: last.text, timecreated: last.timecreated };
            trigger = true;
        }
        if (trigger) {
            // Update discussions last message.
            this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_5__providers_messages__["a" /* AddonMessagesProvider */].NEW_MESSAGE_EVENT, {
                userId: this.userId,
                message: this.lastMessage.text,
                timecreated: this.lastMessage.timecreated
            }, this.siteId);
            // Update navBar links and buttons.
            var newCanDelete = (last && last.id && this.messages.length == 1) || this.messages.length > 1;
            if (this.canDelete != newCanDelete) {
                this.checkCanDelete();
            }
        }
    };
    /**
     * Set the place where the unread label position has to be.
     */
    AddonMessagesDiscussionPage.prototype.setUnreadLabelPosition = function () {
        if (this.unreadMessageFrom != 0) {
            return;
        }
        var previousMessageRead = false;
        for (var x in this.messages) {
            var message = this.messages[x];
            if (message.useridfrom != this.currentUserId) {
                // Place unread from message label only once.
                message.unreadFrom = message.read == 0 && previousMessageRead;
                if (message.unreadFrom) {
                    // Save where the label is placed.
                    this.unreadMessageFrom = parseInt(message.id, 10);
                    break;
                }
                previousMessageRead = message.read != 0;
            }
        }
        // Do not update the message unread from label on next refresh.
        if (this.unreadMessageFrom == 0) {
            // Using negative to indicate the label is not placed but should not be placed.
            this.unreadMessageFrom = -1;
        }
    };
    /**
     * Check if there's any message in the list that can be deleted.
     */
    AddonMessagesDiscussionPage.prototype.checkCanDelete = function () {
        // All messages being sent should be at the end of the list.
        var first = this.messages[0];
        this.canDelete = first && !first.sending;
    };
    /**
     * Hide unread label when sending messages.
     */
    AddonMessagesDiscussionPage.prototype.hideUnreadLabel = function () {
        if (this.unreadMessageFrom > 0) {
            for (var x in this.messages) {
                var message = this.messages[x];
                if (message.id == this.unreadMessageFrom) {
                    message.unreadFrom = false;
                    break;
                }
            }
            // Label hidden.
            this.unreadMessageFrom = -1;
        }
    };
    /**
     * Wait until fetching is false.
     * @return {Promise<void>} Resolved when done.
     */
    AddonMessagesDiscussionPage.prototype.waitForFetch = function () {
        var _this = this;
        if (!this.fetching) {
            return Promise.resolve();
        }
        var deferred = this.utils.promiseDefer();
        setTimeout(function () {
            return _this.waitForFetch().finally(function () {
                deferred.resolve();
            });
        }, 400);
        return deferred.promise;
    };
    /**
     * Set a polling to get new messages every certain time.
     */
    AddonMessagesDiscussionPage.prototype.setPolling = function () {
        var _this = this;
        if (!this.polling) {
            // Start polling.
            this.polling = setInterval(function () {
                _this.fetchData().catch(function () {
                    // Ignore errors.
                });
            }, __WEBPACK_IMPORTED_MODULE_5__providers_messages__["a" /* AddonMessagesProvider */].POLL_INTERVAL);
        }
    };
    /**
     * Unset polling.
     */
    AddonMessagesDiscussionPage.prototype.unsetPolling = function () {
        if (this.polling) {
            this.logger.debug("Cancelling polling for conversation with user '" + this.userId + "'");
            clearInterval(this.polling);
            this.polling = undefined;
        }
    };
    /**
     * Copy message to clipboard
     *
     * @param {string} text Message text to be copied.
     */
    AddonMessagesDiscussionPage.prototype.copyMessage = function (text) {
        this.utils.copyToClipboard(text);
    };
    /**
     * Function to delete a message.
     *
     * @param {any} message  Message object to delete.
     * @param {number} index Index where the mesasge is to delete it from the view.
     */
    AddonMessagesDiscussionPage.prototype.deleteMessage = function (message, index) {
        var _this = this;
        var langKey = message.pending ? 'core.areyousure' : 'addon.messages.deletemessageconfirmation';
        this.domUtils.showConfirm(this.translate.instant(langKey)).then(function () {
            var modal = _this.domUtils.showModalLoading('core.deleting', true);
            return _this.messagesProvider.deleteMessage(message).then(function () {
                // Remove message from the list without having to wait for re-fetch.
                _this.messages.splice(index, 1);
                _this.removeMessage(message.hash);
                _this.notifyNewMessage();
                _this.fetchData(); // Re-fetch messages to update cached data.
            }).finally(function () {
                modal.dismiss();
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'addon.messages.errordeletemessage', true);
        });
    };
    /**
     * Function to load previous messages.
     *
     * @param {any} [infiniteScroll] Infinite scroll object.
     * @return {Promise<any>} Resolved when done.
     */
    AddonMessagesDiscussionPage.prototype.loadPrevious = function (infiniteScroll) {
        var _this = this;
        // If there is an ongoing fetch, wait for it to finish.
        return this.waitForFetch().finally(function () {
            _this.pagesLoaded++;
            _this.fetchData().catch(function (error) {
                _this.pagesLoaded--;
                _this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingmessages', true);
            }).finally(function () {
                infiniteScroll.complete();
            });
        });
    };
    /**
     * Content or scroll has been resized. For content, only call it if it's been added on top.
     */
    AddonMessagesDiscussionPage.prototype.resizeContent = function () {
        var _this = this;
        var top = this.content.getContentDimensions().scrollTop;
        this.content.resize();
        // Wait for new content height to be calculated.
        setTimeout(function () {
            // Visible content size changed, maintain the bottom position.
            if (!_this.viewDestroyed && _this.content && _this.domUtils.getContentHeight(_this.content) != _this.oldContentHeight) {
                if (!top) {
                    top = _this.content.getContentDimensions().scrollTop;
                }
                top += _this.oldContentHeight - _this.domUtils.getContentHeight(_this.content);
                _this.oldContentHeight = _this.domUtils.getContentHeight(_this.content);
                _this.domUtils.scrollTo(_this.content, 0, top, 0);
            }
        });
    };
    /**
     * Scroll bottom when render has finished.
     */
    AddonMessagesDiscussionPage.prototype.scrollToBottom = function () {
        var _this = this;
        // Check if scroll is at bottom. If so, scroll bottom after rendering since there might be something new.
        if (this.scrollBottom) {
            // Need a timeout to leave time to the view to be rendered.
            setTimeout(function () {
                if (!_this.viewDestroyed) {
                    _this.domUtils.scrollToBottom(_this.content, 0);
                }
            });
            this.scrollBottom = false;
        }
    };
    /**
     * Sends a message to the server.
     * @param {string} text Message text.
     */
    AddonMessagesDiscussionPage.prototype.sendMessage = function (text) {
        var _this = this;
        var message;
        this.hideUnreadLabel();
        this.showDelete = false;
        this.scrollBottom = true;
        message = {
            pending: true,
            sending: true,
            useridfrom: this.currentUserId,
            smallmessage: text,
            text: text,
            timecreated: new Date().getTime()
        };
        this.addMessage(message, false);
        this.messagesBeingSent++;
        // If there is an ongoing fetch, wait for it to finish.
        // Otherwise, if a message is sent while fetching it could disappear until the next fetch.
        this.waitForFetch().finally(function () {
            _this.messagesProvider.sendMessage(_this.userId, text).then(function (data) {
                var promise;
                _this.messagesBeingSent--;
                if (data.sent) {
                    // Message was sent, fetch messages right now.
                    promise = _this.fetchData();
                }
                else {
                    promise = Promise.reject(null);
                }
                promise.catch(function () {
                    // Fetch failed or is offline message, mark the message as sent.
                    // If fetch is successful there's no need to mark it because the fetch will already show the message received.
                    message.sending = false;
                    if (data.sent) {
                        // Message sent to server, not pending anymore.
                        message.pending = false;
                    }
                    else if (data.message) {
                        message.timecreated = data.message.timecreated;
                    }
                    _this.notifyNewMessage();
                });
            }).catch(function (error) {
                _this.messagesBeingSent--;
                // Only close the keyboard if an error happens.
                // We want the user to be able to send multiple messages without the keyboard being closed.
                _this.appProvider.closeKeyboard();
                _this.domUtils.showErrorModalDefault(error, 'addon.messages.messagenotsent', true);
                _this.removeMessage(message.hash);
            });
        });
    };
    /**
     * Check date should be shown on message list for the current message.
     * If date has changed from previous to current message it should be shown.
     *
     * @param {any} message       Current message where to show the date.
     * @param {any} [prevMessage] Previous message where to compare the date with.
     * @return {boolean}  If date has changed and should be shown.
     */
    AddonMessagesDiscussionPage.prototype.showDate = function (message, prevMessage) {
        if (!prevMessage) {
            // First message, show it.
            return true;
        }
        else if (message.pending) {
            // If pending, it has no date, not show.
            return false;
        }
        // Check if day has changed.
        return !__WEBPACK_IMPORTED_MODULE_14_moment__(message.timecreated).isSame(prevMessage.timecreated, 'day');
    };
    /**
     * Toggles delete state.
     */
    AddonMessagesDiscussionPage.prototype.toggleDelete = function () {
        this.showDelete = !this.showDelete;
    };
    /**
     * Page destroyed.
     */
    AddonMessagesDiscussionPage.prototype.ngOnDestroy = function () {
        // Unset again, just in case.
        this.unsetPolling();
        this.syncObserver && this.syncObserver.off();
        this.keyboardObserver && this.keyboardObserver.off();
        this.viewDestroyed = true;
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonMessagesDiscussionPage.prototype, "content", void 0);
    AddonMessagesDiscussionPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-messages-discussion',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/messages/pages/discussion/discussion.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n        <ion-buttons end></ion-buttons>\n    </ion-navbar>\n    <core-navbar-buttons end>\n        <button ion-button icon-only clear="true" (click)="toggleDelete()" [hidden]="!canDelete">\n            <ion-icon name="trash"></ion-icon>\n        </button>\n        <a [hidden]="!showProfileLink" core-user-link [userId]="userId" [attr.aria-label]=" \'core.user.viewprofile\' | translate">\n            <img class="button core-bar-button-image" [src]="profileLink" core-external-content onError="this.src=\'assets/img/user-avatar.png\'">\n        </a>\n    </core-navbar-buttons>\n</ion-header>\n<ion-content class="has-footer">\n    <core-loading [hideUntil]="loaded">\n        <!-- Load previous messages. -->\n        <ion-infinite-scroll [enabled]="canLoadMore" (ionInfinite)="loadPrevious($event)" position="top">\n           <ion-infinite-scroll-content></ion-infinite-scroll-content>\n        </ion-infinite-scroll>\n        <ion-list class="addon-messages-discussion-container" [attr.aria-live]="polite">\n            <ng-container *ngFor="let message of messages; index as index; last as last">\n                <ion-chip *ngIf="showDate(message, messages[index - 1])" class="addon-messages-date" color="light">\n                    <ion-label>{{ message.timecreated | coreFormatDate: "LL" }}</ion-label>\n                </ion-chip>\n\n                <ion-chip class="addon-messages-unreadfrom" *ngIf="message.unreadFrom" color="light">\n                    <ion-label>{{ \'addon.messages.newmessages\' | translate:{$a: title} }}</ion-label>\n                    <ion-icon name="arrow-round-down"></ion-icon>\n                </ion-chip>\n\n                <ion-item text-wrap (longPress)="copyMessage(message.smallmessage)" class="addon-message" [class.addon-message-mine]="message.useridfrom == currentUserId" [@coreSlideInOut]="message.useridfrom == currentUserId ? \'\' : \'fromLeft\'">\n                    <!-- Some messages have <p> and some others don\'t. Add a <p> so they all have same styles. -->\n                    <p class="addon-message-text">\n                        <core-format-text (afterRender)="last && scrollToBottom()" [text]="message.text"></core-format-text>\n                    </p>\n                    <ion-note *ngIf="!message.pending">\n                        {{ message.timecreated | coreFormatDate: "dftimedate" }}\n                    </ion-note>\n                    <ion-note *ngIf="message.pending"><ion-icon name="time"></ion-icon></ion-note>\n\n                    <button ion-button icon-only clear="true" *ngIf="!message.sending && showDelete" (click)="deleteMessage(message, index)" class="addon-messages-delete-button" [@coreSlideInOut]="\'fromRight\'" [attr.aria-label]=" \'addon.messages.deletemessage\' | translate">\n                        <ion-icon name="trash" color="danger"></ion-icon>\n                    </button>\n                </ion-item>\n            </ng-container>\n        </ion-list>\n        <core-empty-box *ngIf="!messages || messages.length <= 0" icon="chatbubbles" [message]="\'addon.messages.nomessages\' | translate"></core-empty-box>\n    </core-loading>\n</ion-content>\n<ion-footer color="light" class="footer-adjustable">\n    <ion-toolbar color="light" position="bottom">\n        <core-send-message-form (onSubmit)="sendMessage($event)" [showKeyboard]="showKeyboard" [placeholder]="\'addon.messages.newmessage\' | translate" (onResize)="resizeContent()"></core-send-message-form>\n    </ion-toolbar>\n</ion-footer>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/messages/pages/discussion/discussion.html"*/,
            animations: [__WEBPACK_IMPORTED_MODULE_12__classes_animations__["b" /* coreSlideInOut */]]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_3__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_4__providers_sites__["a" /* CoreSitesProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */],
            __WEBPACK_IMPORTED_MODULE_7__core_user_providers_user__["a" /* CoreUserProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_6__providers_sync__["a" /* AddonMessagesSyncProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_messages__["a" /* AddonMessagesProvider */], __WEBPACK_IMPORTED_MODULE_10__providers_logger__["a" /* CoreLoggerProvider */],
            __WEBPACK_IMPORTED_MODULE_9__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_11__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */]])
    ], AddonMessagesDiscussionPage);
    return AddonMessagesDiscussionPage;
}());

//# sourceMappingURL=discussion.js.map

/***/ })

});
//# sourceMappingURL=102.js.map