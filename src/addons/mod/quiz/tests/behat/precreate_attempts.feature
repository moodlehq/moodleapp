
Feature: Precreated attempts for quizzes

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
      | Test questions   | truefalse   | TF2   | Text of the second question |

  Scenario: Student cannot see pre-created attempts, but can start them once quiz is open
    Given the following "activities" exist:
      | activity   | name          | intro              | course | idnumber | timeopen     |
      | quiz       | Quiz open     | Quiz 1 description | C1     | quiz1    | ##-1 hours## |
      | quiz       | Quiz not open | Quiz 2 description | C1     | quiz2    | ##+1 hours## |
    And quiz "Quiz open" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And quiz "Quiz not open" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And quiz "Quiz open" has pre-created attempts
    And quiz "Quiz not open" has pre-created attempts
    And I entered the course "Course 1" as "student1" in the app
    When I press "Quiz not open" in the app
    Then I should find "This quiz is currently not available" in the app
    And I should not find "Attempt 1" in the app
    And I should not be able to press "Attempt quiz now" in the app

    When I go back in the app
    And I press "Quiz open" in the app
    Then I should not find "Attempt 1" in the app
    And I should not find "This quiz is currently not available" in the app

    When I press "Attempt quiz now" in the app
    Then I should find "Text of the first question" in the app

    When I go back in the app
    And I wait loading to finish in the app
    Then I should find "Attempt 1" in the app
    And I should find "In progress" in the app

    When I press "Continue your attempt" in the app
    And I press "True" in the app
    And I press "Next" in the app
    And I press "False" in the app
    And I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "Submit" in the app
    Then I should find "Finished" in the app

  Scenario: Student can prefetch open quiz with pre-created attempts
    Given the following "activities" exist:
      | activity   | name          | intro              | course | idnumber | timeopen     | allowofflineattempts |
      | quiz       | Quiz open     | Quiz 1 description | C1     | quiz1    | ##-1 hours## | 1                    |
      | quiz       | Quiz not open | Quiz 2 description | C1     | quiz2    | ##+1 hours## | 1                    |
    And quiz "Quiz open" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And quiz "Quiz not open" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And quiz "Quiz open" has pre-created attempts
    And quiz "Quiz not open" has pre-created attempts
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Course downloads" in the app
    Then I should find "Download" within "Quiz open" "ion-item" in the app
    And I should not find "Download" within "Quiz not open" "ion-item" in the app

    When I press "Download" within "Quiz open" "ion-item" in the app
    Then I should find "Downloaded" within "Quiz open" "ion-item" in the app

    When I switch network connection to offline
    And I go back in the app
    And I press "Quiz open" in the app
    Then I should find "Attempt 1" in the app
    And I should find "In progress" in the app

    When I press "Continue your attempt" in the app
    And I press "True" in the app
    And I press "Next" in the app
    And I press "False" in the app
    And I press "Submit" in the app
    And I press "Submit all and finish" in the app
    And I press "Submit" in the app
    Then I should find "This Quiz has offline data to be synchronised" in the app
    And I should find "Submitted (Offline)" in the app

    When I switch network connection to wifi
    And I pull to refresh in the app
    Then I should find "Finished" in the app
    And I should find "Re-attempt quiz" in the app
