@app @javascript
Feature: It opens external links properly.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity   | name       | intro       | course | idnumber |
      | forum      | Test forum | Test forum  | C1     | forum    |
    And the following forum discussions exist in course "Course 1":
      | forum      | user     | name        | message       |
      | Test forum | student1 | Forum topic | See <a href="https://moodle.org/">moodle.org</a> |

  Scenario: Click an external link
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum" in the app
    And I press "Forum topic" in the app
    And I press "moodle.org" in the app
    Then I should find "You are about to leave the app" in the app

    When I press "Cancel" in the app
    And I press "moodle.org" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url "moodle.org"

    When I close the browser tab opened by the app
    And I press the back button in the app
    And I press the page menu button in the app
    And I press "Open in browser" in the app
    Then the app should have opened a browser tab

    When I close the browser tab opened by the app
    And I press "Forum topic" in the app
    And I press "moodle.org" in the app
    And I select "Don't show again." in the app
    And I press "OK" in the app
    And I close the browser tab opened by the app
    And I press "moodle.org" in the app
    Then the app should have opened a browser tab with url "moodle.org"
