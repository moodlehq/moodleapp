@addon_mod_url @app @mod @mod_url @javascript
Feature: Test basic usage of url activity in app

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
      | activity | name           | course | idnumber | externalurl        |
      | url      | Test url title | C1     | url      | https://moodle.org |

  Scenario: View contents
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Test url title" in the app
    Then I should find "https://moodle.org" in the app

    When I press "Access the URL" in the app
    And I press "OK" near "You are about to leave the app" in the app
    Then the app should have opened a browser tab with url "moodle.org"
    And the following events should have been logged for "student1" in the app:
      | name                                | activity | activityname   | course   |
      | \mod_url\event\course_module_viewed | url      | Test url title | Course 1 |
