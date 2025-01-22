@addon_mod_forum @app @mod @mod_forum @javascript
Feature: Test basic usage of forum activity in app
  In order to participate in the forum while using the mobile app
  As a student
  I need basic forum functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | student2 |
      | teacher1 |
      | teacher2 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
      | teacher1 | C1     | editingteacher |
      | teacher2 | C1     | editingteacher |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode | assessed | scale |
      | forum      | Test forum name | Test forum  | C1     | forum    | 0         | 1        | 1     |
    And the following "mod_forum > discussions" exist:
      | forum  | name               | subject            | message                    |
      | forum  | Initial discussion | Initial discussion | Initial discussion message |

  Scenario: Create new discussion
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | My happy subject |
      | Message | An awesome message |
    And I press "Post to forum" in the app
    Then I should find "My happy subject" in the app

    When I press "My happy subject" in the app
    Then I should find "An awesome message" in the app

  Scenario: New discussion automatically opened in tablet
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    When I press "Add discussion topic" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "My happy subject" in the app
    And I should find "An awesome message" inside the split-view content in the app

  Scenario: Reply a post
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I replace "/.*/" within ".addon-mod-forum-discussion-author p" with "[Publication date]"
    And I replace "/\d+ seconds ago/" within ".addon-mod-forum-discussion-more-info ion-note" with "[seconds] seconds ago"
    Then the UI should match the snapshot

    When I press "Initial discussion" in the app
    And I press "Reply" in the app
    And I scroll to "Post to forum" in the app
    And I replace "/.*/" within ".addon-mod-forum-post-author p:last-child" with "[Publication date]"
    Then the UI should match the snapshot

    When I set the field "Message" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "Initial discussion message" in the app
    And I should find "ReplyMessage" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                             | activity | activityname    | course   |
      | \mod_forum\event\course_module_viewed            | forum    | Test forum name | Course 1 |
      | \mod_forum\event\assessable_uploaded             | forum    | Test forum name | Course 1 |
      | \mod_forum\event\post_created                    | forum    | Test forum name | Course 1 |
      | \mod_forum\event\discussion_subscription_created | forum    | Test forum name | Course 1 |

  Scenario: Star and pin discussions (student)
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Display options" near "Initial discussion" in the app
    And I press "Star this discussion" in the app
    Then I should find "Your star option has been updated." in the app

    When I press "Display options" near "Initial discussion" in the app
    And I press "Unstar this discussion" in the app
    Then I should find "Your star option has been updated." in the app

    When I press "Display options" near "Initial discussion" in the app
    Then I should not find "Pin this discussion" in the app

  Scenario: Star and pin discussions (teacher)
    Given I entered the forum activity "Test forum name" on course "Course 1" as "teacher1" in the app
    When I press "Display options" near "Initial discussion" in the app
    And I press "Star this discussion" in the app
    Then I should find "Your star option has been updated." in the app

    When I press "Display options" near "Initial discussion" in the app
    And I press "Pin this discussion" in the app
    Then I should find "The pin option has been updated." in the app

    When I press "Display options" near "Initial discussion" in the app
    And I press "Unstar this discussion" in the app
    Then I should find "Your star option has been updated." in the app

    When I press "Display options" near "Initial discussion" in the app
    And I press "Unpin this discussion" in the app
    Then I should find "The pin option has been updated." in the app

  Scenario: Edit a not sent reply offline
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Initial discussion" in the app
    Then I should find "Reply" in the app

    When I go back in the app
    And I switch network connection to offline
    And I press "Initial discussion" in the app
    And I press "Reply" in the app
    And I set the field "Message" to "not sent reply" in the app
    And I press "Post to forum" in the app
    And I press "Display options" within "not sent reply" "ion-card" in the app
    Then I should find "Edit" in the app

    When I press "Edit" in the app
    And I set the field "Message" to "not sent reply edited" in the app
    And I press "Save changes" in the app
    Then I should find "Not sent" in the app
    And I should find "This Discussion has offline data to be synchronised" in the app

    When I switch network connection to wifi
    And I go back in the app
    And I press "Initial discussion" in the app
    Then I should not find "Not sent" in the app
    And I should not find "This Discussion has offline data to be synchronised" in the app

  Scenario: Edit a not sent new discussion offline
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I switch network connection to offline
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Auto-test |
      | Message | Auto-test message |
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Post to forum" in the app
    Then I should find "This Forum has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I press "Auto-test" in the app
    Then I should find "Post to forum" in the app

    When I press "Post to forum" in the app
    Then I should not find "This Forum has offline data to be synchronised." in the app

    When I press "Auto-test" in the app
    And I should find "Auto-test message edited" in the app

  Scenario: Edit a forum post (only online)
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Auto-test |
      | Message | Auto-test message |
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I press "Display options" near "Reply" in the app
    Then I should find "Edit" in the app

    When I press "Edit" in the app
    And I switch network connection to offline
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Save changes" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I press "OK" in the app
    And I press "Cancel" in the app
    And I press "OK" in the app
    And I press "Display options" near "Reply" in the app
    And I press "Edit" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I switch network connection to wifi
    And I press "OK" in the app
    And I press "Edit" in the app
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Save changes" in the app
    Then I should find "Auto-test message edited" in the app

  Scenario: Delete a forum post (only online)
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Auto-test |
      | Message | Auto-test message |
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I press "Display options" near "Reply" in the app
    Then I should find "Delete" in the app

    When I press "Delete" in the app
    And I press "Cancel" in the app
    And I switch network connection to offline
    And I press "Display options" near "Reply" in the app
    Then I should find "Delete" in the app

    When I press "Delete" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I press "OK" in the app
    And I close the popup in the app
    And I switch network connection to wifi
    And I press "Display options" near "Reply" in the app
    And I press "Delete" in the app
    And I press "Delete" in the app
    Then I should not find "Auto-test" in the app

  Scenario: Add/view ratings
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Auto-test |
      | Message | Auto-test message |
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I press "Reply" in the app
    And I set the field "Message" to "test2" in the app
    And I press "Post to forum" in the app
    Then I should find "test2" "ion-card" in the app

    Given I entered the forum activity "Test forum name" on course "Course 1" as "teacher1" in the app
    When I press "Auto-test" in the app
    And I press "None" near "Auto-test message" in the app
    And I press "1" near "Cancel" in the app
    And I switch network connection to offline
    And I press "None" near "test2" in the app
    And I press "0" near "Cancel" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "Average of ratings: -" in the app
    And I should find "Average of ratings: 1" in the app

    When I switch network connection to wifi
    And I go back in the app
    Then I should find "This Forum has offline data to be synchronised." in the app

    When I press "Information" in the app
    And I press "Synchronise now" in the app
    Then I should not find "This Forum has offline data to be synchronised." in the app

    When I press "Auto-test" in the app
    Then I should find "Average of ratings: 1" in the app
    And I should find "Average of ratings: 0" in the app
    But I should not find "Average of ratings: -" in the app

    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Auto-test" in the app
    Then I should find "Average of ratings: 1" in the app
    And I should find "Average of ratings: 0" in the app
    But I should not find "Average of ratings: -" in the app

  Scenario: Reply a post offline
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I press "Initial discussion" in the app
    And I switch network connection to offline
    Then I should find "Reply" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "Initial discussion message" in the app
    And I should find "ReplyMessage" in the app
    And I should find "Not sent" in the app

    When I go back in the app
    And I switch network connection to wifi
    And I press "Initial discussion" in the app
    Then I should find "Initial discussion message" in the app
    And I should find "ReplyMessage" in the app
    But I should not find "Not sent" in the app

  Scenario: New discussion offline & Sync Forum
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    When I switch network connection to offline
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | DiscussionSubject |
      | Message | DiscussionMessage |
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "Not sent" in the app
    And I should find "This Forum has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I go back in the app
    And I press "Test forum name" in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    And I press "DiscussionSubject" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "DiscussionMessage" in the app
    But I should not find "Not sent" in the app
    And I should not find "This Forum has offline data to be synchronised." in the app

  Scenario: New discussion offline & Auto-sync forum
    Given I entered the forum activity "Test forum name" on course "Course 1" as "student1" in the app
    When I switch network connection to offline
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | DiscussionSubject |
      | Message | DiscussionMessage |
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "Not sent" in the app
    And I should find "This Forum has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I run cron tasks in the app
    And I wait loading to finish in the app
    Then I should not find "Not sent" in the app

    When I press "DiscussionSubject" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "DiscussionMessage" in the app
    But I should not find "Not sent" in the app
    And I should not find "This Forum has offline data to be synchronised." in the app

  Scenario: Prefetch
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Course downloads" in the app
    And I press "Download" within "Test forum name" "ion-item" in the app
    Then I should find "Downloaded" within "Test forum name" "ion-item" in the app

    When I go back in the app
    And I switch network connection to offline
    And I press "Test forum name" in the app
    Then I should find "Initial discussion" in the app

    When I press "Initial discussion" in the app
    Then I should find "Initial discussion" in the app
    And I should find "Initial discussion message" in the app

    When I go back in the app
    And I press "Add discussion topic" in the app
    Then I should not find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I go back in the app
    And I press "Sort by last post creation date in descending order" in the app
    And I press "Sort by last post creation date in ascending order" in the app
    Then I should find "Forum not available in this sorting order" in the app

    When I go back in the app
    And I press "Test forum name" in the app
    Then I should find "Forum not available in this sorting order" in the app
    And I should find "Sort by last post creation date in ascending order" in the app
