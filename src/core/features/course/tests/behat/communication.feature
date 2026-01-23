@core_course @app @communication @communication_matrix @javascript @lms_from4.4
Feature: Use custom communication link in course

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
      | student1 | Student   | 1        | student1@example.com |
    And the following "courses" exist:
      | fullname  | shortname |
      | Course 1  | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And the following config values are set as admin:
      | enablecommunicationsubsystem | 1 |
    And I am on the "Course 1" "Course" page logged in as "teacher1"
    And I navigate to "Communication" in current page administration
    And I select "Custom link" from the "Provider" singleselect
    And I set the following fields to these values:
      | communication_customlinkroomname | Test URL                                                                                   |
      | customlinkurl                    | #wwwroot#/communication/provider/customlink/tests/behat/fixtures/custom_link_test_page.php |
    And I press "Save changes"

  Scenario: Use communication link
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Chat to course participants" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url ".*\/communication\/provider\/customlink\/tests\/behat\/fixtures\/custom_link_test_page.php"
