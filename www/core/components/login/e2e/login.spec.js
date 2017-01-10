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

describe('A user can register sites to the app', function() {

    it('Adding a site', function(done) {
        element(by.model('siteurl'))
            .sendKeys(SITEURL);

        return $('[ng-click="connect(siteurl)"]').click().then(function() {
            element(by.model('credentials.username'))
                .sendKeys(USERS.STUDENT.LOGIN);
            element(by.model('credentials.password'))
                .sendKeys(USERS.STUDENT.PASSWORD);
            return $('[ng-click="login()"]').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My courses');
            done();
        });
    });

    it('Logging out and back in', function(done) {
        return MM.loginAsStudent().then(function() {
            return MM.clickOnInSideMenu('Change site');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Login');
            expect(element.all(by.repeater('site in sites')).count()).toBe(1);
            expect(MM.getView().getText()).toMatch(SITEURL);
            return MM.clickOn(SITEURL);
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My courses');
            done();
        });
    });

    it('Adding more than one site', function(done) {
        return MM.loginAsStudent().then(function() {
            return MM.logout();
        }).then(function() {
            return MM.clickOnElement($('[ng-click="add()"]'));
        }).then(function() {
            return MM.loginAsTeacher();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('My courses');
            return MM.logout();
        }).then(function() {
            return browser.waitForAngular();
        }).then(function() {
            expect(element.all(by.repeater('site in sites')).count()).toBe(2);
            done();
        });
    });

});
