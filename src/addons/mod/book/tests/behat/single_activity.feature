@addon_mod_book @app @mod @mod_book @javascript @singleactivity
Feature: Test single activity of book type in app
  In order to view a book while using the mobile app
  As a student
  I need single activity of book type functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
    And the following "courses" exist:
      | fullname | shortname | category | format         | activitytype |
      | Course 1 | C1        | 0        | singleactivity | book         |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activity" exist:
      | activity | name                 | intro                 | course | idnumber | numbering | section |
      | book     | Single activity book | Test book description | C1     | 1        | 1         | 0       |
    And the following "mod_book > chapter" exist:
      | book                 | title   | content                    | subchapter | hidden | pagenum |
      | Single activity book | Chapt 1 | This is the first chapter  | 0          | 0      | 1       |
      | Single activity book | Chapt 2 | This is the second chapter | 0          | 0      | 1       |
      | Single activity book | Chapt 3 | This is the third chapter  | 0          | 0      | 1       |

  Scenario: Single activity book
    Given I entered the course "Course 1" as "student1" in the app
    Then I should find "Chapt 1" in the app
    And I should find "Chapt 2" in the app

    When I set "page-core-course-index core-course-image" styles to "background" "lightblue"
    And I set "page-core-course-index core-course-image" styles to "--core-image-visibility" "hidden"
    Then the UI should match the snapshot

    Then I press "Chapt 1" in the app
    And I should find "Chapt 1" in the app
    And I should find "This is the first chapter" in the app
    But I should not find "This is the second chapter" in the app
