@app_parallel_run_course @core_course @app @core @javascript
Feature: Test basic usage of one course in app
  In order to participate in one course while using the mobile app
  As a student
  I need basic course functionality to work

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
      | student2 | Student2 | student2 | student2@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | initsections |
      | Course 1 | C1        | 0        | 1            |
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
      | activity | name      | intro        | course | idnumber | section |
      | data     | Web links | Useful links | C1     | data1    | 4       |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | lti           | Test external name | Test external  | C1     | external    | 0         | 1       |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | feedback      | Test feedback name | Test feedback  | C1     | feedback    | 0         | 3       |
    And the following "mod_feedback > questions" exist:
      | activity |
      | feedback |
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
      | activity    | name             | intro        | course | idnumber  | groupmode |
      | wiki        | Test wiki name   | Test wiki    | C1     | wiki      | 0         |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | lesson        | Test lesson name   | Test lesson    | C1     | lesson      | 0         | 3       |
    And the following "mod_lesson > pages" exist:
      | lesson           | qtype   | title            |
      | Test lesson name | content | First page title |
    And the following "mod_lesson > answers" exist:
      | page             |
      | First page title |
    And the following "activities" exist:
      | activity      | name               | intro          | course | idnumber    | groupmode | section |
      | scorm         | Test scorm name    | Test scorm     | C1     | scorm       | 0         | 2       |
    And the following "activities" exist:
      | activity      | name                  | intro             | course | idnumber       | groupmode | section |
      | workshop      | Test workshop name    | Test workshop     | C1     | workshop       | 0         | 3       |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModLti:launchViaSite | tool_mobile |

    # TODO remove once MDL-77951 is resolved.
    And I log in as "admin"
    And I am on "Course 1" course homepage with editing mode on
    And I open "Choice course 1" actions menu
    And I click on "Move right" "link" in the "Choice course 1" activity
    And I open "assignment" actions menu
    And I click on "Move right" "link" in the "assignment" activity
    And I log out

  Scenario: View course contents
    When I entered the course "Course 1" as "student1" in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app

    When I set "page-core-course-index core-course-image" styles to "background" "lightblue"
    And I set "page-core-course-index core-course-image" styles to "--core-image-visibility" "hidden"
    Then the UI should match the snapshot

    # Test infinite scroll on course
    When I scroll to "Test workshop name" in the app
    Then I should find "Web links" in the app
    And I should find "Test glossary" in the app

    # Test Collapsible header
    And the UI should match the snapshot

    When I press "Choice course 1" in the app
    Then the header should be "Choice course 1" in the app

    When I go back in the app
    And I press "assignment" in the app
    Then the header should be "assignment" in the app

    When I go back in the app
    And I press "Test forum name" in the app
    Then the header should be "Test forum name" in the app

    When I go back in the app
    And I press "Web links" in the app
    Then the header should be "Web links" in the app

    When I go back in the app
    And I press "Test external name" in the app
    And I press "Launch the activity" in the app
    And I wait loading to finish in the app
    Then the header should be "Test external name" in the app

    When I go back in the app
    And I press "Test feedback name" in the app
    Then the header should be "Test feedback name" in the app

    When I go back in the app
    And I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app

    When I go back in the app
    And I press "Quiz 1" in the app
    Then the header should be "Quiz 1" in the app

    When I go back in the app
    And I press "Test wiki name" in the app
    Then the header should be "Test wiki name" in the app

    When I go back in the app
    And I press "Test lesson name" in the app
    Then the header should be "Test lesson name" in the app

    When I go back in the app
    And I press "Test scorm name" in the app
    Then the header should be "Test scorm name" in the app

    When I go back in the app
    And I press "Test workshop name" in the app
    Then the header should be "Test workshop name" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                       | activity | activityname       | course   |
      | \mod_wiki\event\course_module_viewed       | wiki     | Test wiki name     | Course 1 |
      | \mod_lesson\event\course_module_viewed     | lesson   | Test lesson name   | Course 1 |
      | \mod_scorm\event\course_module_viewed      | scorm    | Test scorm name    | Course 1 |
      | \mod_workshop\event\course_module_viewed   | workshop | Test workshop name | Course 1 |
      | \mod_choice\event\course_module_viewed     | choice   | Choice course 1    | Course 1 |
      | \mod_assign\event\course_module_viewed     | assign   | assignment         | Course 1 |
      | \mod_assign\event\submission_status_viewed | assign   | assignment         | Course 1 |
      | \mod_forum\event\course_module_viewed      | forum    | Test forum name    | Course 1 |
      | \mod_data\event\course_module_viewed       | data     | Web links          | Course 1 |
      | \mod_lti\event\course_module_viewed        | lti      | Test external name | Course 1 |
      | \mod_feedback\event\course_module_viewed   | feedback | Test feedback name | Course 1 |
      | \mod_glossary\event\course_module_viewed   | glossary | Test glossary      | Course 1 |
      | \mod_quiz\event\course_module_viewed       | quiz     | Quiz 1             | Course 1 |

  @lms_from4.4
  Scenario: View section contents
    When I entered the course "Course 1" as "student1" in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app

    When I press "Course index" in the app
    And I press "General" in the app
    Then I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    But I should not find "Choice course 1" in the app
    And I should not find "assignment" in the app
    And I should not find "Web links" in the app
    And I should not find "Test external name" in the app
    And I should not find "Test feedback name" in the app
    And I should not find "Test glossary" in the app
    And I should not find "Quiz 1" in the app
    And I should not find "Test lesson name" in the app
    And I should not find "Test scorm name" in the app
    And I should not find "Test workshop name" in the app

    When I press "Test forum name" in the app
    Then the header should be "Test forum name" in the app

    When I go back in the app
    And I press "Test wiki name" in the app
    Then the header should be "Test wiki name" in the app

    When I go back in the app
    And I press "Course index" in the app
    And I press "Section 1" in the app
    Then I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    But I should not find "Test forum name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test feedback name" in the app
    And I should not find "Test glossary" in the app
    And I should not find "Quiz 1" in the app
    And I should not find "Test wiki name" in the app
    And I should not find "Test lesson name" in the app
    And I should not find "Test scorm name" in the app
    And I should not find "Test workshop name" in the app

    When I press "Choice course 1" in the app
    Then the header should be "Choice course 1" in the app

    When I go back in the app
    And I press "assignment" in the app
    Then the header should be "assignment" in the app

    When I go back in the app
    And I press "Test external name" in the app
    Then the header should be "Test external name" in the app

    When I go back in the app
    And I press "Course index" in the app
    And I press "Section 2" in the app
    Then I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    But I should not find "Choice course 1" in the app
    And I should not find "assignment" in the app
    And I should not find "Test forum name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test external name" in the app
    And I should not find "Test feedback name" in the app
    And I should not find "Test glossary" in the app
    And I should not find "Test wiki name" in the app
    And I should not find "Test lesson name" in the app
    And I should not find "Test workshop name" in the app

    When I press "Quiz 1" in the app
    Then the header should be "Quiz 1" in the app

    When I go back in the app
    And I press "Test scorm name" in the app
    Then the header should be "Test scorm name" in the app

    When I go back in the app
    And I press "Course index" in the app
    And I press "Section 3" in the app
    Then I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    But I should not find "Choice course 1" in the app
    And I should not find "assignment" in the app
    And I should not find "Test forum name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test external name" in the app
    And I should not find "Test glossary" in the app
    And I should not find "Quiz 1" in the app
    And I should not find "Test wiki name" in the app
    And I should not find "Test scorm name" in the app

    When I press "Test feedback name" in the app
    Then the header should be "Test feedback name" in the app

    When I go back in the app
    And I press "Test lesson name" in the app
    Then the header should be "Test lesson name" in the app

    When I go back in the app
    And I press "Test workshop name" in the app
    Then the header should be "Test workshop name" in the app

    When I go back in the app
    And I press "Course index" in the app
    And I press "Section 4" in the app
    Then I should find "Web links" in the app
    But I should not find "Choice course 1" in the app
    And I should not find "assignment" in the app
    And I should not find "Test forum name" in the app
    And I should not find "Test external name" in the app
    And I should not find "Test feedback name" in the app
    And I should not find "Test glossary" in the app
    And I should not find "Quiz 1" in the app
    And I should not find "Test wiki name" in the app
    And I should not find "Test lesson name" in the app
    And I should not find "Test scorm name" in the app
    And I should not find "Test workshop name" in the app

    When I press "Web links" in the app
    Then the header should be "Web links" in the app

    When I go back in the app
    And I press "Course index" in the app
    And I press "Section 5" in the app
    Then I should find "Test glossary" in the app
    But I should not find "Choice course 1" in the app
    And I should not find "assignment" in the app
    And I should not find "Test forum name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test external name" in the app
    And I should not find "Test feedback name" in the app
    And I should not find "Quiz 1" in the app
    And I should not find "Test wiki name" in the app
    And I should not find "Test lesson name" in the app
    And I should not find "Test scorm name" in the app
    And I should not find "Test workshop name" in the app

    When I press "Test glossary" in the app
    Then the header should be "Test glossary" in the app

  @lms_from4.4
  Scenario: Navigation between sections using the bottom arrows
    When I entered the course "Course 1" as "student1" in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app

    When I press "Course index" in the app
    And I press "General" in the app
    Then I should find "General" in the app
    And I should find "Next: Section 1" in the app
    But I should not find "Section 2" in the app
    And I should not find "Section 3" in the app
    And I should not find "Section 4" in the app
    And I should not find "Section 5" in the app
    And I should not find "Previous:" in the app

    When I press "Next:" in the app
    Then I should find "Section 1" in the app
    And I should find "Previous: General" in the app
    And I should find "Next: Section 2" in the app
    But I should not find "Section 3" in the app
    And I should not find "Section 4" in the app
    And I should not find "Section 5" in the app

    When I press "Next:" in the app
    Then I should find "Section 2" in the app
    And I should find "Previous: Section 1" in the app
    And I should find "Next: Section 3" in the app
    But I should not find "General" in the app
    And I should not find "Section 4" in the app
    And I should not find "Section 5" in the app

    When I press "Next:" in the app
    Then I should find "Section 3" in the app
    And I should find "Previous: Section 2" in the app
    And I should find "Next: Section 4" in the app
    But I should not find "General" in the app
    And I should not find "Section 1" in the app
    And I should not find "Section 5" in the app

    When I press "Next:" in the app
    Then I should find "Section 4" in the app
    And I should find "Previous: Section 3" in the app
    And I should find "Next: Section 5" in the app
    But I should not find "General" in the app
    And I should not find "Section 1" in the app
    And I should not find "Section 2" in the app

    When I press "Next:" in the app
    Then I should find "Section 5" in the app
    And I should find "Previous: Section 4" in the app
    But I should not find "General" in the app
    And I should not find "Section 1" in the app
    And I should not find "Section 2" in the app
    And I should not find "Section 3" in the app
    And I should not find "Next:" in the app

    When I press "Previous:" in the app
    Then I should find "Section 4" in the app
    And I should find "Previous: Section 3" in the app
    And I should find "Next: Section 5" in the app
    But I should not find "General" in the app
    And I should not find "Section 1" in the app
    And I should not find "Section 2" in the app
    But the following events should have been logged for "student1" in the app:
      | name                      | course   | other                     |
      | \core\event\course_viewed | Course 1 | {"coursesectionnumber":1} |
      | \core\event\course_viewed | Course 1 | {"coursesectionnumber":2} |
      | \core\event\course_viewed | Course 1 | {"coursesectionnumber":3} |
      | \core\event\course_viewed | Course 1 | {"coursesectionnumber":4} |
      | \core\event\course_viewed | Course 1 | {"coursesectionnumber":5} |

  Scenario: View blocks on drawer
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And I entered the course "Course 1" as "student1" in the app
    Then the header should be "Course 1" in the app
    And I should find "Test forum name" in the app
    And I should find "Test wiki name" in the app
    And I should find "Choice course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test external name" in the app
    And I should find "Quiz 1" in the app
    And I should find "Test scorm name" in the app
    And I should find "Test feedback name" in the app
    And I should find "Test lesson name" in the app
    And I should find "Test workshop name" in the app
    And I should not find "Web links" in the app
    And I should not find "Test glossary" in the app
    Then I press "Open block drawer" in the app
    And I should find "HTML title test" in the app
    And I should find "body test" in the app
