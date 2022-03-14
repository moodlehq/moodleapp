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

/**
 * Mobile/desktop app steps definitions.
 *
 * @package core
 * @category test
 * @copyright 2018 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');

use Behat\Gherkin\Node\TableNode;
use Behat\Mink\Exception\DriverException;
use Behat\Mink\Exception\ExpectationException;

/**
 * Behat app listener.
 */
interface behat_app_listener {

    /**
     * Called when the app is loaded.
     */
    function on_app_load(): void;

    /**
     * Called before the app is unloaded.
     */
    function on_app_unload(): void;

}

/**
 * Mobile/desktop app steps definitions.
 *
 * @package core
 * @category test
 * @copyright 2018 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_app extends behat_base {
    /** @var stdClass Object with data about launched Ionic instance (if any) */
    protected static $ionicrunning = null;

    /** @var array */
    protected static $listeners = [];

    /** @var string URL for running Ionic server */
    protected $ionicurl = '';

    /** @var bool Whether the app is running or not */
    protected $apprunning = false;

    /**
     * Register listener.
     *
     * @param behat_app_listener $listener Listener.
     * @return Closure Unregister function.
     */
    public static function listen(behat_app_listener $listener): Closure {
        self::$listeners[] = $listener;

        return function () use ($listener) {
            $index = array_search($listener, self::$listeners);

            if ($index !== false) {
                array_splice(self::$listeners, $index, 1);
            }
        };
    }

    /**
     * Checks if the current OS is Windows, from the point of view of task-executing-and-killing.
     *
     * @return bool True if Windows
     */
    protected static function is_windows() : bool {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }

    /**
     * Called from behat_hooks when a new scenario starts, if it has the app tag.
     *
     * This updates Moodle configuration and starts Ionic running, if it isn't already.
     */
    public function start_scenario() {
        $this->check_behat_setup();
        $this->fix_moodle_setup();
        $this->ionicurl = $this->start_or_reuse_ionic();
    }

    /**
     * Opens the Moodle app in the browser and introduces the enters the site.
     *
     * @Given /^I enter the app$/
     * @throws DriverException Issue with configuration or feature file
     * @throws dml_exception Problem with Moodle setup
     * @throws ExpectationException Problem with resizing window
     */
    public function i_enter_the_app() {
        $this->i_launch_the_app();
        $this->enter_site();
    }

    /**
     * Opens the Moodle app in the browser.
     *
     * @Given /^I launch the app( runtime)?$/
     * @throws DriverException Issue with configuration or feature file
     * @throws dml_exception Problem with Moodle setup
     * @throws ExpectationException Problem with resizing window
     */
    public function i_launch_the_app(string $runtime = '') {
        // Check the app tag was set.
        if (!$this->has_tag('app')) {
            throw new DriverException('Requires @app tag on scenario or feature.');
        }

        // Go to page and prepare browser for app.
        $this->prepare_browser(['skiponboarding' => empty($runtime)]);
    }

    /**
     * @Then /^I wait the app to restart$/
     */
    public function i_wait_the_app_to_restart() {
        // Wait window to reload.
        $this->spin(function() {
            return $this->evaluate_script("return !window.behat;");
        });

        // Prepare testing runtime again.
        $this->prepare_browser(['restart' => false]);
    }

    /**
     * Finds elements in the app.
     *
     * @Then /^I should( not)? find (".+")( inside the .+)? in the app$/
     * @param bool $not
     * @param string $locator
     * @param string $containerName
     */
    public function i_find_in_the_app(bool $not, string $locator, string $containerName = '') {
        $locator = $this->parse_element_locator($locator);
        $locatorjson = json_encode($locator);
        if (!empty($containerName)) {
            preg_match('/^ inside the (.+)$/', $containerName, $matches);
            $containerName = $matches[1];
        }
        $containerName = json_encode($containerName);

        $this->spin(function() use ($not, $locatorjson, $containerName) {
            $result = $this->evaluate_script("return window.behat.find($locatorjson, $containerName);");

            if ($not && $result === 'OK') {
                throw new DriverException('Error, found an item that should not be found');
            }

            if (!$not && $result !== 'OK') {
                throw new DriverException('Error finding item - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Scroll to an element in the app.
     *
     * @When /^I scroll to (".+") in the app$/
     * @param string $locator
     */
    public function i_scroll_to_in_the_app(string $locator) {
        $locator = $this->parse_element_locator($locator);
        $locatorjson = json_encode($locator);

        $this->spin(function() use ($locatorjson) {
            $result = $this->evaluate_script("return window.behat.scrollTo($locatorjson);");

            if ($result !== 'OK') {
                throw new DriverException('Error finding item - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Load more items in a list with an infinite loader.
     *
     * @When /^I (should not be able to )?load more items in the app$/
     * @param bool $not
     */
    public function i_load_more_items_in_the_app(bool $not = false) {
        $this->spin(function() use ($not) {
            $result = $this->evaluate_async_script('return window.behat.loadMoreItems();');

            if ($not && $result !== 'ERROR: All items are already loaded') {
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
     * @When /^I swipe to the (left|right) in the app$/
     * @param string $direction
     */
    public function i_swipe_in_the_app(string $direction) {
        $method = 'swipe' . ucwords($direction);

        $this->evaluate_script("behat.getAngularInstance('ion-content', 'CoreSwipeNavigationDirective').$method()");

        // Wait swipe animation to finish.
        $this->getSession()->wait(300);
    }

    /**
     * Check if elements are selected in the app.
     *
     * @Then /^(".+") should( not)? be selected in the app$/
     * @param string $locator
     * @param bool $not
     */
    public function be_selected_in_the_app(string $locator, bool $not = false) {
        $locator = $this->parse_element_locator($locator);
        $locatorjson = json_encode($locator);

        $this->spin(function() use ($locatorjson, $not) {
            $result = $this->evaluate_script("return window.behat.isSelected($locatorjson);");

            switch ($result) {
                case 'YES':
                    if ($not) {
                        throw new ExpectationException("Item was selected and shouldn't have", $this->getSession()->getDriver());
                    }
                    break;
                case 'NO':
                    if (!$not) {
                        throw new ExpectationException("Item wasn't selected and should have", $this->getSession()->getDriver());
                    }
                    break;
                default:
                    throw new DriverException('Error finding item - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Checks the Behat setup - tags and configuration.
     *
     * @throws DriverException
     */
    protected function check_behat_setup() {
        global $CFG;

        // Check JavaScript is enabled.
        if (!$this->running_javascript()) {
            throw new DriverException('The app requires JavaScript.');
        }

        // Check the config settings are defined.
        if (empty($CFG->behat_ionic_wwwroot) && empty($CFG->behat_ionic_dirroot)) {
            throw new DriverException('$CFG->behat_ionic_wwwroot or $CFG->behat_ionic_dirroot must be defined.');
        }
    }

    /**
     * Fixes the Moodle admin settings to allow mobile app use (if not already correct).
     *
     * @throws dml_exception If there is any problem changing Moodle settings
     */
    protected function fix_moodle_setup() {
        global $CFG, $DB;

        // Configure Moodle settings to enable app web services.
        if (!$CFG->enablewebservices) {
            set_config('enablewebservices', 1);
        }
        if (!$CFG->enablemobilewebservice) {
            set_config('enablemobilewebservice', 1);
        }

        // Add 'Create token' and 'Use REST webservice' permissions to authenticated user role.
        $userroleid = $DB->get_field('role', 'id', ['shortname' => 'user']);
        $systemcontext = \context_system::instance();
        role_change_permission($userroleid, $systemcontext, 'moodle/webservice:createtoken', CAP_ALLOW);
        role_change_permission($userroleid, $systemcontext, 'webservice/rest:use', CAP_ALLOW);

        // Check the value of the 'webserviceprotocols' config option. Due to weird behaviour
        // in Behat with regard to config variables that aren't defined in a settings.php, the
        // value in $CFG here may reflect a previous run, so get it direct from the database
        // instead.
        $field = $DB->get_field('config', 'value', ['name' => 'webserviceprotocols'], IGNORE_MISSING);
        if (empty($field)) {
            $protocols = [];
        } else {
            $protocols = explode(',', $field);
        }
        if (!in_array('rest', $protocols)) {
            $protocols[] = 'rest';
            set_config('webserviceprotocols', implode(',', $protocols));
        }

        // Enable mobile service.
        require_once($CFG->dirroot . '/webservice/lib.php');
        $webservicemanager = new webservice();
        $service = $webservicemanager->get_external_service_by_shortname(
                MOODLE_OFFICIAL_MOBILE_SERVICE, MUST_EXIST);
        if (!$service->enabled) {
            $service->enabled = 1;
            $webservicemanager->update_external_service($service);
        }

        // If installed, also configure local_mobile plugin to enable additional features service.
        $localplugins = core_component::get_plugin_list('local');
        if (array_key_exists('mobile', $localplugins)) {
            $service = $webservicemanager->get_external_service_by_shortname(
                    'local_mobile', MUST_EXIST);
            if (!$service->enabled) {
                $service->enabled = 1;
                $webservicemanager->update_external_service($service);
            }
        }
    }

    /**
     * Starts an Ionic server if necessary, or uses an existing one.
     *
     * @return string URL to Ionic server
     * @throws DriverException If there's a system error starting Ionic
     */
    protected function start_or_reuse_ionic() {
        global $CFG;

        if (empty($CFG->behat_ionic_dirroot) && !empty($CFG->behat_ionic_wwwroot)) {
            // Use supplied Ionic server which should already be running.
            $url = $CFG->behat_ionic_wwwroot;
        } else if (self::$ionicrunning) {
            // Use existing Ionic instance launched previously.
            $url = self::$ionicrunning->url;
        } else {
            // Open Ionic process in relevant path.
            $path = realpath($CFG->behat_ionic_dirroot);
            $stderrfile = $CFG->dataroot . '/behat/ionic-stderr.log';
            $prefix = '';
            // Except on Windows, use 'exec' so that we get the pid of the actual Node process
            // and not the shell it uses to execute. You can't do exec on Windows; there is a
            // bypass_shell option but it is not the same thing and isn't usable here.
            if (!self::is_windows()) {
                $prefix = 'exec ';
            }
            $process = proc_open($prefix . 'ionic serve --no-interactive --no-open',
                    [['pipe', 'r'], ['pipe', 'w'], ['file', $stderrfile, 'w']], $pipes, $path);
            if ($process === false) {
                throw new DriverException('Error starting Ionic process');
            }
            fclose($pipes[0]);

            // Get pid - we will need this to kill the process.
            $status = proc_get_status($process);
            $pid = $status['pid'];

            // Read data from stdout until the server comes online.
            // Note: On Windows it is impossible to read simultaneously from stderr and stdout
            // because stream_select and non-blocking I/O don't work on process pipes, so that is
            // why stderr was redirected to a file instead. Also, this code is simpler.
            $url = null;
            $stdoutlog = '';
            while (true) {
                $line = fgets($pipes[1], 4096);
                if ($line === false) {
                    break;
                }

                $stdoutlog .= $line;

                if (preg_match('~^\s*Local: (http\S*)~', $line, $matches)) {
                    $url = $matches[1];
                    break;
                }
            }

            // If it failed, close the pipes and the process.
            if (!$url) {
                fclose($pipes[1]);
                proc_close($process);
                $logpath = $CFG->dataroot . '/behat/ionic-start.log';
                $stderrlog = file_get_contents($stderrfile);
                @unlink($stderrfile);
                file_put_contents($logpath,
                        "Ionic startup log from " . date('c') .
                        "\n\n----STDOUT----\n$stdoutlog\n\n----STDERR----\n$stderrlog");
                throw new DriverException('Unable to start Ionic. See ' . $logpath);
            }

            // Remember the URL, so we can reuse it next time, and other details so we can kill
            // the process.
            self::$ionicrunning = (object)['url' => $url, 'process' => $process, 'pipes' => $pipes,
                    'pid' => $pid];
            $url = self::$ionicrunning->url;
        }
        return $url;
    }

    /**
     * Closes Ionic (if it was started) at end of test suite.
     *
     * @AfterSuite
     */
    public static function close_ionic() {
        if (self::$ionicrunning) {
            fclose(self::$ionicrunning->pipes[1]);

            if (self::is_windows()) {
                // Using proc_terminate here does not work. It terminates the process but not any
                // other processes it might have launched. Instead, we need to use an OS-specific
                // mechanism to kill the process and children based on its pid.
                exec('taskkill /F /T /PID ' . self::$ionicrunning->pid);
            } else {
                // On Unix this actually works, although only due to the 'exec' command inserted
                // above.
                proc_terminate(self::$ionicrunning->process);
            }
            self::$ionicrunning = null;
        }
    }

    /**
     * Goes to the app page and then sets up some initial JavaScript so we can use it.
     *
     * @param string $url App URL
     * @throws DriverException If the app fails to load properly
     */
    protected function prepare_browser(array $options = []) {
        $restart = $options['restart'] ?? true;
        $skiponboarding = $options['skiponboarding'] ?? true;

        if ($restart) {
            if ($this->apprunning) {
                $this->notify_unload();
            }

            // Restart the browser and set its size.
            $this->getSession()->restart();
            $this->resize_window('360x720', true);

            if (empty($this->ionicurl)) {
                $this->ionicurl = $this->start_or_reuse_ionic();
            }

            // Visit the Ionic URL.
            $this->getSession()->visit($this->ionicurl);
            $this->notify_load();

            $this->apprunning = true;
        }

        // Wait the application to load.
        $this->spin(function($context) {
            $title = $context->getSession()->getPage()->find('xpath', '//title');

            if ($title) {
                $text = $title->getHtml();

                if ($text === 'Moodle App') {
                    return true;
                }
            }

            throw new DriverException('Moodle app not found in browser');
        }, false, 60);

        // Inject Behat JavaScript runtime.
        global $CFG;

        $this->execute_script("
            var script = document.createElement('script');
            script.src = '{$CFG->behat_wwwroot}/local/moodlemobileapp/tests/behat/app_behat_runtime.js';
            document.body.append(script);
        ");

        if ($restart) {
            // Assert initial page.
            $this->spin(function($context) use ($skiponboarding) {
                $page = $context->getSession()->getPage();
                $element = $page->find('xpath', '//page-core-login-site//input[@name="url"]');

                if ($element) {
                    if (!$skiponboarding) {
                        return true;
                    }

                    // Wait for the onboarding modal to open, if any.
                    $this->wait_for_pending_js();

                    $element = $page->find('xpath', '//core-login-site-onboarding');

                    if ($element) {
                        $this->i_press_in_the_app('"Skip"');
                    }

                    // Login screen found.
                    return true;
                }

                if ($page->find('xpath', '//page-core-mainmenu')) {
                    // Main menu found.
                    return true;
                }

                throw new DriverException('Moodle app not launched properly');
            }, false, 60);
        }

        // Continue only after JS finishes.
        $this->wait_for_pending_js();
    }

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
                function($context, $args) {
                    $mainmenu = $context->getSession()->getPage()->find('xpath', '//page-core-mainmenu');
                    if ($mainmenu) {
                        return 'mainpage';
                    }
                    throw new DriverException('Moodle app main page not loaded after login');
                }, false, 30);

        // Wait for JS to finish as well.
        $this->wait_for_pending_js();
    }

    /**
     * User enters a course in the app.
     *
     * @Given /^I enter the course "(.+?)"(?: as "(.+)")? in the app$/
     * @param string $coursename Course name
     * @throws DriverException If the button push doesn't work
     */
    public function i_enter_the_course_in_the_app(string $coursename, ?string $username = null) {
        if (!is_null($username)) {
            $this->i_enter_the_app();
            $this->login($username);
        }

        $mycoursesfound = $this->evaluate_script("return window.behat.find({ text: 'My courses', near: { text: 'Messages' } });");

        if ($mycoursesfound !== 'OK') {
            // My courses not present enter from Dashboard.
            $this->i_press_in_the_app('"Home" near "Messages"');
            $this->i_press_in_the_app('"Dashboard"');
            $this->i_press_in_the_app('"'.$coursename.'" near "Course overview"');

            $this->wait_for_pending_js();

            return;
        }

        $this->i_press_in_the_app('"My courses" near "Messages"');
        $this->i_press_in_the_app('"'.$coursename.'"');

        $this->wait_for_pending_js();
    }

    /**
     * Presses standard buttons in the app.
     *
     * @Given /^I press the (back|more menu|page menu|user menu|main menu) button in the app$/
     * @param string $button Button type
     * @throws DriverException If the button push doesn't work
     */
    public function i_press_the_standard_button_in_the_app(string $button) {
        $this->spin(function() use ($button) {
            $result = $this->evaluate_script("return window.behat.pressStandard('$button');");

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
     * @Given /^I receive a push notification in the app for:$/
     * @param TableNode $data
     */
    public function i_receive_a_push_notification(TableNode $data) {
        global $DB, $CFG;

        $data = (object) $data->getColumnsHash()[0];
        $module = $DB->get_record('course_modules', ['idnumber' => $data->module]);
        $discussion = $DB->get_record('forum_discussions', ['name' => $data->discussion]);
        $notification = json_encode([
            'site' => md5($CFG->wwwroot . $data->username),
            'courseid' => $discussion->course,
            'moodlecomponent' => 'mod_forum',
            'name' => 'posts',
            'contexturl' => '',
            'notif' => 1,
            'customdata' => [
                'discussionid' => $discussion->id,
                'cmid' => $module->id,
                'instance' => $discussion->forum,
            ],
        ]);

        $this->evaluate_script("return window.pushNotifications.notificationClicked($notification)");
        $this->wait_for_pending_js();
    }

    /**
     * Replace arguments from the content in the given activity field.
     *
     * @Given /^I replace the arguments in "([^"]+)" "([^"]+)"$/
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
     */
    public function i_open_a_custom_link(TableNode $data) {
        global $DB, $CFG;

        $data = $data->getColumnsHash()[0];
        $title = array_keys($data)[0];
        $data = (object) $data;

        switch ($title) {
            case 'discussion':
                $discussion = $DB->get_record('forum_discussions', ['name' => $data->discussion]);
                $pageurl = "{$CFG->behat_wwwroot}/mod/forum/discuss.php?d={$discussion->id}";

                break;

            case 'forum':
                $forumdata = $DB->get_record('forum', ['name' => $data->forum]);
                $cm = get_coursemodule_from_instance('forum', $forumdata->id);
                $pageurl = "{$CFG->behat_wwwroot}/mod/forum/view.php?id={$cm->id}";
                break;

            default:
                throw new DriverException('Invalid custom link title - ' . $title);
        }

        $url = "moodlemobile://link=" . urlencode($pageurl);

        $this->evaluate_script("return window.urlSchemes.handleCustomURL('$url')");
        $this->wait_for_pending_js();
    }

    /**
     * Closes a popup by clicking on the 'backdrop' behind it.
     *
     * @Given /^I close the popup in the app$/
     * @throws DriverException If there isn't a popup to close
     */
    public function i_close_the_popup_in_the_app() {
        $this->spin(function()  {
            $result = $this->evaluate_script("return window.behat.closePopup();");

            if ($result !== 'OK') {
                throw new DriverException('Error closing popup - ' . $result);
            }

            return true;
        });

        $this->wait_for_pending_js();
    }

    /**
     * Clicks on / touches something that is visible in the app.
     *
     * Note it is difficult to use the standard 'click on' or 'press' steps because those do not
     * distinguish visible items and the app always has many non-visible items in the DOM.
     *
     * @Then /^I press (".+") in the app$/
     * @param string $locator Element locator
     * @throws DriverException If the press doesn't work
     */
    public function i_press_in_the_app(string $locator) {
        $locator = $this->parse_element_locator($locator);
        $locatorjson = json_encode($locator);

        $this->spin(function() use ($locatorjson) {
            $result = $this->evaluate_script("return window.behat.press($locatorjson);");

            if ($result !== 'OK') {
                throw new DriverException('Error pressing item - ' . $result);
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
     * @param string $selectedtext
     * @param string $locator
     * @throws DriverException If the press doesn't work
     */
    public function i_select_in_the_app(string $selectedtext, string $locator) {
        $selected = $selectedtext === 'select' ? 'YES' : 'NO';
        $locator = $this->parse_element_locator($locator);
        $locatorjson = json_encode($locator);

        $this->spin(function() use ($selectedtext, $selected, $locatorjson) {
            // Don't do anything if the item is already in the expected state.
            $result = $this->evaluate_script("return window.behat.isSelected($locatorjson);");

            if ($result === $selected) {
                return true;
            }

            // Press item.
            $result = $this->evaluate_script("return window.behat.press($locatorjson);");

            if ($result !== 'OK') {
                throw new DriverException('Error pressing item - ' . $result);
            }

            // Check that it worked as expected.
            usleep(1000000);

            $result = $this->evaluate_script("return window.behat.isSelected($locatorjson);");

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
     * Check whether the current page is the login form.
     */
    protected function is_in_login_page(): bool {
        $page = $this->getSession()->getPage();
        $logininput = $page->find('xpath', '//page-core-login-site//input[@name="url"]');

        return !is_null($logininput);
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
            $result = $this->evaluate_script("return window.behat.setField(\"$field\", \"$value\");");

            if ($result !== 'OK') {
                throw new DriverException('Error setting field - ' . $result);
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
            $result = $this->evaluate_script('return window.behat.getHeader();');

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
     * @Given /^the app should( not)? have opened a browser tab(?: with url "(?P<pattern>[^"]+)")?$/
     * @param bool $not
     * @param string $urlpattern
     */
    public function the_app_should_have_opened_a_browser_tab(bool $not = false, ?string $urlpattern = null) {
        $this->spin(function() use ($not, $urlpattern) {
            $windownames = $this->getSession()->getWindowNames();
            $openedbrowsertab = count($windownames) === 2;

            if ((!$not && !$openedbrowsertab) || ($not && $openedbrowsertab && is_null($urlpattern))) {
                throw new ExpectationException(
                    $not
                        ? 'Did not expect the app to have opened a browser tab'
                        : 'Expected the app to have opened a browser tab',
                    $this->getSession()->getDriver()
                );
            }

            if (!is_null($urlpattern)) {
                $this->getSession()->switchToWindow($windownames[1]);
                $windowurl = $this->getSession()->getCurrentUrl();
                $windowhaspattern = preg_match("/$urlpattern/", $windowurl);
                $this->getSession()->switchToWindow($windownames[0]);

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
     * @Given /^I switch to the browser tab opened by the app$/
     * @throws DriverException If there aren't exactly 2 tabs open
     */
    public function i_switch_to_the_browser_tab_opened_by_the_app() {
        $names = $this->getSession()->getWindowNames();
        if (count($names) !== 2) {
            throw new DriverException('Expected to see 2 tabs open, not ' . count($names));
        }
        $this->getSession()->switchToWindow($names[1]);
    }

    /**
     * Force cron tasks instead of waiting for the next scheduled execution.
     *
     * @When /^I run cron tasks in the app$/
     */
    public function i_run_cron_tasks_in_the_app() {
        $session = $this->getSession();

        // Force cron tasks execution and wait until they are completed.
        $operationid = random_string();

        $session->executeScript(
            "cronProvider.forceSyncExecution().then(() => { window['behat_{$operationid}_completed'] = true; });"
        );
        $this->spin(
            function() use ($session, $operationid) {
                return $session->evaluateScript("window['behat_{$operationid}_completed'] || false");
            },
            false,
            60,
            new ExpectationException('Forced cron tasks in the app took too long to complete', $session)
        );

        // Trigger Angular change detection
        $session->executeScript('ngZone.run(() => {});');
    }

    /**
     * Wait until loading has finished.
     *
     * @When /^I wait loading to finish in the app$/
     */
    public function i_wait_loading_to_finish_in_the_app() {
        $session = $this->getSession();

        $this->spin(
            function() use ($session) {
                $session->executeScript('ngZone.run(() => {});');

                $nodes = $this->find_all('css', 'core-loading ion-spinner');

                foreach ($nodes as $node) {
                    if (!$node->isVisible()) {
                        continue;
                    }

                    return false;
                }

                return true;
            },
            false,
            60,
            new ExpectationException('"Loading took too long to complete', $session)
        );
    }

    /**
     * Closes the current browser tab.
     *
     * This assumes it was opened by the app and you will now get back to the app.
     *
     * @Given /^I close the browser tab opened by the app$/
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

        $this->execute_script('window.close()');
        $this->getSession()->switchToWindow($names[0]);
    }

    /**
     * Switch navigator online mode.
     *
     * @Given /^I switch offline mode to "(true|false)"$/
     * @param string $offline New value for navigator online mode
     * @throws DriverException If the navigator.online mode is not available
     */
    public function i_switch_offline_mode(string $offline) {
        $this->execute_script("appProvider.setForceOffline($offline);");
    }

    /**
     * Parse an element locator string.
     *
     * @param string $text Element locator string.
     * @return object
     */
    public function parse_element_locator(string $text): object {
        preg_match('/^"((?:[^"]|\\")*?)"(?: "([^"]*?)")?(?: (near|within) "((?:[^"]|\\")*?)"(?: "([^"]*?)")?)?$/', $text, $matches);

        $locator = [
            'text' => str_replace('\\"', '"', $matches[1]),
            'selector' => $matches[2] ?? null,
        ];

        if (!empty($matches[3])) {
            $locator[$matches[3]] = (object) [
                'text' => str_replace('\\"', '"', $matches[4]),
                'selector' => $matches[5] ?? null,
            ];
        }

        return (object) $locator;
    }

    /**
     * Replaces $WWWROOT for the url of the Moodle site.
     *
     * @Transform /^(.*\$WWWROOT.*)$/
     * @param string $text Text.
     * @return string
     */
    public function replace_wwwroot($text) {
        global $CFG;

        return str_replace('$WWWROOT', $CFG->behat_wwwroot, $text);
    }

    /**
     * Replace arguments with the format "${activity:field}" from a string, where "activity" is
     * the idnumber of an activity and "field" is the activity's field to get replacement from.
     *
     * At the moment, the only field supported is "cmid", the id of the course module for this activity.
     *
     * @param string $text Original text.
     * @return string Text with arguments replaced.
     */
    protected function replace_arguments(string $text): string {
        global $DB;

        preg_match_all("/\\$\\{([^:}]+):([^}]+)\\}/", $text, $matches);

        foreach ($matches[0] as $index => $match) {
            switch ($matches[2][$index]) {
                case 'cmid':
                    $coursemodule = $DB->get_record('course_modules', ['idnumber' => $matches[1][$index]]);
                    $text = str_replace($match, $coursemodule->id, $text);

                    break;
            }
        }

        return $text;
    }

    /**
     * Notify to listeners that the app was just loaded.
     */
    private function notify_load(): void {
        foreach (self::$listeners as $listener) {
            $listener->on_app_load();
        }
    }

    /**
     * Notify to listeners that the app is about to be unloaded.
     */
    private function notify_unload(): void {
        foreach (self::$listeners as $listener) {
            $listener->on_app_unload();
        }
    }

    /**
     * Evaludate a script that returns a Promise.
     *
     * @param string $script
     * @return mixed Resolved promise result.
     */
    private function evaluate_async_script(string $script) {
        $script = preg_replace('/^return\s+/', '', $script);
        $script = preg_replace('/;$/', '', $script);
        $start = microtime(true);
        $promisevariable = 'PROMISE_RESULT_' . time();
        $timeout = self::get_timeout();

        $this->evaluate_script("Promise.resolve($script)
            .then(result => window.$promisevariable = result)
            .catch(error => window.$promisevariable = 'Async code rejected: ' + error?.message);");

        do {
            if (microtime(true) - $start > $timeout) {
                throw new DriverException("Async script not resolved after $timeout seconds");
            }

            usleep(100000);
        } while (!$this->evaluate_script("return '$promisevariable' in window;"));

        $result = $this->evaluate_script("return window.$promisevariable;");

        $this->evaluate_script("delete window.$promisevariable;");

        return $result;
    }

}
