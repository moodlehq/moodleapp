/**
 * Created by Supun
 */

describe('User can attempt questions', function() {

    it('View question windows', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            expect(MM.getNavBar().getText()).toMatch('Grammar help with your essays');
            done();
        });
    });

    it('Attept Questions', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Attempt quiz now');
            done();
        });
    });

    it('Continue the last attempt', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function(){
            return element(by.xpath('/html/body/div[4]/div/div[3]/button')).click();
            done();
        });
    });

    it('Check questions without submitting answer', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function() {
            return MM.clickOn('Check');
        }).then(function () {
            return MM.clickOn('OK');
            expect(MM.getView().getText()).toMatch('Please select an answer.');
            done();
        });
    });

    it('User can select answer', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return MM.clickOn('Continue the last attempt');
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[1]/label/div/i')).click();
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[2]/label/div/i')).click();
        }).then(function() {
            return element(by.xpath('//*[@id="mma-mod_quiz-question-1"]/mm-question/div[1]/section/label[3]/label/div/i')).click();
        }).then(function () {
            return MM.clickOn('Check');
            done();
        });
    });

    it('User can open test in browser', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            return MM.clickOn('Psychology in Cinema');
        }).then(function () {
            return MM.clickOn('Group Projects and Individual tasks');
        }).then(function () {
            return MM.clickOn('Grammar help with your essays');
        }).then(function() {
            return element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/div[3]/span/a')).click();
            done();
        });
    });
});

