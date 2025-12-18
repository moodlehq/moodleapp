@app_parallel_run_bbb @addon_mod_bigbluebuttonbn @app @mod @mod_bigbluebuttonbn @javascript
Feature: Test usage of BBB activity with groups in app

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
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
      | Group 2 | C1     | G2       |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |

  Scenario: BBB activity with visible groups
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | groupmode |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 0    | 2         |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should find "There is a room for each group and you have access to more" in the app
    And I should be able to press "Join session" in the app

    When I press "Visible groups" in the app
    Then I should find "All participants" in the app
    And I should find "Group 1" in the app
    And I should find "Group 2" in the app

    When I press "Group 1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

  Scenario: BBB activity with separate groups (student)
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | groupmode |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 0    | 1         |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app
    But I should not find "There is a room for each group and you have access to more" in the app

    When I press "Separate groups" in the app
    Then I should find "Group 1" in the app
    But I should not find "All participants" in the app
    And I should not find "Group 2" in the app

  Scenario: BBB activity with separate groups (teacher)
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | groupmode |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 0    | 1         |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "teacher1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should find "There is a room for each group and you have access to more" in the app
    And I should be able to press "Join session" in the app

    When I press "Separate groups" in the app
    Then I should find "All participants" in the app
    And I should find "Group 1" in the app
    And I should find "Group 2" in the app

    When I press "Group 1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

  Scenario: View recordings
    Given a BigBlueButton mock server is configured
    And the following "activities" exist:
      | activity        | name     | course | idnumber | wait | groupmode | type | recordings_imported |
      | bigbluebuttonbn | Test BBB | C1     | bbb1     | 0    | 2         | 0    | 0                   |
    And the following "mod_bigbluebuttonbn > meeting" exists:
      | activity | Test BBB |
    And the following "mod_bigbluebuttonbn > meetings" exist:
      | activity | group |
      | Test BBB | G1    |
      | Test BBB | G2    |
    And the following "mod_bigbluebuttonbn > recordings" exist:
      | bigbluebuttonbn | name        | description   | status | group |
      | Test BBB        | Recording 1 | Description 1 | 3      | G1    |
      | Test BBB        | Recording 2 | Description 2 | 3      | G2    |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "Recording 1" in the app
    But I should not find "Recording 2" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "Recording 2" in the app
    But I should not find "Recording 1" in the app
