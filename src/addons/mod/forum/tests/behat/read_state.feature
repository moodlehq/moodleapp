@app_parallel_run_forum @addon_mod_forum @app @mod @mod_forum @javascript @lms_from5.3
Feature: Test mark as read/unread forum posts in app
  In order to manage unread forum posts while using the mobile app
  As a student
  I need to be able to mark forum posts as read or unread

  Background:
    Given the Moodle site is compatible with this feature
    And the following config values are set as admin:
      | forum_trackreadposts | 1 |
      | forum_usermarksread  | 1 |
    And the following "users" exist:
      | username | firstname | lastname | trackforums |
      | student1 | Student   | 1        | 1           |
      | teacher1 | Teacher   | 1        | 1           |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name            | intro      | course | idnumber | trackingtype | forcesubscribe |
      | forum    | Test forum name | Test forum | C1     | forum    | 2            | 2              |
    And the following "mod_forum > discussions" exist:
      | forum | user     | name            | message                 |
      | forum | teacher1 | Test discussion | Test discussion message |
    And the following "mod_forum > posts" exist:
      | user     | parentsubject   | subject | message              |
      | teacher1 | Test discussion | Reply 1 | Test reply message 1 |

  Scenario: Mark a forum post as unread and read
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Test discussion" in the app
    # Posts are auto-marked as read when the discussion loads, so "Mark unread" is shown.
    Then I should find "Unread" within "Test reply message 1" "ion-card" in the app

    When I press "Display options" within "Test reply message 1" "ion-card" in the app
    Then I should find "Mark read" in the app
    But I should not find "Mark unread" in the app

    When I press "Mark read" in the app
    Then I should not find "Unread" within "Test reply message 1" "ion-card" in the app

    When I press "Display options" within "Test reply message 1" "ion-card" in the app
    Then I should find "Mark unread" in the app
    But I should not find "Mark read" in the app

    When I press "Mark unread" in the app
    Then I should find "Unread" within "Test reply message 1" "ion-card" in the app

  Scenario: Display options are not shown when forum_usermarksread is disabled
    Given the following config values are set as admin:
      | forum_usermarksread | 0 |
    And I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Test discussion" in the app
    Then I should not find "Display options" within "Test reply message 1" "ion-card" in the app

  Scenario: Cannot mark as read/unread when offline
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Test discussion" in the app
    And I switch network connection to offline
    Then I should not find "Display options" within "Test reply message 1" "ion-card" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "My offline reply" in the app
    And I press "Post to forum" in the app
    Then I should find "Display options" within "My offline reply" "ion-card" in the app

    When I press "Display options" within "My offline reply" "ion-card" in the app
    Then I should not find "Mark read" in the app
    And I should not find "Mark unread" in the app
