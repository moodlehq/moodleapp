@mod @mod_bigbluebuttonbn @app @javascript @lms_from4.0
Feature: Test basic usage of BBB activity in app
  In order to join a BBB meeting while using the mobile app
  As a student
  I need basic BBB functionality to work

  Background:
    Given I enable "bigbluebuttonbn" "mod" plugin
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

  Scenario: Open and closed dates
    Given the following "activities" exist:
      | activity        | name  | intro                | course | idnumber | wait | openingtime                | closingtime                |
      | bigbluebuttonbn | BBB 1 | Test BBB description | C1     | bbb1     | 0    | ## 1 January 2050 00:00 ## | 0                          |
      | bigbluebuttonbn | BBB 2 | Test BBB description | C1     | bbb2     | 0    | 0                          | ## 1 January 2000 00:00 ## |
      | bigbluebuttonbn | BBB 3 | Test BBB description | C1     | bbb3     | 0    | ## 1 January 2000 00:00 ## | ## 1 January 2050 00:00 ## |
    And I entered the bigbluebuttonbn activity "BBB 1" on course "Course 1" as "student1" in the app
    Then I should find "The session has not started yet." in the app
    And I should find "Saturday, 1 January 2050, 12:00 AM" within "Open" "ion-item" in the app

    When I press the back button in the app
    And I press "BBB 2" in the app
    Then I should find "The session has ended." in the app
    And I should find "Saturday, 1 January 2000, 12:00 AM" within "Close" "ion-item" in the app

    When I press the back button in the app
    And I press "BBB 3" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should find "Saturday, 1 January 2000, 12:00 AM" within "Open" "ion-item" in the app
    And I should find "Saturday, 1 January 2050, 12:00 AM" within "Close" "ion-item" in the app

  Scenario: Join meeting (student)
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 0    |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

    When I press "Join session" in the app
    Then the app should have opened a browser tab with url "blindsidenetworks.com"

    Given I wait "10" seconds
    Then I should find "The session is in progress." in the app
    And I should find "1" near "viewer" in the app
    And I should find "0" near "moderator" in the app

  Scenario: Join meeting (moderator)
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | moderators          |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 1    | role:editingteacher |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "teacher1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

    When I press "Join session" in the app
    Then the app should have opened a browser tab with url "blindsidenetworks.com"

    Given I wait "10" seconds
    Then I should find "The session is in progress." in the app
    And I should find "1" near "moderator" in the app
    And I should find "0" near "viewer" in the app

  Scenario: Wait for moderator
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | moderators          |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 1    | role:editingteacher |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "Waiting for a moderator to join." in the app
    And I should not be able to press "Join session" in the app

    # Join the session as moderator in a browser.
    When I press "Information" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I click on "Join session" "link"
    And I wait "10" seconds
    And I switch back to the app
    And I press "Close" in the app
    And I pull to refresh in the app
    Then I should find "The session is in progress." in the app
    And I should find "1" near "moderator" in the app
    And I should find "0" near "viewer" in the app
    And I should be able to press "Join session" in the app

    When I close all opened windows
    And I press "Join session" in the app
    Then the app should have opened a browser tab with url "blindsidenetworks.com"
