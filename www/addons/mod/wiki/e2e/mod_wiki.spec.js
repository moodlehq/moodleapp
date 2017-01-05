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

describe('User can manage course notes wiki', function() {

    it('View course notes wiki collaborative window', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            return MM.clickOn("Your course notes wiki (collaborative)");
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('The Movies');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Use this space to add notes on all aspects of the films studied,');
            expect(MM.getView().getText()).toMatch('Fight Club');
            expect(MM.getView().getText()).toMatch('A Beautiful Mind');
            expect(MM.getView().getText()).toMatch('Spider');
        }).then(function () {
            return MM.goBack()
        }).then(function() {
            done();
        });
    });

    it('View course notes wiki private window', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            return MM.clickOn("Your course notes wiki (Private)");
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch("Back");
        }).then(function() {
            expect(MM.getView().getText()).toMatch('View page');
            expect(MM.getView().getText()).toMatch('Map');
        }).then(function () {
            return MM.clickOn('OK');
        }).then(function() {
            done();
        });
    });

    it('Click Fight Club in course notes wiki private window', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            return MM.clickOn("Your course notes wiki (collaborative)");
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[4]/ion-tabs/ng-include/ion-content/div[1]/mm-loading/div/article/mm-format-text/p[1]/a')).click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Use this space to add notes on all aspects of the films studied.');
            expect(MM.getView().getText()).toMatch('(Are we allowed to add stuff about any film or just our group choice film?)');
            expect(MM.getView().getText()).toMatch('View page');
            expect(MM.getView().getText()).toMatch('Map');
        }).then(function() {
            done();
        });
    });

    it('Click A Beautiful Mind in course notes wiki private window', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            return MM.clickOn("Your course notes wiki (collaborative)");
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[4]/ion-tabs/ng-include/ion-content/div[1]/mm-loading/div/article/mm-format-text/p[3]/a')).click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Use this space to add notes on all aspects of the films studied.');
            expect(MM.getView().getText()).toMatch('View page');
            expect(MM.getView().getText()).toMatch('Map');
        }).then(function() {
            done();
        });
    });

    it('Click Spider in course notes wiki private window', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses')
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Reflection and Feedback');
        }).then(function () {
            return MM.clickOn("Your course notes wiki (collaborative)");
        }).then(function () {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[4]/ion-tabs/ng-include/ion-content/div[1]/mm-loading/div/article/mm-format-text/p[5]/a')).click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Use this space to add notes on all aspects of the films studied.');
            expect(MM.getView().getText()).toMatch('View page');
            expect(MM.getView().getText()).toMatch('Map');
        }).then(function() {
            done();
        });
    });

});

