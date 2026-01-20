@app_parallel_run_imscp @addon_mod_imscp @app @mod @mod_imscp @javascript
Feature: Test basic usage of imscp activity in app

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
      | activity | name             | intro                  | course | idnumber |
      | imscp    | Test imscp title | Test imscp description | C1     | imscp    |

  Scenario: View contents
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Test imscp title" in the app
    Then I should find "Test imscp description" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                  | activity | activityname     | course   |
      | \mod_imscp\event\course_module_viewed | imscp    | Test imscp title | Course 1 |
