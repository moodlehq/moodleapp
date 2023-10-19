@core @core_course @app @javascript @lms_upto3.11
Feature: Test basic usage of one course in app
  In order to participate in one course while using the mobile app
  As a student
  I need basic course functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
      | student2 | Student2 | student2 | student2@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | name            | intro                   | course | idnumber | option                       | section |
      | choice   | Choice course 1 | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 | 1       |
    And the following "activities" exist:
      | activity | course | idnumber | name                | intro                       | assignsubmission_onlinetext_enabled | section |
      | assign   | C1     | assign1  | assignment          | Test assignment description | 1                                   | 1       |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode | assessed | scale[modgrade_type] |
      | forum      | Test forum name | Test forum  | C1     | forum    | 0         | 5        | Point                |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode | section |
      | chat       | Test chat name  | Test chat   | C1     | chat     | 0         | 2       |
    And the following "activities" exist:
      | activity | name      | intro        | course | idnumber | section |
      | data     | Web links | Useful links | C1     | data1    | 4       |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | lti           | Test external name | Test external  | C1     | external    | 0         | 1       |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | feedback      | Test feedback name | Test feedback  | C1     | feedback    | 0         | 3       |
    And the following "activities" exist:
      | activity | name          | intro                | course | idnumber  | section |
      | glossary | Test glossary | glossary description | C1     | gloss1    | 5       |
    And the following "activities" exist:
      | activity   | name   | intro              | course | idnumber | section |
      | quiz       | Quiz 1 | Quiz 1 description | C1     | quiz1    | 2       |
    And the following "question categories" exist:
      | contextlevel | reference | name           |
      | Course       | C1        | Test questions |
    And the following "questions" exist:
      | questioncategory | qtype       | name  | questiontext                |
      | Test questions   | truefalse   | TF1   | Text of the first question  |
      | Test questions   | truefalse   | TF2   | Text of the second question |
    And quiz "Quiz 1" contains the following questions:
      | question | page |
      | TF1      | 1    |
      | TF2      | 2    |
    And the following "activities" exist:
      | activity    | name             | intro        | course | idnumber  | groupmode | section |
      | survey      | Test survey name | Test survey  | C1     | survey    | 0         | 1       |
    And the following "activities" exist:
      | activity    | name             | intro        | course | idnumber  | groupmode |
      | wiki        | Test wiki name   | Test wiki    | C1     | wiki      | 0         |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | lesson        | Test lesson name   | Test lesson    | C1     | lesson      | 0         | 3       |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | scorm         | Test scorm name    | Test scorm     | C1     | scorm       | 0         | 2       |
    And the following "activities" exist:
      | activity      | name                  | intro             | course | idnumber       | groupmode | section |
      | workshop      | Test workshop name    | Test workshop     | C1     | workshop       | 0         | 3       |

  Scenario: Self enrol
    Given the Moodle site is compatible with this feature
    And I log in as "teacher1"
    And I am on "Course 1" course homepage
    And I add "Self enrolment" enrolment method with:
      | Custom instance name | Student self enrolment |
    And I entered the app as "student2"
    When I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    And I press "Enrol me" in the app
    And I press "OK" in the app
    And I wait loading to finish in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    And I should find "Test survey name" in the app
    And I should find "Test chat name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app

  Scenario: Guest access
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Course summary" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I press "Actions menu"
    And I follow "More..."
    And I follow "Users"
    And I follow "Enrolment methods"
    And I click on "Enable" "icon" in the "Guest access" "table_row"
    And I close the browser tab opened by the app
    Given I entered the app as "student2"
    When I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app

    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "View course" "ion-button" in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test survey name" in the app
    And I should find "Test chat name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app
