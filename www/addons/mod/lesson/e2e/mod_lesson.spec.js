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

describe('User can manage lesson', function () {

    it('View Lesson', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('FOBO? Let us help you cure it!');
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('FOBO? Let us help you cure it!');
        }).then(function () {
            done();
        });
    });

    it('Start Lesson', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('FOBO? Let us help you cure it!');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="start(false)"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="buttonClicked(button.data)"]'));
        }).then(function () {
            return MM.clickOn('4-6 of these apply to me');
        }).then(function () {
            return MM.clickOn('Continue with the lesson');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Schedule email time');
            return MM.clickOnElement($('button[ng-click="buttonClicked(button.data)"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="buttonClicked(button.data)"]'));
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('FOBO? Let us help you cure it!');
        }).then(function () {
            done();
        });
    });

    it('Continue Lesson', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('FOBO? Let us help you cure it!');
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="start(true)"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="buttonClicked(button.data)"]'));
        }).then(function () {
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_172"]'));
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_172"]').$('option[label="switch off your mobile phone"]'));
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_173"]'));
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_173"]').$('option[label="check your emails"]'));
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_174"]'));
            MM.clickOnElement($('select[aria-labelledby="mma-mod_lesson-id_response_174"]').$('option[label="speak or call your colleague"]'));
            return MM.clickOnElement($('button[ng-click="submitQuestion()"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="loadPage(button.pageid, true)"]'));
        }).then(function () {
            expect(MM.getView().getText()).toContain('Congratulations - end of lesson reached');
            return MM.clickOnElement($('button[ng-click="reviewLesson(eolData.reviewlesson.pageid)"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="submitQuestion()"]'));
        }).then(function () {
            return MM.clickOnElement($('button[ng-click="loadPage(LESSON_EOL)"]'));
        }).then(function () {
            expect(MM.getNavBar().getText()).toContain('FOBO? Let us help you cure it!');
        }).then(function () {
            done();
        });
    });

    it('Try to retake', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('FOBO? Let us help you cure it!');
        }).then(function () {
            expect(MM.getView().getText()).toMatch('You are not allowed to retake this lesson.');
        }).then(function () {
            done();
        });
    });

    it('Context Menu', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Self-reflection');
        }).then(function () {
            return MM.clickOn('FOBO? Let us help you cure it!');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            browser.sleep(5000); // Wait for button css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});