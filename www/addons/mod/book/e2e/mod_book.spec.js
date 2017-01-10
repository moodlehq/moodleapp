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

describe('User can manage course book', function() {

    it('Click All sections course book tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('All sections');
        }).then(function () {
            return MM.clickOn('Useful links');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Video resources');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Click Background information course book tabs', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Useful links');
        }).then(function () {
            return MM.goBack();
        }).then(function () {
            return MM.clickOn('Video resources');
        }).then(function () {
            return MM.goBack();
        }).then(function() {
            done();
        });
    });

    it('Can go all the useful links press next and previous icon', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Useful links');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 A beautiful Mind');
        }).then(function () {
            return $('[ng-click="action(next)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('2 Fight Club');
        }).then(function () {
            return $('[ng-click="action(next)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('3 Spider');
        }).then(function() {
            return $('[ng-click="action(previous)"]').click();
        }).then(function() {
            return $('[ng-click="action(previous)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 A beautiful Mind');
        }).then(function() {
            done();
        });
    });

    it('Click secondary button in useful links', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Useful links');
        }).then(function () {
            return $('[ng-href="http://school.demo.moodle.net/mod/book/view.php?id=707"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 A beautiful Mind');
        }).then(function () {
            done();
        });
    });

    it('Click secondary menu button in useful links', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Useful links');
        }).then(function () {
            return $('[ng-click="popover.show($event)"]').click();
        }).then(function() {
            return element(by.xpath('/html/body/div[4]/div/ion-popover-view/ion-content/div[1]/nav/ul/li[3]/a')).click();
            expect(MM.getView().getText()).toMatch('Spider');
        }).then(function () {
            done();
        });
    });

    it('Can go all the Video resources press next and previous icon', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Video resources');
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 Trailer: A beautiful mind');
        }).then(function () {
            return $('[ng-click="action(next)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('2 Trailer: Fight club');
        }).then(function () {
            return $('[ng-click="action(next)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('3 Trailer: Spider');
        }).then(function() {
            return $('[ng-click="action(previous)"]').click();
        }).then(function() {
            return $('[ng-click="action(previous)"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 Trailer: A beautiful mind');
        }).then(function() {
            done();
        });
    });

    it('Click secondary button in Video resources', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Video resources');
        }).then(function () {
            return $('[ng-href="http://school.demo.moodle.net/mod/book/view.php?id=708"]').click();
        }).then(function() {
            expect(MM.getView().getText()).toMatch('1 Trailer: A beautiful mind');
        }).then(function () {
            done();
        });
    });

    it('Click secondary menu button in Video resources', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Background information');
        }).then(function () {
            return MM.clickOn('Video resources');
        }).then(function () {
            return $('[ng-click="popover.show($event)"]').click();
        }).then(function() {
            return element(by.xpath('/html/body/div[4]/div/ion-popover-view/ion-content/div[1]/nav/ul/li[3]/a')).click();
            expect(MM.getView().getText()).toMatch('3 Trailer: Spider');
        }).then(function () {
            done();
        });
    });

});

