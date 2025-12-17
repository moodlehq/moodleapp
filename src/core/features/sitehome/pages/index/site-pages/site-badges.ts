// (C) Copyright 2015 Moodle Pty Ltd.
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

import { Component } from '@angular/core';

import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';
import { CoreLoginHelperProvider } from '@features/login/services/login-helper';

/**
 * Component that displays help to connect to a site.
 */
@Component({
    selector: 'core-login-site-help',
    templateUrl: 'site-badges.html',
    styleUrls: ['site-badges.scss'],
})

export class CoreLoginSiteBadgesComponent {

    urlImageHtml: string;
    setupLinkHtml: string;
    qrCodeImageHtml: string;
    canScanQR: boolean;

    constructor() {
	    const noBadgeMsg = Translate.instant('home.nobadges');
        let firstname = '';
		 const viewbadges = document.querySelector<HTMLElement>('.view-badges');
        if(viewbadges != null && viewbadges.attributes['data-firstname'] != null){
            firstname = viewbadges.attributes['data-firstname'].value;
        }

        let lastname = '';
        if(viewbadges != null && viewbadges.attributes['data-lastname'] != null){
            lastname = viewbadges.attributes['data-lastname'].value;
        }

        let parseddate = '';
        if(viewbadges != null && viewbadges.attributes['data-bd'] != null){
            const bdate = viewbadges.attributes['data-bd'].value;
            try{
                const d = new Date(bdate);
                let m = d.getMonth();
                m++;
                let month = m+'';
                if(m < 10){
                    month = '0' + m;
                }

                const g = d.getDate();
                let day = g+'';
                if(g < 10){
                    day = '0' + g;
                }
                parseddate = d.getFullYear() +'' + month  + '' + day;

            }catch(e){
                console.log(e);
            }
        }

        const url = 'https://art001exe.exentriq.com/93489/getBLSDCert?rand=' + new Date().getTime();
        const payload = {
            name: firstname,
            surname: lastname,
            birthDate:parseddate,
        };

        fetch(url, {
					    method: 'POST',
					    headers: {
					      'Accept': 'application/json',
					      'Content-Type': 'application/json',
					    },
					    body: JSON.stringify(payload),
					  })
					  .then(response => response.json())
					  .then(data => {
					    // Handle data

					    console.log(data);

					    // modal.dismiss();

					    if(data && data.length > 0){

				        	var br2 = document.querySelector<HTMLElement>('.mybadges_result2');
					        if(br2 != null){

						       let html = '';
						       for(let i=0; i < data.length; i++){

							        html += '<div class=\'single_badge\' style=\'margin-top: 10px;padding-top: 10px;border-top: 1px solid #ccc;\'><div class=\'badge_img\'><img src=\'' + data[i].Image + '\'></div><div class=\'badge_desc\' style=\'display:none\'>' + data[i].Certification + '</div></div>';

						        }

						         br2.innerHTML = html;

					        }

				        }else{
					        const br = document.querySelector<HTMLElement>('.mybadges_result2');
					        if(br != null){
						        br.innerHTML = '<div class=\'noBadgeMsg\' style=\'padding:20px\'>' +  noBadgeMsg + '</div>';
						    }

						    var br2 = document.querySelector<HTMLElement>('.no-mybadges_result');
					        if(br2 != null){
						        br2.style.display = 'block';
						    }

				        }

            });

        this.canScanQR = CoreUtils.canScanQR();
        this.urlImageHtml = CoreLoginHelperProvider.FAQ_URL_IMAGE_HTML;
        this.qrCodeImageHtml = CoreLoginHelperProvider.FAQ_QRCODE_IMAGE_HTML;
        this.setupLinkHtml = '<a href="https://moodle.com/getstarted/" title="' +
            Translate.instant('core.login.faqsetupsitelinktitle') + '">https://moodle.com/getstarted/</a>';
    }

    /**
     * Close help modal.
     */
    closeHelp(): void {
	    const br2 = document.querySelector<HTMLElement>('.no-mybadges_result');
        if(br2 != null){
	         br2.style.display = 'none';
	    }
        ModalController.dismiss();
    }

}
