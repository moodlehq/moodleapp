@core_login @app @javascript
Feature: Test different cases of logout and switch account
  I need different logout use cases to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | david     | student  |
      | student2 | pau       | student2 |

  Scenario: Log out and re-login
    Given I entered the app as "student1"
    When I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    Then the header should be "Accounts" in the app

    When I press "david student" in the app
    Then the header should be "Reconnect" in the app
    And I should find "david student" in the app

    When I set the following fields to these values in the app:
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    Then the header should be "Acceptance test site" in the app

  Scenario: Exit account using switch account and re-enter
    Given I entered the app as "student1"
    When I press the user menu button in the app
    And I press "Switch account" in the app
    And I press "Add" in the app
    And I wait the app to restart
    Then I should find "Connect to Moodle" in the app

    When I go back in the app
    And I press "david student" in the app
    Then the header should be "Acceptance test site" in the app

  Scenario: Exit account using switch account and re-enter when forcelogout is enabled
    Given the following config values are set as admin:
      | forcelogout     | 1 | tool_mobile |
    And I entered the app as "student1"
    When I press the user menu button in the app
    And I press "Switch account" in the app
    And I press "Add" in the app
    And I wait the app to restart
    And I go back in the app
    And I press "david student" in the app
    Then the header should be "Reconnect" in the app
    And I should find "david student" in the app

  Scenario: Switch to a different account
    Given I entered the app as "student1"
    And I entered the app as "student2"
    When I press the user menu button in the app
    Then I should find "pau student2" in the app

    When I press "Switch account" in the app
    And I press "david student" in the app
    And I wait the app to restart
    Then the header should be "Acceptance test site" in the app

    When I press the user menu button in the app
    Then I should find "david student" in the app

  Scenario: Logout when there is unsaved data
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity   | name       | intro       | course | idnumber |
      | forum      | Test forum | Test forum  | C1     | forum    |
    And the following forum discussions exist in course "Course 1":
      | forum      | user     | name          | message         |
      | Test forum | student1 | Forum topic 1 | Forum message 1 |
      | Test forum | student1 | Forum topic 2 | Forum message 2 |
    And I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    When I press "Test forum" in the app
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | My happy subject |
      | Message | An awesome message |
    And I press the user menu button in the app
    And I press "Log out" in the app
    Then I should find "Leave page?" in the app
    And I should find "Unsaved changes will be lost." in the app

    # Check that the app continues working fine if the user cancels the logout.
    When I press "Cancel" in the app
    And I press "Forum topic 1" in the app
    And I press "Leave" in the app
    Then I should find "Forum message 1" in the app

    When I press "Forum topic 2" in the app
    Then I should find "Forum message 2" in the app

    # Now confirm the logout.
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | My happy subject |
      | Message | An awesome message |
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I press "Leave" in the app
    And I wait the app to restart
    Then the header should be "Accounts" in the app

  Scenario: Switch account when there is unsaved data
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity   | name       | intro       | course | idnumber |
      | forum      | Test forum | Test forum  | C1     | forum    |
    And the following forum discussions exist in course "Course 1":
      | forum      | user     | name          | message         |
      | Test forum | student1 | Forum topic 1 | Forum message 1 |
      | Test forum | student1 | Forum topic 2 | Forum message 2 |
    And I entered the app as "student2"
    And I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    When I press "Test forum" in the app
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | My happy subject |
      | Message | An awesome message |
    And I press the user menu button in the app
    And I press "Switch account" in the app
    And I press "pau student2" in the app
    Then I should find "Leave page?" in the app
    And I should find "Unsaved changes will be lost." in the app

    # Check that the app continues working fine if the user cancels the switch account.
    When I press "Cancel" in the app
    And I press "Forum topic 1" in the app
    And I press "Leave" in the app
    Then I should find "Forum message 1" in the app

    When I press "Forum topic 2" in the app
    Then I should find "Forum message 2" in the app

    # Now confirm the switch account.
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | My happy subject |
      | Message | An awesome message |
    And I press the user menu button in the app
    And I press "Switch account" in the app
    And I press "pau student2" in the app
    And I press "Leave" in the app
    And I wait the app to restart
    And I press the user menu button in the app
    Then I should find "pau student2" in the app
