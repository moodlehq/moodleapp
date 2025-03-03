@core_course @app @core @javascript
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
      | user | course | role |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | name   | intro                   | course | idnumber | option                       | section | showdescription |
      | choice   | choice | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 | 1       | 1               |
    And the following config values are set as admin:
      | disabledfeatures | CoreCourseModuleDelegate_AddonModChoice | tool_mobile |

  Scenario: View disabled activity
    Given I entered the course "Course 1" as "student1" in the app
    When I press "choice" in the app
    Then the header should be "choice" in the app
    And I should find "Test choice description" in the app
    And I should find "This content is not available in the app" in the app
