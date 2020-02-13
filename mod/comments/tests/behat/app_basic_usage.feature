@mod @mod_comments @app @javascript
Feature: Test basic usage of comments in app
  In order to participate in the comments while using the mobile app
  As a student
  I need basic comments functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |

    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |

    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |

    And the following "activities" exist:
      | activity | name          | intro                | course | idnumber  | mainglossary | allowcomments | assessed   | scale |
      | glossary | Test glossary | glossary description | C1     | gloss1    | 1            | 1             | 1          | 1     |

    And the following "activities" exist:
      | activity | name      | intro        | course | idnumber | comments |
      | data     | Data      | Data info    | C1     | data1    | 1        |


  @app @3.8.0 @OK
  Scenario: Add comments and delete comments (database)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Data" in the app
  And I press "Display options" in the app
  And I press "Open in browser" in the app
  And I switch to the browser tab opened by the app
  And I log in as "teacher1"
  And I add a "Text input" field to "Data" database and I fill the form with:
      | Field name | Test field name |
      | Field description | Test field description |
  And I press "Save"
  And I close the browser tab opened by the app
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Data" in the app
  And I press "add" in the app
  And I set the field "Test field name" to "Test" in the app
  And I press "Save" in the app
  And I press "More" in the app
  And I press "Comments (0)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Data" in the app
  And I press "More" in the app
  And I press "Comments (1)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test student" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I should see "comment test student"
  And I press the back button in the app
  And I should see "Comments (2)"
  And I press "Comments (2)" in the app
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "comment test"
  And I should not see "comment test student"
  And I press the back button in the app
  And I should see "Comments (1)"

  @app @3.8.0 @OK
  Scenario: Add comments offline, delete comments offline and sync (database)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Data" in the app
  And I press "Display options" in the app
  And I press "Open in browser" in the app
  And I switch to the browser tab opened by the app
  And I log in as "teacher1"
  And I add a "Text input" field to "Data" database and I fill the form with:
      | Field name | Test field name |
      | Field description | Test field description |
  And I press "Save"
  And I close the browser tab opened by the app
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Data" in the app
  And I press "add" in the app
  And I set the field "Test field name" to "Test" in the app
  And I press "Save" in the app
  And I press "More" in the app
  And I press "Comments (0)" in the app
  And I switch offline mode to "true"
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
  And I should see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "true"
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "There are offline comments to be synchronised."
  And I should see "Deleted offline"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"

  @app @3.8.0 @OK
  Scenario: Add comments and delete comments (glossary)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Test glossary" in the app
  And I press "close" in the app
  And I set the field "Concept" to "potato" in the app
  And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
  And I press "Save" in the app
  And I press "potato" in the app
  And I press "Comments (0)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Test glossary" in the app
  And I press "potato" in the app
  And I press "Comments (1)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test student" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I should see "comment test student"
  And I press the back button in the app
  And I should see "Comments (2)"
  And I press "Comments (2)" in the app
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "comment test"
  And I should not see "comment test student"
  And I press the back button in the app
  And I should see "Comments (1)"

  @app @3.8.0 @OK
  Scenario: Add comments offline, delete comments offline and sync (glossary)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Test glossary" in the app
  And I press "close" in the app
  And I set the field "Concept" to "potato" in the app
  And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
  And I press "Save" in the app
  And I press "potato" in the app
  And I press "Comments (0)" in the app
  And I switch offline mode to "true"
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
  And I should see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "true"
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "There are offline comments to be synchronised."
  And I should see "Deleted offline"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"

  @app @3.8.0 @mobile @OK
  Scenario: Add comments and delete comments mobile (blogs)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Website" in the app
  And I switch to the browser tab opened by the app
  And I follow "Log in"
  And I log in as "teacher1"
  And I click on "Side panel" "button"
  And I follow "C1"
  And I press "Actions menu"
  And I follow "Turn editing on"
  And I click on "Side panel" "button"
  And I follow "Add a block"
  And I follow "Blog menu"
  And I follow "Add an entry about this course"
  And I set the field "Entry title" to "Blog test"
  And I set the field "Blog entry body" to "Blog body"
  And I press "Save changes"
  And I close the browser tab opened by the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Site blog" in the app
  Then I should see "Blog test"
  And I should see "Blog body"
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"

  @app @3.8.0 @tablet @OK
  Scenario: Add comments and delete comments tablet (blogs)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Website" in the app
  And I switch to the browser tab opened by the app
  And I follow "Log in"
  And I log in as "teacher1"
  And I follow "C1"
  And I press "Actions menu"
  And I follow "Turn editing on"
  And I follow "Add a block"
  And I follow "Blog menu"
  And I follow "Add an entry about this course"
  And I set the field "Entry title" to "Blog test"
  And I set the field "Blog entry body" to "Blog body"
  And I press "Save changes"
  And I close the browser tab opened by the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Site blog" in the app
  Then I should see "Blog test"
  And I should see "Blog body"
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Comment created"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"

  @app @3.8.0 @mobile @OK
  Scenario: Add comments offline, delete comments offline and sync mobile (blogs)
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Website" in the app
  And I switch to the browser tab opened by the app
  And I follow "Log in"
  And I log in as "teacher1"
  And I click on "Side panel" "button"
  And I follow "C1"
  And I press "Actions menu"
  And I follow "Turn editing on"
  And I click on "Side panel" "button"
  And I follow "Add a block"
  And I follow "Blog menu"
  And I follow "Add an entry about this course"
  And I set the field "Entry title" to "Blog test"
  And I set the field "Blog entry body" to "Blog body"
  And I press "Save changes"
  And I close the browser tab opened by the app
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Site blog" in the app
  Then I should see "Blog test"
  And I should see "Blog body"
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "true"
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
  And I should see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "true"
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "There are offline comments to be synchronised."
  And I should see "Deleted offline"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"

  @app @3.8.0 @tablet @OK
  Scenario: Add comments offline, delete comments offline and sync tablet (blogs)
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "menu" in the app
  And I press "Website" in the app
  And I switch to the browser tab opened by the app
  And I follow "Log in"
  And I log in as "teacher1"
  And I follow "C1"
  And I press "Actions menu"
  And I follow "Turn editing on"
  And I follow "Add a block"
  And I follow "Blog menu"
  And I follow "Add an entry about this course"
  And I set the field "Entry title" to "Blog test"
  And I set the field "Blog entry body" to "Blog body"
  And I press "Save changes"
  And I close the browser tab opened by the app
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  And I press "Site blog" in the app
  Then I should see "Blog test"
  And I should see "Blog body"
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "true"
  And I press "close" in the app
  And I set the field "Add a comment..." to "comment test" in the app
  And I press "Save comment" in the app
  Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
  And I should see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"
  And I press "Comments (0)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "true"
  And I press "Delete" in the app
  And I press "trash" in the app
  And I press "Delete" near "Cancel" in the app
  Then I should see "Comment deleted"
  And I should see "There are offline comments to be synchronised."
  And I should see "Deleted offline"
  And I should see "comment test"
  And I press the back button in the app
  And I should see "Comments (1)"
  And I press "Comments (1)" in the app
  And I switch offline mode to "false"
  And I press "Display options" in the app
  And I press "Synchronise now" in the app
  Then I should not see "There are offline comments to be synchronised."
  And I should not see "comment test"
  And I press the back button in the app
  And I should see "Comments (0)"