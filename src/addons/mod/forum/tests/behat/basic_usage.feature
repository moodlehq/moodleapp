@mod @mod_forum @app @javascript
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

  Scenario: Create new discussion
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "My happy subject" in the app

    When I press "My happy subject" in the app
    Then I should find "An awesome message" in the app

  Scenario: Reply a post
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "DiscussionSubject" in the app
    Then I should find "Reply" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionMessage" in the app
    And I should find "ReplyMessage" in the app

  Scenario: Star and pin discussions (student)
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "starred subject" in the app
    And I set the field "Message" to "starred message" in the app
    And I press "Post to forum" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "normal subject" in the app
    And I set the field "Message" to "normal message" in the app
    And I press "Post to forum" in the app
    And I press "starred subject" in the app
    Then I should find "starred message" in the app

    When I press the back button in the app
    And I press "Display options" near "starred subject" in the app
    And I press "Star this discussion" in the app
    And I press "starred subject" in the app
    Then I should find "starred message" in the app

    When I press the back button in the app
    And I press "normal subject" in the app
    Then I should find "normal message" in the app

    When I press the back button in the app
    And I press "Display options" near "starred subject" in the app
    And I press "Unstar this discussion" in the app
    And I press "starred subject" in the app
    Then I should find "starred message" in the app

    When I press the back button in the app
    And I press "normal subject" in the app
    Then I should find "normal message" in the app

  Scenario: Star and pin discussions (teacher)
    When I enter the course "Course 1" as "teacher1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test star" in the app
    And I set the field "Message" to "Auto-test star message" in the app
    And I press "Post to forum" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test pin" in the app
    And I set the field "Message" to "Auto-test pin message" in the app
    And I press "Post to forum" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test plain" in the app
    And I set the field "Message" to "Auto-test plain message" in the app
    And I press "Post to forum" in the app
    And I press "Display options" near "Auto-test star" in the app
    And I press "Star this discussion" in the app
    And I press "Display options" near "Auto-test pin" in the app
    And I press "Pin this discussion" in the app
    Then I should find "Auto-test pin" in the app
    And I should find "Auto-test star" in the app
    And I should find "Auto-test plain" in the app

    When I press "Display options" near "Auto-test pin" in the app
    And I press "Unpin this discussion" in the app
    And I press "Display options" near "Auto-test star" in the app
    And I press "Unstar this discussion" in the app
    Then I should find "Auto-test star" in the app
    And I should find "Auto-test pin" in the app

  Scenario: Edit a not sent reply offline
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    And I should find "Reply" in the app

    When I press the back button in the app
    And I switch offline mode to "true"
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should find "Reply" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "not sent reply" in the app
    And I press "Post to forum" in the app
    And I press "Display options" within "not sent reply" "ion-card" in the app
    Then I should find "Edit" in the app

    When I press "Edit" in the app
    And I set the field "Message" to "not sent reply edited" in the app
    And I press "Save changes" in the app
    Then I should find "Not sent" in the app
    And I should find "This Discussion has offline data to be synchronised" in the app

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should not find "Not sent" in the app
    And I should not find "This Discussion has offline data to be synchronised" in the app

  Scenario: Edit a not sent new discussion offline
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Post to forum" in the app
    Then I should find "This Forum has offline data to be synchronised." in the app

    When I switch offline mode to "false"
    And I press "Auto-test" in the app
    Then I should find "Post to forum" in the app

    When I press "Post to forum" in the app
    Then I should not find "This Forum has offline data to be synchronised." in the app

    When I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    And I should find "Auto-test message edited" in the app

  Scenario: Edit a forum post (only online)
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    Then I should find "Auto-test" in the app

    When I press the back button in the app
    And I press "Course downloads" in the app
    And I press "Download" within "Test forum name" "ion-item" in the app
    And I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should find "Reply" in the app

    When I press "Display options" near "Reply" in the app
    Then I should find "Edit" in the app

    When I press "Edit" in the app
    And I switch offline mode to "true"
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Save changes" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

  Scenario: Delete a forum post (only online)
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    Then I should find "Auto-test" in the app

    When I press the back button in the app
    And I press "Course downloads" in the app
    And I press "Download" within "Test forum name" "ion-item" in the app
    And I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should find "Reply" in the app

    When I press "Display options" near "Reply" in the app
    Then I should find "Delete" in the app

    When I press "Delete" in the app
    And I press "Cancel" in the app
    And I switch offline mode to "true"
    And I press "Display options" near "Reply" in the app
    Then I should not find "Delete" in the app

    When I close the popup in the app
    And I switch offline mode to "false"
    And I press "Display options" near "Reply" in the app
    And I press "Delete" in the app
    And I press "Delete" in the app
    Then I should not find "Auto-test" in the app

  Scenario: Add/view ratings
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    Then I should find "Reply" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "test2" in the app
    And I press "Post to forum" in the app
    Then I should find "test2" "ion-card" in the app

    When I enter the course "Course 1" as "teacher1" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    Then I should find "Reply" in the app

    When I press "None" near "Auto-test message" in the app
    And I press "1" near "Cancel" in the app
    And I switch offline mode to "true"
    And I press "None" near "test2" in the app
    And I press "0" near "Cancel" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." inside the toast in the app
    And I should find "Average of ratings: -" in the app
    And I should find "Average of ratings: 1" in the app

    When I switch offline mode to "false"
    And I press the back button in the app
    Then I should find "This Forum has offline data to be synchronised." in the app

    When I press "Information" in the app
    And I press "Synchronise now" in the app
    Then I should not find "This Forum has offline data to be synchronised." in the app

    When I press "Auto-test" in the app
    Then I should find "Average of ratings: 1" in the app
    And I should find "Average of ratings: 0" in the app
    But I should not find "Average of ratings: -" in the app

    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    Then I should find "Average of ratings: 1" in the app
    And I should find "Average of ratings: 0" in the app
    But I should not find "Average of ratings: -" in the app

  Scenario: Reply a post offline
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press the back button in the app
    And I press "Course downloads" in the app
    And I press "Download" within "Test forum name" "ion-item" in the app
    And I press the back button in the app
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" in the app
    And I switch offline mode to "true"
    Then I should find "Reply" in the app

    When I press "Reply" in the app
    And I set the field "Message" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionMessage" in the app
    And I should find "ReplyMessage" in the app
    And I should find "Not sent" in the app

    When I press the back button in the app
    And I switch offline mode to "false"
    And I press "DiscussionSubject" in the app
    Then I should find "DiscussionMessage" in the app
    And I should find "ReplyMessage" in the app
    But I should not find "Not sent" in the app

  Scenario: New discussion offline & Sync Forum
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "Not sent" in the app
    And I should find "This Forum has offline data to be synchronised." in the app

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "DiscussionMessage" in the app
    But I should not find "Not sent" in the app
    And I should not find "This Forum has offline data to be synchronised." in the app

  Scenario: New discussion offline & Auto-sync forum
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "Not sent" in the app
    And I should find "This Forum has offline data to be synchronised." in the app

    When I switch offline mode to "false"
    And I run cron tasks in the app
    And I wait loading to finish in the app
    Then I should not find "Not sent" in the app

    When I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should find "DiscussionSubject" in the app
    And I should find "DiscussionMessage" in the app
    But I should not find "Not sent" in the app
    And I should not find "This Forum has offline data to be synchronised." in the app

  Scenario: Prefetch
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 1" in the app
    And I set the field "Message" to "DiscussionMessage 1" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject 1" in the app

    When I press the back button in the app
    And I press "Course downloads" in the app
    And I press "Download" within "Test forum name" "ion-item" in the app
    Then I should find "Downloaded" within "Test forum name" "ion-item" in the app
    And I press the back button in the app

    When I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 2" in the app
    And I set the field "Message" to "DiscussionMessage 2" in the app
    And I press "Post to forum" in the app
    Then I should find "DiscussionSubject 1" in the app
    And I should find "DiscussionSubject 2" in the app

    When I press the back button in the app
    And I switch offline mode to "true"
    And I press "Test forum name" in the app
    And I press "DiscussionSubject 2" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I press "OK" in the app
    And I press the back button in the app
    And I press "DiscussionSubject 1" in the app
    Then I should find "DiscussionSubject 1" in the app
    And I should find "DiscussionMessage 1" in the app
    But I should not find "There was a problem connecting to the site. Please check your connection and try again." in the app
