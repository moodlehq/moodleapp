/**
 * Created by Supun
 * */

describe('User can search courses', function() {

    it('User can search courses with valid word count', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/div[3]/span')).click();
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/form/label/input')).sendKeys('Software Engineering');
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/form/button')).click();
        }).then(function () {
            element(by.xpath('/html/body/div[4]/div/div[3]/button')).click();
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[1]/ion-header-bar/button')).click();
            done();
        });
    });

    it('User can not search courses without valid word count', function (done) {
        return MM.loginAsStudent().then(function () {
            return MM.clickOnInSideMenu('My courses');
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-bar/div[2]/ion-header-bar/div[3]/span')).click();
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/form/label/input')).sendKeys('SE');
        }).then(function () {
            element(by.xpath('/html/body/ion-nav-view/ion-side-menus/ion-side-menu-content/ion-nav-view/ion-view[2]/ion-content/div[1]/form/button')).isDisplayed().toBe(false);
            done();
        });

    });
});
