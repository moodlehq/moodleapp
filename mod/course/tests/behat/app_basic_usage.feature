@mod @mod_course @app @app_upto3.9.4 @javascript
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

  @app @3.8.0
  Scenario: View course contents
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test external name"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"

    When I press "Choice course 1" in the app
    Then the header should be "Choice course 1" in the app

    When I press the back button in the app
    And I press "assignment" in the app
    Then the header should be "assignment" in the app

    When I press the back button in the app
    And I press "Test forum name" in the app
    Then the header should be "Test forum name" in the app

    When I press the back button in the app
    And I press "Test chat name" in the app
    Then the header should be "Test chat name" in the app

    When I press the back button in the app
    And I press "Web links" in the app
    Then the header should be "Web links" in the app

    When I press the back button in the app
    And I press "Test external name" in the app
    Then the header should be "Test external name" in the app

    When I press the back button in the app
    And I press "Test feedback name" in the app
    And I press "OK" in the app
    Then the header should be "Test feedback name" in the app

    When I press the back button in the app
    And I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app

    When I press the back button in the app
    And I press "Quiz 1" in the app
    Then the header should be "Quiz 1" in the app

    When I press the back button in the app
    And I press "Test survey name" in the app
    Then the header should be "Test survey name" in the app

    When I press the back button in the app
    And I press "Test wiki name" in the app
    And I press "OK" in the app
    Then the header should be "Test wiki name" in the app

    When I press the back button in the app
    And I press "Test lesson name" in the app
    Then the header should be "Test lesson name" in the app

    When I press the back button in the app
    And I press "Test scorm name" in the app
    Then the header should be "Test scorm name" in the app

    When I press the back button in the app
    And I press "Test workshop name" in the app
    Then the header should be "Test workshop name" in the app

  @app @3.8.0
  Scenario: View section contents
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test external name"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"

    When I press "arrow dropdown" in the app
    And I press "General" near "Sections" in the app
    Then I should see "Test forum name"
    And I should see "Test wiki name"
    But I should not see "Choice course 1"
    And I should not see "assignment"
    And I should not see "Test chat name"
    And I should not see "Web links"
    And I should not see "Test external name"
    And I should not see "Test feedback name"
    And I should not see "Test glossary"
    And I should not see "Quiz 1"
    And I should not see "Test survey name"
    And I should not see "Test lesson name"
    And I should not see "Test scorm name"
    And I should not see "Test workshop name"

    When I press "Test forum name" in the app
    Then the header should be "Test forum name" in the app

    When I press the back button in the app
    And I press "Test wiki name" in the app
    And I press "OK" in the app
    Then the header should be "Test wiki name" in the app

    When I press the back button in the app
    And I press "arrow dropdown" in the app
    And I press "Topic 1" near "Sections" in the app
    Then I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test external name"
    And I should see "Test survey name"
    But I should not see "Test forum name"
    And I should not see "Test chat name"
    And I should not see "Web links"
    And I should not see "Test feedback name"
    And I should not see "Test glossary"
    And I should not see "Quiz 1"
    And I should not see "Test wiki name"
    And I should not see "Test lesson name"
    And I should not see "Test scorm name"
    And I should not see "Test workshop name"

    When I press "Choice course 1" in the app
    Then the header should be "Choice course 1" in the app

    When I press the back button in the app
    And I press "assignment" in the app
    Then the header should be "assignment" in the app

    When I press the back button in the app
    And I press "Test external name" in the app
    Then the header should be "Test external name" in the app

    When I press the back button in the app
    And I press "Test survey name" in the app
    Then the header should be "Test survey name" in the app

    When I press the back button in the app
    And I press "arrow dropdown" in the app
    And I press "Topic 2" near "Sections" in the app
    Then I should see "Quiz 1"
    And I should see "Test chat name"
    And I should see "Test scorm name"
    But I should not see "Choice course 1"
    And I should not see "assignment"
    And I should not see "Test forum name"
    And I should not see "Web links"
    And I should not see "Test external name"
    And I should not see "Test feedback name"
    And I should not see "Test glossary"
    And I should not see "Test survey name"
    And I should not see "Test wiki name"
    And I should not see "Test lesson name"
    And I should not see "Test workshop name"

    When I press "Test chat name" in the app
    Then the header should be "Test chat name" in the app

    When I press the back button in the app
    And I press "Quiz 1" in the app
    Then the header should be "Quiz 1" in the app

    When I press the back button in the app
    And I press "Test scorm name" in the app
    Then the header should be "Test scorm name" in the app

    When I press the back button in the app
    And I press "arrow dropdown" in the app
    And I press "Topic 3" near "Sections" in the app
    Then I should see "Test feedback name"
    And I should see "Test lesson name"
    And I should see "Test workshop name"
    But I should not see "Choice course 1"
    And I should not see "assignment"
    And I should not see "Test forum name"
    And I should not see "Test chat name"
    And I should not see "Web links"
    And I should not see "Test external name"
    And I should not see "Test glossary"
    And I should not see "Quiz 1"
    And I should not see "Test survey name"
    And I should not see "Test wiki name"
    And I should not see "Test scorm name"

    When I press "Test feedback name" in the app
    And I press "OK" in the app
    Then the header should be "Test feedback name" in the app

    When I press the back button in the app
    And I press "Test lesson name" in the app
    Then the header should be "Test lesson name" in the app

    When I press the back button in the app
    And I press "Test workshop name" in the app
    Then the header should be "Test workshop name" in the app

    When I press the back button in the app
    And I press "arrow dropdown" in the app
    And I press "Topic 4" near "Sections" in the app
    Then I should see "Web links"
    But I should not see "Choice course 1"
    And I should not see "assignment"
    And I should not see "Test forum name"
    And I should not see "Test chat name"
    And I should not see "Test external name"
    And I should not see "Test feedback name"
    And I should not see "Test glossary"
    And I should not see "Quiz 1"
    And I should not see "Test survey name"
    And I should not see "Test wiki name"
    And I should not see "Test lesson name"
    And I should not see "Test scorm name"
    And I should not see "Test workshop name"

    When I press "Web links" in the app
    Then the header should be "Web links" in the app

    When I press the back button in the app
    And I press "arrow dropdown" in the app
    And I press "Topic 5" near "Sections" in the app
    Then I should see "Test glossary"
    But I should not see "Choice course 1"
    And I should not see "assignment"
    And I should not see "Test forum name"
    And I should not see "Test chat name"
    And I should not see "Web links"
    And I should not see "Test external name"
    And I should not see "Test feedback name"
    And I should not see "Quiz 1"
    And I should not see "Test survey name"
    And I should not see "Test wiki name"
    And I should not see "Test lesson name"
    And I should not see "Test scorm name"
    And I should not see "Test workshop name"

    When I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app

  @app @3.8.0
  Scenario: Navigation between sections using the bottom arrows
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test external name"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"

    When I press "arrow dropdown" in the app
    And I press "General" near "Sections" in the app
    Then I should see "General"
    But I should not see "Topic 1"
    And I should not see "Topic 2"
    And I should not see "Topic 3"
    And I should not see "Topic 4"
    And I should not see "Topic 5"

    When I press "arrow forward" near "Test wiki name" in the app
    Then I should see "Topic 1"
    But I should not see "General"
    And I should not see "Topic 2"
    And I should not see "Topic 3"
    And I should not see "Topic 4"
    And I should not see "Topic 5"

    When I press "arrow forward" near "Test survey name" in the app
    Then I should see "Topic 2"
    But I should not see "General"
    And I should not see "Topic 1"
    And I should not see "Topic 3"
    And I should not see "Topic 4"
    And I should not see "Topic 5"

    When I press "arrow forward" near "Test scorm name" in the app
    Then I should see "Topic 3"
    But I should not see "General"
    And I should not see "Topic 1"
    And I should not see "Topic 2"
    And I should not see "Topic 4"
    And I should not see "Topic 5"

    When I press "arrow forward" near "Test workshop name" in the app
    Then I should see "Topic 4"
    But I should not see "General"
    And I should not see "Topic 1"
    And I should not see "Topic 2"
    And I should not see "Topic 3"
    And I should not see "Topic 5"

    When I press "arrow forward" near "Web links" in the app
    Then I should see "Topic 5"
    But I should not see "General"
    And I should not see "Topic 1"
    And I should not see "Topic 2"
    And I should not see "Topic 3"
    And I should not see "Topic 4"

    When I press "arrow back" near "Test glossary" in the app
    Then I should see "Topic 4"
    But I should not see "General"
    And I should not see "Topic 1"
    And I should not see "Topic 2"
    And I should not see "Topic 3"
    And I should not see "Topic 5"

  @app @3.8.0
  Scenario: Self enrol
    Given I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "Display options" in the app
    And I press "Course summary" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I press "Actions menu"
    And I follow "More..."
    And I follow "Users"
    And I follow "Enrolment methods"
    And I click on "Enable" "icon" in the "Self enrolment (Student)" "table_row"
    And I close the browser tab opened by the app
    When I enter the app
    And I log in as "student2"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    And I press "Enrol me" in the app
    And I press "OK" in the app
    And I wait loading to finish in the app
    And I press "Contents" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test external name"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"

  @app @3.8.0
  Scenario: Guest access
    Given I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "Display options" in the app
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
    When I enter the app
    And I log in as "student2"
    And I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should see "Download course"
    And I should see "Contents"

    When I press "Contents" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"

  @app @3.8.0
  Scenario: View blocks bellow/beside contents also when All sections selected
    Given I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "Display options" in the app
    And I press "Course summary" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I press "Turn editing on"
    And I click on "Side panel" "button"
    And I follow "Add a block"
    And I follow "HTML"
    And I click on "Side panel" "button"
    And I follow "Add a block"
    And I follow "Activities"
    And I click on "Actions menu" "icon" in the "#action-menu-toggle-0" "css_element"
    And I follow "Configure (new HTML block) block"
    And I set the field "HTML block title" to "HTML title test"
    And I set the field "Content" to "body test"
    And I press "Save changes"
    And I close the browser tab opened by the app
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    Then the header should be "Course 1" in the app
    And I should see "Choice course 1"
    And I should see "assignment"
    And I should see "Test forum name"
    And I should see "Test chat name"
    And I should see "Web links"
    And I should see "Test external name"
    And I should see "Test feedback name"
    And I should see "Test glossary"
    And I should see "Quiz 1"
    And I should see "Test survey name"
    And I should see "Test wiki name"
    And I should see "Test lesson name"
    And I should see "Test scorm name"
    And I should see "Test workshop name"
    And I should see "HTML title test"
    And I should see "body test"
    And I should see "Activities"
