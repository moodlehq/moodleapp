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

describe('User can create notes in a course', function () {

    it('User can click notes icon', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Notes');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Notes');
        }).then(function () {
            done();
        });
    });

    it('User can see notes side tabs', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Notes');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Notes');
            expect(MM.getView().getText()).toMatch('Site notes');
            expect(MM.getView().getText()).toMatch('Course notes');
            expect(MM.getView().getText()).toMatch('Personal notes');
        }).then(function () {
            done();
        });
    });

    it('User can click Site notes tabs', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Notes');
        }).then(function () {
            return MM.clickOn('Site notes');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Site notes');
            expect(MM.getView().getText()).toMatch('Barbara Gardner');
            expect(MM.getView().getText()).toMatch('Please teachers and support staff -keep an eye on Barbara for any recurring bullying issues.');
        }).then(function () {
            done();
        });
    });

    it('User can click Course notes tabs', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Notes');
        }).then(function () {
            return MM.clickOn('Course notes');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Course notes');
            expect(MM.getView().getText()).toMatch('There are no notes of this type yet');
        }).then(function () {
            done();
        });
    });

    it('User can click Personal notes tabs', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Notes');
        }).then(function () {
            return MM.clickOn('Personal notes');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Personal notes');
            expect(MM.getView().getText()).toMatch('There are no notes of this type yet');
        }).then(function () {
            done();
        });
    });

});

