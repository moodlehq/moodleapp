<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');
require_once(__DIR__ . '/behat_app_helper.php');

use Behat\Behat\Hook\Scope\ScenarioScope;
use Behat\Gherkin\Node\TableNode;
use Behat\Mink\Exception\DriverException;
use Behat\Mink\Exception\ExpectationException;

/**
 * Moodle App steps definitions.
 *
 * @package core
 * @category test
 * @copyright 2018 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_app extends behat_app_helper {

    /** @var array Config overrides */
    protected $appconfig = [
        'disableUserTours' => true,
        'toastDurations' => [ // Extend toast durations in Behat so they don't disappear too soon.
            'short' => 7500,
            'long' => 10000,
            'sticky' => 0,
        ],
    ];

    protected $windowsize = '360x720';

    /**
     * @BeforeScenario
     */
    public function before_scenario(ScenarioScope $scope) {
        if (!$scope->getFeature()->hasTag('app')) {
            return;
        }

        global $CFG;

        $performanceLogs = $CFG->behat_profiles['default']['capabilities']['extra_capabilities']['goog:loggingPrefs']['performance'] ?? null;

        if ($performanceLogs !== 'ALL') {
            return;
        }

        // Enable DB Logging only for app tests with performance logs activated.
        $this->getSession()->visit($this->get_app_url() . '/assets/env.json');
        $this->execute_script("document.cookie = 'MoodleAppDBLoggingEnabled=true;path=/';");
    }

    /**
     * Opens the Moodle App in the browser and optionally logs in.
     *
     * @When I enter the app
     * @Given I entered the app as :username
     * @param string $username Username
     * @throws DriverException Issue with configuration or feature file
     * @throws dml_exception Problem with Moodle setup
     * @throws ExpectationException Problem with resizing window
     */
    public function i_enter_the_app(string $username = null) {
        $this->i_launch_the_app();

        if (!is_null($username)) {
            $this->open_moodleapp_custom_login_url($username);

            return;
        }

        $this->enter_site();
    }

    /**
     * Check whether the current page is the login form.
     */
    protected function is_in_login_page(): bool {
        $page = $this->getSession()->getPage();
        $logininput = $page->find('xpath', '//page-core-login-site//input[@name="url"]');

        return !is_null($logininput);
    }

    /**
     * Opens the Moodle App in the browser.
     *
     * @When I launch the app :runtime
     * @When I launch the app
     * @param string $runtime Runtime
     * @throws DriverException Issue with configuration or feature file
     * @throws dml_exception Problem with Moodle setup
     * @throws ExpectationException Problem with resizing window
     */
    public function i_launch_the_app(string $runtime = '') {
        // Go to page and prepare browser for app.
        $this->prepare_browser(['skiponboarding' => empty($runtime)]);
    }

    /**
     * Restart the app.
     *
     * @When I restart the app
     */
    public function i_restart_the_app() {
        $this->getSession()->visit($this->get_app_url());

        $this->i_wait_the_app_to_restart();
    }

    /**
     * @Then I wait the app to restart
     */
    public function i_wait_the_app_to_restart() {
        // Prepare testing runtime again.
        $this->prepare_browser();
    }

    /**
     * @Then I log out in the app
     *
     * @param bool $force If force logout or not.
     */
    public function i_log_out_in_app($force = true) {
        $options = json_encode([
            'forceLogout' => $force,
        ]);

        $result = $this->zone_js("sites.logout($options)");

        if ($result !== 'OK') {
            throw new DriverException('Error on log out - ' . $result);
        }

        $this->i_wait_the_app_to_restart();
    }

    /**
     * Finds elements in the app.
     *
     * @Then /^I should( not)? find (".+")( inside the .+)? in the app$/
     * @param bool $not Whether assert that the element was not found
     * @param string $locator Element locator
     * @param string $container Container name
     */
    public function i_find_in_the_app(bool $not, string $locator, string $container = '') {
        $locator = $this->parse_element_locator($locator);
        if (!empty($container)) {
            preg_match('/^ inside the (.+)$/', $container, $matches);
            $container = $matches[1];
        }
        $options = json_encode(['containerName' => $container]);

        $this->spin(function() use ($not, $locator, $options) {
            $result = $this->runtime_js("find($locator, $options)");

            if ($not && $result === 'OK') {
                throw new DriverException('Error, found an element that should not be found');
            }

            if (!$not && $result !== 'OK') {
                throw new DriverException('Error finding element - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Scroll to an element in the app.
     *
     * @When /^I scroll to (".+") in the app$/
     * @param string $locator Element locator
     */
    public function i_scroll_to_in_the_app(string $locator) {
        $locator = $this->parse_element_locator($locator);

        $this->spin(function() use ($locator) {
            $result = $this->runtime_js("scrollTo($locator)");

            if ($result !== 'OK') {
                throw new DriverException('Error finding element - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();

        // Wait scroll animation to finish.
        $this->getSession()->wait(300);
    }

    /**
     * Load more items in a list with an infinite loader.
     *
     * @When /^I (should not be able to )?load more items in the app$/
     * @param bool $not Whether assert that it is not possible to load more items
     */
    public function i_load_more_items_in_the_app(bool $not = false) {
        $this->spin(function() use ($not) {
            $result = $this->runtime_js('loadMoreItems()');

            if ($not && $result !== 'ERROR: All items are already loaded.') {
                throw new DriverException('It should not have been possible to load more items');
            }

            if (!$not && $result !== 'OK') {
                throw new DriverException('Error loading more items - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Trigger swipe gesture.
     *
     * @When /^I swipe to the (left|right) (in (".+") )?in the app$/
     * @param string $direction Swipe direction
     * @param bool $hasLocator Whether a reference locator is used.
     * @param string $locator Reference locator.
     */
    public function i_swipe_in_the_app(string $direction, bool $hasLocator = false, string $locator = '') {
        if ($hasLocator) {
            $locator = $this->parse_element_locator($locator);
        }

        $result = $this->zone_js("swipe('$direction'" . ($hasLocator ? ", $locator" : '') . ')');

        if ($result !== 'OK') {
            throw new DriverException('Error when swiping - ' . $result);
        }

        $this->wait_for_pending_js();

        // Wait swipe animation to finish.
        $this->getSession()->wait(300);
    }

    /**
     * Check if elements are selected in the app.
     *
     * @Then /^(".+") should( not)? be selected in the app$/
     * @param string $locator Element locator
     * @param bool $not Whether to assert that the element is not selected
     */
    public function be_selected_in_the_app(string $locator, bool $not = false) {
        $locator = $this->parse_element_locator($locator);

        $this->spin(function() use ($locator, $not) {
            $result = $this->runtime_js("isSelected($locator)");

            switch ($result) {
                case 'YES':
                    if ($not) {
                        throw new ExpectationException("Element was selected and shouldn't have", $this->getSession()->getDriver());
                    }
                    break;
                case 'NO':
                    if (!$not) {
                        throw new ExpectationException("Element wasn't selected and should have", $this->getSession()->getDriver());
                    }
                    break;
                default:
                    throw new DriverException('Error finding element - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Carries out the login steps for the app, assuming the user is on the app login page. Called
     * from behat_auth.php.
     *
     * @param string $username Username (and password)
     * @throws Exception Any error
     */
    public function login(string $username) {
        $this->i_set_the_field_in_the_app('Username', $username);
        $this->i_set_the_field_in_the_app('Password', $username);

        // Note there are two 'Log in' texts visible (the title and the button) so we have to use
        // a 'near' value here.
        $this->i_press_in_the_app('"Log in" near "Forgotten"');

        // Wait until the main page appears.
        $this->spin(
                function($context) {
                    $initialpage = $context->getSession()->getPage()->find('xpath', '//page-core-mainmenu') ??
                        $context->getSession()->getPage()->find('xpath', '//page-core-login-change-password') ??
                        $context->getSession()->getPage()->find('xpath', '//page-core-user-complete-profile');
                    if ($initialpage) {
                        return true;
                    }
                    throw new DriverException('Moodle App main page not loaded after login');
                }, false, 30);

        // Wait for JS to finish as well.
        $this->wait_for_pending_js();
    }

    /**
     * Enter site.
     */
    protected function enter_site() {
        if (!$this->is_in_login_page()) {
            // Already in the site.
            return;
        }

        global $CFG;

        $this->i_set_the_field_in_the_app('Your site', $CFG->wwwroot);
        $this->i_press_in_the_app('"Connect to your site"');
        $this->wait_for_pending_js();
    }

    /**
     * Shortcut to  let the user enter a course in the app.
     *
     * @Given I entered the course :coursename as :username in the app
     * @Given I entered the course :coursename in the app
     * @param string $coursename Course name
     * @param string $username Username
     * @throws DriverException If the button push doesn't work
     */
    public function i_entered_the_course_in_the_app(string $coursename, ?string $username = null) {
        $courseid = $this->get_course_id($coursename);
        if (!$courseid) {
            throw new DriverException("Course '$coursename' not found");
        }

        if ($username) {
            $this->i_launch_the_app();

            $this->open_moodleapp_custom_login_url($username, "/course/view.php?id=$courseid", '//page-core-course-index');
        } else {
            $this->open_moodleapp_custom_url("/course/view.php?id=$courseid", '//page-core-course-index');
        }
    }

    /**
     * User enters a course in the app.
     *
     * @Given I enter the course :coursename as :username in the app
     * @Given I enter the course :coursename in the app
     * @param string $coursename Course name
     * @param string $username Username
     * @throws DriverException If the button push doesn't work
     */
    public function i_enter_the_course_in_the_app(string $coursename, ?string $username = null) {
        if (!is_null($username)) {
            $this->i_enter_the_app();
            $this->login($username);
        }

        $mycoursesfound = $this->runtime_js("find({ text: 'My courses', selector: 'ion-tab-button'})");

        if ($mycoursesfound !== 'OK') {
            // My courses not present enter from Dashboard.
            $this->i_press_in_the_app('"Home" "ion-tab-button"');
            $this->i_press_in_the_app('"Dashboard"');
            $this->i_press_in_the_app('"'.$coursename.'" near "Course overview"');

            $this->wait_for_pending_js();

            return;
        }

        $this->i_press_in_the_app('"My courses" "ion-tab-button"');
        $this->i_press_in_the_app('"'.$coursename.'"');

        $this->wait_for_pending_js();
    }

    /**
     * User enters an activity in a course in the app.
     *
     * @Given I entered the :activity activity :activityname on course :course as :username in the app
     * @Given I entered the :activity activity :activityname on course :course in the app
     * @param string $activity Activity
     * @param string $activityname Activity name
     * @param string $coursename Course name
     * @param string $username Username
     * @throws DriverException If the button push doesn't work
     */
    public function i_enter_the_activity_in_the_app(string $activity, string $activityname, string $coursename, ?string $username = null) {
        $cm = $this->get_cm_by_activity_name_and_course($activity, $activityname, $coursename);
        if (!$cm) {
            throw new DriverException("'$activityname' activity '$activityname' not found");
        }

        $pageurl = "/mod/$activity/view.php?id={$cm->id}";

        if ($username) {
            $this->i_launch_the_app();

            $this->open_moodleapp_custom_login_url($username, $pageurl);
        } else {
            $this->open_moodleapp_custom_url($pageurl);
        }
    }

    /**
     * Presses standard buttons in the app.
     *
     * @When /^I press the (back|more menu|page menu|user menu|main menu) button in the app$/
     * @param string $button Button type
     * @throws DriverException If the button push doesn't work
     */
    public function i_press_the_standard_button_in_the_app(string $button) {
        $this->spin(function() use ($button) {
            $result = $this->runtime_js("pressStandard('$button')");

            if ($result !== 'OK') {
                throw new DriverException('Error pressing standard button - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Receives push notifications.
     *
     * @When /^I click a push notification in the app for:$/
     * @param TableNode $data Table data
     */
    public function i_click_a_push_notification(TableNode $data) {
        global $DB, $CFG;

        $data = (object) $data->getColumnsHash()[0];

        if (isset($data->module, $data->discussion)) {
            $module = $DB->get_record('course_modules', ['idnumber' => $data->module]);
            $discussion = $DB->get_record('forum_discussions', ['name' => $data->discussion]);
            $data->name = 'posts';
            $data->component = 'mod_forum';
        }

        $notification = json_encode([
            'site' => md5($CFG->behat_wwwroot . $data->username),
            'subject' => $data->subject ?? null,
            'userfrom' => $data->userfrom ?? null,
            'userto' => $data->username ?? null,
            'message' => $data->message ?? '',
            'title' => $data->title ?? '',
            'image' => $data->image ?? null,
            'courseid' => $discussion->course ?? null,
            'moodlecomponent' => $data->component ?? null,
            'name' => $data->name ?? null,
            'contexturl' => '',
            'notif' => 1,
            'customdata' => isset($discussion->id, $module->id, $discussion->forum)
                ? ['discussionid' => $discussion->id, 'cmid' => $module->id, 'instance' => $discussion->forum]
                : null,
            'additionalData' => isset($data->subject) || isset($data->userfrom)
                ? ['foreground' => true, 'notId' => 23, 'notif' => 1] : null,
        ]);

        $this->evaluate_script("pushNotifications.notificationClicked($notification)", true);
        $this->wait_for_pending_js();
    }

    /**
     * Replace arguments from the content in the given activity field.
     *
     * @Given /^I replace the arguments in "([^"]+)" "([^"]+)"$/
     * @param string $idnumber Id number
     * @param string $field Field
     */
    public function i_replace_arguments_in_the_activity(string $idnumber, string $field) {
        global $DB;

        $coursemodule = $DB->get_record('course_modules', compact('idnumber'));
        $module = $DB->get_record('modules', ['id' => $coursemodule->module]);
        $activity = $DB->get_record($module->name, ['id' => $coursemodule->instance]);

        $DB->update_record($module->name, [
            'id' => $coursemodule->instance,
            $field => $this->replace_arguments($activity->{$field}),
        ]);
    }

    /**
     * Opens a custom link.
     *
     * @Given /^I open a custom link in the app for:$/
     * @param TableNode $data Table data
     */
    public function i_open_a_custom_link(TableNode $data) {
        global $DB;

        $data = $data->getColumnsHash()[0];
        $title = array_keys($data)[0];
        $data = (object) $data;

        switch ($title) {
            case 'discussion':
                $discussion = $DB->get_record('forum_discussions', ['name' => $data->discussion]);
                $pageurl = "/mod/forum/discuss.php?d={$discussion->id}";

                break;

            case 'assign':
            case 'bigbluebuttonbn':
            case 'book':
            case 'chat':
            case 'choice':
            case 'data':
            case 'feedback':
            case 'folder':
            case 'forum':
            case 'glossary':
            case 'h5pactivity':
            case 'imscp':
            case 'label':
            case 'lesson':
            case 'lti':
            case 'page':
            case 'quiz':
            case 'resource':
            case 'scorm':
            case 'survey':
            case 'url':
            case 'wiki':
            case 'workshop':
                $name = $data->$title;
                $module = $DB->get_record($title, ['name' => $name]);
                $cm = get_coursemodule_from_instance($title, $module->id);
                $pageurl = "/mod/$title/view.php?id={$cm->id}";
                break;

            default:
                throw new DriverException('Invalid custom link title - ' . $title);
        }

        $this->open_moodleapp_custom_url($pageurl);
    }

    /**
     * Closes a popup by clicking on the 'backdrop' behind it.
     *
     * @When I close the popup in the app
     * @throws DriverException If there isn't a popup to close
     */
    public function i_close_the_popup_in_the_app() {
        $this->spin(function()  {
            $result = $this->runtime_js('closePopup()');

            if ($result !== 'OK') {
                throw new DriverException('Error closing popup - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Override app config.
     *
     * @Given /^the app has the following config:$/
     * @param TableNode $data Table data
     */
    public function the_app_has_the_following_config(TableNode $data) {
        foreach ($data->getRows() as $configrow) {
            $this->appconfig[$configrow[0]] = json_decode($configrow[1]);
        }
    }

    /**
     * Check whether the moodle site is compatible with the current feature file
     * and skip it otherwise. This will be checked looking at tags such as @lms_uptoXXX
     *
     * @Given the Moodle site is compatible with this feature
     */
    public function the_moodle_site_is_compatible_with_this_feature() {
        $this->check_tags();
    }

    /**
     * Clicks on / touches something that is visible in the app.
     *
     * Note it is difficult to use the standard 'click on' or 'press' steps because those do not
     * distinguish visible elements and the app always has many non-visible elements in the DOM.
     *
     * @When /^I press (".+") in the app$/
     * @param string $locator Element locator
     * @throws DriverException If the press doesn't work
     */
    public function i_press_in_the_app(string $locator) {
        $locator = $this->parse_element_locator($locator);

        $this->spin(function() use ($locator) {
            $result = $this->runtime_js("press($locator)");

            if ($result !== 'OK') {
                throw new DriverException('Error pressing item - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Performs a pull to refresh gesture.
     *
     * @When I pull to refresh in the app
     * @throws DriverException If the gesture is not available
     */
    public function i_pull_to_refresh_in_the_app() {
        $this->spin(function() {
            $result = $this->runtime_js('pullToRefresh()');

            if ($result !== 'OK') {
                throw new DriverException('Error pulling to refresh - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();

        // Wait for UI to settle after refreshing.
        $this->getSession()->wait(300);
    }

    /**
     * Checks if elements can be pressed in the app.
     *
     * @Then /^I should( not)? be able to press (".+") in the app$/
     * @param bool $not Whether to assert that the element cannot be pressed
     * @param string $locator Element locator
     */
    public function i_should_be_able_to_press_in_the_app(bool $not, string $locator) {
        $locator = $this->parse_element_locator($locator);

        $this->spin(function() use ($not, $locator) {
            $result = $this->runtime_js("find($locator, { onlyClickable: true })");

            if ($not && $result === 'OK') {
                throw new DriverException('Error, found a clickable element that should not be found');
            }

            if (!$not && $result !== 'OK') {
                throw new DriverException('Error finding clickable element - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Select an item from a list of options, such as a radio button.
     *
     * It may be necessary to use this step instead of "I press..." because radio buttons in Ionic are initialized
     * with JavaScript, and clicks may not work until they are initialized properly which may cause flaky tests due
     * to race conditions.
     *
     * @Then /^I (unselect|select) (".+") in the app$/
     * @param string $selectedtext Text inidicating if the element should be selected or unselected
     * @param string $locator Element locator
     * @throws DriverException If the press doesn't work
     */
    public function i_select_in_the_app(string $selectedtext, string $locator) {
        $selected = $selectedtext === 'select' ? 'YES' : 'NO';
        $locator = $this->parse_element_locator($locator);

        $this->spin(function() use ($selectedtext, $selected, $locator) {
            // Don't do anything if the item is already in the expected state.
            $result = $this->runtime_js("isSelected($locator)");

            if ($result === $selected) {
                return true;
            }

            // Press element.
            $result = $this->runtime_js("press($locator)");

            if ($result !== 'OK') {
                throw new DriverException('Error pressing element - ' . $result);
            }

            // Check that it worked as expected.
            $this->wait_for_pending_js();

            $result = $this->runtime_js("isSelected($locator)");

            switch ($result) {
                case 'YES':
                case 'NO':
                    if ($result !== $selected) {
                        throw new ExpectationException("Item wasn't $selectedtext after pressing it", $this->getSession()->getDriver());
                    }

                    return true;
                default:
                    throw new DriverException('Error finding item - ' . $result);
            }
        });

        $this->wait_for_pending_js();
    }

    /**
     * Sets a field to the given text value in the app.
     *
     * Currently this only works for input fields which must be identified using a partial or
     * exact match on the placeholder text.
     *
     * @Given /^I set the field "((?:[^"]|\\")+)" to "((?:[^"]|\\")*)" in the app$/
     * @param string $field Text identifying field
     * @param string $value Value for field
     * @throws DriverException If the field set doesn't work
     */
    public function i_set_the_field_in_the_app(string $field, string $value) {
        $field = addslashes_js($field);
        $value = addslashes_js($value);

        $this->spin(function() use ($field, $value) {
            $result = $this->runtime_js("setField('$field', '$value')");

            if ($result !== 'OK') {
                throw new DriverException('Error setting field - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Fills a form with field/value data.
     *
     * @Given /^I set the following fields to these values in the app:$/
     * @param TableNode $data
     */
    public function i_set_the_following_fields_to_these_values_in_the_app(TableNode $data) {
        $datahash = $data->getRowsHash();

        // The action depends on the field type.
        foreach ($datahash as $locator => $value) {
            $this->i_set_the_field_in_the_app($locator, $value);
        }
    }

    /**
     * Checks a field matches a certain value in the app.
     *
     * Currently this only works for input fields which must be identified using a partial or
     * exact match on the placeholder text.
     *
     * @Given /^the field "((?:[^"]|\\")+)" matches value "((?:[^"]|\\")*)" in the app$/
     * @param string $field Text identifying field
     * @param string $value Value for field
     * @throws DriverException If the field isn't found
     * @throws ExpectationException If the field value is different to the expected value
     */
    public function the_field_matches_value_in_the_app(string $field, string $value) {
        $field = addslashes_js($field);
        $value = addslashes_js($value);

        $this->spin(function() use ($field, $value) {
            $result = $this->runtime_js("fieldMatches('$field', '$value')");

            if ($result !== 'OK') {
                if (str_contains($result, 'No element matches')) {
                    throw new DriverException('Error field matches value - ' . $result);
                } else {
                    throw new ExpectationException(
                        'Error field matches value - ' . $result,
                        $this->getSession()->getDriver()
                    );
                }
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Checks that the current header stripe in the app contains the expected text.
     *
     * This can be used to see if the app went to the expected page.
     *
     * @Then /^the header should be "((?:[^"]|\\")+)" in the app$/
     * @param string $text Expected header text
     * @throws DriverException If the header can't be retrieved
     * @throws ExpectationException If the header text is different to the expected value
     */
    public function the_header_should_be_in_the_app(string $text) {
        $this->spin(function() use ($text) {
            $result = $this->runtime_js('getHeader()');

            if (substr($result, 0, 3) !== 'OK:') {
                throw new DriverException('Error getting header - ' . $result);
            }

            $header = substr($result, 3);
            if (trim($header) !== trim($text)) {
                throw new ExpectationException(
                    "The header text was not as expected: '$header'",
                    $this->getSession()->getDriver()
                );
            }

            return true;
        });
    }

    /**
     * Check that the app opened a new browser tab.
     *
     * @Then /^the app should( not)? have opened a browser tab(?: with url "(?P<pattern>[^"]+)")?$/
     * @param bool $not Whether to check if the app did not open a new browser tab
     * @param string $urlpattern Url pattern
     */
    public function the_app_should_have_opened_a_browser_tab(bool $not = false, ?string $urlpattern = null) {
        $this->spin(function() use ($not, $urlpattern) {
            $windowNames = $this->getSession()->getWindowNames();
            $openedbrowsertab = count($windowNames) === 2;

            if ((!$not && !$openedbrowsertab) || ($not && $openedbrowsertab && is_null($urlpattern))) {
                throw new ExpectationException(
                    $not
                        ? 'Did not expect the app to have opened a browser tab'
                        : 'Expected the app to have opened a browser tab',
                    $this->getSession()->getDriver()
                );
            }

            if (!is_null($urlpattern)) {
                $this->getSession()->switchToWindow($windowNames[1]);
                $windowurl = $this->getSession()->getCurrentUrl();
                $windowhaspattern = (bool)preg_match("/$urlpattern/", $windowurl);
                $this->getSession()->switchToWindow($windowNames[0]);

                if ($not === $windowhaspattern) {
                    throw new ExpectationException(
                        $not
                            ? "Did not expect the app to have opened a browser tab with pattern '$urlpattern'"
                            : "Browser tab url does not match pattern '$urlpattern', it is '$windowurl'",
                        $this->getSession()->getDriver()
                    );
                }
            }

            return true;
        });
    }

    /**
     * Switches to a newly-opened browser tab.
     *
     * This assumes the app opened a new tab.
     *
     * @Given I switch to the browser tab opened by the app
     * @throws DriverException If there aren't exactly 2 tabs open
     */
    public function i_switch_to_the_browser_tab_opened_by_the_app() {
        $windowNames = $this->getSession()->getWindowNames();
        if (count($windowNames) !== 2) {
            throw new DriverException('Expected to see 2 tabs open, not ' . count($windowNames));
        }
        $this->getSession()->switchToWindow($windowNames[1]);
    }

    /**
     * Switches to the app if the user is in a browser tab.
     *
     * @Given I switch back to the app
     */
    public function i_switch_back_to_the_app() {
        $windowNames = $this->getSession()->getWindowNames();
        if (count($windowNames) > 1) {
            $this->getSession()->switchToWindow($windowNames[0]);
        }
    }

    /**
     * Force cron tasks instead of waiting for the next scheduled execution.
     *
     * @When I run cron tasks in the app
     */
    public function i_run_cron_tasks_in_the_app() {
        $this->zone_js('cronDelegate.forceSyncExecution()');
        $this->wait_for_pending_js();
    }

    /**
     * Wait until loading has finished.
     *
     * @When I wait loading to finish in the app
     */
    public function i_wait_loading_to_finish_in_the_app() {
        $this->runtime_js('waitLoadingToFinish()');
        $this->wait_for_pending_js();
    }

    /**
     * Closes the current browser tab.
     *
     * This assumes it was opened by the app and you will now get back to the app.
     *
     * @Given I close the browser tab opened by the app
     * @throws DriverException If there aren't exactly 2 tabs open
     */
    public function i_close_the_browser_tab_opened_by_the_app() {
        $names = $this->getSession()->getWindowNames();
        if (count($names) !== 2) {
            throw new DriverException('Expected to see 2 tabs open, not ' . count($names));
        }
        // Make sure the browser tab is selected.
        if ($this->getSession()->getWindowName() !== $names[1]) {
            $this->getSession()->switchToWindow($names[1]);
        }

        $this->evaluate_script('window.close()');
        $this->getSession()->switchToWindow($names[0]);
    }

    /**
     * Switch navigator online mode.
     *
     * @Given /^I switch offline mode to "(true|false)"$/
     * @param string $offline New value for navigator online mode
     * @throws DriverException If the navigator.online mode is not available
     * @deprecated since 4.1 use i_switch_network_connection instead.
     */
    public function i_switch_offline_mode(string $offline) {
        $this->i_switch_network_connection($offline == 'true' ? 'offline' : 'wifi');
    }

    /**
     * Switch network connection.
     *
     * @When /^I switch network connection to (wifi|cellular|offline)$/
     * @param string $more New network mode.
     * @throws DriverException If the navigator.online mode is not available
     */
    public function i_switch_network_connection(string $mode) {
        switch ($mode) {
            case 'wifi':
                $this->runtime_js("network.setForceConnectionMode('$mode');");
                break;
            case 'cellular':
                $this->runtime_js("network.setForceConnectionMode('$mode');");
                break;
            case 'offline':
                $this->runtime_js("network.setForceConnectionMode('none');");
                break;
            default:
                break;
        }
    }

    /**
     * Open a browser tab with a certain URL.
     *
     * @Then /^I open a browser tab with url "(?P<pattern>[^"]+)"$/
     * @param string $url URL
     */
    public function i_open_a_browser_tab_with_url(string $url) {
        $this->execute_script("window.open('$url', '_system');");

        $windowNames = $this->getSession()->getWindowNames();
        $this->getSession()->switchToWindow($windowNames[1]);
    }


    /**
     * Check if a notification has been triggered and is present.
     *
     * @Then /^a notification with title (".+") is( not)? present in the app$/
     * @param string $title Notification title
     * @param bool $not Whether assert that the notification was not found
     */
    public function notification_present_in_the_app(string $title, bool $not = false) {
        $result = $this->runtime_js("notificationIsPresentWithText($title)");

        if ($not && $result === 'YES') {
            throw new ExpectationException("Notification is present", $this->getSession()->getDriver());
        }

        if (!$not && $result === 'NO') {
            throw new ExpectationException("Notification is not present", $this->getSession()->getDriver());
        }

        if ($result !== 'YES' && $result !== 'NO') {
            throw new DriverException('Error checking notification - ' . $result);
        }

        return true;
    }

    /**
     * Close a notification present in the app
     *
     * @Then /^I close a notification with title (".+") in the app$/
     * @param string $title Notification title
     */
    public function close_notification_app(string $title) {
        $result = $this->runtime_js("closeNotification($title)");

        if ($result !== 'OK') {
            throw new DriverException('Error closing notification - ' . $result);
        }

        return true;
    }

    /**
     * View a specific month in the calendar in the app.
     *
     * @When /^I open the calendar for "(?P<month>\d+)" "(?P<year>\d+)" in the app$/
     * @param int $month the month selected as a number
     * @param int $year the four digit year
     */
    public function i_open_the_calendar_for($month, $year) {
        $options = json_encode([
            'params' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);

        $this->zone_js("navigator.navigateToSitePath('/calendar/index', $options)");
    }

}
