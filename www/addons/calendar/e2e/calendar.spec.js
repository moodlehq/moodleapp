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

describe('User can manage course calendar event', function () {

    it('Click the calendar event tab in main menu', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Calendar events');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Calendar events');
        }).then(function () {
            done();
        });
    });

    it('User can view list of calendar events', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Calendar events');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Calendar events');
            expect(MM.getView().getText()).toContain('Breakfast club');
        }).then(function () {
            done();
        });
    });

    it('View a calender event', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Calendar events');
        }).then(function () {
            return MM.clickOn('Breakfast club');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Breakfast club');
            expect(MM.getView().getText()).toContain('A chance to get together on Saturdays and discuss life');
        }).then(function () {
            done();
        });
    });

});
