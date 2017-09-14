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

describe('User can attempt quizzes', function () {

    it('Open a quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch("Fun quiz: How's your Social media?");
        }).then(function () {
            done();
        });
    });

    it('Attempt Quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            return MM.clickOn('Attempt quiz now');
        }).then(function () {
            browser.sleep(25000);
            expect(MM.getNavBar().getText()).toMatch("Fun quiz: How's your Social media?");
            return MM.clickOnElement(element.all(by.css('label[name="q81:1_answer"]')).get(1));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('span[class="choice4 group1 drag no4 unplaced"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('span[class="place2 drop group1"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="loadPage(nextPage)"]'));
        }).then(function () {
            done();
        });
    });

    it('Continue the first attempt', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            return MM.clickOn('Continue the last attempt');
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('select[name="q81:4_sub0"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('option[label="Facetime"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="loadPage(nextPage)"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="finishAttempt()"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('button[class="button ng-binding button-positive"]'));
        }).then(function () {
            done();
        });
    });

    it('Re-Attempt a quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            return MM.clickOn('Re-attempt quiz');
        }).then(function () {
            browser.sleep(15000);
            return MM.clickOnElement($('[ng-click="loadPage(nextPage)"]'));
        }).then(function () {
            done();
        });
    });

    it('Continue the last attempt & check return to attempt', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            return MM.clickOn('Continue the last attempt');
        }).then(function () {
            browser.sleep(25000);
            return MM.clickOnElement($('[ng-click="loadPage(nextPage)"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="loadPage(attempt.currentpage)"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="loadPage(nextPage)"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('[ng-click="finishAttempt()"]'));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement($('button[class="button ng-binding button-positive"]'));
        }).then(function () {
            done();
        });
    });

    it('Click secondary button in the quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            browser.sleep(7500); // Wait for button css to render.
            return MM.clickOnElement($('.secondary-buttons'));
        }).then(function () {
            browser.sleep(5000); // Wait for css to render.
            expect($('.popover-backdrop.active').isPresent()).toBeTruthy();
        }).then(function () {
            done();
        });
    });

    it('Open review of Quiz', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('Course overview');
        }).then(function () {
            return MM.clickOn('Digital Literacy');
        }).then(function () {
            return MM.clickOn('Group work and assessment');
        }).then(function () {
            return MM.clickOn("Fun quiz: How's your Social media?");
        }).then(function () {
            expect(MM.getNavBar().getText()).toMatch("Fun quiz: How's your Social media?");
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOnElement(element.all(by.css('a[aria-label="Click here to see more detail"]')).get(0));
        }).then(function () {
            browser.sleep(10000);
            return MM.clickOn("Review");
        }).then(function () {
            browser.sleep(5000);
            expect(MM.getNavBar().getText()).toMatch("Review");
        }).then(function () {
            done();
        });
    });

});

