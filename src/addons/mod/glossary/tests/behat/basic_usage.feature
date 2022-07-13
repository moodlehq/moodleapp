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
    And the following "mod_glossary > categories" exist:
      | glossary | name            |
      | gloss1   | The ones I like |
      | gloss1   | All for you     |
    And the following "mod_glossary > entries" exist:
      | glossary | concept  | definition     | user     | categories      | usedynalink |
      | gloss1   | Eggplant | Sour eggplants | teacher1 | All for you     | 0           |
      | gloss1   | Cucumber | Sweet cucumber | student1 | The ones I like | 0           |
      | gloss1   | Potato   | To make chips  | student1 | The ones I like | 1           |
      | gloss1   | Raddish  | Raphanus sativus | student1 | All for you   | 1           |

  Scenario: View a glossary and its terms
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Eggplant" in the app
    And I should find "Cucumber" in the app
    And I should find "Potato" in the app

    When I press "Potato" in the app
    Then I should find "Potato" in the app
    And I should find "To make chips" in the app

  Scenario: Navigate to glossary terms by link (auto-linking)
    Given the "glossary" filter is "on"
    And I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Eggplant" in the app
    And I should find "Cucumber" in the app
    And I should find "Potato" in the app
    And I should find "Raddish" in the app

    When I press the back button in the app
    And I press "Test forum name" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "Testing auto-link glossary"
    And I set the field "Message" to "Glossary terms auto-linked: Raddish Potato" in the app
    And I press "Post to forum" in the app
    And I press "Testing auto-link glossary" in the app
    Then I should find "Raddish" in the app

    When I press "Raddish" in the app
    Then the header should be "Raddish" in the app
    And I should find "Raphanus sativus" in the app

    When I press the back button in the app
    And I press "Potato" in the app
    Then the header should be "Potato" in the app
    And I should find "To make chips" in the app

  Scenario: See comments
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    Then the header should be "Test glossary" in the app

    When I press "Eggplant" in the app
    Then I should find "Comments (0)" in the app

    # Write comments as a teacher
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "Eggplant" in the app
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
    And I press "Eggplant" in the app
    When I pull to refresh in the app
    Then I should find "Comments (2)" in the app

    When I press "Comments" in the app
    And I should find "teacher first comment" in the app
    And I should find "teacher second comment" in the app

  Scenario: Prefetch
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Course downloads" in the app
    When I press "Download" within "Test glossary" "ion-item" in the app
    And I press the back button in the app
    And I switch network connection to offline
    And I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Cucumber" in the app
    And I should find "Eggplant" in the app
    And I should find "Potato" in the app

    When I press "Eggplant" in the app
    Then I should find "Eggplant" in the app
    And I should find "Sour eggplants" in the app
    And I should not see "Comments cannot be retrieved"
    And I should find "Comments (0)" in the app

  Scenario: Add entries (basic info)
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Broccoli |
      | Definition | Brassica oleracea var. italica |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Cabbage |
      | Definition | Brassica oleracea var. capitata |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Garlic |
      | Definition | Allium sativum |
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Cucumber" in the app
    And I should find "Eggplant" in the app
    And I should find "Potato" in the app
    And I should find "Broccoli" in the app
    And I should find "Cabbage" in the app
    And I should find "Garlic" in the app

    When I press "Garlic" in the app
    Then I should find "Garlic" in the app
    And I should find "Allium sativum" in the app

  Scenario: Sync
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Add a new entry" in the app
    And I switch network connection to offline
    And I set the following fields to these values in the app:
      | Concept | Broccoli |
      | Definition | Brassica oleracea var. italica |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Cabbage |
      | Definition | Brassica oleracea var. capitata |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Garlic |
      | Definition | Allium sativum |
    And I press "Save" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Cucumber" in the app
    And I should find "Eggplant" in the app
    And I should find "Potato" in the app
    And I should find "Broccoli" in the app
    And I should find "Cabbage" in the app
    And I should find "Garlic" in the app
    And I should find "Entries to be synced" in the app
    And I should find "This Glossary has offline data to be synchronised." in the app

    When I switch network connection to wifi
    And I press "Information" in the app
    And I press "Synchronise now" in the app
    Then the header should be "Test glossary" in the app
    And I should find "Cucumber" in the app
    And I should find "Eggplant" in the app
    And I should find "Potato" in the app
    And I should find "Broccoli" in the app
    And I should find "Cabbage" in the app
    And I should find "Garlic" in the app
    But I should not see "Entries to be synced"
    And I should not see "This Glossary has offline data to be synchronised."

    When I press "Garlic" in the app
    Then I should find "Garlic" in the app
    And I should find "Allium sativum" in the app

  Scenario: Add/view ratings
    # Rate entries as teacher1
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher1" in the app
    And I press "Cucumber" in the app
    Then I should find "Average of ratings: -" in the app

    When I press "None" in the app
    And I press "1" in the app
    Then I should find "Average of ratings: 1" in the app

    # Rate entries as teacher2
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "teacher2" in the app
    And I press "Cucumber" in the app
    And I switch network connection to offline
    And I press "None" in the app
    And I press "0" in the app
    Then I should find "Data stored in the device because it couldn't be sent. It will be sent automatically later." in the app
    And I should find "Average of ratings: 1" in the app

    When I switch network connection to wifi
    And I press the back button in the app
    Then I should find "This Glossary has offline data to be synchronised." in the app

    When I press "Information" in the app
    And I press "Synchronise now" in the app
    And I press "Cucumber" in the app
    Then I should find "Average of ratings: 0.5" in the app

    # View ratings as a student
    Given I entered the glossary activity "Test glossary" on course "Course 1" as "student1" in the app
    And I press "Cucumber" in the app
    Then the header should be "Cucumber" in the app
    But I should not see "Average of ratings: 0.5"
