@addon_mod_page @app @mod @mod_page @javascript
Feature: Test basic usage of page activity in app

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
      | activity | name            | content           | course | idnumber |
      | page     | Test page title | Test page content | C1     | page     |

  Scenario: View contents
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Test page title" in the app
    Then I should find "Test page content" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                 | activity | activityname    | course   |
      | \mod_page\event\course_module_viewed | page     | Test page title | Course 1 |
