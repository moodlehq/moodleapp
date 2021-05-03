@mod @mod_forum @app @app_upto3.9.4 @javascript
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

  @app @3.8.0
  Scenario: Create new discussion
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should see "My happy subject"

    When I press "My happy subject" in the app
    Then I should see "An awesome message"

  @app_from3.7
  Scenario: Reply a post
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "DiscussionSubject" in the app
    Then I should see "Reply"

    When I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"

  @app @3.8.0
  Scenario: Star and pin discussions (student)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "starred subject" in the app
    And I set the field "Message" to "starred message" in the app
    And I press "Post to forum" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "normal subject" in the app
    And I set the field "Message" to "normal message" in the app
    And I press "Post to forum" in the app
    And I press "starred subject" in the app
    Then I should see "starred message"

    When I press the back button in the app
    And I press "Display options" near "starred subject" in the app
    And I press "Star this discussion" in the app
    And I press "starred subject" in the app
    Then I should see "starred message"

    When I press the back button in the app
    And I press "normal subject" in the app
    Then I should see "normal message"

    When I press the back button in the app
    And I press "Display options" near "starred subject" in the app
    And I press "Unstar this discussion" in the app
    And I press "starred subject" in the app
    Then I should see "starred message"

    When I press the back button in the app
    And I press "normal subject" in the app
    Then I should see "normal message"

  @app @3.8.0
  Scenario: Star and pin discussions (teacher)
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test star" in the app
    And I set the field "Message" to "Auto-test star message" in the app
    And I press "Post to forum" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test pin" in the app
    And I set the field "Message" to "Auto-test pin message" in the app
    And I press "Post to forum" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test plain" in the app
    And I set the field "Message" to "Auto-test plain message" in the app
    And I press "Post to forum" in the app
    And I press "Display options" near "Auto-test star" in the app
    And I press "Star this discussion" in the app
    And I press "Display options" near "Auto-test pin" in the app
    And I press "Pin this discussion" in the app
    Then I should see "Auto-test pin"
    And I should see "Auto-test star"
    And I should see "Auto-test plain"

    When I press "Display options" near "Auto-test pin" in the app
    And I press "Unpin this discussion" in the app
    And I press "Display options" near "Auto-test star" in the app
    And I press "Unstar this discussion" in the app
    Then I should see "Auto-test star"
    And I should see "Auto-test pin"

  @app_upto3.6.0
  Scenario: Star and pin discussions (teacher in 3.6)
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    Then I should see "Reply"

    When I press "Information" in the app
    Then I should not see "Star this discussion"
    And I should not see "Pin this discussion"

  @app @3.8.0
  Scenario: Edit a not sent reply offline
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    And I should see "Reply"

    When I press the back button in the app
    And I switch offline mode to "true"
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should see "Reply"

    When I press "Reply" in the app
    And I set the field "Write your reply..." to "not sent reply" in the app
    And I press "Post to forum" in the app
    And I press "Display options" near "not sent reply" in the app
    Then I should see "Edit"

    When I press "Edit" in the app
    And I set the field "Write your reply..." to "not sent reply edited" in the app
    And I press "Post to forum" in the app
    Then I should see "Not sent"
    And I should see "This Discussion has offline data to be synchronised"

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should not see "Not sent"
    And I should not see "This Discussion has offline data to be synchronised"

  @app @3.8.0
  Scenario: Edit a not sent new discussion offline
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I set the field "Message" to "Auto-test message edited" in the app
    And I press "Post to forum" in the app
    Then I should see "This Forum has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press "Auto-test" in the app
    Then I should see "Post to forum"

    When I press "Post to forum" in the app
    Then I should not see "This Forum has offline data to be synchronised."

    When I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    And I should see "Auto-test message edited"

  @app @3.8.0
  Scenario: Edit a forum post (only online)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    Then I should see "Auto-test"

    When I press the back button in the app
    And I press "Display options" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should see "Reply"

    When I press "Display options" near "Reply" in the app
    Then I should see "Edit"

    When I press "Edit" in the app
    And I switch offline mode to "true"
    And I set the field "Write your reply..." to "Auto-test message edited" in the app
    And I press "Save changes" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."

  @app @3.8.0
  Scenario: Delete a forum post (only online)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    Then I should see "Auto-test"

    When I press the back button in the app
    And I press "Display options" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" near "Sort by last post creation date in descending order" in the app
    Then I should see "Reply"

    When I press "Display options" near "Reply" in the app
    Then I should see "Delete"

    When I press "Delete" in the app
    And I press "Cancel" in the app
    And I switch offline mode to "true"
    And I press "Display options" near "Reply" in the app
    Then I should not see "Delete"

    When I switch offline mode to "false"
    And I press "Display options" near "Reply" in the app
    And I press "Delete" in the app
    And I press "Delete" in the app
    Then I should not see "Auto-test"

  @app @3.8.0
  Scenario: Add/view ratings
    Given I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    Then I should see "Reply"

    When I press "Reply" in the app
    And I set the field "Write your reply..." to "test2" in the app
    And I press "Post to forum" in the app
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    Then I should see "Reply"

    When I press "None" near "Auto-test message" in the app
    And I press "1" near "Cancel" in the app
    And I switch offline mode to "true"
    And I press "None" near "test2" in the app
    And I press "0" near "Cancel" in the app
    Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
    And I should see "Average of ratings: -"
    And I should see "Average of ratings: 1"

    When I switch offline mode to "false"
    And I press the back button in the app
    Then I should see "This Forum has offline data to be synchronised."

    When I press "Display options" near "Test forum name" in the app
    And I press "Synchronise now" in the app
    Then I should not see "This Forum has offline data to be synchronised."

    When I press "Auto-test" in the app
    Then I should see "Average of ratings: 1"
    And I should see "Average of ratings: 0"
    But I should not see "Average of ratings: -"

    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    Then I should see "Average of ratings: 1"
    And I should see "Average of ratings: 0"
    But I should not see "Average of ratings: -"

  @app @3.8.0
  Scenario: Reply a post offline
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press the back button in the app
    And I press "Display options" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" in the app
    And I switch offline mode to "true"
    Then I should see "Reply"

    When I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    And I should see "Not sent"

    When I press the back button in the app
    And I switch offline mode to "false"
    And I press "DiscussionSubject" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    But I should not see "Not sent"

  @app @3.8.0
  Scenario: New discussion offline & Sync Forum
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I should see "Not sent"
    And I should see "This Forum has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Display options" near "Test forum name" in the app
    And I press "Refresh discussions" in the app
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    But I should not see "Not sent"
    And I should not see "This Forum has offline data to be synchronised."

  @app @3.8.0
  Scenario: New discussion offline & Auto-sync forum
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I switch offline mode to "true"
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I should see "Not sent"
    And I should see "This Forum has offline data to be synchronised."

    When I switch offline mode to "false"
    And I run cron tasks in the app
    And I wait loading to finish in the app
    Then I should not see "Not sent"

    When I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    But I should not see "Not sent"
    And I should not see "This Forum has offline data to be synchronised."

  @app @3.8.0
  Scenario: Prefetch
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 1" in the app
    And I set the field "Message" to "DiscussionMessage 1" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject 1"

    When I press the back button in the app
    And I press "Display options" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 2" in the app
    And I set the field "Message" to "DiscussionMessage 2" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject 1"
    And I should see "DiscussionSubject 2"

    When I press the back button in the app
    And I switch offline mode to "true"
    And I press "Test forum name" in the app
    And I press "DiscussionSubject 2" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."

    When I press "OK" in the app
    And I press the back button in the app
    And I press "DiscussionSubject 1" in the app
    Then I should see "DiscussionSubject 1"
    And I should see "DiscussionMessage 1"
    But I should not see "There was a problem connecting to the site. Please check your connection and try again."
