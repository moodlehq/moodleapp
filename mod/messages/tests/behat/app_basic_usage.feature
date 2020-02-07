@mod @mod_messages @app @javascript
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
  And I press "Display options" in the app
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

  @app @3.8.0 @mobile @OK
  Scenario: User profile, send message, add/remove contact (mobile)
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
  Then I should see "Contact request sent"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  And I press "Requests" in the app
  And I press "Teacher teacher" in the app
  Then I should see "Teacher teacher would like to contact you"
  And I press "Accept and add to contacts" in the app
  And I should not see "Teacher teacher would like to contact you"
  And I press "Teacher teacher" in the app
  And I press "Message" in the app
  And I set the field "New message" to "hi" in the app
  And I press "Send" in the app
  Then I should see "heeey student"
  And I should see "hi"
  And I press the back button in the app
  And I press "Remove from contacts" in the app
  And I press "Remove" in the app
  Then I should see "Add to contacts"
  And I press the back button in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Add to contacts"
  And I press "Delete conversation" in the app
  And I press "Delete" in the app
  And I should not see "heeey student"
  And I should not see "hi"

  @app @3.8.0 @tablet @OK
  Scenario: User profile, send message, add/remove contact (tablet)
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
  And I press "Display options" in the app
  And I press "Add to contacts" in the app
  And I press "Add" in the app
  Then I should see "Contact request sent"
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Contacts" in the app
  And I press "Requests" in the app
  And I press "Teacher teacher" in the app
  Then I should see "Teacher teacher would like to contact you"
  And I press "Accept and add to contacts" in the app
  And I should not see "Teacher teacher would like to contact you"
  And I set the field "New message" to "hi" in the app
  And I press "Send" in the app
  Then I should see "heeey student"
  And I should see "hi"
  And I press "Display options" in the app
  And I press "Remove from contacts" in the app
  And I press "Remove" in the app
  And I press "Display options" in the app
  Then I should see "Add to contacts"
  And I press "Delete conversation" in the app
  And I press "Delete" in the app
  And I should not see "heeey student"
  And I should not see "hi"

  @app @3.8.0 @mobile @OK
  Scenario: Send message offline (mobile)
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
  And I switch offline mode to "true"
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  And I set the field "New message" to "byee" in the app
  And I press "Send" in the app
  And I switch offline mode to "false"
  And I press the back button in the app
  And I press "Student1 student1" in the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Teacher teacher" in the app
  Then I should see "heeey student"
  And I should see "byee"

  @app @3.8.0 @tablet @OK
  Scenario: Send message offline (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
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
  And I switch offline mode to "true"
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  And I set the field "New message" to "byee" in the app
  And I press "Send" in the app
  And I switch offline mode to "false"
  And I press "Student1 student1" in the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Teacher teacher" in the app
  Then I should see "heeey student"
  And I should see "byee"

  @app @3.8.0 @OK
  Scenario: Auto-sync messages
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
  And I switch offline mode to "true"
  And I set the field "New message" to "heeey student" in the app
  And I press "Send" in the app
  And I set the field "New message" to "byee" in the app
  And I press "Send" in the app
  And I switch offline mode to "false"
  And I wait "600" seconds
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "Teacher teacher" in the app
  Then I should see "heeey student"
  And I should see "byee"

  @app @3.8.0 @OK
  Scenario: Search for messages
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "test message" in the app
  And I press "Send" in the app
  And I set the field "New message" to "search this message" in the app
  And I press "Send" in the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "search this message" in the app
  And I press "search" in the app
  Then I should see "Messages"
  And I should see "search this message"
  And I press "search this message" near "Teacher teacher" in the app
  Then I should see "test message"
  And I should see "search this message"

  @app @3.8.0 @mobile @OK
  Scenario: Star/Unstar (mobile)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "star message" in the app
  And I press "Send" in the app
  When I enter the app
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "test message student2" in the app
  And I press "Send" in the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  Then I should see "Private (2)"
  And I should see "Starred (1)"
  And I press "star message" in the app
  And I press "Conversation actions menu" in the app
  And I press "Star conversation" in the app
  And I press the back button in the app
  Then I should see "Private (1)"
  And I should see "Starred (2)"
  And I press "Starred (2)" in the app
  Then I should see "Teacher teacher"
  And I should see "Student1 student1"

  @app @3.8.0 @tablet @OK
  Scenario: Star/Unstar (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "star message" in the app
  And I press "Send" in the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "test message student2" in the app
  And I press "Send" in the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  Then I should see "Private (2)"
  And I should see "Starred (1)"
  And I press "star message" in the app
  And I press "Display options" in the app
  And I press "Star conversation" in the app
  Then I should see "Private (1)"
  And I should see "Starred (2)"
  And I press "Starred (2)" in the app
  Then I should see "Teacher teacher"
  And I should see "Student1 student1"

  @app @3.8.0 @mobile @OK
  Scenario: User blocking feature (mobile)
  When I enter the app
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student1 student1" in the app
  Then I should see "Block user"
  And I press "Block user" in the app
  And I should see "Are you sure you want to block Student1 student1?"
  And I press "Cancel" in the app
  And I should see "Block user"
  And I press "Block user" in the app
  And I press "Block user" near "Cancel" in the app
  Then I should not see "Block user"
  And I should see "Unblock user"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  Then I should see "You are unable to message this user"
  When I enter the app
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student1 student1" in the app
  Then I should see "Unblock user"
  And I should not see "Block user"
  And I press "Unblock user" in the app
  And I press "Cancel" in the app
  Then I should see "Unblock user"
  And I should not see "Block user"
  And I press "Unblock user" in the app
  And I press "Unblock user" near "Cancel" in the app
  Then I should see "Block user"
  And I should not see "Unblock user"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  And I set the field "New message" to "test message" in the app
  And I press "Send" in the app
  Then I should see "test message"
  And I should not see "You are unable to message this user"

  @app @3.8.0 @tablet @OK
  Scenario: User blocking feature (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  Then I should see "Block user"
  And I press "Block user" in the app
  And I should see "Are you sure you want to block Student1 student1?"
  And I press "Cancel" in the app
  And I should see "Block user"
  And I press "Block user" in the app
  And I press "Block user" near "Cancel" in the app
  Then I should not see "Block user"
  And I should see "Unblock user"
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  Then I should see "You are unable to message this user"
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student2"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  Then I should see "Unblock user"
  And I should not see "Block user"
  And I press "Unblock user" in the app
  And I press "Cancel" in the app
  Then I should see "Unblock user"
  And I should not see "Block user"
  And I press "Unblock user" in the app
  And I press "Unblock user" near "Cancel" in the app
  Then I should see "Block user"
  And I should not see "Unblock user"
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  And I set the field "New message" to "test message" in the app
  And I press "Send" in the app
  Then I should see "test message"
  And I should not see "You are unable to message this user"

  @app @3.8.0 @mobile @OK
  Scenario: Mute Unmute conversations (mobile)
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  And I set the field "New message" to "test message" in the app
  And I press "Send" in the app
  And I press "Conversation actions menu" in the app
  And I press "Mute" in the app
  And I press "Muted conversation" in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Unmute"
  And I should not see "Mute"
  And I press "Unmute" in the app
  And I press "Conversation actions menu" in the app
  Then I should not see "Unmute"
  And I should see "Mute"
  And I press "Mute" in the app
  And I press "Messages" in the app
  And I press "Private (1)" in the app
  And I press "Student2 student2" in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Unmute"
  And I should not see "Mute"

  @app @3.8.0 @tablet @OK
  Scenario: Mute Unmute conversations (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Participants" in the app
  And I press "Student2 student2" in the app
  And I press "Message" in the app
  And I set the field "New message" to "test message" in the app
  And I press "Send" in the app
  And I press "Conversation actions menu" in the app
  And I press "Mute" in the app
  And I press "Muted conversation" in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Unmute"
  And I should not see "Mute"
  And I press "Unmute" in the app
  And I press "Conversation actions menu" in the app
  Then I should not see "Unmute"
  And I should see "Mute"
  And I press "Mute" in the app
  And I press "Messages" in the app
  And I press "Private (1)" in the app
  And I press "Student2 student2" in the app
  And I press "Display options" in the app
  Then I should see "Unmute"
  And I should not see "Mute"

  @app @3.8.0 @mobile @OK
  Scenario: Self conversations (mobile)
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  Then I should see "Starred (1)"
  And I press "Student1 student1" in the app
  And I set the field "New message" to "self conversation" in the app
  And I press "Send" in the app
  And I switch offline mode to "true"
  And I set the field "New message" to "self conversation offline" in the app
  And I press "Send" in the app
  And I switch offline mode to "false"
  And I press the back button in the app
  And I press "Student1 student1" in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Unstar conversation"
  And I should see "Show delete messages"
  And I should see "Delete conversation"
  And I press "Unstar conversation" in the app
  And I press "Conversation actions menu" in the app
  Then I should see "Star conversation"
  And I should see "Show delete messages"
  And I should see "Delete conversation"
  And I press "Show delete messages" in the app
  And I should see "self conversation"
  And I should see "self conversation offline"
  And I press "Delete message" near "self conversation offline" in the app
  And I press "OK" in the app
  Then I should see "self conversation"
  And I should not see "self conversation offline"
  And I press "Conversation actions menu" in the app
  And I press "Delete conversation" in the app
  And I press "Delete" in the app
  Then I should not see "self conversation"
  And I should not see "self conversation offline"
  And I press the back button in the app
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "Student1 student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "auto search test" in the app
  And I press "Send" in the app
  And I press the back button in the app
  And I press the back button in the app
  And I press "Private" in the app
  And I press "Student1 student1" in the app
  Then I should see "auto search test"

  @app @3.8.0 @tablet @OK
  Scenario: Self conversations (tablet)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Messages" in the app
  Then I should see "Starred (1)"
  And I press "Student1 student1" in the app
  And I set the field "New message" to "self conversation" in the app
  And I press "Send" in the app
  And I switch offline mode to "true"
  And I set the field "New message" to "self conversation offline" in the app
  And I press "Send" in the app
  And I switch offline mode to "false"
  And I press "Student1 student1" in the app
  And I press "Display options" in the app
  Then I should see "Unstar conversation"
  And I should see "Show delete messages"
  And I should see "Delete conversation"
  And I press "Unstar conversation" in the app
  And I press "Display options" in the app
  Then I should see "Star conversation"
  And I should see "Show delete messages"
  And I should see "Delete conversation"
  And I press "Show delete messages" in the app
  And I should see "self conversation"
  And I should see "self conversation offline"
  And I press "Delete message" near "self conversation offline" in the app
  And I press "OK" in the app
  Then I should see "self conversation"
  And I should not see "self conversation offline"
  And I press "Display options" in the app
  And I press "Delete conversation" in the app
  And I press "Delete" in the app
  Then I should not see "self conversation"
  And I should not see "self conversation offline"
  And I press "addon.messages.search" in the app
  And I set the field "Search" to "Student1 student1" in the app
  And I press "search" in the app
  And I press "Student1 student1" in the app
  And I set the field "New message" to "auto search test" in the app
  And I press "Send" in the app
  And I press the back button in the app
  And I press "Private" in the app
  And I press "Student1 student1" in the app
  Then I should see "auto search test"