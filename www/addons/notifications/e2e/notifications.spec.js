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

describe('User can manage course notifications', function() {

    it('Click the notification tab in main menu', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Notifications');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Notifications');
        }).then(function() {
            done();
        });
    });

    it('User can land the notification page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Notifications');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Notifications');
            expect(MM.getView().getText()).toMatch('There are no notifications');
        }).then(function() {
            done();
        });
    });

});

