webpackJsonp([95],{

/***/ 1804:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModChatChatPageModule", function() { return AddonModChatChatPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__chat__ = __webpack_require__(1925);
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







var AddonModChatChatPageModule = /** @class */ (function () {
    function AddonModChatChatPageModule() {
    }
    AddonModChatChatPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_6__chat__["a" /* AddonModChatChatPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_5__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_6__chat__["a" /* AddonModChatChatPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModChatChatPageModule);
    return AddonModChatChatPageModule;
}());

//# sourceMappingURL=chat.module.js.map

/***/ }),

/***/ 1925:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModChatChatPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_logger__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_chat__ = __webpack_require__(390);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__ionic_native_network__ = __webpack_require__(133);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_moment__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_moment___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_10_moment__);
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
 * Page that displays a chat session.
 */
var AddonModChatChatPage = /** @class */ (function () {
    function AddonModChatChatPage(navParams, logger, network, zone, navCtrl, chatProvider, appProvider, sitesProvider, modalCtrl, domUtils, textUtils, eventsProvider) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.chatProvider = chatProvider;
        this.appProvider = appProvider;
        this.modalCtrl = modalCtrl;
        this.domUtils = domUtils;
        this.textUtils = textUtils;
        this.eventsProvider = eventsProvider;
        this.loaded = false;
        this.messages = [];
        this.lastTime = 0;
        this.oldContentHeight = 0;
        this.viewDestroyed = false;
        this.pollingRunning = false;
        this.chatId = navParams.get('chatId');
        this.courseId = navParams.get('courseId');
        this.title = navParams.get('title');
        this.logger = logger.getInstance('AddonModChoiceChoicePage');
        this.currentUserBeep = 'beep ' + sitesProvider.getCurrentSiteUserId();
        this.isOnline = this.appProvider.isOnline();
        this.onlineObserver = network.onchange().subscribe(function (online) {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(function () {
                _this.isOnline = _this.appProvider.isOnline();
            });
        });
    }
    /**
     * View loaded.
     */
    AddonModChatChatPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.loginUser().then(function () {
            return _this.fetchMessages().then(function () {
                _this.startPolling();
            }).catch(function (error) {
                _this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileretrievingmessages', true);
                _this.navCtrl.pop();
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileconnecting', true);
            _this.navCtrl.pop();
        }).finally(function () {
            _this.loaded = true;
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
    AddonModChatChatPage.prototype.ionViewDidEnter = function () {
        this.startPolling();
    };
    /**
     * Runs when the page is about to leave and no longer be the active page.
     */
    AddonModChatChatPage.prototype.ionViewWillLeave = function () {
        this.stopPolling();
    };
    /**
     * Display the chat users modal.
     */
    AddonModChatChatPage.prototype.showChatUsers = function () {
        var _this = this;
        var modal = this.modalCtrl.create('AddonModChatUsersPage', { sessionId: this.sessionId });
        modal.onDidDismiss(function (data) {
            if (data && data.talkTo) {
                _this.newMessage = "To " + data.talkTo + ": ";
            }
            if (data && data.beepTo) {
                _this.sendMessage('', data.beepTo);
            }
        });
        modal.present();
    };
    /**
     * Convenience function to login the user.
     *
     * @return {Promise<any>} Resolved when done.
     */
    AddonModChatChatPage.prototype.loginUser = function () {
        var _this = this;
        return this.chatProvider.loginUser(this.chatId).then(function (sessionId) {
            _this.sessionId = sessionId;
        });
    };
    /**
     * Convenience function to fetch chat messages.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModChatChatPage.prototype.fetchMessages = function () {
        var _this = this;
        return this.chatProvider.getLatestMessages(this.sessionId, this.lastTime).then(function (messagesInfo) {
            _this.lastTime = messagesInfo.chatnewlasttime || 0;
            return _this.chatProvider.getMessagesUserData(messagesInfo.messages, _this.courseId).then(function (messages) {
                _this.messages = _this.messages.concat(messages);
                if (messages.length) {
                    // New messages or beeps, scroll to bottom.
                    setTimeout(function () { return _this.scrollToBottom(); });
                }
            });
        });
    };
    /**
     * Start the polling to get chat messages periodically.
     */
    AddonModChatChatPage.prototype.startPolling = function () {
        var _this = this;
        // We already have the polling in place.
        if (this.polling) {
            return;
        }
        // Start polling.
        this.polling = setInterval(function () {
            _this.fetchMessagesInterval().catch(function () {
                // Ignore errors.
            });
        }, __WEBPACK_IMPORTED_MODULE_8__providers_chat__["a" /* AddonModChatProvider */].POLL_INTERVAL);
    };
    /**
     * Stop polling for messages.
     */
    AddonModChatChatPage.prototype.stopPolling = function () {
        if (this.polling) {
            this.logger.debug('Cancelling polling for messages');
            clearInterval(this.polling);
        }
    };
    /**
     * Convenience function to be called every certain time to fetch chat messages.
     *
     * @return {Promise<any>} Promised resolved when done.
     */
    AddonModChatChatPage.prototype.fetchMessagesInterval = function () {
        var _this = this;
        this.logger.debug('Polling for messages');
        if (!this.isOnline || this.pollingRunning) {
            // Obviously we cannot check for new messages when the app is offline.
            return Promise.reject(null);
        }
        this.pollingRunning = true;
        return this.fetchMessages().catch(function () {
            // Try to login, it might have failed because the session expired.
            return _this.loginUser().then(function () {
                return _this.fetchMessages();
            }).catch(function (error) {
                // Fail again. Stop polling if needed.
                if (_this.polling) {
                    clearInterval(_this.polling);
                    _this.polling = undefined;
                }
                _this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhileretrievingmessages', true);
                return Promise.reject(null);
            });
        }).finally(function () {
            _this.pollingRunning = false;
        });
    };
    /**
     * Check if the date should be displayed between messages (when the day changes at midnight for example).
     *
     * @param  {any} message     New message object.
     * @param  {any} prevMessage Previous message object.
     * @return {boolean} True if messages are from diferent days, false othetwise.
     */
    AddonModChatChatPage.prototype.showDate = function (message, prevMessage) {
        if (!prevMessage) {
            return true;
        }
        // Check if day has changed.
        return !__WEBPACK_IMPORTED_MODULE_10_moment__(message.timestamp * 1000).isSame(prevMessage.timestamp * 1000, 'day');
    };
    /**
     * Send a message to the chat.
     *
     * @param {string} text     Text of the nessage.
     * @param {number} [beep=0] ID of the user to beep.
     */
    AddonModChatChatPage.prototype.sendMessage = function (text, beep) {
        var _this = this;
        if (beep === void 0) { beep = 0; }
        if (!this.isOnline) {
            // Silent error, the view should prevent this.
            return;
        }
        else if (beep === 0 && !text.trim()) {
            // Silent error.
            return;
        }
        text = this.textUtils.replaceNewLines(text, '<br>');
        var modal = this.domUtils.showModalLoading('core.sending', true);
        this.chatProvider.sendMessage(this.sessionId, text, beep).then(function () {
            // Update messages to show the sent message.
            _this.fetchMessagesInterval().catch(function () {
                // Ignore errors.
            });
        }).catch(function (error) {
            /* Only close the keyboard if an error happens, we want the user to be able to send multiple
              messages without the keyboard being closed. */
            _this.appProvider.closeKeyboard();
            _this.domUtils.showErrorModalDefault(error, 'addon.mod_chat.errorwhilesendingmessage', true);
        }).finally(function () {
            modal.dismiss();
        });
    };
    AddonModChatChatPage.prototype.reconnect = function () {
        var _this = this;
        var modal = this.domUtils.showModalLoading();
        // Call startPolling would take a while for the first execution, so we'll execute it manually to check if it works now.
        return this.fetchMessagesInterval().then(function () {
            // It works, start the polling again.
            _this.startPolling();
        }).catch(function () {
            // Ignore errors.
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Scroll bottom when render has finished.
     */
    AddonModChatChatPage.prototype.scrollToBottom = function () {
        var _this = this;
        // Need a timeout to leave time to the view to be rendered.
        setTimeout(function () {
            if (!_this.viewDestroyed) {
                _this.domUtils.scrollToBottom(_this.content, 0);
            }
        });
    };
    /**
     * Content or scroll has been resized. For content, only call it if it's been added on top.
     */
    AddonModChatChatPage.prototype.resizeContent = function () {
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
                _this.content.scrollTo(0, top, 0);
            }
        });
    };
    /**
     * Page destroyed.
     */
    AddonModChatChatPage.prototype.ngOnDestroy = function () {
        this.onlineObserver && this.onlineObserver.unsubscribe();
        this.keyboardObserver && this.keyboardObserver.off();
        this.stopPolling();
        this.viewDestroyed = true;
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["f" /* Content */])
    ], AddonModChatChatPage.prototype, "content", void 0);
    AddonModChatChatPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-chat-chat',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/chat/pages/chat/chat.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n        <ion-buttons end>\n            <button *ngIf="loaded" ion-button icon-only (click)="showChatUsers()">\n                <ion-icon name="people"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content  class="has-footer">\n    <core-loading [hideUntil]="loaded">\n        <div aria-live="polite">\n            <div *ngFor="let message of messages; index as index; last as last">\n\n                <div text-center *ngIf="showDate(messages[index], messages[index - 1])" class="addon-mod-chat-notice">\n                    <ion-badge text-wrap color="light">\n                        <span>{{ message.timestamp * 1000 | coreFormatDate:"dfdayweekmonth" }}</span>\n                    </ion-badge>\n                </div>\n\n                <div text-center *ngIf="message.system && message.message == \'enter\'" class="addon-mod-chat-notice">\n                    <ion-badge text-wrap color="light">\n                        <span>{{ message.timestamp * 1000 | coreFormatDate:"dftimedate" }} {{ \'addon.mod_chat.messageenter\' | translate:{$a: message.userfullname} }}</span>\n                    </ion-badge>\n                </div>\n\n                <div text-center *ngIf="message.system && message.message == \'exit\'" class="addon-mod-chat-notice">\n                    <ion-badge text-wrap color="light">\n                        <span>{{ message.timestamp * 1000 | coreFormatDate:"dftimedate" }} {{ \'addon.mod_chat.messageexit\' | translate:{$a: message.userfullname} }}</span>\n                    </ion-badge>\n                </div>\n\n                <div text-center *ngIf="message.message == currentUserBeep" class="addon-mod-chat-notice">\n                    <ion-badge text-wrap color="light">\n                        <span>{{ \'addon.mod_chat.messagebeepsyou\' | translate:{$a: message.userfullname} }}</span>\n                    </ion-badge>\n                </div>\n\n                <ion-item text-wrap *ngIf="!message.system && message.message.substr(0, 4) != \'beep\'" class="addon-mod-chat-message">\n                    <ion-avatar item-start>\n                        <img [src]="message.userprofileimageurl" onError="this.src=\'assets/img/user-avatar.png\'" core-external-content [alt]="\'core.pictureof\' | translate:{$a: message.userfullname}" role="presentation">\n                    </ion-avatar>\n                    <h2>\n                        <p float-end>{{ message.timestamp * 1000 | coreFormatDate:"dftimedate" }}</p>\n                        <core-format-text [text]="message.userfullname"></core-format-text>\n                    </h2>\n                    <core-format-text [text]="message.message" (afterRender)="last && scrollToBottom()"></core-format-text>\n                </ion-item>\n            </div>\n\n            <div text-center margin *ngIf="!messages || messages.length <= 0">\n                <p>{{ \'addon.mod_chat.nomessages\' | translate}}</p>\n            </div>\n        </div>\n    </core-loading>\n</ion-content>\n<ion-footer color="light" class="footer-adjustable">\n    <ion-toolbar color="light" position="bottom">\n        <p text-center *ngIf="!isOnline">{{ \'addon.mod_chat.mustbeonlinetosendmessages\' | translate }}</p>\n        <core-send-message-form *ngIf="isOnline && polling && loaded" [message]="newMessage" (onSubmit)="sendMessage($event)" [showKeyboard]="showKeyboard" [placeholder]="\'addon.messages.newmessage\' | translate" (onResize)="resizeContent()"></core-send-message-form>\n        <button *ngIf="isOnline && !polling && loaded" (click)="reconnect()" ion-button block color="light">{{ \'core.login.reconnect\' | translate }}</button>\n    </ion-toolbar>\n</ion-footer>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/chat/pages/chat/chat.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_4__providers_logger__["a" /* CoreLoggerProvider */], __WEBPACK_IMPORTED_MODULE_9__ionic_native_network__["a" /* Network */], __WEBPACK_IMPORTED_MODULE_0__angular_core__["M" /* NgZone */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */],
            __WEBPACK_IMPORTED_MODULE_8__providers_chat__["a" /* AddonModChatProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_app__["a" /* CoreAppProvider */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["p" /* ModalController */], __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_utils_text__["a" /* CoreTextUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_3__providers_events__["a" /* CoreEventsProvider */]])
    ], AddonModChatChatPage);
    return AddonModChatChatPage;
}());

//# sourceMappingURL=chat.js.map

/***/ })

});
//# sourceMappingURL=95.js.map