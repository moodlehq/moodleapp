@addon_mod_assign @app @javascript
Feature: Test assignments navigation

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | teacher1 | Teacher   | teacher  |
      | student1 | First     | Student  |
      | student2 | Second    | Student  |
      | student3 | Third     | Student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
      | Group 2 | C1     | G2       |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |
      | student2 | G1    |
      | student2 | G2    |
      | student3 | G2    |
    And the following "activities" exist:
      | activity | name       | course | idnumber   | assignsubmission_onlinetext_enabled | duedate | groupmode |
      | assign   | Assignment | C1     | assignment | 1                                   | 0       | 1         |
    And the following "mod_assign > submissions" exist:
      | assign     | user      | onlinetext |
      | assignment | student1  | Lorem      |
      | assignment | student3  | Ipsum      |

  Scenario: Mobile navigation on assignment
    Given I entered the course "Course 1" as "teacher1" in the app

    # Initial status
    When I press "Assignment" in the app
    Then I should find "3" near "Participants" in the app
    And I should find "2" near "Drafts" in the app

    # Participants
    When I press "Participants" in the app
    Then I should find "First Student" in the app
    And I should find "Second Student" in the app
    And I should find "Third Student" in the app

    # Participants — swipe
    When I press "First Student" in the app
    And I swipe to the right in the app
    Then I should find "First Student" in the app
    But I should not find "Second Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Second Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

    # Drafts
    When I go back 2 times in the app
    And I press "Drafts" in the app
    Then I should find "First Student" in the app
    And I should find "Third Student" in the app
    But I should not find "Second Student" in the app

    # Drafts — swipe
    When I press "First Student" in the app
    And I swipe to the right in the app
    Then I should find "First Student" in the app
    But I should not find "Second Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

    # Filter groups in assignment page
    When I go back 2 times in the app
    And I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "2" near "Participants" in the app
    And I should find "1" near "Drafts" in the app

    When I press "Participants" in the app
    Then I should find "First Student" in the app
    And I should find "Second Student" in the app
    But I should not find "Third Student" in the app

    When I press "First Student" in the app
    And I swipe to the right in the app
    Then I should find "First Student" in the app
    But I should not find "Second Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Second Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Second Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Third Student" in the app

    # Filter groups in submissions page
    When I go back in the app
    And I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "Second Student" in the app
    And I should find "Third Student" in the app
    But I should not find "First Student" in the app

    When I press "Second Student" in the app
    And I swipe to the right in the app
    Then I should find "Second Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Third Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

    When I swipe to the left in the app
    Then I should find "Third Student" in the app
    But I should not find "First Student" in the app
    And I should not find "Second Student" in the app

  Scenario: Tablet navigation on assignment
    Given I entered the course "Course 1" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    # Initial status
    When I press "Assignment" in the app
    Then I should find "3" near "Participants" in the app
    And I should find "2" near "Drafts" in the app

    # Participants
    When I press "Participants" in the app
    Then I should find "First Student" in the app
    And I should find "Second Student" in the app
    And I should find "Third Student" in the app
    And "First Student" near "Third Student" should be selected in the app
    And I should find "First Student" inside the split-view content in the app
    But I should not find "Second Student" inside the split-view content in the app
    And I should not find "Third Student" inside the split-view content in the app

    # Participants — Split view
    When I press "Second Student" in the app
    Then "Second Student" near "Third Student" should be selected in the app
    And I should find "Second Student" inside the split-view content in the app
    But I should not find "First Student" inside the split-view content in the app
    And I should not find "Third Student" inside the split-view content in the app

    # Drafts
    When I go back in the app
    And I press "Drafts" in the app
    Then I should find "First Student" in the app
    And I should find "Third Student" in the app
    And "First Student" near "Third Student" should be selected in the app
    And I should find "First Student" inside the split-view content in the app
    But I should not find "Second Student" in the app
    And I should not find "Third Student" inside the split-view content in the app

    # Drafts — Split view
    When I press "Third Student" in the app
    Then "Third Student" near "First Student" should be selected in the app
    And I should find "Third Student" inside the split-view content in the app
    But I should not find "First Student" inside the split-view content in the app
    And I should not find "Second Student" in the app

    # Filter groups in assignment page
    When I go back in the app
    And I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "2" near "Participants" in the app
    And I should find "1" near "Drafts" in the app

    When I press "Participants" in the app
    Then I should find "First Student" in the app
    And I should find "Second Student" in the app
    And "First Student" near "Second Student" should be selected in the app
    And I should find "First Student" inside the split-view content in the app
    But I should not find "Third Student" in the app
    And I should not find "Second Student" inside the split-view content in the app

    # Filter groups in submissions page
    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "Second Student" in the app
    And I should find "Third Student" in the app
    And "Second Student" near "Third Student" should be selected in the app
    And I should find "Second Student" inside the split-view content in the app
    But I should not find "First Student" in the app
    And I should not find "Third Student" inside the split-view content in the app

    When I press "Third Student" in the app
    Then "Third Student" near "Second Student" should be selected in the app
    And I should find "Third Student" inside the split-view content in the app
    But I should not find "Second Student" inside the split-view content in the app
    And I should not find "First Student" in the app
