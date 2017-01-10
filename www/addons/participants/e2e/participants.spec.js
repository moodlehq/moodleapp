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

describe('User can see listed correctly the participants list in a course', function() {

    it('User can see participants page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[1]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function () {
            done();
        });
    });

    it('User can see participants list', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[1]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Mark Ellis');
            expect(MM.getView().getText()).toMatch('Brian Franklin');
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
            expect(MM.getView().getText()).toMatch('Amanda Hamilton');
            expect(MM.getView().getText()).toMatch('Joshua Knight');
        }).then(function () {
            done();
        });
    });

    it('Can click login user tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[1]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function() {
            return MM.clickOn('Barbara Gardner');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function () {
            done();
        });
    });

    it('Can click other specific users tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view/ion-content/div[1]/mm-loading/div/section[1]/div[2]/a[2]')).click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function() {
            return MM.clickOn('Mark Ellis');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Mark Ellis');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('Brian Franklin');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Brian Franklin');
        }).then(function() {
            return MM.goBack();
        }).then(function() {
            return MM.clickOn('Amanda Hamilton');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Amanda Hamilton');
        }).then(function() {
            return MM.goBack();
        }).then(function () {
            done();
        });
    });

});

