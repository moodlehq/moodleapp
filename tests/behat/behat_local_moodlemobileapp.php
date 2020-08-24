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
 * Behat step definitions.
 *
 * @package    local_apps
 * @copyright  2010 Moodle Pty Ltd (http://moodle.com)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use Behat\Mink\Exception\ExpectationException;

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');

/**
 * Behat step definitions.
 *
 * @package    local_apps
 * @copyright  2010 Moodle Pty Ltd (http://moodle.com)
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_local_moodlemobileapp extends behat_base {

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

        // Trigger Angular digest cycle multiple times in case some changes have
        // side-effects that result in further pending operations.
        for ($ticks = 5; $ticks > 0; $ticks--) {
            $session->executeScript('appRef.tick();');
        }
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
                $session->executeScript('appRef.tick();');

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
     * Replaces $WEBSERVER for webserver env variable value, defaults to "webserver" if it is not set.
     *
     * @Transform /^(.*\$WEBSERVER.*)$/
     * @param string $text Text.
     * @return string
     */
    public function arg_replace_webserver_env($text) {
        $webserver = getenv('WEBSERVER');

        if ($webserver === false) {
            $webserver = 'webserver';
        }

        return str_replace('$WEBSERVER', $webserver, $text);
    }

}
