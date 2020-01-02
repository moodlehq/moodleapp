@mod @mod_forum @app @javascript
Feature: Test basic usage in app
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
      | activity   | name            | intro       | course | idnumber | groupmode | assessed | scale[modgrade_type] |
      | forum      | Test forum name | Test forum  | C1     | forum    | 0         | 5        | Point                |

  Scenario: Student starts a discussion
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should see "My happy subject"
    And I should see "An awesome message"

  @app_upto3.6.1
  Scenario: Student posts a reply
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "DiscussionSubject" in the app
    And I press "Reply" in the app
    And I set the field "Message" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"

  @app_from3.7
  Scenario: Student posts a reply
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "DiscussionSubject" in the app
    And I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"

  Scenario: Test that 'open in browser' works for forum
    When I enter the app
    And I change viewport size to "360x640"
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press the page menu button in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "Test forum name"
    And I should see "Add a new discussion topic"
    And I close the browser tab opened by the app
    And I press the back button in the app

  @app @3.8.0
  Scenario: Student star a discussion
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test star" in the app
    And I set the field "Message" to "Auto-test star message" in the app
    And I press "Post to forum" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test star" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Star this discussion" in the app
    And I press "arrow back" in the app
    And I should see "Auto-test star"
    And I should see "Auto-test"
    And I pause 
    And I press "Auto-test star" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Unstar this discussion" in the app
    And I press "arrow back" in the app
    Then I should see "Auto-test star"
    And I should see "Auto-test"
    And I pause


    @app @3.8.0
    Scenario: Teacher star and pin a discussion
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test star" in the app
    And I set the field "Message" to "Auto-test star message" in the app
    And I press "Post to forum" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test pin" in the app
    And I set the field "Message" to "Auto-test pin message" in the app
    And I press "Post to forum" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test star" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Star this discussion" in the app
    And I press "arrow back" in the app
    And I press "Auto-test pin" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Pin this discussion" in the app
    And I press "arrow back" in the app
    And I should see "Auto-test pin"
    And I should see "Auto-test star"
    And I should see "Auto-test"
    And I pause
    And I press "Auto-test pin" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Unpin this discussion" in the app
    And I press "arrow back" in the app
    And I press "Auto-test star" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    And I press "Unstar this discussion" in the app
    And I press "arrow back" in the app
    Then I should see "Auto-test star"
    And I should see "Auto-test pin"
    And I pause

    @app @3.6 @OK
    Scenario: Teacher checks pin and star in 3.6
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I wait "1" seconds
    And I press "Information" in the app
    Then I should not see "Star this discussion"
    And I should not see "Pin this discussion"


    @app @3.8.0
    Scenario: Edit a forum post (only online)
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    Then I should see "Auto-test"
    And I press "arrow back" in the app
    And I press "Information" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    And I wait "2" seconds
    And I pause
    And I press "" in the app
    And I should see "Edit"
    And I pause
    And I switch offline mode to "true"
    And I pause

    @app @3.8.0
    Scenario: Add/view ratings
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "close" in the app
    And I set the field "Subject" to "Auto-test" in the app
    And I set the field "Message" to "Auto-test message" in the app
    And I press "Post to forum" in the app
    And I press "Auto-test" in the app
    And I press "Reply" in the app
    And I set the field "Write your reply..." to "test" in the app
    And I press "Post to forum" in the app
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Auto-test" in the app
    And I pause

  @app @3.8.0 @mobile @OK
  Scenario: Student replies a post offline mobile
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "arrow back" in the app
    And I press "Information" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" in the app
    And I switch offline mode to "true"
    And I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    And I should see "Not sent"
    And I press "arrow back" in the app
    And I switch offline mode to "false"
    And I press "DiscussionSubject" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    And I should not see "Not sent"

    @app @3.8.0 @tablet @OK
  Scenario: Student replies a post offline tablet 
    When I enter the app
    And I change viewport size to "1280x1080"
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    And I press "arrow back" in the app
    And I press "Information" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    And I switch offline mode to "true"
    And I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    And I should see "Not sent"
    And I press "arrow back" in the app
    And I switch offline mode to "false"
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should see "DiscussionMessage"
    And I should see "ReplyMessage"
    And I should not see "Not sent"

    @app @3.8.0 @OK
    Scenario: Student creates a new discussion offline and sync forum
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
    And I switch offline mode to "false"
    And I press "arrow back" in the app
    And I press "Test forum name" in the app
    And I press "Information" in the app
    And I press "Refresh discussions" in the app
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    And I should not see "Not sent"

    @app @3.8.0 @OK
    Scenario: Student creates a new discussion offline and auto-sync forum
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
    And I switch offline mode to "false"
    And I wait "600" seconds
    And I should not see "Not sent"
    And I press "DiscussionSubject" near "Sort by last post creation date in descending order" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    And I should not see "Not sent"

    @app @3.8.0 @mobile @OK
    Scenario: Prefetch mobile
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I press "arrow back" in the app
    And I press "Information" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 2" in the app
    And I set the field "Message" to "DiscussionMessage 2" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionSubject 2"
    And I press "arrow back" in the app
    And I switch offline mode to "true"
    And I press "Test forum name" in the app
    And I press "DiscussionSubject 2" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."
    And I press "OK" in the app
    And I press "arrow back" in the app
    And I press "DiscussionSubject" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    And I should not see "There was a problem connecting to the site. Please check your connection and try again."


    @app @3.8.0 @tablet @OK
    Scenario: Prefetch tablet
    When I enter the app
    And I change viewport size to "1280x1080"
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I press "arrow back" in the app
    And I press "Information" in the app
    And I press "Show download options" in the app
    And I press "cloud download" near "Test forum name" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject 2" in the app
    And I set the field "Message" to "DiscussionMessage 2" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionSubject 2"
    And I press "arrow back" in the app
    And I switch offline mode to "true"
    And I press "refresh" near "Test forum name" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."
    And I press "OK" in the app
    And I press "Test forum name" in the app
    And I press "DiscussionSubject" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionMessage"
    And I press "arrow back" in the app
    And I switch offline mode to "false"
    And I press "refresh" near "Test forum name" in the app
    Then I should not see "There was a problem connecting to the site. Please check your connection and try again."

    @app @3.8.0
    Scenario: Student sorts a forum discussion
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Course overview" in the app
    And I press "Test forum name" in the app
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject" in the app
    And I set the field "Message" to "DiscussionMessage" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I press "Add a new discussion topic" in the app
    And I set the field "Subject" to "DiscussionSubject more replies" in the app
    And I set the field "Message" to "DiscussionMessage more replies" in the app
    And I press "Post to forum" in the app
    Then I should see "DiscussionSubject"
    And I should see "DiscussionSubject more replies"
    And I press "DiscussionSubject more replies" in the app
    And I press "Reply" in the app
    And I set the field "Write your reply" to "ReplyMessage" in the app
    And I press "Post to forum" in the app
    And I pause