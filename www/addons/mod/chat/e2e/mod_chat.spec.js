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

describe('User can manage course chat', function() {

    it('Click All sections course chat tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('View course chat windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Heather and I will be available on this chat most lunchtimes');
            expect(MM.getView().getText()).toMatch('Click here to enter the chat now');
        }).then(function() {
            done();
        });
    });

    it('Click description tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function () {
            return MM.clickOn('Heather and I will be available on this chat most lunchtimes');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Heather and I will be available on this chat most lunchtimes');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Adding new chat message', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function () {
            return MM.clickOn('Click here to enter the chat now');
        }).then(function () {
            return $('[ng-model="newMessage.text"]').sendKeys('Hi All..');
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/div/ion-footer-bar/form/div/button')).click();
            expect(MM.getView().getText()).toMatch('Hi All..');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('View chat users', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function () {
            return MM.clickOn('Click here to enter the chat now');
        }).then(function () {
            return $('[ng-click="showChatUsers()"]').click();
        }).then(function () {
            return $('[ng-click="closeModal()"]').click();
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

    it('Click secondary button', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Course welcome');
        }).then(function () {
            return MM.clickOn('Course chat');
        }).then(function () {
            return $('.secondary-buttons').click();
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

});

