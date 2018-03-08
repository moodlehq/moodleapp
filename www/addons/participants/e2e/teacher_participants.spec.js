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

describe('User can see more options in participants section as a teacher', function () {

    it('User can see student grades and add notes', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            browser.sleep(5000); // wait to render
            return $('[ng-click="showCourseActions($event)"]').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            return MM.clickOn('Barbara Gardner');
        }).then(function () {
            browser.sleep(5000); // Wait to render
            expect(MM.getView().getText()).toContain('Grades');
            expect(MM.getView().getText()).toContain('Add a new note');
        }).then(function () {
            done();
        });
    });

});