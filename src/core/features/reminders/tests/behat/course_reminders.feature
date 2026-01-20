@app_parallel_run_notifications @core_reminders @app @javascript
Feature: Set a new reminder on course

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | startdate       | enddate         |
      | Course 1 | C1        | 0        | ## yesterday ## | ## now +24 hours ## |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |

  Scenario: Add, delete and update reminder on course
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Course summary" in the app

    Then I should not find "Set a reminder for \"Course 1\" (Course start date)" in the app
    And I should not find "Reminder set for" in the app
    But I should find "Set a reminder for \"Course 1\" (Course end date)" in the app

    # Default set
    When I press "Set a reminder for \"Course 1\" (Course end date)" in the app
    Then I should find "Reminder set for " in the app

    # Set from list
    When I wait toast to dismiss in the app
    And I press "Set a reminder for \"Course 1\" (Course end date)" in the app
    Then I should find "Set a reminder" in the app
    And "At the time of the event" should be selected in the app
    But "12 hours before" should not be selected in the app
    When I press "12 hours before" in the app
    Then I should find "Reminder set for " in the app

    # Custom set
    When I wait toast to dismiss in the app
    And I press "Set a reminder for \"Course 1\" (Course end date)" in the app
    Then I should find "Set a reminder" in the app
    And "At the time of the event" should not be selected in the app
    But "12 hours before" should be selected in the app
    When I press "Custom..." in the app
    Then I should find "Custom reminder" in the app
    When I set the following fields to these values in the app:
       | Value | 2 |
       | Units | hours |
    And I press "Set reminder" in the app
    Then I should find "Reminder set for " in the app

    # Remove
    When I wait toast to dismiss in the app
    And I press "Set a reminder for \"Course 1\" (Course end date)" in the app
    Then "2 hours before" should be selected in the app
    When I press "Delete reminder" in the app
    Then I should find "Reminder deleted" in the app
    But I should not find "Reminder set for" in the app
