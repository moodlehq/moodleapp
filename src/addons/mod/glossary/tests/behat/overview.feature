@addon_mod_glossary @app @mod @mod_glossary @javascript @lms_from5.1
Feature: Activities overview for glossary activity

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Username  | 1        |
      | student2 | Username  | 2        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name                             | course | idnumber  | defaultapproval | allowcomments |
      | glossary | Glossary without defaultapproval | C1     | glossary1 | 0               | 1             |
      | glossary | Glossary without entries         | C1     | glossary2 | 0               | 0             |
      | glossary | Glossary with comments           | C1     | glossary3 | 1               | 1             |
    And the following "mod_glossary > entries" exist:
      | glossary  | user     | concept  | definition                                       | approved |
      | glossary1 | teacher1 | Dragon   | Large, winged, fire-breathing reptilian monster. | 1        |
      | glossary1 | student1 | Griffin  | Lion body, eagle head and wings.                 | 1        |
      | glossary1 | student1 | Minotaur | Half-human, half-bull, lived in labyrinth.       | 0        |
      | glossary1 | student1 | Hydra    | Many-headed serpent; regrows heads when cut.     | 0        |
      | glossary1 | student2 | Centaur  | Half-human, half-horse creature from Greek myth. | 0        |
      | glossary3 | student1 | Phoenix  | Mythical bird, regenerates from ashes.           | 1        |

  Scenario: Teacher can see the glossary relevant information in the glossary overview
    # Add a few comments.
    Given I am on the "Glossary with comments" "glossary activity" page logged in as student2
    And I click on "Comments (0)" "link"
    And I set the following fields to these values:
      | Comment        | My first comment |
    And I click on "Save comment" "link"
    And I set the following fields to these values:
      | Comment        | My second comment |
    And I click on "Save comment" "link"
    And I entered the course "Course 1" as "teacher1" in the app

    When I press "Activities" in the app
    And I press "Glossaries" in the app
    And I press "Glossary without defaultapproval" "ion-item" in the app
    Then I should find "0" within "Comments" "ion-item" in the app
    And I should find "2" within "Entries" "ion-item" in the app
    And I should find "Approve" within "Actions" "ion-item" in the app
    And I should find "3" within "Approve" "ion-button" in the app

    When I press "Approve" in the app
    Then the header should be "Glossary without defaultapproval" in the app
    And I should find "Dragon" in the app

    When I go back in the app
    And I press "Glossary without entries" "ion-item" in the app
    Then I should find "-" within "Comments" "ion-item" in the app
    And I should find "0" within "Entries" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" in the app
    Then the header should be "Glossary without entries" in the app
    And I should find "No entries were found" in the app

    When I go back in the app
    And I press "Glossary with comments" "ion-item" in the app
    Then I should find "2" within "Comments" "ion-item" in the app
    And I should find "1" within "Entries" "ion-item" in the app
    And I should be able to press "View" within "Actions" "ion-item" in the app

  Scenario: Students can see the glossary relevant information in the glossary overview
    # Add a few comments.
    Given I am on the "Glossary with comments" "glossary activity" page logged in as student2
    And I click on "Comments (0)" "link"
    And I set the following fields to these values:
      | Comment        | My first comment |
    And I click on "Save comment" "link"
    And I set the following fields to these values:
      | Comment        | My second comment |
    And I click on "Save comment" "link"
    And I entered the course "Course 1" as "student1" in the app

    When I press "Activities" in the app
    And I press "Glossaries" in the app
    And I press "Glossary without defaultapproval" "ion-item" in the app
    Then I should find "0" within "Comments" "ion-item" in the app
    And I should find "2" within "Total entries" "ion-item" in the app
    And I should find "3" within "My entries" "ion-item" in the app
    And I should not find "Actions" in the app

    When I press "Glossary without entries" "ion-item" in the app
    Then I should find "-" within "Comments" "ion-item" in the app
    And I should find "0" within "Total entries" "ion-item" in the app
    And I should find "0" within "My entries" "ion-item" in the app

    When I press "Glossary with comments" "ion-item" in the app
    Then I should find "2" within "Comments" "ion-item" in the app
    And I should find "1" within "Total entries" "ion-item" in the app
    And I should find "1" within "My entries" "ion-item" in the app
