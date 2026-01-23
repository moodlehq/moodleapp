@core_navigation @app @javascript
Feature: It opens external links properly.

  Background:
    Given the following "users" exist:
      | username |
      | teacher1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | teacher1 | C1     | teacher |
    And the following "activities" exist:
      | activity   | name       | intro       | course | idnumber |
      | forum      | Test forum | Test forum  | C1     | forum    |
    And the following forum discussions exist in course "Course 1":
      | forum      | user     | name        | message       |
      | Test forum | teacher1 | Forum topic | See <a href="https://moodle.org/">moodle.org external link</a> |

  Scenario: Click an external link
    Given I entered the forum activity "Test forum" on course "Course 1" as "teacher1" in the app
    When I press "Forum topic" in the app
    And I press "moodle.org external link" in the app
    Then I should find "You are about to leave the app" in the app

    When I press "Cancel" in the app
    And I press "moodle.org external link" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url "moodle.org"

    When I close the browser tab opened by the app
    And I go back in the app
    And I press "Information" in the app
    And I press "Open in browser" in the app
    Then the app should have opened a browser tab

    When I close the browser tab opened by the app
    When I close the popup in the app
    And I press "Forum topic" in the app
    And I press "moodle.org external link" in the app
    And I select "Don't show again." in the app
    And I press "OK" in the app
    And I close the browser tab opened by the app
    And I press "moodle.org external link" in the app
    Then the app should have opened a browser tab with url "moodle.org"
