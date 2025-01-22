@addon_mod_bigbluebuttonbn @app @mod @mod_bigbluebuttonbn @javascript
Feature: Test basic usage of BBB activity in app
  In order to join a BBB meeting while using the mobile app
  As a student
  I need basic BBB functionality to work

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

  Scenario: Open and closed dates
    Given the following "activities" exist:
      | activity        | name  | intro                | course | idnumber | wait | openingtime                | closingtime                |
      | bigbluebuttonbn | BBB 1 | Test BBB description | C1     | bbb1     | 0    | ## 1 January 2050 00:00 ## | 0                          |
      | bigbluebuttonbn | BBB 2 | Test BBB description | C1     | bbb2     | 0    | 0                          | ## 1 January 2000 00:00 ## |
      | bigbluebuttonbn | BBB 3 | Test BBB description | C1     | bbb3     | 0    | ## 1 January 2000 00:00 ## | ## 1 January 2050 00:00 ## |
    And I entered the course "Course 1" as "student1" in the app
    And I press "BBB 1" in the app
    Then I should find "The session has not started yet." in the app
    And I should find "Saturday, 1 January 2050, 12:00 AM" within "Open" "ion-item" in the app

    When I go back in the app
    And I press "BBB 2" in the app
    Then I should find "The session has ended." in the app
    And I should find "Saturday, 1 January 2000, 12:00 AM" within "Close" "ion-item" in the app

    When I go back in the app
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
    # TODO: This step will make behat github actions work but we should find a better way to wait for the room to start.
    And I wait "3" seconds
    And I wait for the BigBlueButton room to start
    And I switch back to the app
    Then I should find "The session is in progress." in the app
    And I should find "1" near "Viewer" in the app
    And I should find "0" near "Moderator" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                            | activity        | activityname | course   |
      | \mod_bigbluebuttonbn\event\course_module_viewed | bigbluebuttonbn | Test BBB     | Course 1 |
      | \mod_bigbluebuttonbn\event\meeting_joined	    | bigbluebuttonbn | Test BBB     | Course 1 |

  Scenario: Join meeting (moderator)
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | moderators          |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 1    | role:editingteacher |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "teacher1" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app

    When I press "Join session" in the app
    # TODO: This step will make behat github actions work but we should find a better way to wait for the room to start.
    And I wait "3" seconds
    And I wait for the BigBlueButton room to start
    And I switch back to the app
    Then I should find "The session is in progress." in the app
    And I should find "1" near "Moderator" in the app
    And I should find "0" near "Viewer" in the app

  Scenario: Wait for moderator
    Given the following "activities" exist:
      | activity        | name     | intro                | course | idnumber | wait | moderators          |
      | bigbluebuttonbn | Test BBB | Test BBB description | C1     | bbb1     | 1    | role:editingteacher |
    And I entered the bigbluebuttonbn activity "Test BBB" on course "Course 1" as "student1" in the app
    Then I should find "Waiting for a moderator to join." in the app
    And I should not be able to press "Join session" in the app

    # Join the session as moderator in a browser.
    When I open a browser tab with url "$WWWROOT"
    And I am on the "bbb1" Activity page logged in as teacher1
    And I click on "Join session" "link"
    And I wait for the BigBlueButton room to start
    And I switch back to the app
    And I pull to refresh until I find "The session is in progress" in the app
    Then I should find "1" near "Moderator" in the app
    And I should find "0" near "Viewer" in the app
    And I should be able to press "Join session" in the app

    When I close all opened windows
    And I press "Join session" in the app
    Then the app should have opened a browser tab with url "blindsidenetworks.com"

  Scenario: Display right info based on instance type
    Given the following "activities" exist:
      | activity        | name              | course | idnumber | type |
      | bigbluebuttonbn | Room & recordings | C1     | bbb1     | 0    |
      | bigbluebuttonbn | Room only         | C1     | bbb2     | 1    |
      | bigbluebuttonbn | Recordings only   | C1     | bbb3     | 2    |
    And I entered the course "Course 1" as "student1" in the app
    And I press "Room & recordings" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app
    And I should find "Recordings" in the app
    And I should find "There are no recordings available." in the app

    When I go back in the app
    And I press "Room only" in the app
    Then I should find "This room is ready. You can join the session now." in the app
    And I should be able to press "Join session" in the app
    But I should not find "Recordings" in the app

    When I go back in the app
    And I press "Recordings only" in the app
    Then I should find "Recordings" in the app
    But I should not find "This room is ready. You can join the session now." in the app
    And I should not be able to press "Join session" in the app

  # Test recordings requires a BBB mock server. If you're using docker, you can run the BBB mock server with this command:
  #
  # docker run --name bbbmockserver -p 8001:80 moodlehq/bigbluebutton_mock:latest
  #
  # You also need to edit the config.php of your Moodle site to add this line:
  #
  # define('TEST_MOD_BIGBLUEBUTTONBN_MOCK_SERVER', 'http://bbbmockserver:8001/hash' . sha1($CFG->behat_wwwroot));
  Scenario: View recordings
    Given a BigBlueButton mock server is configured
    And the following "activities" exist:
      | activity        | name | course | idnumber | type | recordings_imported |
      | bigbluebuttonbn | BBB  | C1     | bbb1     | 0    | 0                   |
    And the following "mod_bigbluebuttonbn > meeting" exists:
      | activity | BBB |
    And the following "mod_bigbluebuttonbn > recordings" exist:
      | bigbluebuttonbn | name        | description   | status |
      | BBB             | Recording 1 | Description 1 | 3      |
      | BBB             | Recording 2 | Description 2 | 3      |
    And I entered the bigbluebuttonbn activity "BBB" on course "Course 1" as "student1" in the app
    Then I should find "Recording 1" in the app
    And I should find "Recording 2" in the app
    But I should not find "Description 1" in the app
    And I should not find "Description 2" in the app
    And I should not find "Presentation" in the app

    When I press "Recording 1" in the app
    Then I should find "Description 1" in the app
    And I should find "Presentation" in the app
    And I should find "Recording 1" within "Name" "ion-item" in the app
    And I should find "Date" in the app
    And I should find "3600" within "Duration" "ion-item" in the app
    But I should not find "Description 2" in the app

    When I press "Recording 1" in the app
    Then I should not find "Description 1" in the app

    When I press "Recording 2" in the app
    Then I should find "Description 2" in the app
    And I should find "Presentation" in the app
    And I should find "Recording 2" within "Name" "ion-item" in the app
    But I should not find "Description 1" in the app

    # Test play button, but the mock server doesn't support viewing recordings.
    When I press "Presentation" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "The recording URL is invalid"
