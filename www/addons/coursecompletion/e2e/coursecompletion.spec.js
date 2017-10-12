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

describe('User can manage course completion', function() {

    it('View course completion inside the course in main page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('Psychology in Cinema');
            expect(MM.getView().getText()).toMatch('Course completion');
        }).then(function() {
            done();
        });
    });

    it('User can land course completion page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mma-coursecompletion-mine-handler').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Course completion');
        }).then(function() {
            done();
        });
    });

    it('User can view content of course completion page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function() {
            return $('.tab-item.active.mm-courses-handler.mma-coursecompletion-mine-handler').click();
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Course completion');
            expect(MM.getView().getText()).toMatch('Status');
            expect(MM.getView().getText()).toMatch('In progress');
            expect(MM.getView().getText()).toMatch('Required');
            expect(MM.getView().getText()).toMatch('All criteria below are required');
            expect(MM.getView().getText()).toMatch('Required criteria');
            expect(MM.getView().getText()).toMatch('Announcements from your tutor');
            expect(MM.getView().getText()).toMatch('Marking yourself complete');
            expect(MM.getView().getText()).toMatch('Yes');
            expect(MM.getView().getText()).toMatch('Prior Knowledge assessment');
            expect(MM.getView().getText()).toMatch('Factual recall test');
            expect(MM.getView().getText()).toMatch('Achieving grade');
            expect(MM.getView().getText()).toMatch('Yes');
        }).then(function() {
            done();
        });
    });

});

