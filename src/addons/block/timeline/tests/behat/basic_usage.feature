@addon_block_timeline @app @block @block_timeline @javascript
Feature: Timeline block.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
      | Course 3 | C3        |
      | Course 4 | C4        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student1 | C3     | student |
      | student1 | Acceptance test site | student |
    And the following "activities" exist:
      | activity | course               | idnumber  | name          | duedate        |
      | assign   | Acceptance test site | assign00  | Assignment 00 | ##tomorrow##   |
      | assign   | C2                   | assign01  | Assignment 01 | ##yesterday##  |
      | assign   | C1                   | assign02  | Assignment 02 | ##tomorrow##   |
      | assign   | C1                   | assign03  | Assignment 03 | ##tomorrow##   |
      | assign   | C2                   | assign04  | Assignment 04 | ##+2 days##    |
      | assign   | C1                   | assign05  | Assignment 05 | ##+5 days##    |
      | assign   | C2                   | assign06  | Assignment 06 | ##+31 days##   |
      | assign   | C2                   | assign07  | Assignment 07 | ##+31 days##   |
      | assign   | C3                   | assign08  | Assignment 08 | ##+31 days##   |
      | assign   | C2                   | assign09  | Assignment 09 | ##+31 days##   |
      | assign   | C1                   | assign10  | Assignment 10 | ##+31 days##   |
      | assign   | C1                   | assign11  | Assignment 11 | ##+6 months##  |
      | assign   | C1                   | assign12  | Assignment 12 | ##+6 months##  |
      | assign   | C1                   | assign13  | Assignment 13 | ##+6 months##  |
      | assign   | C2                   | assign14  | Assignment 14 | ##+6 months##  |
      | assign   | C2                   | assign15  | Assignment 15 | ##+6 months##  |
      | assign   | C2                   | assign16  | Assignment 16 | ##+6 months##  |
      | assign   | C3                   | assign17  | Assignment 17 | ##+6 months##  |
      | assign   | C3                   | assign18  | Assignment 18 | ##+6 months##  |
      | assign   | C3                   | assign19  | Assignment 19 | ##+6 months##  |
      | assign   | C1                   | assign20  | Assignment 20 | ##+1 year##    |
      | assign   | C1                   | assign21  | Assignment 21 | ##+1 year##    |
      | assign   | C2                   | assign22  | Assignment 22 | ##+1 year##    |
      | assign   | C2                   | assign23  | Assignment 23 | ##+1 year##    |
      | assign   | C3                   | assign24  | Assignment 24 | ##+1 year##    |
      | assign   | C3                   | assign25  | Assignment 25 | ##+1 year##    |

  Scenario: See courses inside block
    Given I entered the app as "student1"
    Then I should find "Assignment 00" within "Timeline" "ion-card" in the app
    And I should find "Assignment 02" within "Timeline" "ion-card" in the app
    And I should find "Assignment 05" within "Timeline" "ion-card" in the app
    And I should find "Course 1" within "Timeline" "ion-card" in the app
    And I should find "Course 2" within "Timeline" "ion-card" in the app
    But I should not find "Assignment 01" within "Timeline" "ion-card" in the app
    And I should not find "Course 3" within "Timeline" "ion-card" in the app

    When I press "Filter timeline by date" in the app
    And I press "Overdue" in the app
    Then I should find "Assignment 01" within "Timeline" "ion-card" in the app
    And I should find "Course 2" within "Timeline" "ion-card" in the app
    But I should not find "Assignment 00" within "Timeline" "ion-card" in the app
    And I should not find "Assignment 02" within "Timeline" "ion-card" in the app
    And I should not find "Course 1" within "Timeline" "ion-card" in the app
    And I should not find "Course 3" within "Timeline" "ion-card" in the app

    When I press "Filter timeline by date" in the app
    And I press "All" in the app
    Then I should find "Assignment 19" within "Timeline" "ion-card" in the app
    And I should find "Course 3" within "Timeline" "ion-card" in the app
    But I should not find "Assignment 20" within "Timeline" "ion-card" in the app

    When I press "Load more" in the app
    Then I should find "Assignment 21" within "Timeline" "ion-card" in the app
    And I should find "Assignment 25" within "Timeline" "ion-card" in the app

    When I press "Filter timeline by date" in the app
    And I press "Next 7 days" in the app
    And I press "Sort by" in the app
    And I press "Sort by courses" in the app
    Then I should find "Course 1" "h3" within "Timeline" "ion-card" in the app
    And I should find "Course 2" "h3" within "Timeline" "ion-card" in the app
    And I should find "Assignment 02" within "Timeline" "ion-card" in the app
    And I should find "Assignment 04" within "Timeline" "ion-card" in the app
    But I should not find "Course 3" within "Timeline" "ion-card" in the app

    When the following "activities" exist:
      | activity | course | idnumber  | name           | duedate      |
      | assign   | C1     | newassign | New Assignment | ##tomorrow## |
    And I pull to refresh in the app
    Then I should find "New Assignment" in the app

  Scenario: Search
    Given I entered the app as "student1"
    Then I should find "Assignment 00" within "Timeline" "ion-card" in the app

    When I set the field "Search by activity type or name" to "thisdoesntexist" in the app
    And I press "Search" in the app
    Then I should find "No activities require action" in the app
    But I should not find "Assignment 00" within "Timeline" "ion-card" in the app

    When I press "Clear search" in the app
    Then I should find "Assignment 00" within "Timeline" "ion-card" in the app

    When I press "Sort by" in the app
    And I press "Sort by courses" in the app
    Then I should find "Course 1" in the app
    And I should find "Assignment 02" within "Timeline" "ion-card" in the app

    When I set the field "Search by activity type or name" to "thisdoesntexist" in the app
    And I press "Search" in the app
    Then I should find "No activities require action" in the app
    But I should not find "Course 1" in the app
    And I should not find "Assignment 02" within "Timeline" "ion-card" in the app
