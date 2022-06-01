@mod @mod_glossary @app @javascript
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

  Scenario: View a glossary and its terms
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press "car" in the app
    Then I should find "car" in the app
    And I should find "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app

  Scenario: Change filters (include search)
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press "Search" in the app
    And I set the field "Search query" to "something" in the app
    And I press enter
    Then I should find "No entries were found." in the app

    When I set the field "Search query" to "potato" in the app
    And I press "Search" near "No entries were found." in the app
    And I set the field "Search query" to " " in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    And I press "potato" in the app
    Then I should find "potato" in the app
    And I should find "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app

  Scenario: Navigate to glossary terms by link (auto-linking)
    Given the "glossary" filter is "on"
    And I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "This entry should be automatically linked" in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Testing auto-link glossary"
    And I set the field "Message" to "Glossary terms auto-linked: potato car mountain" in the app
    And I press "Post to forum" in the app
    And I press "Testing auto-link glossary" in the app
    Then I should find "car" in the app

    When I press "car" in the app
    Then the header should be "car" in the app
    And I should find "is a wheeled motor vehicle used for transportation" in the app

    When I press the back button in the app
    And I press "mountain" in the app
    Then the header should be "mountain" in the app
    And I should find "landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app

  Scenario: See comments
    # Create entries as a student
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press "mountain" in the app
    Then I should find "Comments (0)" in the app

    # Write comments as a teacher
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "mountain" in the app
    Then I should find "Comments (0)" in the app

    When I press "Comments" in the app
    Then I should find "No comments" in the app

    And I set the field "Add a comment..." to "teacher first comment" in the app
    And I press "Send" in the app
    Then I should find "teacher first comment" in the app

    And I set the field "Add a comment..." to "teacher second comment" in the app
    And I press "Send" in the app
    Then I should find "teacher first comment" in the app
    And I should find "teacher second comment" in the app

    # View comments as a student
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "mountain" in the app
    Then I should find "Comments (2)" in the app

    When I press "Comments" in the app
    And I should find "teacher first comment" in the app
    And I should find "teacher second comment" in the app

  Scenario: Prefetch
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press "Information" in the app
    And I press "Download" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I enter the course "Course 1" in the app
    And I switch offline mode to "true"
    And I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    When I press "mountain" in the app
    Then I should find "mountain" in the app
    And I should find "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I should not see "Comments cannot be retrieved"
    And I should find "Comments (0)" in the app

  Scenario: Sync
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I switch offline mode to "true"
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app
    And I should find "Entries to be synced" in the app
    And I should find "This Glossary has offline data to be synchronised." in the app

    When I switch offline mode to "false"
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "testSync" in the app
    And I set the field "Definition" to "testSync" in the app
    And I press "Save" in the app
    And I press "Information" in the app
    And I press "Synchronise now" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app
    And I should find "testSync" in the app
    But I should not see "Entries to be synced"
    And I should not see "This Glossary has offline data to be synchronised."

  Scenario: Add/view ratings
    # Create entries as a student
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "potato" in the app
    And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "car" in the app
    And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the field "Concept" to "mountain" in the app
    And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "car" in the app
    And I should find "mountain" in the app
    And I should find "potato" in the app

    # Rate entries as teacher1
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "mountain" in the app
    Then I should find "Average of ratings: -" in the app

    When I press "None" in the app
    And I press "1" in the app
    Then I should find "Average of ratings: 1" in the app

    # Rate entries as teacher2
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher2" in the app
    And I press "mountain" in the app
    And I switch offline mode to "true"
    And I press "None" in the app
    And I press "0" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "Average of ratings: 1" in the app

    When I switch offline mode to "false"
    And I press the back button in the app
    Then I should find "This Glossary has offline data to be synchronised." in the app

    When I press "Information" in the app
    And I press "Synchronise now" in the app
    And I press "mountain" in the app
    Then I should find "Average of ratings: 0.5" in the app

    # View ratings as a student
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "mountain" in the app
    Then the header should be "mountain" in the app
    But I should not see "Average of ratings: 0.5"
