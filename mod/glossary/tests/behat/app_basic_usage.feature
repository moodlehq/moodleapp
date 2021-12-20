@mod @mod_glossary @app @app_upto3.9.4 @javascript
Feature: Test basic usage of glossary in app
  In order to participate in the glossaries while using the mobile app
  As a student
  I need basic glossary functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher  | teacher  | teacher1@example.com |
      | teacher2 | Teacher2 | teacher2 | teacher2@example.com |
      | student1 | Student  | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | teacher2 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | name          | intro                | course | idnumber  | mainglossary | allowcomments | assessed   | scale |
      | glossary | Test glossary | glossary description | C1     | gloss1    | 1            | 1             | 1          | 1     |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | forum      | Test forum name | Test forum  | C1     | forum    | 0         |

  @app @3.8.0
  Scenario: View a glossary and its terms
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press "car" in the app
    Then I should see "car"
    And I should see "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods."

  @app @3.8.0
  Scenario: Change filters (include search)
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press "Search" in the app
    And I set the field "Search query" to "something" in the app
    And I press "search" near "No entries were found." in the app
    Then I should see "No entries were found."

    When I set the field "Search query" to "potato" in the app
    And I press "search" near "No entries were found." in the app
    And I set the field "Search query" to " " in the app
    And I press "Display options" in the app
    And I press "Refresh" in the app
    And I press "potato" in the app
    Then I should see "potato"
    And I should see "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae."

  @app @3.8.0
  Scenario: Navigate to glossary terms by link (auto-linking)
    When the "glossary" filter is "on"
    And I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press the back button in the app
    And I press "Test forum name" in the app
    And I press "add" in the app
    And I set the field "Subject" to "Testing auto-link glossary"
    And I set the field "Message" to "Glossary terms auto-linked: potato car mountain" in the app
    And I press "Post to forum" in the app
    And I press "Testing auto-link glossary" near "Last post a few seconds ago" in the app
    Then I should see "car"

    When I press "car" in the app
    Then the header should be "car" in the app
    And I should see "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods."

    When I press the back button in the app
    And I press "mountain" in the app
    Then the header should be "mountain" in the app
    And I should see "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak."

  @app @3.8.0
  Scenario: See comments
    # Create entries as a student
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press "mountain" in the app
    Then I should see "Comments (0)"

    # Write comments as a teacher
    When I enter the course "Course 1" as "teacher1" in the app
    And I press "Test glossary" in the app
    And I press "mountain" in the app
    Then I should see "Comments (0)"

    When I press "Comments" in the app
    And I should see "No comments"

    When I press "close" in the app
    And I set the field "Add a comment..." to "teacher first comment" in the app
    And I press "Save comment" in the app
    Then I should see "teacher first comment"

    When I press "close" in the app
    And I set the field "Add a comment..." to "teacher second comment" in the app
    And I press "Save comment" in the app
    Then I should see "teacher first comment"
    And I should see "teacher second comment"

    # View comments as a student
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "mountain" in the app
    Then I should see "Comments (2)"

    When I press "Comments" in the app
    And I should see "teacher first comment"
    And I should see "teacher second comment"

  @app @3.8.0
  Scenario: Prefetch
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press "Display options" in the app
    And I press "Download" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I enter the course "Course 1" in the app
    And I switch offline mode to "true"
    And I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    When I press "mountain" in the app
    Then I should see "mountain"
    And I should see "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak."
    And I should not see "Comments cannot be retrieved"
    And I should see "Comments (0)"

  @app @3.8.0
  Scenario: Sync
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I switch offline mode to "true"
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"
    And I should see "Entries to be synced"
    And I should see "This Glossary has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press "close" in the app
    And I set the field "Concept" to "testSync" in the app
    And I set the field "Definition" to "testSync" in the app
    And I press "Save" in the app
    And I press "Display options" in the app
    And I press "Synchronise now" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"
    And I should see "testSync"
    But I should not see "Entries to be synced"
    And I should not see "This Glossary has offline data to be synchronised."

  @app @3.8.0
  Scenario: Add/view ratings
    # Create entries as a student
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "close" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "close" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should see "car"
    And I should see "mountain"
    And I should see "potato"

    # Rate entries as teacher1
    When I enter the course "Course 1" as "teacher1" in the app
    And I press "Test glossary" in the app
    And I press "mountain" in the app
    Then I should see "Average of ratings: -"

    When I press "None" in the app
    And I press "1" in the app
    Then I should see "Average of ratings: 1"

    # Rate entries as teacher2
    When I enter the course "Course 1" as "teacher2" in the app
    And I press "Test glossary" in the app
    And I press "mountain" in the app
    And I switch offline mode to "true"
    And I press "None" in the app
    And I press "0" in the app
    Then I should see "Data stored in the device because it couldn't be sent. It will be sent automatically later."
    And I should see "Average of ratings: 1"

    When I switch offline mode to "false"
    And I press the back button in the app
    Then I should see "This Glossary has offline data to be synchronised."

    When I press "Display options" in the app
    And I press "Synchronise now" in the app
    And I press "mountain" in the app
    Then I should see "Average of ratings: 0.5"

    # View ratings as a student
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test glossary" in the app
    And I press "mountain" in the app
    Then the header should be "mountain" in the app
    But I should not see "Average of ratings: 0.5"
