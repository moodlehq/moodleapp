@core_enrol @app @enrol @enrol_self @javascript
Feature: Users can auto-enrol themself in courses where self enrolment is allowed
  In order to participate in courses while using the mobile app
  As a user
  I need to auto enrol me in courses

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | 1 | teacher1@example.com |
      | student1 | Student | 1 | student1@example.com |
      | student2 | Student | 2 | student2@example.com |
    And the following "courses" exist:
      | fullname | shortname | format | initsections |
      | Course 1 | C1        | topics | 1            |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |

  Scenario: Self-enrolment enabled
    Given I log in as "teacher1"
    When I add "Self enrolment" enrolment method in "Course 1" with:
      | Custom instance name | Test student enrolment |

    And I entered the app as "student1"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "Enrol me" in the app
    And I press "Enrol me" in the app
    And I wait loading to finish in the app
    Then the header should be "Course 1" in the app
    And I should find "Section 1" in the app
    And I should not find "Enrol me" in the app

  Scenario: Self-enrolment enabled requiring an enrolment key
    Given I log in as "teacher1"
    When I add "Self enrolment" enrolment method in "Course 1" with:
      | Custom instance name | Test student enrolment |
      | Enrolment key | moodle_rules |

    And I entered the app as "student1"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "Enrol me" in the app
    And I set the field "Enrolment key" to "moodle_rules" in the app
    And I press "Enrol me" in the app
    And I wait loading to finish in the app
    Then the header should be "Course 1" in the app
    And I should find "Section 1" in the app
    And I should not find "Enrol me" in the app

  Scenario: Self-enrolment disabled
    Given I entered the app as "student1"

    When I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app

    Then I should find "Course summary" in the app
    And I should find "Course" in the app
    And I should find "You cannot enrol yourself in this course" in the app

  Scenario: Self-enrolment enabled requiring a group enrolment key
    Given I log in as "teacher1"
    When I add "Self enrolment" enrolment method in "Course 1" with:
      | Custom instance name     | Test student enrolment |
      | Enrolment key            | moodle_rules           |
      | Use group enrolment keys | Yes                    |
    And I am on the "Course 1" "groups" page
    And I press "Create group"
    And I set the following fields to these values:
      | Group name    | Group 1             |
      | Enrolment key | Test-groupenrolkey1 |
    And I press "Save changes"

    And I entered the app as "student1"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "Enrol me" in the app
    And I set the field "Enrolment key" to "Test-groupenrolkey1" in the app
    And I press "Enrol me" in the app
    And I wait loading to finish in the app
    Then the header should be "Course 1" in the app
    And I should find "Section 1" in the app
    And I should not find "Enrol me" in the app

    When I entered the app as "student2"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "Enrol me" in the app
    And I set the field "Enrolment key" to "moodle_rules" in the app
    And I press "Enrol me" in the app
    And I wait loading to finish in the app
    Then the header should be "Course 1" in the app
    And I should find "Section 1" in the app
    And I should not find "Enrol me" in the app

    # Check the groups on website
    When I open a browser tab with url "$WWWROOT"
    And I am on the "Course 1" course page logged in as teacher1
    And I navigate to course participants
    Then the following should exist in the "participants" table:
      | First name | Email address        | Roles   | Groups    |
      | Student 1  | student1@example.com | Student | Group 1   |
      | Student 2  | student2@example.com | Student | No groups |

  Scenario: Self-enrolment enabled with simultaneous guest access
    Given I log in as "teacher1"
    And I am on the "Course 1" "enrolment methods" page
    And I add "Self enrolment" enrolment method in "Course 1" with:
      | Custom instance name     | Self enrolment (Student with password) |
      | Enrolment key            | moodle_rules           |
    And I click on "Enable" "link" in the "Self enrolment (Student)" "table_row"
    And I click on "Edit" "link" in the "Guest access" "table_row"
    And I set the following fields to these values:
      | Allow guest access | Yes |
    And I press "Save changes"

    When I entered the app as "student1"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app
    And I should find "Enrol me" in the app
    And I should find "View course" in the app

    When I press "Enrol me" in the app
    Then I should find "Self enrolment (Student)" in the app
    And I should find "Self enrolment (Student with password)" in the app

    When I press "Self enrolment (Student)" in the app
    Then I should find "Self enrolment (Student)" in the app
    Then I should not find "Self enrolment (Student with password)" in the app
