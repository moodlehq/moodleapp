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

describe('A user can register sites to the app', function () {

    it('Adding a site', function (done) {
        return MM.loginAsStudent().then(function () {
            browser.sleep(5000); // wait to render
            expect(MM.getNavBar().getText()).toMatch('Course overview');
        }).then(function () {
            done();
        });
    });

    it('Logging out and back in', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Change site');
        }).then(function () {
            browser.sleep(5000); // wait to render
            expect(MM.getNavBar().getText()).toMatch('Sites');
            expect(element.all(by.repeater('site in sites')).count()).toBe(1);
            expect(MM.getView().getText()).toContain('school.demo.moodle.net');
            return MM.clickOn('school.demo.moodle.net');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Course overview');
        }).then(function () {
            done();
        });
    });

    it('Adding more than one site', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.logout();
        }).then(function () {
            return MM.clickOnElement($('[ng-click="add()"]'));
        }).then(function () {
            return MM.loginAsTeacher();
        }).then(function () {
            browser.sleep(5000);
            expect(MM.getNavBar().getText()).toMatch('Course overview');
            return MM.logout();
        }).then(function () {
            browser.sleep(5000);
            expect(element.all(by.repeater('site in sites')).count()).toBe(2);
        }).then(function () {
            done();
        });
    });

});
