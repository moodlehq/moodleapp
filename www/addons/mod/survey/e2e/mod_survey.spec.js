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

describe('User can manage course survey', function () {

    it('Click survey tab and landing the survey page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learning survey: Help us to help you study more effectively');
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch('Learning survey: Help us to help you study more effectively');
            expect(MM.getView().getText()).toContain('Relevance');
        }).then(function () {
            done();
        });
    });

    it('Click the description in the survey page', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learning survey: Help us to help you study more effectively');
        }).then(function () {
            return MM.clickOn('The purpose of this survey');
        }).then(function () {
            expect(MM.getView().getText()).toContain('The purpose of this survey is to help us');
        }).then(function () {
            done();
        });
    });

    it('View the survey questions', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learning survey: Help us to help you study more effectively');
        }).then(function () {
            browser.sleep(5000); // Wait to render
            expect(MM.getView().getText()).toContain('my learning focuses on issues that interest me.');
        }).then(function () {
            done();
        });
    });

    it('Select survey responses', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learning survey: Help us to help you study more effectively');
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            return $('[aria-labelledby="mma-mod_survey-qP1"]').click();
        }).then(function () {
            browser.sleep(2000); // Wait for css to render.
            return MM.clickOn('Seldom');
        }).then(function () {
            browser.sleep(2000); // Wait for css to render.
            expect(MM.getView().getText()).toContain('Seldom');
        }).then(function () {
            done();
        });
    });

    it('Click secondary buttons', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('About this course');
        }).then(function () {
            return MM.clickOn('Learning survey: Help us to help you study more effectively');
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return $('.secondary-buttons').click();
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

});