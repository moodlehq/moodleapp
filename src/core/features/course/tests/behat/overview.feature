@app_parallel_run_course @core_course @app @core @javascript @lms_from5.1
Feature: Activities overview common functionality

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname | format | numsections | initsections | enablecompletion |
      | Course 1 | C1        | topics | 3           | 1            | 1                |
    And the following "users" exist:
      | username | firstname | lastname |
      | teacher  | Teacher   | 1        |
      | student  | Student   | 1        |
    And the following "course enrolments" exist:
      | user    | course | role           |
      | student | C1     | student        |
      | teacher | C1     | editingteacher |
    # Don't use the name of the resource in the activity name to avoid false positives when looking for Resource type in tablet.
    And the following "activities" exist:
      | activity | name                 | course | section |
      | book     | Tirant lo Blanc      | C1     | 1       |
      | folder   | Docs collection      | C1     | 1       |
      | imscp    | IMS Package          | C1     | 1       |
      | label    | Label title          | C1     | 2       |
      | page     | Course guidelines    | C1     | 2       |
      | page     | Project introduction | C1     | 2       |
      | resource | PDF document         | C1     | 3       |
      | url      | Moodle website       | C1     | 3       |

  Scenario: Only the right activity types are displayed
    Given the following "activities" exist:
      | activity | course | idnumber | name       |
      | assign   | C1     | assign1  | Assignment |
    And I entered the course "Course 1" as "student" in the app

    When I press "Activities" in the app
    Then I should find "An overview of all activities in the course" in the app
    And I should be able to press "Assignments" in the app
    And I should be able to press "Resource" in the app
    But I should not be able to press "BigBlueButton" in the app
    And I should not be able to press "Choices" in the app
    And I should not be able to press "Databases" in the app
    And I should not be able to press "Feedback" in the app
    And I should not be able to press "Forums" in the app
    And I should not be able to press "Glossaries" in the app
    And I should not be able to press "Lessons" in the app
    And I should not be able to press "External tools" in the app
    And I should not be able to press "Quizzes" in the app
    And I should not be able to press "SCORM packages" in the app
    And I should not be able to press "Wikis" in the app
    And I should not be able to press "Workshops" in the app

  Scenario: View Resources overview (phone)
    Given I entered the course "Course 1" as "student" in the app
    When I press "Activities" in the app
    Then I should not find "Tirant lo Blanc" in the app
    And I should not find "Docs collection" in the app

    When I press "Resources" in the app
    Then I should find "Tirant lo Blanc" in the app
    And I should find "Section 1" within "Tirant lo Blanc" "ion-item" in the app
    And I should find "Docs collection" in the app
    And I should find "Section 1" within "Docs collection" "ion-item" in the app
    And I should find "IMS Package" in the app
    And I should find "Section 1" within "IMS Package" "ion-item" in the app
    And I should find "Course guidelines" in the app
    And I should find "Section 2" within "Course guidelines" "ion-item" in the app
    And I should find "Project introduction" in the app
    And I should find "Section 2" within "Project introduction" "ion-item" in the app
    And I should find "PDF document" in the app
    And I should find "Section 3" within "PDF document" "ion-item" in the app
    And I should find "Moodle website" in the app
    And I should find "Section 3" within "Moodle website" "ion-item" in the app
    But I should not find "Label title" in the app
    And I should not find "Status" in the app
    And I should not find "Resource type" in the app

    When I press "Tirant lo Blanc" "ion-item" in the app
    Then I should find "Book" within "Resource type" "ion-item" in the app
    But I should not find "Status" within "Tirant lo Blanc" "ion-card" in the app

    When I press "Course guidelines" "ion-item" in the app
    Then I should find "Page" within "Resource type" "ion-item" in the app

    # Test that pressing the activity name opens the activity.
    When I press "Docs collection" in the app
    Then the header should be "Docs collection" in the app
    And I should find "There are no files to show" in the app

  Scenario: View Resources overview (tablet)
    Given I entered the course "Course 1" as "student" in the app
    And I change viewport size to "1200x640" in the app
    When I press "Activities" in the app
    Then I should not find "Tirant lo Blanc" in the app
    And I should not find "Docs collection" in the app

    When I press "Resources" in the app
    Then I should find "Tirant lo Blanc" in the app
    And I should find "Section 1" within "Tirant lo Blanc" "td" in the app
    And I should find "Book" within "Tirant lo Blanc" "tr" in the app
    And I should find "Docs collection" in the app
    And I should find "Section 1" within "Docs collection" "td" in the app
    And I should find "Folder" within "Docs collection" "tr" in the app
    And I should find "IMS Package" in the app
    And I should find "Section 1" within "IMS Package" "td" in the app
    And I should find "IMS content package" within "IMS Package" "tr" in the app
    And I should find "Course guidelines" in the app
    And I should find "Section 2" within "Course guidelines" "td" in the app
    And I should find "Page" within "Course guidelines" "tr" in the app
    And I should find "Project introduction" in the app
    And I should find "Section 2" within "Project introduction" "td" in the app
    And I should find "Page" within "Project introduction" "tr" in the app
    And I should find "PDF document" in the app
    And I should find "Section 3" within "PDF document" "td" in the app
    And I should find "File" within "PDF document" "tr" in the app
    And I should find "Moodle website" in the app
    And I should find "Section 3" within "Moodle website" "td" in the app
    And I should find "URL" within "Moodle website" "tr" in the app
    But I should not find "Label title" in the app
    And I should not find "Status" in the app

    # Test that pressing the activity name opens the activity.
    When I press "Docs collection" in the app
    Then the header should be "Docs collection" in the app
    And I should find "There are no files to show" in the app

  Scenario: Student can only see visible activities
    Given the following config values are set as admin:
      | allowstealth | 1 |
    Given the following "activities" exist:
      | activity | name        | course | section | visible |
      | book     | Mar i Cel   | C1     | 1       | 0       |
      | book     | Terra baixa | C1     | 1       | 1       |
    And I log in as "teacher"
    And I am on "Course 1" course homepage with editing mode on
    And I open "Terra baixa" actions menu
    And I choose "Availability > Make available but don't show on course page" in the open action menu
    And I entered the course "Course 1" as "student" in the app
    When I press "Activities" in the app
    And I press "Resources" in the app
    Then I should find "Terra baixa" in the app
    And I should find "Available but not shown on course page" within "Terra baixa" "ion-item" in the app
    But I should not find "Mar i Cel" in the app

  Scenario: Teachers can see hidden activities
    Given the following "activities" exist:
      | activity | name        | course | section | visible |
      | book     | Mar i Cel   | C1     | 1       | 0       |
    And I entered the course "Course 1" as "teacher" in the app
    When I press "Activities" in the app
    And I press "Resources" in the app
    Then I should find "Mar i Cel" in the app
    And I should find "Hidden from students" within "Mar i Cel" "ion-item" in the app

  Scenario: Students can see and change completion status (phone)
    Given the following "activities" exist:
      | activity | name        | course | section | completion | completionview |
      | book     | Mar i Cel   | C1     | 1       | 1          | 1              |
      | book     | Terra baixa | C1     | 1       | 2          | 1              |
    And I entered the course "Course 1" as "student" in the app
    When I press "Activities" in the app
    And I press "Resources" in the app
    And I press "Tirant lo Blanc" "ion-item" in the app
    Then I should find "-" within "Status" "ion-item" in the app

    When I press "Mar i Cel" "ion-item" in the app
    Then I should find "Mark as done" within "Status" "ion-item" in the app

    When I press "Mark as done" within "Status" "ion-item" in the app
    Then I should find "Done" within "Status" "ion-item" in the app

    When I press "Terra baixa" "ion-item" in the app
    Then I should find "To do" within "Status" "ion-item" in the app

    When I press "To do" within "Status" "ion-item" in the app
    Then I should find "To do:" in the app
    And I should find "View" in the app

  Scenario: Students can see and change completion status (tablet)
    Given the following "activities" exist:
      | activity | name        | course | section | completion | completionview |
      | book     | Mar i Cel   | C1     | 1       | 1          | 1              |
      | book     | Terra baixa | C1     | 1       | 2          | 1              |
    And I entered the course "Course 1" as "student" in the app
    And I change viewport size to "1200x640" in the app
    When I press "Activities" in the app
    And I press "Resources" in the app
    Then I should find "-" within "Tirant lo Blanc" "tr" in the app
    And I should find "Mark as done" within "Mar i Cel" "tr" in the app
    And I should find "To do" within "Terra baixa" "tr" in the app

    When I press "Mark as done" within "Mar i Cel" "tr" in the app
    Then I should find "Done" within "Mar i Cel" "tr" in the app

    When I press "To do" within "Terra baixa" "tr" in the app
    Then I should find "To do:" in the app
    And I should find "View" in the app

  Scenario: Users in no group that cannot view all groups see an error on 'Separate groups' activities
    Given the following "users" exist:
      | username   | firstname   | lastname |
      | nonediting | Non-editing | Teacher  |
    And the following "course enrolments" exist:
      | user       | course | role    |
      | nonediting | C1     | teacher |
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
    And the following "activities" exist:
      | activity | name            | course | section | groupmode |
      | book     | Separate groups | C1     | 1       | 1         |
    And I entered the course "Course 1" as "teacher" in the app
    When I press "Activities" in the app
    And I press "Resources" in the app
    Then I should not find "You are not a member of any group" in the app

    When I entered the course "Course 1" as "nonediting" in the app
    And I press "Activities" in the app
    And I press "Resources" in the app
    Then I should find "You are not a member of any group" within "Separate groups" "ion-item" in the app

    When I press "Separate groups" "ion-item" in the app
    Then I should not find "Resource type" in the app

    When I entered the course "Course 1" as "student" in the app
    And I press "Activities" in the app
    And I press "Resources" in the app
    Then I should find "You are not a member of any group" within "Separate groups" "ion-item" in the app

    When I press "Separate groups" "ion-item" in the app
    Then I should not find "Resource type" in the app

  Scenario: Links to overview are handled by the app and open the overview page
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user    | course | role           |
      | student | C2     | student        |
    Given the following "activities" exist:
      | activity | idnumber    | course | name            | intro                                                                        |
      | label    | c1linklabel | C1     | C1 Link label   | <a href="/course/overview.php?id=${c1linklabel:course}">Overview link</a>    |
      | label    | c2linklabel | C2     | C2 Link label   | <a href="/course/overview.php?id=${c1linklabel:course}">C1 Overview link</a> |
    And I replace the arguments in "c1linklabel" "intro"
    And I replace the arguments in "c2linklabel" "intro"
    And I entered the course "Course 1" as "student" in the app

    When I press "Overview link" in the app
    Then I should find "An overview of all activities in the course" in the app
    And I should be able to press "Resources" in the app

    When I go back in the app
    And I press "My courses" in the app
    And I press "Course 2" in the app
    And I press "C1 Overview link" in the app
    Then the header should be "Course 1" in the app
    And I should find "An overview of all activities in the course" in the app
    And I should be able to press "Resources" in the app

  Scenario: The course overview page should log a page event and a resource list event
    Given I entered the course "Course 1" as "student" in the app
    When I press "Activities" in the app
    Then the following events should have been logged for "student" in the app:
      | name                               | course   |
      | \core\event\course_overview_viewed | Course 1 |
    And the following events should not have been logged for "student" in the app:
      | name                                     | course   |
      | \core\event\course_resources_list_viewed | Course 1 |

    When I press "Resources" in the app
    Then the following events should have been logged for "student" in the app:
      | name                                     | course   |
      | \core\event\course_resources_list_viewed | Course 1 |
