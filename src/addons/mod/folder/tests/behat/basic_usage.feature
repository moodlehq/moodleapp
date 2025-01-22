@addon_mod_folder @app @mod @mod_folder @javascript
Feature: Test basic usage of folder activity in app

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | name              | intro                   | course | idnumber |
      | folder   | Test folder title | Test folder description | C1     | folder   |

  Scenario: View contents
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Test folder title" in the app
    Then I should find "Test folder description" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                   | activity | activityname      | course   |
      | \mod_folder\event\course_module_viewed | folder   | Test folder title | Course 1 |
