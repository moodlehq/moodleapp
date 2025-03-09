@addon_mod_choice @app @mod @mod_choice @javascript @chartjs @lms_from5.0
Feature: Test basic usage of choice activity in app
  In order to participate in the choice while using the mobile app
  As a student
  I need basic choice functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student1  | student  | student1@example.com |
      | student2 | Student2  | student  | student2@example.com |
      | student3 | Student3  | student  | student3@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
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
    Given the following "activities" exist:
      | activity | name              | course | idnumber | option                       | groupmode | showresults |
      | choice   | Sep groups choice | C1     | choice1  | Option 1, Option 2, Option 3 | 1         | 3           |
      | choice   | Vis groups choice | C1     | choice1  | Option 1, Option 2, Option 3 | 2         | 3           |
    # TODO: Generate answers with generators instead of doing it in the app.

  Scenario: Students can only see their groups in separate groups, teachers can see them all
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Sep groups choice" in the app
    When I select "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    Then I should find "Option 1: 1" in the app
    And I should find "Option 2: 0" in the app
    And I should find "Option 3: 0" in the app

    When I press "Separate groups" in the app
    Then I should find "Group 1" in the app
    And I should not find "Group 2" in the app
    And I should not find "All participants" in the app

    When I entered the course "Course 1" as "student2" in the app
    And I press "Sep groups choice" in the app
    And I select "Option 2" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    And I press "Separate groups" in the app
    Then I should find "Group 1" in the app
    And I should find "Group 2" in the app
    And I should not find "All participants" in the app

    When I press "Group 1" in the app
    Then I should find "Option 1: 1" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I entered the course "Course 1" as "student3" in the app
    And I press "Sep groups choice" in the app
    Then I should find "Sorry, but you need to be part of a group to see this page" in the app
    And I should not find "Separate groups" in the app
    And I should not find "Option 3: 0" in the app

    When I entered the course "Course 1" as "teacher1" in the app
    And I press "Sep groups choice" in the app
    And I press "Separate groups" in the app
    Then I should find "Group 1" in the app
    And I should find "Group 2" in the app
    And I should find "All participants" in the app

    When I press "Group 1" in the app
    Then I should find "Option 1: 1" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Separate groups" in the app
    And I press "All participants" in the app
    Then I should find "Option 1: 1" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

  Scenario: Students can view all groups in visible groups
    Given I entered the course "Course 1" as "student2" in the app
    And I press "Vis groups choice" in the app
    And I select "Option 2" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    And I entered the course "Course 1" as "student3" in the app
    And I press "Vis groups choice" in the app

    When I select "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    And I press "Visible groups" in the app
    Then I should find "Group 1" in the app
    And I should find "Group 2" in the app
    And I should find "All participants" in the app

    When I press "Group 1" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Visible groups" in the app
    And I press "All participants" in the app
    Then I should find "Option 1: 1" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

  Scenario: Prefetch results with groups
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Vis groups choice" in the app
    And I select "Option 2" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    And I entered the course "Course 1" as "student3" in the app

    When I press "Course downloads" in the app
    And I press "Download" within "Vis groups choice" "ion-item" in the app
    Then I should find "Downloaded" within "Vis groups choice" "ion-item" in the app

    When I go back in the app
    And I switch network connection to offline
    And I press "Vis groups choice" in the app
    And I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 0" in the app
    And I should find "Option 3: 0" in the app

    When I press "Visible groups" in the app
    And I press "All participants" in the app
    Then I should find "Option 1: 0" in the app
    And I should find "Option 2: 1" in the app
    And I should find "Option 3: 0" in the app
