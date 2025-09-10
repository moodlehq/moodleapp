@addon_mod_forum @app @mod @mod_forum @javascript
Feature: Activities overview for forum activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | trackforums |
      | s1       | Username  | 1        | 1           |
      | s2       | Username  | 2        | 0           |
      | s3       | Username  | 3        | 0           |
      | s4       | Username  | 4        | 0           |
      | t1       | Teacher   | T        | 1           |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And "4" "course enrolments" exist with the following data:
      | user   | s[count] |
      | course | C1       |
      | role   | student  |
    And the following "course enrolments" exist:
      | user | course | role           |
      | t1   | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name           | course | idnumber | duedate              | type     | forcesubscribe | trackingtype |
      | forum    | Due forum      | C1     | forum1   | ##1 Jan 2040 08:00## | qanda    | 0              | 0            |
      | forum    | No discussions | C1     | forum2   | ##tomorrow noon##    | eachuser | 2              | 0            |
      | forum    | Unread posts   | C1     | forum3   |                      | general  | 3              | 1            |
    And the following "mod_forum > discussions" exist:
      | user | forum       | name              | message                 |
      | t1   | forum3      | Test discussion 1 | Test post message one   |
      | s1   | forum3      | Test discussion 2 | Test post message two   |
      | s2   | forum3      | Test discussion 3 | Test post message three |
    And the following "mod_forum > posts" exist:
      | user | parentsubject     | subject                 | message                 |
      | s1   | Test discussion 1 | Reply 1 to discussion 1 | Discussion contents 1.1 |
      | s3   | Test discussion 1 | Reply 2 to discussion 1 | Discussion contents 1.2 |

  Scenario: Teachers can see relevant columns in the forum overview
    Given I entered the course "Course 1" as "t1" in the app
    When I press "Activities" in the app
    And I press "Forums" in the app
    And I press "Due forum" "ion-item" in the app
    Then I should find "Q and A forum" within "Forum type" "ion-item" in the app
    And I should find "0" within "Discussions" "ion-item" in the app
    And I should find "0" within "Posts" "ion-item" in the app
    But I should not find "Track" in the app
    And I should not find "Subscribed" in the app
    And I should not find "Digest type" in the app

    When I press "0" within "Posts" "ion-item" in the app
    Then the header should be "Due forum" in the app

    When I go back in the app
    And I press "No discussions" "ion-item" in the app
    Then I should find "Each person posts one discussion" within "Forum type" "ion-item" in the app
    And I should find "0" within "Discussions" "ion-item" in the app
    And I should find "0" within "Posts" "ion-item" in the app

    When I press "Unread posts" "ion-item" in the app
    Then I should find "Standard forum for general use" within "Forum type" "ion-item" in the app
    And I should find "3" within "Discussions" "ion-item" in the app
    And I should find "5" within "Posts" "ion-item" in the app
    And I should find "5" "ion-badge" within "Posts" "ion-item" in the app

  Scenario: Students can see relevant columns in the forum overview
    Given I entered the course "Course 1" as "s1" in the app
    When I press "Activities" in the app
    And I press "Forums" in the app
    And I press "Due forum" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "0" within "Discussions" "ion-item" in the app
    And I should find "0" within "Posts" "ion-item" in the app
    But I should not find "Forum type" in the app
    And I should not find "Track" in the app
    And I should not find "Subscribed" in the app
    And I should not find "Digest type" in the app

    When I press "0" within "Posts" "ion-item" in the app
    Then the header should be "Due forum" in the app

    When I go back in the app
    And I press "No discussions" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "0" within "Discussions" "ion-item" in the app
    And I should find "0" within "Posts" "ion-item" in the app

    When I press "Unread posts" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "3" within "Discussions" "ion-item" in the app
    And I should find "5" within "Posts" "ion-item" in the app
    And I should find "5" "ion-badge" within "Posts" "ion-item" in the app
