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

describe('User can see listed correctly the participants list in a course', function () {

    it('User can see participants page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function () {
            done();
        });
    });

    it('User can see participants list', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Frances Banks');
            expect(MM.getView().getText()).toMatch('Angela Bowman');
        }).then(function () {
            done();
        });
    });

    it('Can click logged-in user tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function () {
            return MM.clickOn('Barbara Gardner');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
        }).then(function () {
            done();
        });
    });

    it('Can click other specific users tab', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Participants');
        }).then(function () {
            return MM.clickOn('Angela Bowman');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Angela Bowman');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Brian Franklin');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('Brian Franklin');
        }).then(function () {
            done();
        });
    });

});

