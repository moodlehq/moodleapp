@addon_competency @app @tool @tool_lp @javascript
Feature: Test competency navigation

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username  | firstname | lastname |
      | student1  | Student   | first    |
      | student2  | Student   | second   |
      | teacher1  | Teacher   | first   |
    And the following "system role assigns" exist:
      | user     | role           | contextlevel |
      | teacher1 | editingteacher | System       |
    And the following "permission overrides" exist:
      | capability                 | permission | role           | contextlevel | reference |
      | moodle/competency:planview | Allow      | editingteacher | System       |           |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | teacher1 | C1     | editingteacher |
      | admin    | C1     | editingteacher |
    And the following "scales" exist:
      | name       | scale            |
      | Test Scale | Bad, Good, Great |
    And the following "core_competency > frameworks" exist:
      | shortname | idnumber | scale      |
      | Cookery   | cookery  | Test Scale |
      | Literacy  | literacy | Test Scale |
    And the following "core_competency > competencies" exist:
      | shortname      | idnumber       | description            | competencyframework |
      | Salads         | salads         | Salads are important   | cookery             |
      | Desserts       | desserts       | Desserts are important | cookery             |
      | Cakes          | cakes          | Cakes are important    | cookery             |
      | Reading        | reading        | Reading is important   | literacy            |
      | Writing        | writing        | Writing is important   | literacy            |
    And the following "core_competency > related_competencies" exist:
      | competency | relatedcompetency |
      | desserts   | cakes             |
    And the following "core_competency > plans" exist:
      | name     | description           | competencies            | user     | status |
      | Cookery  | Cookery is important  | salads, desserts, cakes | student1 | active |
      | Literacy | Literacy is important | reading, writing        | student1 | active |
    And the following "core_competency > course_competencies" exist:
      | course | competency |
      | C1     | salads     |
      | C1     | desserts   |
      | C1     | cakes      |
      | C1     | reading    |
      | C1     | writing    |
    And the following "core_competency > user_competency" exist:
      | competency | user     | grade |
      | salads     | student1 | Good  |
      | desserts   | student1 | Great |
      | cakes      | student1 | Great |
      | reading    | student2 | Great |
      | writing    | student2 | Bad   |
    And the following "core_competency > user_competency_courses" exist:
      | course | competency | user     | grade |
      | C1     | salads     | student1 | Good  |
      | C1     | desserts   | student1 | Great |
      | C1     | cakes      | student1 | Great |
      | C1     | reading    | student2 | Great |
      | C1     | writing    | student2 | Bad   |

  Scenario: Mobile navigation (student)
    Given I entered the course "Course 1" as "student1" in the app

    # Course competencies
    When I press "Competencies" in the app
    Then I should find "60%" near "You are proficient in 3 out of 5 competencies in this course" in the app
    And I should find "Good" within "salads" "ion-item" in the app
    And I should find "Salads are important" in the app
    And I should find "Great" within "desserts" "ion-item" in the app
    And I should find "Desserts are important" in the app
    And I should find "Great" within "cakes" "ion-item" in the app
    And I should find "Cakes are important" in the app
    And I should find "Reading is important" in the app
    And I should find "Writing is important" in the app
    But I should not find "Bad" within "reading" "ion-item" in the app
    And I should not find "Good" within "reading" "ion-item" in the app
    And I should not find "Great" within "reading" "ion-item" in the app
    And I should not find "Bad" within "writing" "ion-item" in the app
    And I should not find "Good" within "writing" "ion-item" in the app
    And I should not find "Great" within "writing" "ion-item" in the app

    # Course competencies details
    When I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app

    # Course competencies details — Swipe
    When I swipe to the right in the app
    Then I should find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Desserts are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Desserts are important" in the app

    # Course competencies summary
    When I press "Desserts" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

    # Learning plans
    When I go back to the root page in the app
    And I press the user menu button in the app
    And I press "Learning plans" in the app
    Then I should find "Cookery" in the app
    And I should find "Literacy" in the app

    # Learning plans details
    When I press "Cookery" in the app
    Then I should find "Cookery is important" in the app
    And I should find "100.0" near "3 out of 3 competencies are proficient" in the app
    And I should find "Good" within "Salads" "ion-item" in the app
    And I should find "Great" within "Desserts" "ion-item" in the app
    And I should find "Great" within "Cakes" "ion-item" in the app
    But I should not find "Literacy" in the app
    And I should not find "Reading" in the app
    And I should not find "Writing" in the app

    # Learning plans details — Swipe
    When I swipe to the right in the app
    Then I should find "Cookery is important" in the app

    When I swipe to the left in the app
    Then I should find "Literacy is important" in the app
    And I should find "0.0" near "0 out of 2 competencies are proficient" in the app
    And I should find "Reading" in the app
    And I should find "Writing" in the app
    But I should not find "Bad" in the app
    And I should not find "Good" in the app
    And I should not find "Great" in the app
    And I should not find "Cookery" in the app

    # Learning plans competency details
    When I swipe to the right in the app
    And I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app

    # Learning plans competency details — Swipe
    When I swipe to the right in the app
    Then I should find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Desserts are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Desserts are important" in the app

    # Learning plans competency summary
    When I press "Desserts" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

    # Event logs
    And the following events should have been logged for "student1" in the app:
      | name                                                    | object     | objectname | course   |
      | \core\event\competency_user_competency_viewed_in_plan	|            |            |          |
      | \core\event\competency_viewed	                        | competency | Desserts   |          |
      | \core\event\competency_user_competency_viewed_in_course |            |            | Course 1 |

  Scenario: Mobile navigation (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app

    # Participant competencies
    When I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Competencies" in the app
    Then I should find "Student first" in the app
    And I should find "Good" within "salads" "ion-item" in the app
    And I should find "Salads are important" in the app
    And I should find "Great" within "desserts" "ion-item" in the app
    And I should find "Desserts are important" in the app
    And I should find "Great" within "cakes" "ion-item" in the app
    And I should find "Cakes are important" in the app
    And I should find "Reading is important" in the app
    And I should find "Writing is important" in the app
    But I should not find "Bad" within "reading" "ion-item" in the app
    And I should not find "Good" within "reading" "ion-item" in the app
    And I should not find "Great" within "reading" "ion-item" in the app
    And I should not find "Bad" within "writing" "ion-item" in the app
    And I should not find "Good" within "writing" "ion-item" in the app
    And I should not find "Great" within "writing" "ion-item" in the app

    # Participant competencies detail
    When I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app

    # Participant competencies detail — Swipe
    When I swipe to the right in the app
    Then I should find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Desserts are important" in the app
    And I should find "Student first" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Cakes are important" in the app
    And I should find "Student first" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Desserts are important" in the app

    # Participant competencies summary
    When I press "Desserts" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

    # User learning plans
    When I go back to the root page in the app
    And I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student" in the app
    And I press "Search" "button" in the app
    And I press "Student first" in the app
    And I press "Display options" in the app
    And I press "User info" in the app
    And I press "Learning plans" in the app
    Then I should find "Cookery" in the app
    And I should find "Literacy" in the app

    # User learning plans details
    When I press "Cookery" in the app
    Then I should find "Cookery is important" in the app
    And I should find "100.0" near "3 out of 3 competencies are proficient" in the app
    And I should find "Student first" in the app
    And I should find "Good" within "Salads" "ion-item" in the app
    And I should find "Great" within "Desserts" "ion-item" in the app
    And I should find "Great" within "Cakes" "ion-item" in the app
    But I should not find "Literacy" in the app
    And I should not find "Reading" in the app
    And I should not find "Writing" in the app

    # User learning plans details — Swipe
    When I swipe to the right in the app
    Then I should find "Cookery is important" in the app

    When I swipe to the left in the app
    Then I should find "Literacy is important" in the app
    And I should find "0.0" near "0 out of 2 competencies are proficient" in the app
    And I should find "Student first" in the app
    And I should find "Reading" in the app
    And I should find "Writing" in the app
    But I should not find "Bad" in the app
    And I should not find "Good" in the app
    And I should not find "Great" in the app
    And I should not find "Cookery" in the app

    # User learning plans competency details
    When I swipe to the right in the app
    And I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app

    # User learning plans competency details — Swipe
    When I swipe to the right in the app
    Then I should find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Desserts are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Salads are important" in the app

    When I swipe to the left in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Desserts are important" in the app

    # User learning plans competency summary
    When I press "Desserts" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

  Scenario: Tablet navigation (student)
    Given I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    # Course competencies
    When I press "Competencies" in the app
    Then I should find "60%" near "You are proficient in 3 out of 5 competencies in this course" in the app
    And I should find "Good" within "salads" "ion-item" in the app
    And I should find "Salads are important" in the app
    And I should find "Great" within "desserts" "ion-item" in the app
    And I should find "Desserts are important" in the app
    And I should find "Great" within "cakes" "ion-item" in the app
    And I should find "Cakes are important" in the app
    And I should find "Reading is important" in the app
    And I should find "Writing is important" in the app
    But I should not find "Bad" within "reading" "ion-item" in the app
    And I should not find "Good" within "reading" "ion-item" in the app
    And I should not find "Great" within "reading" "ion-item" in the app
    And I should not find "Bad" within "writing" "ion-item" in the app
    And I should not find "Good" within "writing" "ion-item" in the app
    And I should not find "Great" within "writing" "ion-item" in the app

    # Course competencies details
    When I press "Salads" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app
    And "Salads" near "Desserts" should be selected in the app
    But I should not find "Desserts are important" in the app

    # Course competencies details — Split view
    When I press "Cakes" in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    But I should not find "Salads are important" in the app

    # Course competencies summary
    When I press "Desserts" near "Cross-referenced competencies" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

    # Learning plans
    When I press the user menu button in the app
    And I press "Learning plans" in the app
    Then I should find "Cookery" in the app
    And I should find "Literacy" in the app
    And I should find "Cookery is important" in the app
    And I should find "100.0" near "3 out of 3 competencies are proficient" in the app
    And I should find "Good" within "Salads" "ion-item" in the app
    And I should find "Great" within "Desserts" "ion-item" in the app
    And I should find "Great" within "Cakes" "ion-item" in the app
    And "Cookery" near "Literacy" should be selected in the app
    But I should not find "Literacy" inside the split-view content in the app
    And I should not find "Reading" inside the split-view content in the app
    And I should not find "Writing" inside the split-view content in the app

    # Learning plans — Split view
    When I press "Literacy" in the app
    Then I should find "0.0" near "0 out of 2 competencies are proficient" in the app
    And "Literacy" near "Cookery" should be selected in the app
    But I should not find "Bad" in the app
    And I should not find "Good" in the app
    And I should not find "Great" in the app

    # Learning plans competency details
    When I press "Cookery" in the app
    And I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app
    And "Salads" near "Desserts" should be selected in the app

    # Learning plans competency details — Split view
    When I press "Cakes" in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    And "Cakes" near "Salads" should be selected in the app
    But I should not find "Cookery is important" in the app

    # Learning plans competency summary
    When I press "Desserts" near "Cross-referenced competencies" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

  Scenario: Tablet navigation (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    # Participant competencies
    When I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Competencies" within "Student first" "page-core-user-participants" in the app
    Then I should find "Student first" in the app
    And I should find "Salads are important" in the app
    And I should find "Good" within "salads" "ion-item" in the app
    And I should find "Great" within "desserts" "ion-item" in the app
    And I should find "Great" within "cakes" "ion-item" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app
    And "Salads" near "Desserts" should be selected in the app
    But I should not find "Desserts are important" in the app
    And I should not find "Bad" within "reading" "ion-item" in the app
    And I should not find "Good" within "reading" "ion-item" in the app
    And I should not find "Great" within "reading" "ion-item" in the app
    And I should not find "Bad" within "writing" "ion-item" in the app
    And I should not find "Good" within "writing" "ion-item" in the app
    And I should not find "Great" within "writing" "ion-item" in the app

    # Participant competencies — Swipe
    When I press "Cakes" in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    And "Cakes" near "Reading" should be selected in the app
    But I should not find "Salads are important" in the app

    # Participant competencies summary
    When I press "Desserts" near "Cross-referenced competencies" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

    # User learning plans
    When I press "Messages" in the app
    And I press "Search people and messages" in the app
    And I set the field "Search" to "student" in the app
    And I press "Search" "button" in the app
    And I press "Display options" in the app
    And I press "User info" in the app
    And I press "Learning plans" in the app
    Then I should find "Cookery is important" in the app
    And I should find "Literacy" in the app
    And I should find "100.0" near "3 out of 3 competencies are proficient" in the app
    And I should find "Good" within "Salads" "ion-item" in the app
    And I should find "Great" within "Desserts" "ion-item" in the app
    And I should find "Great" within "Cakes" "ion-item" in the app
    And "Cookery" near "Literacy" should be selected in the app
    But I should not find "Reading" in the app
    And I should not find "Writing" in the app

    # User learning plans — Split view
    When I press "Literacy" in the app
    Then I should find "0.0" near "0 out of 2 competencies are proficient" in the app
    And "Literacy" near "Cookery" should be selected in the app
    But I should not find "Bad" in the app
    And I should not find "Good" in the app
    And I should not find "Great" in the app

    # User learning plans competency details
    When I press "Cookery" in the app
    And I press "Salads" in the app
    Then I should find "Salads are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Good" within "Rating" "ion-item" in the app
    And "Salads" near "Desserts" should be selected in the app

    # User learning plans competency details — Split view
    When I press "Cakes" in the app
    Then I should find "Cakes are important" in the app
    And I should find "Yes" within "Proficient" "ion-item" in the app
    And I should find "Great" within "Rating" "ion-item" in the app
    And "Cakes" near "Salads" should be selected in the app
    But I should not find "Cookery is important" in the app

    # User learning plans competency summary
    When I press "Desserts" near "Cross-referenced competencies" in the app
    Then I should find "Desserts are important" in the app
    But I should not find "Cakes" in the app

  @lms_from4.4
  Scenario: Disable features
    Given the following config values are set as admin:
      | enabled | 0 | core_competency |

    When I entered the course "Course 1" as "student1" in the app
    Then I should not find "Competencies" in the app

    When I go back to the root page in the app
    And I press the user menu button in the app

    Then I should not find "Learning plans" in the app
