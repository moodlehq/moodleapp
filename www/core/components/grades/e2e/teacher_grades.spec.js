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

describe('User can see course final grade as a teacher', function () {

    it('User can click course grade button as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            return MM.clickOn('Frances Banks');
        }).then(function () {
            return MM.clickOn('Grades');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Grades');
            expect(MM.getView().getText()).toContain('Digital Literacy');
        }).then(function () {
            done();
        });
    });

    it('User can see grades of all activities as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            return MM.clickOn('Frances Banks');
        }).then(function () {
            return MM.clickOn('Grades');
        }).then(function () {
            expect(MM.getView().getText()).toContain('Assignment 1 (Text)');
            expect(MM.getView().getText()).toContain('75.00');
            expect(MM.getView().getText()).toContain('Fun quiz:');
            expect(MM.getView().getText()).toContain('Assignment 2 (Upload)');
            expect(MM.getView().getText()).toContain('Forum');
            expect(MM.getView().getText()).toContain('0.00');
            expect(MM.getView().getText()).toContain('FOBO?');
            expect(MM.getView().getText()).toContain('100.00');
            expect(MM.getView().getText()).toContain('Course total');
            expect(MM.getView().getText()).toContain('175.00');
        }).then(function () {
            done();
        });
    });

    it('Check the grade of an activity as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            return MM.clickOn('Frances Banks');
        }).then(function () {
            return MM.clickOn('Grades');
        }).then(function () {
            return MM.clickOn('Assignment 1 (Text)');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Grade');
            expect(MM.getView().getText()).toContain('Weight');
            expect(MM.getView().getText()).toContain('Grade');
            expect(MM.getView().getText()).toContain('37.31');
            expect(MM.getView().getText()).toContain('Feedback');
        }).then(function () {
            done();
        });
    });

    it('Check the final course grade as a teacher', function (done) {
        return MM.loginAsTeacher().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            return MM.clickOn('Participants');
        }).then(function () {
            return MM.clickOn('Frances Banks');
        }).then(function () {
            return MM.clickOn('Grades');
        }).then(function () {
            browser.sleep(7500); // Wait for css to render.
            return $('[id="row_411_48"]').click();
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Grade');
            expect(MM.getView().getText()).toContain('Grade');
            expect(MM.getView().getText()).toContain('175.00');
            expect(MM.getView().getText()).toContain('87.06');
        }).then(function () {
            done();
        });
    });

});

