import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { CoreSplitViewPlaceholderPage } from './placeholder';
import { TranslateModule } from '@ngx-translate/core';
import { CoreComponentsModule } from '../../components.module';

@NgModule({
    declarations: [
        CoreSplitViewPlaceholderPage,
    ],
    imports: [
        CoreComponentsModule,
        IonicPageModule.forChild(CoreSplitViewPlaceholderPage),
        TranslateModule.forChild()
    ],
    exports: [
        CoreSplitViewPlaceholderPage
    ]
})
export class CorePlaceholderPageModule { }
