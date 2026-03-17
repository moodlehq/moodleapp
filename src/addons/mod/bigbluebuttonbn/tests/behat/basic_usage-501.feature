@app_parallel_run_bbb @addon_mod_bigbluebuttonbn @app @mod @mod_bigbluebuttonbn @javascript @lms_upto5.1
Feature: Test basic usage of BBB activity in app
  In order to join a BBB meeting while using the mobile app
  As a student
  I need basic BBB functionality to work

  Background:
    Given the Moodle site is compatible with this feature
    And I enable "bigbluebuttonbn" "mod" plugin
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |

  Scenario: Wait for moderator
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | moderators          |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 1    | role:editingteacher |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "Waiting for a moderator to join." in the app
    And I should not be able to press "Join session" in the app

    # Join the session as moderator in a browser.
    When I open a browser tab with url "$WWWROOT"
    And I am on the "bbb1" Activity page logged in as teacher1
    And I click on "Join session" "link"
    And I wait for the BigBlueButton room to start
    And I switch back to the app
    And I pull to refresh until I find "The session is in progress" in the app
    Then I should find "1" near "Moderator" in the app
    And I should find "0" near "Viewer" in the app
    And I should be able to press "Join session" in the app

    When I close all opened windows
    And I press "Join session" in the app
    Then the app should have opened a browser tab with url "blindsidenetworks.com"
