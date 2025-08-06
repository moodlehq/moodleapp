@addon_mod_feedback @app @mod @mod_feedback @javascript @lms_from5.1
Feature: Activities overview for feedback activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | Username  | 1        |
      | student2 | Username  | 2        |
      | student3 | Username  | 3        |
      | student4 | Username  | 4        |
      | student5 | Username  | 5        |
      | student6 | Username  | 6        |
      | student7 | Username  | 7        |
      | student8 | Username  | 8        |
      | teacher1  | Teacher  | T        |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | student4 | C1     | student        |
      | student5 | C1     | student        |
      | student6 | C1     | student        |
      | student7 | C1     | student        |
      | student8 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name                   | course | idnumber  | timeclose            |
      | feedback | Date feedback          | C1     | feedback1 | ##1 Jan 2040 08:00## |
      | feedback | Not responded feedback | C1     | feedback2 | ##tomorrow noon##    |
      | feedback | No date feedback       | C1     | feedback3 |                      |
    Given the following "mod_feedback > question" exists:
      | activity     | feedback1                               |
      | name         | Do you like this course?                |
      | questiontype | multichoice                             |
      | label        | multichoice1                            |
      | subtype      | r                                       |
      | hidenoselect | 1                                       |
      | values       | Yes of course\nNot at all\nI don't know |
    And the following "mod_feedback > responses" exist:
      | activity  | user     | Do you like this course? |
      | feedback1 | student1 | Not at all               |
      | feedback1 | student2 | I don't know             |
      | feedback1 | student3 | Not at all               |
      | feedback1 | student4 | Yes of course            |
      | feedback3 | student1 | Not at all               |
      | feedback3 | student2 | I don't know             |
      | feedback3 | student3 | Not at all               |

  Scenario: Teacher can see the feedback relevant information in the feedback overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Feedback" in the app
    And I press "Date feedback" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "4" within "Responses" "ion-item" in the app
    And I should not find "Responded" in the app

    When I press "View" within "Actions" "ion-item" in the app
    Then the header should be "Responses" in the app
    And I should find "Anonymous entries" in the app

    When I go back in the app
    And I press "Not responded feedback" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    And I should find "0" within "Responses" "ion-item" in the app
    And I should be able to press "View" within "Actions" "ion-item" in the app

    When I press "No date feedback" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should be able to press "View" within "Actions" "ion-item" in the app

  # TODO: Support pix icon output. See MDL-86208.
  Scenario: Students can see the feedback relevant information in the feedback overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Feedback" in the app
    And I press "Date feedback" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    # And I should find "You have already submitted this feedback" "ion-icon" within "Responded" "ion-item" in the app
    And I should not find "Responses" in the app

    When I press "Not responded feedback" "ion-item" in the app
    Then I should find "Tomorrow" within "Due date" "ion-item" in the app
    # And I should find "-" within "Responded" "ion-item" in the app

    When I press "No date feedback" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    # And I should find "You have already submitted this feedback" "ion-icon" within "Responded" "ion-item" in the app
