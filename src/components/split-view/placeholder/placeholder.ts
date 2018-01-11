import { Component } from '@angular/core';
import {
    IonicPage,
    NavController,
    NavParams } from 'ionic-angular';

@IonicPage({segment: "core-placeholder"})
@Component({
    selector: 'core-placeholder',
    templateUrl: 'placeholder.html',
})
export class CoreSplitViewPlaceholderPage {

    constructor(public navCtrl: NavController, public navParams: NavParams) { }

}
