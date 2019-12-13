@mod @mod_choice @app @javascript
Feature: Test basic usage in app
  In order to participate in the choice while using the mobile app
  As a student
  I need basic choice functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | teacher1 |
      | student1 |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |

  Scenario: Student sends their single choice
    Given the following "activities" exist:
      | activity | name                    | intro                          | course | idnumber | option                       | allowmultiple | allowupdate | showresults |
      | choice   | Test single choice name | Test single choice description | C1     | choice1  | Option 1, Option 2, Option 3 | 0             | 0           | 1           |
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test single choice name" in the app
    And I press "Option 1" in the app
    And I press "Option 2" in the app
    And I press "Save my choice" in the app
    And I should see "Are you sure"
    And I press "OK" in the app
    Then I should see "Option 1: 0"
    And I should see "Option 2: 1"
    And I should see "Option 3: 0"
    And I should not see "Remove my choice"

  Scenario: Student sends, changes and remove their multi choice
    Given the following "activities" exist:
      | activity | name                    | intro                          | course | idnumber | option                       | allowmultiple | allowupdate | showresults |
      | choice   | Test multi choice name  | Test multi choice description  | C1     | choice2  | Option 1, Option 2, Option 3 | 1             | 1           | 1           |
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test multi choice name" in the app
    And I press "Option 1" in the app
    And I press "Option 2" in the app
    And I press "Save my choice" in the app
    Then I should see "Option 1: 1"
    And I should see "Option 2: 1"
    And I should see "Option 3: 0"
    And I should see "Remove my choice"
    And I press "Option 1" in the app
    And I press "Option 3" in the app
    And I press "Save my choice" in the app
    And I should see "Option 1: 0"
    And I should see "Option 2: 1"
    And I should see "Option 3: 1"
    And I press "Remove my choice" in the app
    And I should see "Are you sure"
    And I press "OK" in the app
    And I should not see "Remove my choice"
    And I should see "The results are not currently viewable"