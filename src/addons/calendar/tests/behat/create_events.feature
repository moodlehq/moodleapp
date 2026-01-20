@app_parallel_run_calendar @addon_calendar @app @core @core_calendar @javascript
Feature: Test creation of calendar events in app
  In order to take advantage of all the calendar features while using the mobile app
  As a student
  I need basic to be able to create and edit calendar events in the app

  Background:
    Given the following config values are set as admin:
      | nofixday  | 1 |
      | nofixhour | 1 |
    And the following "users" exist:
      | username | firstname  | lastname  | email                |
      | teacher1 | Teacher    | teacher   | teacher1@example.com |
      | student1 | Student1   | student1  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |

  # This test is flaky due to timestamp.
  Scenario: Create user event as student from monthly view
    Given I entered the app as "student1"
    When I press the more menu button in the app
    And I press "Calendar" in the app
    And I press "New event" in the app
    # Flaky step, sometimes it fails due to minute change when checking.
    Then the field "Date" matches value "## now ##%Y-%m-%dT%H:%M##" in the app
    And I should not be able to press "Save" in the app

    # Check that student can only create User events.
    When I press "Type of event" in the app
    Then I should not find "Cancel" in the app
    And I should find "User" within "Type of event" "ion-item" in the app

    # Create the event.
    When I set the field "Event title" to "User Event 01" in the app
    And I set the field "Date" to "2025-04-08T09:00" in the app
    And I press "Without duration" in the app
    And I set the field "Description" to "This is User Event 01 description." in the app
    And I set the field "Location" to "Barcelona" in the app
    And I press "Save" in the app
    Then I should find "Calendar" in the app

    # Verify that event was created right.
    When I open the calendar for "4" "2025" in the app
    And I press "Tuesday, 8 April 2025" in the app
    Then I should find "User Event 01" in the app

    When I press "User Event 01" in the app
    Then I should find "Tuesday, 8 April" in the app
    And I should find "Starting time: 9:00 AM" in the app
    And I should find "User event" within "Event type" "ion-item" in the app
    And I should find "This is User Event 01 description." in the app
    And I should find "Barcelona" in the app
    But I should not find "Ending time" in the app

    When I press the page context menu button in the app
    Then I should find "Edit" in the app
    And I should find "Delete" in the app

    When I close the popup in the app
    And I press "Barcelona" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url "google.com"
    And the following events should have been logged for "student1" in the app:
      | name                               | other                    |
      | \core\event\calendar_event_created | {"name":"User Event 01"} |

  # @todo Add more Scenarios to test teacher, different values, and creating events from other views (e.g. day view).
