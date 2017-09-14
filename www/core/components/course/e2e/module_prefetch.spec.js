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

describe('User can prefetch course contents', function () {

    it('User can prefetch a section', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="showContextMenu($event)"]'));
        }).then(function () {
            return MM.clickOn('Enable download sections');
        }).then(function () {
            MM.clickOnElement(element.all(by.css('button[ng-click="prefetch($event, section)"]')).get(1));
            return expect(element.all(by.css('ion-spinner[ng-if="downloadSectionsEnabled && ((section.isDownloading && section.total > 0) || section.isCalculating)"]')).isDisplayed()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('User can prefetch a module section view', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            MM.clickOnElement(element.all(by.css('button[ng-click="button.action($event)"]')).get(2));
            return expect(element.all(by.css('ion-spinner[ng-if="spinner"]')).isDisplayed()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('User can prefetch a module from context menu', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="showContextMenu($event)"]'));
        }).then(function () {
            MM.clickOn('Last modified');
            return expect(element.all(by.css('ion-spinner[ng-if="(item.href || item.action) && item.iconAction == \'spinner\'"]')).isDisplayed()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});