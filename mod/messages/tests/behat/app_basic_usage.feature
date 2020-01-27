@mod @mod_messages @app @javascript
Feature: Test basic usage of messages in app
  In order to participate with messages while using the mobile app
  As a student
  I need basic messages functionality to work

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
  

  @app @3.8.0 @mobile @OK
  Scenario: View recent conversations and contacts (mobile)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  Then I should see "No contacts"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  And I press "Conversation actions menu" in the app
  And I press "Add to contacts" in the app
  And I press "Add" in the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  And I press "Requests" in the app
  And I press "Teacher teacher" in the app
  And I press "Accept and add to contacts" in the app
  And I press the back button in the app
  And I press "Contacts" near "Requests" in the app
  Then the header should be "Contacts" in the app
  And I should see "Teacher teacher"
  And I press the back button in the app
  And I press "Teacher teacher" in the app
  Then the header should be "Teacher teacher" in the app
  And I should see "heeey student"

  @app @3.8.0 @tablet @OK
  Scenario: View recent conversations and contacts (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  Then I should see "No contacts"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  And I press "Information" in the app
  And I press "Add to contacts" in the app
  And I press "Add" in the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  And I press "Requests" in the app
  And I press "Teacher teacher" in the app
  And I press "Accept and add to contacts" in the app
  And I press "Contacts" near "Requests" in the app
  Then the header should be "Contacts" in the app
  And I should see "Teacher teacher"
  And I press the back button in the app
  And I press "Teacher teacher" in the app
  And I should see "heeey student"

  @app @3.8.0 @OK
  Scenario: Search users
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student2" in the app
  And I press "search" in the app
  Then I should see "Student2 student2"
  And I set the field "Search" to "Teacher" in the app
  And I press "search" in the app
  Then I should see "Teacher teacher"

  @app @3.8.0 @OK
  Scenario: Send/receive messages in existing conversations
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  Then I should see "No contacts"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  Then I should see "No contacts"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "teacher" in the app
  And I press "search" in the app
  And I press "Teacher teacher" in the app
  Then I should see "heeey student"
  And I set the field "New message" to "hi" in the app
  And I press "Send" in the app
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  Then I should see "No contacts"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  Then I should see "heeey student"
  And I should see "hi"
  And I set the field "New message" to "byee" in the app
  And I press "Send" in the app
  Then I should see "heeey student"
  And I should see "hi"
  And I should see "byee"