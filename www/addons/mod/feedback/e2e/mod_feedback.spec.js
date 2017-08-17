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

describe('User can manage feedback', function () {
 
   it('View Feedback', function (done) {
       return MM.loginAsStudent().then(function () {
           return MM.clickOnInSideMenu('Course overview');
       }).then(function () {
           return MM.clickOn('Digital Literacy');
       }).then(function () {
           return MM.clickOn('Self-reflection');
       }).then(function () {
           return MM.clickOn('Your views on this course');
       }).then(function () {
           expect(MM.getNavBar().getText()).toMatch('Your views on this course');
       }).then(function () {
           done();
       });
   });

   it('View Feedback preview', function (done) {
       return MM.loginAsStudent().then(function () {
           return MM.clickOnInSideMenu('Course overview');
       }).then(function () {
           return MM.clickOn('Digital Literacy');
       }).then(function () {
           return MM.clickOn('Self-reflection');
       }).then(function () {
           return MM.clickOn('Your views on this course');
       }).then(function () {
           return MM.clickOn('Preview');
       }).then(function () {
           expect(MM.getView().getText()).toMatch('How do you rate this course?');
           expect(MM.getView().getText()).toMatch("User's name will be logged and shown with answers");
       }).then(function() {
           done();
       });
   });

   it('Give Feedback', function (done) {
       return MM.loginAsStudent().then(function () {
           return MM.clickOnInSideMenu('Course overview');
       }).then(function () {
           return MM.clickOn('Digital Literacy');
       }).then(function () {
           return MM.clickOn('Self-reflection');
       }).then(function () {
           return MM.clickOn('Your views on this course');
       }).then(function () {
           return MM.clickOnElement($('[ng-click="gotoAnswerQuestions()"]'));
       }).then(function () {
            return MM.clickOn('Outstanding');
        }).then(function () {
            $('input[name="textfield_58"]').sendKeys('Good');
        }).then(function () {
            return MM.clickOn('Yes');
        }).then(function () {
            return MM.clickOn('Next page');
       }).then(function() {
           return MM.clickOnElement($('[ng-click="gotoPage(true)"]'));
       }).then(function() {
           return MM.clickOnElement($('[ng-click="gotoPage(false)"]'));
       }).then(function() {
            return MM.clickOn('Satisfactory');
        }).then(function () {
            return MM.clickOn('Definitely');
        }).then(function () {
            $('textarea[name="textarea_62"]').sendKeys('Good');
        }).then(function () {
            return MM.clickOnElement($('[ng-click="gotoPage(false)"]'));
       }).then(function() {
           return MM.clickOnElement($('button[ng-click="gotoPage(false)"]'));
       }).then(function() {
           expect(MM.getView().getText()).toContain('Thanks for giving us your views');
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
           return MM.clickOn('Your views on this course');
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