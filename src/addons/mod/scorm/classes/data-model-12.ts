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

import { CoreUtils } from '@static/utils';
import { CoreEvents } from '@static/events';
import {
    AddonModScorm,
    AddonModScormCommonEventData,
    AddonModScormDataEntry,
    AddonModScormDataValue,
    AddonModScormScorm,
    AddonModScormUserDataMap,
} from '../services/scorm';
import {
    ADDON_MOD_SCORM_UPDATE_TOC_EVENT,
    ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT,
    ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT,
    ADDON_MOD_SCORM_GO_OFFLINE_EVENT,
    AddonModScormMode,
} from '../constants';
import { CoreTimeConstants } from '@/core/constants';

// Standard Data Type Definition.
let CMI_STRING_256 = '^[\\u0000-\\uFFFF]{0,255}$';
let CMI_STRING_4096 = '^[\\u0000-\\uFFFF]{0,4096}$';
const CMI_TIME = '^([0-2]{1}[0-9]{1}):([0-5]{1}[0-9]{1}):([0-5]{1}[0-9]{1})(.[0-9]{1,2})?$';
const CMI_TIMESPAN = '^([0-9]{2,4}):([0-9]{2}):([0-9]{2})(.[0-9]{1,2})?$';
const CMI_INTEGER = '^\\d+$'; // eslint-disable-line @typescript-eslint/no-unused-vars
const CMI_SINTEGER = '^-?([0-9]+)$';
const CMI_DECIMAL = '^-?([0-9]{0,3})(.[0-9]*)?$';
const CMI_IDENTIFIER = '^[\\u0021-\\u007E]{0,255}$';
const CMI_FEEDBACK = CMI_STRING_256; // This must be redefined.
const CMI_INDEX = '[._](\\d+).';

// Vocabulary Data Type Definition.
const CMI_STATUS = '^passed$|^completed$|^failed$|^incomplete$|^browsed$';
const CMI_STATUS_2 = '^passed$|^completed$|^failed$|^incomplete$|^browsed$|^not attempted$';
const CMI_EXIT = '^time-out$|^suspend$|^logout$|^$';
const CMI_TYPE = '^true-false$|^choice$|^fill-in$|^matching$|^performance$|^sequencing$|^likert$|^numeric$';
const CMI_RESULT = '^correct$|^wrong$|^unanticipated$|^neutral$|^([0-9]{0,3})?(.[0-9]*)?$';
const NAV_EVENT = '^previous$|^continue$';

// Children lists.
const CMI_CHILDREN = 'core,suspend_data,launch_data,comments,objectives,student_data,student_preference,interactions';
const CORE_CHILDREN = 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,' +
        'exit,session_time';
const SCORE_CHILDREN = 'raw,min,max';
const COMMENTS_CHILDREN = 'content,location,time';
const OBJECTIVES_CHILDREN = 'id,score,status';
const CORRECT_RESPONSES_CHILDREN = 'pattern'; // eslint-disable-line @typescript-eslint/no-unused-vars
const STUDENT_DATA_CHILDREN = 'mastery_score,max_time_allowed,time_limit_action';
const STUDENT_PREFERENCE_CHILDREN = 'audio,language,speed,text';
const INTERACTIONS_CHILDREN = 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency';

// Data ranges.
const SCORE_RANGE = '0#100';
const AUDIO_RANGE = '-1#100';
const SPEED_RANGE = '-100#100';
const WEIGHTING_RANGE = '-100#100';
const TEXT_RANGE = '-1#1';

// Error messages.
const ERROR_STRINGS = {
    0: 'No error',
    101: 'General exception',
    201: 'Invalid argument error',
    202: 'Element cannot have children',
    203: 'Element not an array - cannot have count',
    301: 'Not initialized',
    401: 'Not implemented error',
    402: 'Invalid set value, element is a keyword',
    403: 'Element is read only',
    404: 'Element is write only',
    405: 'Incorrect data type',
};

/**
 * SCORM data model implementation for version 1.2.
 */
export class AddonModScormDataModel12 {

    protected currentUserData: AddonModScormUserDataMap = {}; // Current user data.
    protected def: Record<number, Record<string, AddonModScormDataValue>> = {}; // Object containing the default values.
    protected defExtra: Record<number, Record<string, AddonModScormDataValue>> = {}; // Objectives and interactions (all .n. elems).
    protected dataModel: Record<number, Record<string, DataModelEntry>> = {}; // The SCORM 1.2 data model.

    protected initialized = false; // Whether LMSInitialize has been called.
    protected errorCode = '0'; // Last error.
    protected timeout?: number; // Timeout to commit changes.

    /**
     * Constructor.
     *
     * @param siteId Site ID.
     * @param scorm SCORM.
     * @param scoId Current SCO ID.
     * @param attempt Attempt number.
     * @param userData The user default data.
     * @param mode Mode being played. By default, MODENORMAL.
     * @param offline Whether the attempt is offline.
     * @param canSaveTracks Whether the user can save tracks.
     */
    constructor(
        protected siteId: string,
        protected scorm: AddonModScormScorm,
        protected scoId: number,
        protected attempt: number,
        protected userData: AddonModScormUserDataMap,
        protected mode = AddonModScormMode.NORMAL,
        protected offline = false,
        protected canSaveTracks = true,
    ) {
        this.init(userData);
    }

    /**
     * Utility function for adding two times in format hh:mm:ss.
     *
     * @param first First time.
     * @param second Second time.
     * @returns Total time.
     */
    protected addTime(first: string, second: string): string {
        const sFirst = first.split(':');
        const sSecond = second.split(':');
        const cFirst = sFirst[2].split('.');
        const cSecond = sSecond[2].split('.');
        let change = 0;

        let firstCents = 0; // Cents.
        if (cFirst.length > 1) {
            firstCents = parseInt(cFirst[1], 10);
        }

        let secondCents = 0;
        if (cSecond.length > 1) {
            secondCents = parseInt(cSecond[1], 10);
        }

        let cents: string | number = firstCents + secondCents;
        change = Math.floor(cents / 100);
        cents = cents - (change * 100);
        if (Math.floor(cents) < 10) {
            cents = '0' + cents.toString();
        }

        let secs: string | number = parseInt(cFirst[0], 10) + parseInt(cSecond[0], 10) + change; // Seconds.
        change = Math.floor(secs / 60);
        secs = secs - (change * 60);
        if (Math.floor(secs) < 10) {
            secs = '0' + secs.toString();
        }

        let mins: string | number = parseInt(sFirst[1], 10) + parseInt(sSecond[1], 10) + change; // Minutes.
        change = Math.floor(mins / 60);
        mins = mins - (change * 60);
        if (mins < 10) {
            mins = '0' + mins.toString();
        }

        let hours: string | number = parseInt(sFirst[0], 10) + parseInt(sSecond[0], 10) + change; // Hours.
        if (hours < 10) {
            hours = '0' + hours.toString();
        }

        if (cents != '0') {
            return hours + ':' + mins + ':' + secs + '.' + cents;
        } else {
            return hours + ':' + mins + ':' + secs;
        }
    }

    /**
     * Collect all the user tracking data that must be persisted in the system, this is usually called by LMSCommit().
     *
     * @returns Collected data.
     */
    protected collectData(): AddonModScormDataEntry[] {
        if (!this.currentUserData[this.scoId]) {
            return [];
        }

        const data: AddonModScormDataEntry[] = [];

        for (const element in this.currentUserData[this.scoId].userdata) {
            // Ommit for example the nav. elements and the session time element.
            if (element.substring(0, 3) != 'cmi' || element == 'cmi.core.session_time') {
                continue;
            }

            // Get the generic name for this element (e.g. convert 'cmi.interactions.1.id' to 'cmi.interactions.n.id')
            const expression = new RegExp(CMI_INDEX, 'g');
            const elementModel = element.replace(expression, '.n.');

            // Check if this specific element is not defined in the datamodel, but the generic element name is.
            if (this.dataModel[this.scoId][element] === undefined && this.dataModel[this.scoId][elementModel] !== undefined) {
                // Add this element to the data model (by cloning the generic element) so we can track changes to it.
                this.dataModel[this.scoId][element] = CoreUtils.clone(this.dataModel[this.scoId][elementModel]);
            }

            // Check if the current element exists in the datamodel and it's not a read only element.
            if (this.dataModel[this.scoId][element] === undefined || this.dataModel[this.scoId][element].mod == 'r') {
                continue;
            }

            const el: AddonModScormDataEntry = {
                // Moodle stores the organizations and interactions using _n. instead .n.
                element: element.replace(expression, '_$1.'),
                value: this.getEl(element),
            };

            // Check if the element has a default value.
            if (this.dataModel[this.scoId][element].defaultvalue !== undefined) {

                // Check if the default value is different from the current value.
                if (this.dataModel[this.scoId][element].defaultvalue !== el.value) {
                    data.push(el);

                    // Update the element default to reflect the current committed value.
                    this.dataModel[this.scoId][element].defaultvalue = el.value;
                }
            } else {
                data.push(el);

                // No default value for the element, so set it now.
                this.dataModel[this.scoId][element].defaultvalue = el.value;
            }
        }

        return data;
    }

    /**
     * Get the value of the given element from the non-persistent (current) user data.
     *
     * @param el The element
     * @returns The element value
     */
    protected getEl(el: string): string | number {
        if (this.currentUserData[this.scoId] && this.currentUserData[this.scoId].userdata[el] !== undefined) {
            return this.currentUserData[this.scoId].userdata[el];
        }

        return '';
    }

    /**
     * Initialize the model.
     *
     * @param userData The user default data.
     */
    protected init(userData: AddonModScormUserDataMap): void {
        if (!this.scorm.scormStandard) {
            CMI_STRING_256 = '^[\\u0000-\\uFFFF]{0,64000}$';
            CMI_STRING_4096 = CMI_STRING_256;
        }

        // Prepare the definition array containing the default values.
        for (const scoId in userData) {
            const sco = userData[scoId];
            this.def[scoId] = sco.defaultdata;
            this.defExtra[scoId] = sco.userdata;
        }

        // Set up data model for each SCO.
        for (const scoId in this.def) {
            this.dataModel[scoId] = {
                'cmi._children': { defaultvalue: CMI_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi._version': { defaultvalue: '3.4', mod: 'r', writeerror: '402' },
                'cmi.core._children': { defaultvalue: CORE_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.core.student_id': { defaultvalue: this.def[scoId]['cmi.core.student_id'], mod: 'r', writeerror: '403' },
                'cmi.core.student_name': { defaultvalue: this.def[scoId]['cmi.core.student_name'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_location': {
                    defaultvalue: this.def[scoId]['cmi.core.lesson_location'],
                    format: CMI_STRING_256,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.core.credit': { defaultvalue: this.def[scoId]['cmi.core.credit'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_status': {
                    defaultvalue: this.def[scoId]['cmi.core.lesson_status'],
                    format: CMI_STATUS,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.core.entry': { defaultvalue: this.def[scoId]['cmi.core.entry'], mod: 'r', writeerror: '403' },
                'cmi.core.score._children': { defaultvalue: SCORE_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.core.score.raw': {
                    defaultvalue: this.def[scoId]['cmi.core.score.raw'],
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.core.score.max': {
                    defaultvalue: this.def[scoId]['cmi.core.score.max'],
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.core.score.min': {
                    defaultvalue: this.def[scoId]['cmi.core.score.min'],
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.core.total_time': { defaultvalue: this.def[scoId]['cmi.core.total_time'], mod: 'r', writeerror: '403' },
                'cmi.core.lesson_mode': { defaultvalue: this.def[scoId]['cmi.core.lesson_mode'], mod: 'r', writeerror: '403' },
                'cmi.core.exit': {
                    defaultvalue: this.def[scoId]['cmi.core.exit'],
                    format: CMI_EXIT,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.core.session_time': {
                    format: CMI_TIMESPAN,
                    mod: 'w',
                    defaultvalue: '00:00:00',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.suspend_data': {
                    defaultvalue: this.def[scoId]['cmi.suspend_data'],
                    format: CMI_STRING_4096,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.launch_data': { defaultvalue: this.def[scoId]['cmi.launch_data'], mod: 'r', writeerror: '403' },
                'cmi.comments': {
                    defaultvalue: this.def[scoId]['cmi.comments'],
                    format: CMI_STRING_4096,
                    mod: 'rw',
                    writeerror: '405',
                },
                // Deprecated evaluation attributes.
                'cmi.evaluation.comments._count': { defaultvalue: '0', mod: 'r', writeerror: '402' },
                'cmi.evaluation.comments._children': { defaultvalue: COMMENTS_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.evaluation.comments.n.content': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_STRING_256,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.evaluation.comments.n.location': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_STRING_256,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.evaluation.comments.n.time': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_TIME,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.comments_from_lms': { mod: 'r', writeerror: '403' },
                'cmi.objectives._children': { defaultvalue: OBJECTIVES_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.objectives._count': { mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.objectives.n.id': { pattern: CMI_INDEX, format: CMI_IDENTIFIER, mod: 'rw', writeerror: '405' },
                'cmi.objectives.n.score._children': { pattern: CMI_INDEX, mod: 'r', writeerror: '402' },
                'cmi.objectives.n.score.raw': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.objectives.n.score.min': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.objectives.n.score.max': {
                    defaultvalue: '',
                    pattern: CMI_INDEX,
                    format: CMI_DECIMAL,
                    range: SCORE_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.objectives.n.status': { pattern: CMI_INDEX, format: CMI_STATUS_2, mod: 'rw', writeerror: '405' },
                'cmi.student_data._children': { defaultvalue: STUDENT_DATA_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.student_data.mastery_score': {
                    defaultvalue: this.def[scoId]['cmi.student_data.mastery_score'],
                    mod: 'r',
                    writeerror: '403',
                },
                'cmi.student_data.max_time_allowed': {
                    defaultvalue: this.def[scoId]['cmi.student_data.max_time_allowed'],
                    mod: 'r',
                    writeerror: '403',
                },
                'cmi.student_data.time_limit_action': {
                    defaultvalue: this.def[scoId]['cmi.student_data.time_limit_action'],
                    mod: 'r',
                    writeerror: '403',
                },
                'cmi.student_preference._children': {
                    defaultvalue: STUDENT_PREFERENCE_CHILDREN,
                    mod: 'r',
                    writeerror: '402',
                },
                'cmi.student_preference.audio': {
                    defaultvalue: this.def[scoId]['cmi.student_preference.audio'],
                    format: CMI_SINTEGER,
                    range: AUDIO_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.student_preference.language': {
                    defaultvalue: this.def[scoId]['cmi.student_preference.language'],
                    format: CMI_STRING_256,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.student_preference.speed': {
                    defaultvalue: this.def[scoId]['cmi.student_preference.speed'],
                    format: CMI_SINTEGER,
                    range: SPEED_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.student_preference.text': {
                    defaultvalue: this.def[scoId]['cmi.student_preference.text'],
                    format: CMI_SINTEGER,
                    range: TEXT_RANGE,
                    mod: 'rw',
                    writeerror: '405',
                },
                'cmi.interactions._children': { defaultvalue: INTERACTIONS_CHILDREN, mod: 'r', writeerror: '402' },
                'cmi.interactions._count': { mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.interactions.n.id': {
                    pattern: CMI_INDEX,
                    format: CMI_IDENTIFIER,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.objectives._count': { pattern: CMI_INDEX, mod: 'r', defaultvalue: '0', writeerror: '402' },
                'cmi.interactions.n.objectives.n.id': {
                    pattern: CMI_INDEX,
                    format: CMI_IDENTIFIER,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.time': { pattern: CMI_INDEX, format: CMI_TIME, mod: 'w', readerror: '404', writeerror: '405' },
                'cmi.interactions.n.type': { pattern: CMI_INDEX, format: CMI_TYPE, mod: 'w', readerror: '404', writeerror: '405' },
                'cmi.interactions.n.correct_responses._count': {
                    pattern: CMI_INDEX,
                    mod: 'r',
                    defaultvalue: '0',
                    writeerror: '402',
                },
                'cmi.interactions.n.correct_responses.n.pattern': {
                    pattern: CMI_INDEX,
                    format: CMI_FEEDBACK,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.weighting': {
                    pattern: CMI_INDEX,
                    format: CMI_DECIMAL,
                    range: WEIGHTING_RANGE,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.student_response': {
                    pattern: CMI_INDEX,
                    format: CMI_FEEDBACK,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.result': {
                    pattern: CMI_INDEX,
                    format: CMI_RESULT,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'cmi.interactions.n.latency': {
                    pattern: CMI_INDEX,
                    format: CMI_TIMESPAN,
                    mod: 'w',
                    readerror: '404',
                    writeerror: '405',
                },
                'nav.event': { defaultvalue: '', format: NAV_EVENT, mod: 'w', readerror: '404', writeerror: '405' },
            };

            this.currentUserData[scoId] = {
                scoid: Number(scoId),
                userdata: {},
                defaultdata: {},
            };

            // Load default values.
            for (const element in this.dataModel[scoId]) {
                if (element.match(/\.n\./) === null) {
                    const defaultValue = this.dataModel[scoId][element].defaultvalue;
                    if (defaultValue !== undefined) {
                        this.currentUserData[scoId].userdata[element] = defaultValue;
                    }
                }
            }

            // Load initial user data for current SCO.
            for (const element in this.def[scoId]) {
                if (element.match(/\.n\./) === null) {
                    const defaultValue = this.dataModel[scoId][element].defaultvalue;
                    if (defaultValue !== undefined) {
                        this.currentUserData[scoId].userdata[element] = defaultValue;
                    } else if (this.defExtra[scoId][element] !== undefined) {
                        // Check in user data values.
                        this.currentUserData[scoId].userdata[element] = this.defExtra[scoId][element];
                    } else {
                        this.currentUserData[scoId].userdata[element] = '';
                    }
                }
            }

            // Load interactions and objectives, and init the counters.
            const expression = new RegExp(CMI_INDEX, 'g');

            for (const element in this.defExtra[scoId]) {
                let counterElement = '';
                let currentCounterIndex = '0';

                // This check for an indexed element. cmi.objectives.1.id or cmi.objectives_1.id.
                if (element.match(expression)) {
                    // Normalize to the expected value according the standard.
                    // Moodle stores this values using _n. instead .n.
                    const elementDotFormat = element.replace(expression, '.$1.');
                    this.currentUserData[scoId].userdata[elementDotFormat] = this.defExtra[scoId][element];

                    // Get the correct counter and current index.
                    if (elementDotFormat.indexOf('cmi.evaluation.comments') === 0) {
                        counterElement = 'cmi.evaluation.comments._count';
                        currentCounterIndex = elementDotFormat.match(/.(\d+)./)?.[1] || '0';
                    } else if (elementDotFormat.indexOf('cmi.objectives') === 0) {
                        counterElement = 'cmi.objectives._count';
                        currentCounterIndex = elementDotFormat.match(/.(\d+)./)?.[1] || '0';
                    } else if (elementDotFormat.indexOf('cmi.interactions') === 0) {
                        if (elementDotFormat.indexOf('.objectives.') > 0) {
                            const currentN = elementDotFormat.match(/cmi.interactions.(\d+)./)?.[1];
                            currentCounterIndex = elementDotFormat.match(/objectives.(\d+)./)?.[1] || '0';
                            counterElement = 'cmi.interactions.' + currentN + '.objectives._count';
                        } else if (elementDotFormat.indexOf('.correct_responses.') > 0) {
                            const currentN = elementDotFormat.match(/cmi.interactions.(\d+)./)?.[1];
                            currentCounterIndex = elementDotFormat.match(/correct_responses.(\d+)./)?.[1] || '0';
                            counterElement = 'cmi.interactions.' + currentN + '.correct_responses._count';
                        } else {
                            counterElement = 'cmi.interactions._count';
                            currentCounterIndex = elementDotFormat.match(/.(\d+)./)?.[1] || '0';
                        }
                    }

                    if (counterElement) {
                        const counterData = this.currentUserData[scoId].userdata[counterElement];
                        if (counterData === undefined) {
                            this.currentUserData[scoId].userdata[counterElement] = 0;
                        }
                        // Check if we need to sum.
                        if (Number(currentCounterIndex) == Number(counterData)) {
                            this.currentUserData[scoId].userdata[counterElement] = Number(counterData) + 1;
                        }
                        if (Number(currentCounterIndex) > Number(counterData)) {
                            this.currentUserData[scoId].userdata[counterElement] = Number(currentCounterIndex) - 1;
                        }
                    }

                }
            }

            // Set default status.
            if (this.currentUserData[scoId].userdata['cmi.core.lesson_status'] === '') {
                this.currentUserData[scoId].userdata['cmi.core.lesson_status'] = 'not attempted';
            }

            // Define mode and credit.
            this.currentUserData[scoId].userdata['cmi.core.credit'] = this.mode === AddonModScormMode.NORMAL ?
                'credit' :
                'no-credit';
            this.currentUserData[scoId].userdata['cmi.core.lesson_mode'] = this.mode;
        }
    }

    /**
     * Commit the changes.
     *
     * @param param Param.
     * @returns "true" if success, "false" otherwise.
     */
    LMSCommit(param: string): string {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        this.errorCode = '0';
        if (param == '') {
            if (this.initialized) {
                const result = this.storeData(false);

                // Trigger TOC update.
                this.triggerEvent(ADDON_MOD_SCORM_UPDATE_TOC_EVENT);

                this.errorCode = result ? '0' : '101';

                // Conver to string representing a boolean.
                return result ? 'true' : 'false';
            } else {
                this.errorCode = '301';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Finish the data model.
     *
     * @param param Param.
     * @returns "true" if success, "false" otherwise.
     */
    LMSFinish(param: string): string {
        this.errorCode = '0';

        if (param == '') {
            if (this.initialized) {
                this.initialized = false;

                const result = this.storeData(true);
                if (this.getEl('nav.event') != '') {
                    if (this.getEl('nav.event') == 'continue') {
                        this.triggerEvent(ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT);
                    } else {
                        this.triggerEvent(ADDON_MOD_SCORM_LAUNCH_PREV_SCO_EVENT);
                    }
                } else {
                    if (this.scorm.auto) {
                        this.triggerEvent(ADDON_MOD_SCORM_LAUNCH_NEXT_SCO_EVENT);
                    }
                }

                this.errorCode = result ? '0' : '101';

                // Trigger TOC update.
                this.triggerEvent(ADDON_MOD_SCORM_UPDATE_TOC_EVENT);

                // Conver to string representing a boolean.
                return result ? 'true' : 'false';
            } else {
                this.errorCode = '301';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Get diagnostic.
     *
     * @param param Param.
     * @returns Result.
     */
    LMSGetDiagnostic(param: string): string {
        if (param == '') {
            param = this.errorCode;
        }

        return param;
    }

    /**
     * Get the error message for a certain code.
     *
     * @param param Error code.
     * @returns Error message.
     */
    LMSGetErrorString(param: string): string {
        if (param != '') {
            return ERROR_STRINGS[param];
        } else {
            return '';
        }
    }

    /**
     * Get the last error code.
     *
     * @returns Last error code.
     */
    LMSGetLastError(): string {
        return this.errorCode;
    }

    /**
     * Get the value of a certain element.
     *
     * @param element Name of the element to get.
     * @returns Value.
     */
    LMSGetValue(element: string): AddonModScormDataValue {
        this.errorCode = '0';

        if (this.initialized) {
            if (element != '') {
                const expression = new RegExp(CMI_INDEX, 'g');
                const elementModel = String(element).replace(expression, '.n.');

                if (this.dataModel[this.scoId][elementModel] !== undefined) {
                    if (this.dataModel[this.scoId][elementModel].mod != 'w') {
                        this.errorCode = '0';

                        return this.getEl(element);
                    } else {
                        this.errorCode = this.dataModel[this.scoId][elementModel].readerror || '0';
                    }
                } else {
                    const childrenStr = '._children';
                    const countStr = '._count';

                    if (elementModel.substring(elementModel.length - childrenStr.length) == childrenStr) {
                        const parentModel = elementModel.substring(0, elementModel.length - childrenStr.length);

                        if (this.dataModel[this.scoId][parentModel] !== undefined) {
                            this.errorCode = '202';
                        } else {
                            this.errorCode = '201';
                        }
                    } else if (elementModel.substring(elementModel.length - countStr.length) == countStr) {
                        const parentModel = elementModel.substring(0, elementModel.length - countStr.length);

                        if (this.dataModel[this.scoId][parentModel] !== undefined) {
                            this.errorCode = '203';
                        } else {
                            this.errorCode = '201';
                        }
                    } else {
                        this.errorCode = '201';
                    }
                }
            } else {
                this.errorCode = '201';
            }
        } else {
            this.errorCode = '301';
        }

        return '';
    }

    /**
     * Initialize the data model.
     *
     * @param param Param.
     * @returns "true" if initialized, "false" otherwise.
     */
    LMSInitialize(param: string): string {
        this.errorCode = '0';

        if (param == '') {
            if (!this.initialized) {
                this.initialized = true;
                this.errorCode = '0';

                return 'true';
            } else {
                this.errorCode = '101';
            }
        } else {
            this.errorCode = '201';
        }

        return 'false';
    }

    /**
     * Set the value of a certain element.
     *
     * @param element Name of the element to set.
     * @param value Value to set.
     * @returns "true" if success, "false" otherwise.
     */
    LMSSetValue(element: string, value: AddonModScormDataValue): string {
        this.errorCode = '0';

        if (this.initialized) {
            if (element != '') {
                let expression = new RegExp(CMI_INDEX, 'g');
                const elementModel = String(element).replace(expression, '.n.');

                if (this.dataModel[this.scoId][elementModel] !== undefined) {
                    if (this.dataModel[this.scoId][elementModel].mod != 'r') {
                        expression = new RegExp(this.dataModel[this.scoId][elementModel].format ?? '');
                        value = value + '';

                        const matches = value.match(expression);

                        if (matches != null) {
                            // Create dynamic data model element.
                            if (element != elementModel) {

                                // Init default counters and values.
                                if (element.indexOf('cmi.objectives') === 0) {
                                    const currentN = element.match(/cmi.objectives.(\d+)./)?.[1];
                                    const counterElement = 'cmi.objectives.' + currentN + '.score';

                                    if (this.currentUserData[this.scoId].userdata[counterElement + '._children'] === undefined) {
                                        this.setEl(
                                            <string> this.currentUserData[this.scoId].userdata[counterElement + '._children'],
                                            SCORE_CHILDREN,
                                        );
                                        this.setEl(<string> this.currentUserData[this.scoId].userdata[counterElement + '.raw'], '');
                                        this.setEl(<string> this.currentUserData[this.scoId].userdata[counterElement + '.min'], '');
                                        this.setEl(<string> this.currentUserData[this.scoId].userdata[counterElement + '.max'], '');
                                    }

                                } else if (element.indexOf('cmi.interactions') === 0) {
                                    const currentN = element.match(/cmi.interactions.(\d+)./)?.[1];
                                    let counterElement = 'cmi.interactions.' + currentN + '.objectives._count';

                                    if (this.currentUserData[this.scoId].userdata[counterElement] === undefined) {
                                        this.setEl(counterElement, 0);
                                    }

                                    counterElement = 'cmi.interactions.' + currentN + '.correct_responses._count';
                                    if (this.currentUserData[this.scoId].userdata[counterElement] === undefined) {
                                        this.setEl(counterElement, 0);
                                    }
                                }

                                const elementIndexes = element.split('.');
                                let subElement = 'cmi';

                                for (let i = 1; i < elementIndexes.length - 1; i++) {
                                    const elementIndex = elementIndexes[i];

                                    if (elementIndexes[i + 1].match(/^\d+$/)) {
                                        const counterElement = subElement + '.' + elementIndex + '._count';

                                        if (this.currentUserData[this.scoId].userdata[counterElement] === undefined) {
                                            this.setEl(counterElement, 0);
                                        }

                                        if (elementIndexes[i + 1] == this.getEl(counterElement)) {
                                            const count = this.getEl(counterElement);
                                            this.setEl(counterElement, Number(count) + 1);
                                        }

                                        if (elementIndexes[i + 1] > this.getEl(counterElement)) {
                                            this.errorCode = '201';
                                        }

                                        subElement = subElement.concat('.' + elementIndex + '.' + elementIndexes[i + 1]);
                                        i++;
                                    } else {
                                        subElement = subElement.concat('.' + elementIndex);
                                    }
                                }

                                element = subElement.concat('.' + elementIndexes[elementIndexes.length - 1]);
                            }

                            // Store data.
                            if (this.errorCode == '0') {
                                if (this.scorm.autocommit && !this.timeout) {
                                    this.timeout = window.setTimeout(
                                        () => this.LMSCommit(''),
                                        CoreTimeConstants.MILLISECONDS_MINUTE,
                                    );
                                }

                                const range = this.dataModel[this.scoId][elementModel].range;
                                if (range !== undefined) {
                                    const ranges = range.split('#');
                                    value = Number(value);

                                    if (value >= Number(ranges[0]) && value <= Number(ranges[1])) {
                                        this.setEl(element, Number(value));
                                        this.errorCode = '0';

                                        return 'true';
                                    } else {
                                        this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                                    }
                                } else {
                                    if (element == 'cmi.comments') {
                                        this.setEl('cmi.comments', this.getEl('cmi.comments') + value);
                                    } else {
                                        this.setEl(element, value);
                                    }
                                    this.errorCode = '0';

                                    return 'true';
                                }
                            }
                        } else {
                            this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                        }
                    } else {
                        this.errorCode = this.dataModel[this.scoId][elementModel].writeerror;
                    }
                } else {
                    this.errorCode = '201';
                }
            } else {
                this.errorCode = '201';
            }
        } else {
            this.errorCode = '301';
        }

        return 'false';
    }

    /**
     * Set a SCO ID.
     * The scoId is like a pointer to be able to retrieve the SCO default values and set the new ones in the overall SCORM
     * data structure.
     *
     * @param scoId The new SCO id.
     */
    loadSco(scoId: number): void {
        this.scoId = scoId;
    }

    /**
     * Set the value of the given element in the non-persistent (current) user data.
     *
     * @param el The element.
     * @param value The value.
     */
    protected setEl(el: string, value: AddonModScormDataValue): void {
        this.currentUserData[this.scoId] = this.currentUserData[this.scoId] || {
            scoid: this.scoId,
            userdata: {},
            defaultdata: {},
        };
        this.currentUserData[this.scoId].userdata[el] = value;
    }

    /**
     * Set offline mode to true or false.
     *
     * @param offline True if offline, false otherwise.
     */
    setOffline(offline: boolean): void {
        this.offline = offline;
    }

    /**
     * Persist the current user data (this is usually called by LMSCommit).
     *
     * @param storeTotalTime If true, we need to calculate the total time too.
     * @returns True if success, false otherwise.
     */
    protected storeData(storeTotalTime?: boolean): boolean {
        if (!this.canSaveTracks) {
            return true;
        }

        let tracks: AddonModScormDataEntry[];

        if (storeTotalTime) {
            if (this.getEl('cmi.core.lesson_status') == 'not attempted') {
                this.setEl('cmi.core.lesson_status', 'completed');
            }

            if (this.getEl('cmi.core.lesson_mode') === AddonModScormMode.NORMAL) {
                if (this.getEl('cmi.core.credit') === 'credit') {
                    if (this.getEl('cmi.student_data.mastery_score') !== '' && this.getEl('cmi.core.score.raw') !== '') {
                        if (parseFloat(<string> this.getEl('cmi.core.score.raw')) >=
                                parseFloat(<string> this.getEl('cmi.student_data.mastery_score'))) {
                            this.setEl('cmi.core.lesson_status', 'passed');
                        } else {
                            this.setEl('cmi.core.lesson_status', 'failed');
                        }
                    }
                }
            }

            if (this.getEl('cmi.core.lesson_mode') === AddonModScormMode.BROWSE) {
                if (this.dataModel[this.scoId]['cmi.core.lesson_status'].defaultvalue == '' &&
                        this.getEl('cmi.core.lesson_status') == 'not attempted') {
                    this.setEl('cmi.core.lesson_status', 'browsed');
                }
            }

            tracks = this.collectData();
            tracks.push(this.totalTime());
        } else {
            tracks = this.collectData();
        }

        const ok = AddonModScorm.saveTracksSync(this.scoId, this.attempt, tracks, this.scorm, this.offline, this.currentUserData);

        if (this.offline || ok) {
            return ok;
        }

        // Failure storing data in online. Go offline.
        this.offline = true;
        this.triggerEvent(ADDON_MOD_SCORM_GO_OFFLINE_EVENT);

        return AddonModScorm.saveTracksSync(this.scoId, this.attempt, tracks, this.scorm, this.offline, this.currentUserData);

    }

    /**
     * Utility function for calculating the total time spent in the SCO.
     *
     * @returns Total time element.
     */
    protected totalTime(): AddonModScormDataEntry {
        const totalTime = this.addTime(<string> this.getEl('cmi.core.total_time'), <string> this.getEl('cmi.core.session_time'));

        return { element: 'cmi.core.total_time', value: totalTime };
    }

    /**
     * Convenience function to trigger events.
     *
     * @param name Name of the event to trigger.
     */
    protected triggerEvent(name: string): void {
        CoreEvents.trigger(name, <AddonModScormCommonEventData> {
            scormId: this.scorm.id,
            scoId: this.scoId,
            attempt: this.attempt,
        }, this.siteId);
    }

}

type DataModelEntry = ReadOnlyDataModelEntry | WritableDataModelEntry;

type ReadOnlyDataModelEntry = DataModelCommonProperties & {
    mod: 'r';
    format?: string;
};

type WritableDataModelEntry = DataModelCommonProperties & {
    mod: 'w' | 'rw';
    format: string;
};

type DataModelCommonProperties = {
    writeerror: string;
    readerror?: string;
    defaultvalue?: string | number;
    range?: string;
    pattern?: string;
};
