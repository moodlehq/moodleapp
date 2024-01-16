@core @core_message @app @javascript
Feature: Test basic usage of messages in app
  In order to participate with messages while using the mobile app
  As a student
  I need basic message functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname  | lastname  | email                |
      | teacher1 | Teacher    | teacher   | teacher1@example.com |
      | student1 | Student1   | student1  | student1@example.com |
      | student2 | Student2   | student2  | student2@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
      | student2 | C1 | student |

  Scenario: View recent conversations and contacts
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    Then I should find "No contacts" in the app

    When I press "Search people and messages" in the app
    And I set the field "Search" to "student" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "heeey student" in the app
    And I press "Send" in the app
    And I press "Display options" in the app
    And I press "Add to contacts" in the app
    And I press "Add" near "Are you sure you want to add Student1 student1 to your contacts?" in the app
    Then I should find "Contact request sent" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I replace "/.*/" within ".addon-message-last-message-date" with "[Date]"
    Then I should find "Contacts" in the app
    And the UI should match the snapshot

    When I press "Contacts" in the app
    And I press "Requests" in the app
    And I press "Teacher teacher" in the app
    And I press "Accept and add to contacts" in the app
    Then I should not find "Teacher teacher would like to contact you" in the app

    When I replace "/.*/" within ".addon-messages-date" with "[Day]"
    And I replace "/.*/" within ".message-time" with "[Date]"
    Then the UI should match the snapshot

    When I press the back button in the app
    And I press "Contacts" near "No contact requests" in the app
    Then the header should be "Contacts" in the app
    And I should find "Teacher teacher" in the app

    When I press the back button in the app
    And I press "Teacher teacher" in the app
    Then the header should be "Teacher teacher" in the app
    And I should find "heeey student" in the app

  Scenario: Search users
    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student2" in the app
    And I press "Search" "button" in the app
    Then I should find "Student2 student2" in the app

    When I set the field "Search" to "Teacher" in the app
    And I press "Search" "button" in the app
    Then I should find "Teacher teacher" in the app

  Scenario: Send/receive messages in existing conversations
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "heeey student" in the app
    And I press "Send" in the app
    Then I should find "heeey student" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "teacher" in the app
    And I press "Search" "button" in the app
    And I press "Teacher teacher" in the app
    Then I should find "heeey student" in the app

    When I set the field "New message" to "hi" in the app
    And I press "Send" in the app
    Then I should find "hi" in the app

    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    Then I should find "heeey student" in the app
    And I should find "hi" in the app

    When I set the field "New message" to "byee" in the app
    And I press "Send" in the app
    Then I should find "heeey student" in the app
    And I should find "hi" in the app
    And I should find "byee" in the app

  Scenario: User profile: send message, add/remove contact
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "heeey student" in the app
    And I press "Send" in the app
    Then I should find "heeey student" in the app

    When I press "Display options" in the app
    And I press "Add to contacts" in the app
    And I press "Add" in the app
    Then I should find "Contact request sent" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Requests" in the app
    And I press "Teacher teacher" in the app
    Then I should find "Teacher teacher would like to contact you" in the app

    When I press "Accept and add to contacts" in the app
    Then I should not find "Teacher teacher would like to contact you" in the app

    When I press "Display options" in the app
    And I press "User info" in the app
    And I press "Message" in the app
    And I set the field "New message" to "hi" in the app
    And I press "Send" "button" in the app
    Then I should find "heeey student" in the app
    And I should find "hi" in the app

    When I press "Display options" in the app
    And I press "Remove from contacts" in the app
    And I press "Remove" in the app
    And I wait loading to finish in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press "Display options" in the app
    Then I should find "Add to contacts" in the app

    When I press "Delete conversation" in the app
    And I press "Delete" near "Are you sure you would like to delete this entire conversation?" in the app
    Then I should not find "heeey student" in the app
    And I should not find "hi" in the app

  Scenario: Send message offline
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I switch network connection to offline
    And I set the field "New message" to "heeey student" in the app
    And I press "Send" in the app
    Then I should find "heeey student" in the app

    When I set the field "New message" to "byee" in the app
    And I press "Send" in the app
    Then I should find "byee" in the app

    When I switch network connection to wifi
    And I press the back button in the app
    And I press "Student1 student1" in the app
    Then I should find "heeey student" in the app
    And I should find "byee" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Teacher teacher" in the app
    Then I should find "heeey student" in the app
    And I should find "byee" in the app

  Scenario: Auto-sync messages
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Contacts" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I switch network connection to offline
    And I set the field "New message" to "heeey student" in the app
    And I press "Send" in the app
    And I set the field "New message" to "byee" in the app
    And I press "Send" in the app
    Then I should find "byee" in the app

    When I switch network connection to wifi
    And I run cron tasks in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Teacher teacher" in the app
    Then I should find "heeey student" in the app
    And I should find "byee" in the app

  Scenario: Search for messages
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "test message" in the app
    And I press "Send" in the app
    Then I should find "test message" in the app

    When I set the field "New message" to "search this message" in the app
    And I press "Send" in the app
    Then I should find "search this message" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "search this message" in the app
    And I press "Search" "button" in the app
    Then I should find "Messages" in the app
    And I should find "search this message" in the app

    When I press "search this message" near "Teacher teacher" in the app
    Then I should find "test message" in the app
    And I should find "search this message" in the app

  Scenario: Star/Unstar
    Given I entered the app as "teacher1"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "star message" in the app
    And I press "Send" in the app
    Then I should find "star message" in the app

    Given I entered the app as "student2"
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "test message student2" in the app
    And I press "Send" in the app
    Then I should find "test message student2" in the app

    Given I entered the app as "student1"
    When I press "Messages" in the app
    Then I should find "Private (2)" in the app
    And I should find "Starred (1)" in the app

    When I press "star message" in the app
    And I press "Display options" in the app
    And I press "Star conversation" in the app
    And I press the back button in the app
    Then I should find "Private (1)" in the app
    And I should find "Starred (2)" in the app

    When I press "Starred (2)" in the app
    Then I should find "Teacher teacher" in the app
    And I should find "Student1 student1" in the app

  Scenario: User blocking feature
    Given I entered the course "Course 1" as "student2" in the app
    When I press "Participants" in the app
    And I press "Student1 student1" in the app
    And I press "Message" in the app
    And I press "Display options" in the app
    And I press "Block user" in the app
    And I press "Block user" near "Are you sure you want to block Student1 student1?" in the app
    Then I should find "You have blocked this user" in the app

    Given I entered the course "Course 1" as "student1" in the app
    When I press "Participants" in the app
    And I press "Student2 student2" in the app
    And I press "Message" in the app
    Then I should find "You are unable to message this user" in the app

    Given I entered the course "Course 1" as "student2" in the app
    When I press "Participants" in the app
    And I press "Student1 student1" in the app
    And I press "Message" in the app
    And I press "Display options" in the app
    Then I should find "Unblock user" in the app
    But I should not find "Block user" in the app

    When I press "Unblock user" in the app
    And I press "Unblock user" near "Are you sure you want to unblock Student1 student1?" in the app
    Then I should not find "You have blocked this user" in the app

    Given I entered the course "Course 1" as "student1" in the app
    When I press "Participants" in the app
    And I press "Student2 student2" in the app
    And I press "Message" in the app
    And I set the field "New message" to "test message" in the app
    And I press "Send" in the app
    Then I should find "test message" in the app
    But I should not find "You are unable to message this user" in the app

  Scenario: Mute Unmute conversations
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Participants" in the app
    And I press "Student2 student2" in the app
    And I press "Message" in the app
    And I set the field "New message" to "test message" in the app
    And I press "Send" in the app
    Then I should find "test message" in the app

    When I press "Display options" in the app
    And I press "Mute" in the app
    Then I should find "Muted conversation" in the app

    When I press "Display options" in the app
    And I press "Unmute" in the app
    Then I should not find "Muted conversation" in the app

    When I press "Display options" in the app
    When I press "Mute" in the app
    Then I should find "Muted conversation" in the app

    When I press "Messages" in the app
    And I press "Private (1)" in the app
    And I press "Student2 student2" in the app
    Then I should find "test message" in the app
    And I should find "Muted conversation" in the app

  Scenario: Self conversations
    Given I entered the app as "student1"
    When I press "Messages" in the app
    Then I should find "Starred (1)" in the app

    When I press "Student1 student1" in the app
    And I set the field "New message" to "self conversation online" in the app
    And I press "Send" in the app
    Then I should find "self conversation online" in the app

    When I switch network connection to offline
    And I set the field "New message" to "self conversation offline" in the app
    And I press "Send" in the app
    Then I should find "self conversation offline" in the app

    When I switch network connection to wifi
    And I press the back button in the app
    And I press "Student1 student1" in the app
    And I press "Display options" in the app
    Then I should find "Show delete messages" in the app
    And I should find "Delete conversation" in the app

    When I press "Unstar conversation" in the app
    And I press "Display options" in the app
    Then I should find "Star conversation" in the app
    And I should find "Delete conversation" in the app

    When I press "Show delete messages" in the app
    And I close the popup in the app
    Then I should find "self conversation online" in the app
    And I should find "self conversation offline" in the app

    When I press "Delete message" near "self conversation offline" in the app
    And I press "OK" in the app
    Then I should find "self conversation online" in the app
    But I should not find "self conversation offline" in the app

    When I press "Display options" in the app
    And I press "Delete conversation" in the app
    And I press "Delete" near "Are you sure you would like to delete this entire personal conversation?" in the app
    Then I should not find "self conversation online" in the app
    And I should not find "self conversation offline" in the app

    When I press the back button in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "Student1 student1" in the app
    And I press "Search" "button" in the app
    And I press "Student1 student1" in the app
    And I set the field "New message" to "auto search test" in the app
    And I press "Send" in the app
    Then I should find "auto search test" in the app

    When I press the back button in the app
    And I press the back button in the app
    And I press "Private" in the app
    And I press "Student1 student1" in the app
    Then I should find "auto search test" in the app
