@core @core_comments @app @javascript
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
    And the following "mod_data > fields" exist:
      | database | type | name              | description              |
      | data1    | text | Test field name   | Test field description   |

  Scenario: Add comments & Delete comments (database)
    # Create database entry and comment as a teacher
    Given I entered the data activity "Data" on course "Course 1" as "teacher1" in the app
    And I press "Add entries" in the app
    And I set the field "Test field name" to "Test" in the app
    And I press "Save" in the app
    And I press "Show more" in the app
    And I press "Comments (0)" in the app
    And I set the field "Add a comment..." to "comment test teacher" in the app
    And I press "Send" in the app
    Then I should find "Comment created" in the app
    And I should find "comment test teacher" in the app

    When I press the back button in the app
    And I should find "Comments (1)" in the app

    # Create and delete comments as a student
    Given I entered the data activity "Data" on course "Course 1" as "student1" in the app
    And I press "Show more" in the app
    And I press "Comments (1)" in the app
    And I set the field "Add a comment..." to "comment test student" in the app
    And I press "Send" in the app
    Then I should find "Comment created" in the app
    And I should find "comment test teacher" in the app
    And I should find "comment test student" in the app

    When I press the back button in the app
    And I press "Comments (2)" in the app
    And I press "Toggle delete buttons" in the app
    And I press "Delete" near "comment test student" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    And I should find "comment test teacher" in the app
    But I should not see "comment test student"

    When I press the back button in the app
    Then I should find "Comments (1)" in the app

  Scenario: Add comments offline & Delete comments offline & Sync comments (database)
    Given I entered the data activity "Data" on course "Course 1" as "teacher1" in the app
    And I press "Add entries" in the app
    And I set the field "Test field name" to "Test" in the app
    And I press "Save" in the app
    And I press "Show more" in the app
    And I press "Comments (0)" in the app
    And I switch network connection to offline
    And I set the field "Add a comment..." to "comment test" in the app
    And I press "Send" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (0)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should find "comment test" in the app
    But I should not see "There are offline comments to be synchronised."

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to offline
    And I press "Toggle delete buttons" in the app
    And I press "Delete" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "Deleted offline" in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should not see "There are offline comments to be synchronised."
    And I should not see "comment test"

    When I press the back button in the app
    And I should find "Comments (0)" in the app

  Scenario: Add comments & delete comments (glossary)
    # Create glossary entry and comment as a teacher
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | potato |
      | Definition | The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae. |
    And I press "Save" in the app
    And I press "potato" in the app
    And I press "Comments (0)" in the app
    And I set the field "Add a comment..." to "comment test teacher" in the app
    And I press "Send" in the app
    Then I should find "Comment created" in the app
    And I should find "comment test teacher" in the app
    And I press the back button in the app
    And I should find "Comments (1)" in the app

    # Create and delete comments as a student
    When I entered the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "potato" in the app
    And I press "Comments (1)" in the app
    And I set the field "Add a comment..." to "comment test student" in the app
    And I press "Send" in the app
    Then I should find "Comment created" in the app
    And I should find "comment test teacher" in the app
    And I should find "comment test student" in the app

    When I press the back button in the app
    And I press "Comments (2)" in the app
    And I press "Toggle delete buttons" in the app
    And I press "Delete" near "comment test student" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    And I should find "comment test teacher" in the app
    But I should not see "comment test student"

    When I press the back button in the app
    And I should find "Comments (1)" in the app

  Scenario: Add comments offline & Delete comments offline & Sync comments (glossary)
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | potato |
      | Definition | The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae. |
    And I press "Save" in the app
    And I press "potato" in the app
    And I press "Comments (0)" in the app
    And I switch network connection to offline
    And I set the field "Add a comment..." to "comment test" in the app
    And I press "Send" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (0)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should find "comment test" in the app
    But I should not see "There are offline comments to be synchronised."

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to offline
    And I press "Toggle delete buttons" in the app
    And I press "Delete" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "Deleted offline" in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should not see "There are offline comments to be synchronised."
    And I should not see "comment test"

    When I press the back button in the app
    And I should find "Comments (0)" in the app

  Scenario: Add comments & Delete comments (blogs)
    # Create blog as a teacher
    Given the following "core_blog > entries" exist:
      | subject   | body      | user     |
      | Blog test | Blog body | teacher1 |

    # Create and delete comments as a student
    When I entered the app as "student1"
    And I press the more menu button in the app
    And I press "Site blog" in the app
    Then I should find "Blog test" in the app
    And I should find "Blog body" in the app

    When I press "Comments (0)" in the app
    And I set the field "Add a comment..." to "comment test" in the app
    And I press "Send" in the app
    Then I should find "Comment created" in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I press "Toggle delete buttons" in the app
    And I press "Delete" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    But I should not see "comment test"

    When I press the back button in the app
    Then I should find "Comments (0)" in the app

  Scenario: Add comments offline & Delete comments offline & Sync comments (blogs)
    # Create blog as a teacher
    Given the following "core_blog > entries" exist:
      | subject   | body      | user     |
      | Blog test | Blog body | teacher1 |

    # Create and delete comments as a student
    When I entered the app as "student1"
    And I press the more menu button in the app
    And I press "Site blog" in the app
    Then I should find "Blog test" in the app
    And I should find "Blog body" in the app

    When I press "Comments (0)" in the app
    And I switch network connection to offline
    And I set the field "Add a comment..." to "comment test" in the app
    And I press "Send" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (0)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should find "comment test" in the app
    But I should not see "There are offline comments to be synchronised."

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to offline
    And I press "Toggle delete buttons" in the app
    And I press "Delete" in the app
    And I press "Delete" near "Cancel" in the app
    Then I should find "Comment deleted" in the app
    And I should find "There are offline comments to be synchronised." in the app
    And I should find "Deleted offline" in the app
    And I should find "comment test" in the app

    When I press the back button in the app
    And I press "Comments (1)" in the app
    And I switch network connection to wifi
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I close the popup in the app
    Then I should not see "There are offline comments to be synchronised."
    And I should not see "comment test"

    When I press the back button in the app
    Then I should find "Comments (0)" in the app
