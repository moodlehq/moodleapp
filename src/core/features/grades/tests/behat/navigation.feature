@core_grades @app @app @core @javascript
Feature: Grades navigation

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username  | firstname | lastname |
      | student1  | Student   | first    |
      | student2  | Student   | second    |
      | teacher1  | Teacher   | first   |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 2 | C2        |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student2 | C2     | student |
      | teacher1 | C2     | editingteacher |
    And the following "grade categories" exist:
      | fullname | course |
      | GC C1    | C1     |
      | GC C2.1  | C2     |
      | GC C2.2  | C2     |
    And the following "grade items" exist:
      | gradecategory | itemname  | grademin | grademax | course |
      | GC C1         | GI C1     | 20       | 40       | C1     |
      | GC C2.1       | GI C2.1.1 | 60       | 80       | C2     |
      | GC C2.1       | GI C2.1.2 | 10       | 90       | C2     |
      | GC C2.2       | GI C2.2.1 | 0        | 100      | C2     |
    And the following "grade grades" exist:
      | gradeitem | user     | grade |
      | GI C1     | student1 | 30    |
      | GI C2.1.1 | student1 | 70    |
      | GI C2.1.2 | student1 | 20    |
      | GI C2.2.1 | student1 | 40    |

  Scenario: Mobile navigation (student)
    Given I entered the course "Course 2" as "student1" in the app

    # Course grades
    When I press "Grades" in the app
    Then I should find "GC C2.1" in the app
    And I should find "70" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app
    But I should not find "GC C1" in the app
    And I should not find "GI C1" in the app

    # Course grades details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" in the app
    And I should find "70.00" within "Grade" "ion-item" in the app
    And I should find "60–80" within "Range" "ion-item" in the app
    And I should find "50.00 %" within "Percentage" "ion-item" in the app
    And I should find "Contribution to course total" in the app
    And I should find "GI C2.1.2" in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" in the app
    And I should not find "Range" in the app
    And I should not find "Percentage" in the app
    And I should not find "Contribution to course total" in the app
    But I should find "GI C2.1.1" in the app
    And I should find "GI C2.1.2" in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" in the app
    And I should find "0–270" within "Range" "ion-item" in the app

    When I press "Course total" in the app
    Then I should not find "Weight" in the app
    And I should not find "Percentage" in the app

    # Cannot see grades from others
    When I press "Participants" in the app
    And I press "Student first" in the app
    Then I should find "Blog entries" in the app
    And I should find "Grades" in the app

    When I go back in the app
    And I press "Student second" in the app
    Then I should find "Blog entries" in the app
    But I should not find "Grades" in the app

    # User grades
    When I go back to the root page in the app
    And I press the user menu button in the app
    And I press "Grades" in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "130" within "Course 2" "ion-item" in the app

    # User grades course
    When I press "Course 2" in the app
    Then the header should be "Course 2" in the app
    And I should find "GC C2.1" in the app
    And I should find "70" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app
    But I should not find "Course 1" in the app

    # User grades course details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" in the app
    And I should find "70.00" within "Grade" "ion-item" in the app
    And I should find "60–80" within "Range" "ion-item" in the app
    And I should find "50.00 %" within "Percentage" "ion-item" in the app
    And I should find "Contribution to course total" in the app
    And I should find "GI C2.1.2" in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" in the app
    And I should not find "Range" in the app
    And I should not find "Percentage" in the app
    And I should not find "Contribution to course total" in the app
    But I should find "GI C2.1.1" in the app
    And I should find "GI C2.1.2" in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" in the app
    And I should find "0–270" within "Range" "ion-item" in the app

    When I press "Course total" in the app
    Then I should not find "Weight" in the app
    And I should not find "Percentage" in the app

    # User grades course details — swipe
    When I swipe to the left in the app
    Then I should find "Course 2" in the app
    But I should not find "Course 1" in the app

    When I swipe to the right in the app
    Then I should find "Course 1" in the app
    But I should not find "Course 2" in the app

    When I swipe to the right in the app
    Then I should find "Course 1" in the app
    But I should not find "Course 2" in the app

    When I go back in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                            | course               | other                    |
      | \gradereport_overview\event\grade_report_viewed | Acceptance test site |                          |
      | \gradereport_user\event\grade_report_viewed     | Course 1             |                          |
      | \gradereport_user\event\grade_report_viewed     | Course 2             |                          |
      | \core\event\user_list_viewed                    | Course 2             |                          |
      | \core\event\grade_item_updated                  | Course 1             | {"itemname":"GI C1"}     |
      | \core\event\grade_item_updated                  | Course 2             | {"itemname":"GI C2.1.1"} |
      | \core\event\grade_item_updated                  | Course 2             | {"itemname":"GI C2.1.2"} |
      | \core\event\grade_item_updated                  | Course 2             | {"itemname":"GI C2.2.1"} |
    And the following events should have been logged for the system in the app:
      | name                                            | relateduser | course   | other              |
      | \core\event\user_graded                         | student1    | Course 1 | {"finalgrade":30}  |
      | \core\event\user_graded                         | student1    | Course 2 | {"finalgrade":40}  |
      | \core\event\user_graded                         | student1    | Course 2 | {"finalgrade":90}  |
      | \core\event\user_graded                         | student1    | Course 2 | {"finalgrade":130} |

  @lms_from4.2
  Scenario: Mobile navigation (teacher)
    Given I entered the course "Course 2" as "teacher1" in the app

    # Course grades
    When I press "Grades" in the app
    And I press "Student first" in the app
    Then I should find "GC C2.1" in the app
    And I should find "70" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app
    But I should not find "GC C1" in the app
    And I should not find "GI C1" in the app

    # Course grades details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" in the app
    And I should find "70.00" within "Grade" "ion-item" in the app
    And I should find "60–80" within "Range" "ion-item" in the app
    And I should find "50.00 %" within "Percentage" "ion-item" in the app
    And I should find "Contribution to course total" in the app
    And I should find "GI C2.1.2" in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" in the app
    And I should not find "Range" in the app
    And I should not find "Percentage" in the app
    And I should not find "Contribution to course total" in the app
    But I should find "GI C2.1.1" in the app
    And I should find "GI C2.1.2" in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" in the app
    And I should find "0–270" within "Range" "ion-item" in the app

    When I press "Course total" in the app
    Then I should not find "Weight" in the app
    And I should not find "Percentage" in the app

    # Profile grades
    When I go back in the app
    And I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Grades" in the app
    Then I should find "GC C2.1" in the app

  Scenario: Tablet navigation (student)
    Given I entered the course "Course 2" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    # Course grades
    When I press "Grades" in the app
    Then I should find "GC C2.1" in the app
    And I should find "Weight" in the app
    And I should find "Contribution to course total" in the app
    And I should find "70.00" within "GI C2.1.1" "tr" in the app
    And I should find "60–80" within "GI C2.1.1" "tr" in the app
    And I should find "50.00 %" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app

    # Cannot see grades from others
    When I press "Participants" in the app
    And I press "Student first" in the app
    Then "Student first" should be selected in the app
    And I should find "Grades" inside the split-view content in the app

    When I press "Student second" in the app
    Then "Student second" should be selected in the app
    But I should not find "Grades" inside the split-view content in the app

    # User grades
    When I press the user menu button in the app
    And I press "Grades" within "Student first" "core-main-menu-user-menu" in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "130" within "Course 2" "ion-item" in the app
    And I should find "GC C1" inside the split-view content in the app
    And I should find "30" within "GI C1" "tr" inside the split-view content in the app
    And I should find "30" within "GC C1 total" "tr" inside the split-view content in the app
    And I should find "30" within "Course total" "tr" inside the split-view content in the app
    And "Course 1" should be selected in the app

    # User grades — split view
    When I press "Course 2" in the app
    Then "Course 2" should be selected in the app
    And I should find "GC C2.1" inside the split-view content in the app
    And I should find "70" within "GI C2.1.1" "tr" inside the split-view content in the app
    And I should find "20" within "GI C2.1.2" "tr" inside the split-view content in the app
    And I should find "90" within "GC C2.1 total" "tr" inside the split-view content in the app
    And I should find "GC C2.2" inside the split-view content in the app
    And I should find "40" within "GI C2.2.1" "tr" inside the split-view content in the app
    And I should find "40" within "GC C2.2 total" "tr" inside the split-view content in the app
    And I should find "130" within "Course total" "tr" inside the split-view content in the app
    But I should not find "GC C1" inside the split-view content in the app
    And I should not find "GI C1" inside the split-view content in the app

    # User grades details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" inside the split-view content in the app
    And I should find "70.00" within "Grade" "ion-item" inside the split-view content in the app
    And I should find "60–80" within "Range" "ion-item" inside the split-view content in the app
    And I should find "50.00 %" within "Percentage" "ion-item" inside the split-view content in the app
    And I should find "Contribution to course total" inside the split-view content in the app
    And I should find "GI C2.1.2" inside the split-view content in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" inside the split-view content in the app
    And I should not find "Range" inside the split-view content in the app
    And I should not find "Percentage" inside the split-view content in the app
    And I should not find "Contribution to course total" inside the split-view content in the app
    But I should find "GI C2.1.1" inside the split-view content in the app
    And I should find "GI C2.1.2" inside the split-view content in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" inside the split-view content in the app
    And I should find "0–270" within "Range" "ion-item" inside the split-view content in the app

    When I press "Course total" in the app
    Then I should not find "Weight" inside the split-view content in the app
    And I should not find "Percentage" inside the split-view content in the app

  @lms_from4.2
  Scenario: Tablet navigation (teacher)
    Given I entered the course "Course 2" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    # User grades
    When I press "Grades" in the app
    And I press "Student first" in the app
    Then "Student first" should be selected in the app
    And I should find "GC C2.1" inside the split-view content in the app
    And I should find "70" within "GI C2.1.1" "tr" inside the split-view content in the app
    And I should find "20" within "GI C2.1.2" "tr" inside the split-view content in the app
    And I should find "90" within "GC C2.1 total" "tr" inside the split-view content in the app
    And I should find "GC C2.2" inside the split-view content in the app
    And I should find "40" within "GI C2.2.1" "tr" inside the split-view content in the app
    And I should find "40" within "GC C2.2 total" "tr" inside the split-view content in the app
    And I should find "130" within "Course total" "tr" inside the split-view content in the app
    But I should not find "GC C1" inside the split-view content in the app
    And I should not find "GI C1" inside the split-view content in the app

    # User grades details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" inside the split-view content in the app
    And I should find "70.00" within "Grade" "ion-item" inside the split-view content in the app
    And I should find "60–80" within "Range" "ion-item" inside the split-view content in the app
    And I should find "50.00 %" within "Percentage" "ion-item" inside the split-view content in the app
    And I should find "Contribution to course total" inside the split-view content in the app
    And I should find "GI C2.1.2" inside the split-view content in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" inside the split-view content in the app
    And I should not find "Range" inside the split-view content in the app
    And I should not find "Percentage" inside the split-view content in the app
    And I should not find "Contribution to course total" inside the split-view content in the app
    But I should find "GI C2.1.1" inside the split-view content in the app
    And I should find "GI C2.1.2" inside the split-view content in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" inside the split-view content in the app
    And I should find "0–270" within "Range" "ion-item" inside the split-view content in the app

    When I press "Course total" in the app
    Then I should not find "Weight" inside the split-view content in the app
    And I should not find "Percentage" inside the split-view content in the app

    # Profile grades
    When I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Grades" in the app
    Then I should find "GC C2.1" in the app
