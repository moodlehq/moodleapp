@app_parallel_run_course @core_course @app @core @disabled_features @javascript
Feature: Test disabled text is shown when opening a disabled activity.

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | initsections |
      | Course 1 | C1        | 0        | 1            |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |

  Scenario: View disabled assign activity
    Given the following "activities" exist:
      | activity | course | name                 | intro                       | showdescription |
      | assign   | C1     | Test assignment name | Test assignment description | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModAssign | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test assignment name" "ion-card" in the app
    When I press "Test assignment name" in the app
    Then the header should be "Test assignment name" in the app
    And I should find "Test assignment description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled BBB activity
    Given the following "activities" exist:
      | activity        | name          | intro                | course | showdescription |
      | bigbluebuttonbn | Test BBB name | Test BBB description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModBBB | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test BBB name" "ion-card" in the app
    When I press "Test BBB name" in the app
    Then the header should be "Test BBB name" in the app
    And I should find "Test BBB description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled book activity
    Given the following "activities" exist:
      | activity | name           | intro                 | course | showdescription |
      | book     | Test book name | Test book description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModBook | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test book name" "ion-card" in the app
    When I press "Test book name" in the app
    Then the header should be "Test book name" in the app
    And I should find "Test book description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled choice activity
    Given the following "activities" exist:
      | activity | name             | intro                   | course | option                       | showdescription |
      | choice   | Test choice name | Test choice description | C1     | Option 1, Option 2, Option 3 | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModChoice | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test choice name" "ion-card" in the app
    When I press "Test choice name" in the app
    Then the header should be "Test choice name" in the app
    And I should find "Test choice description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled data activity
    Given the following "activities" exist:
      | activity | name           | intro                 | course | showdescription |
      | data     | Test data name | Test data description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModData | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test data name" "ion-card" in the app
    When I press "Test data name" in the app
    Then the header should be "Test data name" in the app
    And I should find "Test data description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled feedback activity
    Given the following "activities" exist:
      | activity      | name               | intro                     | course | showdescription |
      | feedback      | Test feedback name | Test feedback description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModFeedback | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test feedback name" "ion-card" in the app
    When I press "Test feedback name" in the app
    Then the header should be "Test feedback name" in the app
    And I should find "Test feedback description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled folder activity
    Given the following "activities" exist:
      | activity | name             | intro                   | course | showdescription |
      | folder   | Test folder name | Test folder description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModFolder | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test folder name" "ion-card" in the app
    When I press "Test folder name" in the app
    Then the header should be "Test folder name" in the app
    And I should find "Test folder description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled forum activity
    Given the following "activities" exist:
      | activity   | name            | intro                  | course | showdescription |
      | forum      | Test forum name | Test forum description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModForum | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test forum name" "ion-card" in the app
    When I press "Test forum name" in the app
    Then the header should be "Test forum name" in the app
    And I should find "Test forum description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled glossary activity
    Given the following "activities" exist:
      | activity | name               | intro                     | course | showdescription |
      | glossary | Test glossary name | Test glossary description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModGlossary | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test glossary name" "ion-card" in the app
    When I press "Test glossary name" in the app
    Then the header should be "Test glossary name" in the app
    And I should find "Test glossary description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled H5P activity
    Given the following "activities" exist:
       | activity   | name          | intro                | course | showdescription |
      | h5pactivity | Test h5p name | Test h5p description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModH5PActivity | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test h5p name" "ion-card" in the app
    When I press "Test h5p name" in the app
    Then the header should be "Test h5p name" in the app
    And I should find "Test h5p description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled imscp activity
    Given the following "activities" exist:
      | activity | name             | intro                  | course | showdescription |
      | imscp    | Test imscp name  | Test imscp description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModImscp | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test imscp name" "ion-card" in the app
    When I press "Test imscp name" in the app
    Then the header should be "Test imscp name" in the app
    And I should find "Test imscp description" in the app
    And I should find "This content is not available in the app" in the app

  # This is a very strange case, but we test this for now...
  @lms_from4.3
  Scenario: View disabled label activity
    Given the Moodle site is compatible with this feature
    And the following "activities" exist:
      | activity   | course | name            | intro                  | content | showdescription |
      | label      | C1     | Test label name | Test label description | CONTENT | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModLabel | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Test label name" in the app
    Then the header should be "Test label name" in the app
    And I should find "Test label description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled lesson activity
    Given the following "activities" exist:
      | activity      | name              | intro                   | course | showdescription |
      | lesson        | Test lesson name  | Test lesson description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModLesson| tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test lesson name" "ion-card" in the app
    When I press "Test lesson name" in the app
    Then the header should be "Test lesson name" in the app
    And I should find "Test lesson description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled lti activity
    Given the following "activities" exist:
      | activity      | name               | intro                     | course | showdescription |
      | lti           | Test external name | Test external description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModLti | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test external name" "ion-card" in the app
    When I press "Test external name" in the app
    Then the header should be "Test external name" in the app
    And I should find "Test external description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled page activity
    Given the following "activities" exist:
      | activity   | course | name            | intro                 | content | showdescription |
      | page       | C1     | Test page name  | Test page description | CONTENT | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModPage | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test page name" "ion-card" in the app
    When I press "Test page name" in the app
    Then the header should be "Test page name" in the app
    And I should find "Test page description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled quiz activity
    Given the following "activities" exist:
      | activity   | name           | intro                 | course | section | showdescription |
      | quiz       | Test quiz name | Test quiz description | C1     | 1       | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModQuiz | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test quiz name" "ion-card" in the app
    When I press "Test quiz name" in the app
    Then the header should be "Test quiz name" in the app
    And I should find "Test quiz description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled resource activity
    Given the following "activities" exist:
      | activity | name               | intro                     | display | course | defaultfilename | showdescription |
      | resource | Test resource name | Test resource description | 5       | C1     | A txt.txt       | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModResource | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test resource name" "ion-card" in the app
    When I press "Test resource name" in the app
    Then the header should be "Test resource name" in the app
    And I should find "Test resource description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled scorm activity
    Given the following "activities" exist:
      | activity      | name               | intro                  | course | showdescription |
      | scorm         | Test scorm name    | Test scorm description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModScorm | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test scorm name" "ion-card" in the app
    When I press "Test scorm name" in the app
    Then the header should be "Test scorm name" in the app
    And I should find "Test scorm description" in the app
    And I should find "This content is not available in the app" in the app

  # Subsections cannot be disabled using disabled features.

  Scenario: View disabled url activity
    Given the following "activities" exist:
      | activity | name          | intro                | course | externalurl        | showdescription |
      | url      | Test url name | Test url description | C1     | https://moodle.org | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModUrl | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should not find "Open Test url name in browser" in the app
    Then I should find "Open in browser" within "Test url name" "ion-card" in the app
    When I press "Test url name" in the app
    Then the header should be "Test url name" in the app
    And I should find "Test url description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled wiki activity
    Given the following "activities" exist:
      | activity    | name             | intro                 | course | showdescription |
      | wiki        | Test wiki name   | Test wiki description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModWiki | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test wiki name" "ion-card" in the app
    When I press "Test wiki name" in the app
    Then the header should be "Test wiki name" in the app
    And I should find "Test wiki description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View disabled workshop activity
    Given the following "activities" exist:
      | activity      | name                  | intro                     | course | showdescription |
      | workshop      | Test workshop name    | Test workshop description | C1     | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModWorkshop | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    Then I should find "Open in browser" within "Test workshop name" "ion-card" in the app
    When I press "Test workshop name" in the app
    Then the header should be "Test workshop name" in the app
    And I should find "Test workshop description" in the app
    And I should find "This content is not available in the app" in the app

  Scenario: View activity info download button
    Given the following "activities" exist:
      | activity   | course | name            | intro                 | content | showdescription |
      | page       | C1     | Test page name  | Test page description | CONTENT | 1               |
    And the following config values are set as admin:
      | disabledfeatures | NoDelegate_CoreOffline | tool_mobile |
    When I entered the course "Course 1" as "student1" in the app
    And I press "Test page name" in the app
    And I press "Information" "ion-button" in the app
    Then I should not find "Download" in the app
