@mod @mod_book @app @javascript
Feature: Test basic usage of book activity in app
  In order to view a book while using the mobile app
  As a student
  I need basic book functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | name       | intro                 | course | idnumber | numbering |
      | book     | Basic book | Test book description | C1     | book     | 1         |
    And the following "mod_book > chapter" exist:
      | book       | title             | content                     | subchapter | hidden | pagenum |
      | Basic book | Chapt 1           | This is the first chapter   | 0          | 0      | 1       |
      | Basic book | Chapt 1.1         | This is a subchapter        | 1          | 0      | 2       |
      | Basic book | Chapt 2           | This is the second chapter  | 0          | 0      | 3       |
      | Basic book | Hidden chapter    | This is a hidden chapter    | 0          | 1      | 4       |
      | Basic book | Hidden subchapter | This is a hidden subchapter | 1          | 1      | 5       |
      | Basic book | Chapt 3           | This is the third chapter   | 0          | 0      | 6       |
      | Basic book | Last hidden       | Another hidden subchapter   | 1          | 1      | 7       |

  Scenario: View book table of contents (student)
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Basic book" in the app
    Then I should find "Test book description" in the app
    And I should find "Chapt 1" in the app
    And I should find "Chapt 1.1" in the app
    And I should find "Chapt 2" in the app
    And I should find "Chapt 3" in the app
    And I should find "Start" in the app
    But I should not find "Hidden chapter" in the app
    And I should not find "Hidden subchapter" in the app
    And I should not find "Last hidden" in the app
    And I should not find "This is the first chapter" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "Chapt 1" in the app
    And I should find "Chapt 1.1" in the app
    And I should find "Chapt 2" in the app
    And I should find "Chapt 3" in the app
    But I should not find "Hidden chapter" in the app
    And I should not find "Hidden subchapter" in the app
    And I should not find "Last hidden" in the app

  Scenario: View book table of contents (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Basic book" in the app
    Then I should find "Test book description" in the app
    And I should find "Chapt 1" in the app
    And I should find "Chapt 1.1" in the app
    And I should find "Chapt 2" in the app
    And I should find "Hidden chapter" in the app
    And I should find "Hidden subchapter" in the app
    And I should find "Chapt 3" in the app
    And I should find "Last hidden" in the app
    And I should find "Start" in the app
    And I should not find "This is the first chapter" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "Chapt 1" in the app
    And I should find "Chapt 1.1" in the app
    And I should find "Chapt 2" in the app
    And I should find "Hidden chapter" in the app
    And I should find "Hidden subchapter" in the app
    And I should find "Chapt 3" in the app
    And I should find "Last hidden" in the app

  Scenario: Open chapters from table of contents
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Basic book" in the app
    When I press "Chapt 1" in the app
    Then I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    And the UI should match the snapshot
    But I should not find "This is the second chapter" in the app

    When I press the back button in the app
    And I press "Chapt 2" in the app
    Then I should find "Chapt 2" in the app
    And I should find "This is the second chapter" in the app
    But I should not find "This is the first chapter" in the app

  Scenario: View and navigate book contents (student)
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Basic book" in the app
    And I press "Start" in the app
    Then I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    And I should find "1 / 4" in the app

    When I press "Next" in the app
    Then I should find "Chapt 1.1" in the app
    And I should find "This is a subchapter" in the app
    And I should find "2 / 4" in the app
    But I should not find "This is the first chapter" in the app

    When I press "Next" in the app
    Then I should find "Chapt 2" in the app
    And I should find "This is the second chapter" in the app
    And I should find "3 / 4" in the app
    But I should not find "This is a subchapter" in the app

    When I press "Previous" in the app
    Then I should find "Chapt 1.1" in the app
    And I should find "This is a subchapter" in the app
    And I should find "2 / 4" in the app
    But I should not find "This is the second chapter" in the app

    # Navigate using TOC.
    When I press "Table of contents" in the app
    And I press "Chapt 1" in the app
    Then I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    And I should find "1 / 4" in the app
    But I should not find "This is a subchapter" in the app

    When I press "Table of contents" in the app
    And I press "Chapt 3" in the app
    Then I should find "Chapt 3" in the app
    And I should find "This is the third chapter" in the app
    And I should find "4 / 4" in the app
    But I should not find "This is the first chapter" in the app

    # Navigate using swipe.
    When I swipe to the left in "Chapt 3" "ion-slides" in the app
    Then I should find "Chapt 3" in the app
    And I should find "This is the third chapter" in the app
    And I should find "4 / 4" in the app

    When I swipe to the right in "Chapt 3" "ion-slides" in the app
    Then I should find "Chapt 2" in the app
    And I should find "This is the second chapter" in the app
    And I should find "3 / 4" in the app

    When I swipe to the right in "Chapt 2" "ion-slides" in the app
    Then I should find "Chapt 1.1" in the app
    And I should find "This is a subchapter" in the app
    And I should find "2 / 4" in the app

    When I swipe to the left in "Chapt 1.1" "ion-slides" in the app
    Then I should find "Chapt 2" in the app
    And I should find "This is the second chapter" in the app
    And I should find "3 / 4" in the app

Scenario: View and navigate book contents (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Basic book" in the app
    And I press "Start" in the app
    Then I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    And I should find "1 / 7" in the app

    When I press "Next" in the app
    Then I should find "Chapt 1.1" in the app
    And I should find "This is a subchapter" in the app
    And I should find "2 / 7" in the app
    But I should not find "This is the first chapter" in the app

    When I press "Next" in the app
    Then I should find "Chapt 2" in the app
    And I should find "This is the second chapter" in the app
    And I should find "3 / 7" in the app
    But I should not find "This is a subchapter" in the app

    When I press "Next" in the app
    Then I should find "Hidden chapter" in the app
    And I should find "This is a hidden chapter" in the app
    And I should find "4 / 7" in the app
    But I should not find "This is the second chapter" in the app

    When I press "Next" in the app
    Then I should find "Hidden subchapter" in the app
    And I should find "This is a hidden subchapter" in the app
    And I should find "5 / 7" in the app
    But I should not find "This is a hidden chapter" in the app

    When I press "Previous" in the app
    Then I should find "Hidden chapter" in the app
    And I should find "This is a hidden chapter" in the app
    And I should find "4 / 7" in the app
    But I should not find "This is a hidden subchapter" in the app

    # Navigate using TOC.
    When I press "Table of contents" in the app
    And I press "Chapt 1" in the app
    Then I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    And I should find "1 / 7" in the app
    But I should not find "This is a hidden chapter" in the app

    When I press "Table of contents" in the app
    And I press "Hidden subchapter" in the app
    Then I should find "Hidden subchapter" in the app
    And I should find "This is a hidden subchapter" in the app
    And I should find "5 / 7" in the app
    But I should not find "This is the first chapter" in the app

    # Navigate using swipe.
    When I swipe to the left in "Hidden subchapter" "ion-slides" in the app
    Then I should find "Chapt 3" in the app
    And I should find "This is the third chapter" in the app
    And I should find "6 / 7" in the app

    When I swipe to the left in "Chapt 3" "ion-slides" in the app
    Then I should find "Last hidden" in the app
    And I should find "Another hidden subchapter" in the app
    And I should find "7 / 7" in the app

    When I swipe to the left in "Last hidden" "ion-slides" in the app
    Then I should find "Last hidden" in the app
    And I should find "Another hidden subchapter" in the app
    And I should find "7 / 7" in the app

    When I swipe to the right in "Last hidden" "ion-slides" in the app
    Then I should find "Chapt 3" in the app
    And I should find "This is the third chapter" in the app
    And I should find "6 / 7" in the app

  Scenario: Link to book opens chapter content
    Given I entered the book activity "Basic book" on course "Course 1" as "student1" in the app
    Then I should find "This is the first chapter" in the app

  Scenario: Test numbering (student)
    Given the following "activities" exist:
      | activity | name      | intro                 | course | idnumber  | numbering |
      | book     | Bull book | Test book description | C1     | book2     | 2         |
      | book     | Ind book  | Test book description | C1     | book2     | 3         |
      | book     | None book | Test book description | C1     | book2     | 0         |
    And the following "mod_book > chapter" exist:
      | book      | title             | content                     | subchapter | hidden | pagenum |
      | Bull book | Chapt 1           | This is the first chapter   | 0          | 0      | 1       |
      | Ind book  | Chapt 1           | This is the first chapter   | 0          | 0      | 1       |
      | None book | Chapt 1           | This is the first chapter   | 0          | 0      | 1       |
    And I entered the course "Course 1" as "student1" in the app
    And I press "Basic book" in the app
    Then I should find "1. Chapt 1" in the app
    And I should find "1.1. Chapt 1.1" in the app
    And I should find "2. Chapt 2" in the app
    And I should find "3. Chapt 3" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "1. Chapt 1" in the app
    And I should find "1.1. Chapt 1.1" in the app
    And I should find "2. Chapt 2" in the app
    And I should find "3. Chapt 3" in the app

    When I press "Close" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press "Bull book" in the app
    Then I should find "• Chapt 1" in the app
    But I should not find "1. Chapt 1" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "• Chapt 1" in the app
    But I should not find "1. Chapt 1" in the app

    When I press "Close" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press "Ind book" in the app
    Then I should find "Chapt 1" in the app
    But I should not find "• Chapt 1" in the app
    And I should not find "1. Chapt 1" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "Chapt 1" in the app
    But I should not find "• Chapt 1" in the app
    And I should not find "1. Chapt 1" in the app

    When I press "Close" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press "None book" in the app
    Then I should find "Chapt 1" in the app
    But I should not find "• Chapt 1" in the app
    And I should not find "1. Chapt 1" in the app

    When I press "Start" in the app
    And I press "Table of contents" in the app
    Then I should find "Chapt 1" in the app
    But I should not find "• Chapt 1" in the app
    And I should not find "1. Chapt 1" in the app

  Scenario: Test numbering (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Basic book" in the app
    Then I should find "1. Chapt 1" in the app
    And I should find "1.1. Chapt 1.1" in the app
    And I should find "2. Chapt 2" in the app
    And I should find "x. Hidden chapter" in the app
    And I should find "x.x. Hidden subchapter" in the app
    And I should find "3. Chapt 3" in the app
    And I should find "3.x. Last hidden" in the app
