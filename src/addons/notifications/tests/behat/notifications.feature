@addon_notifications @app @core @core_message @javascript
Feature: Notifications

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
      | student2 | Second    | Student  |
    And the following "notifications" exist:
      | subject  | userfrom | userto   | timecreated | timeread   |
      | Test 01  | student2 | student1 | 1649766600  | null       |
      | Test 02  | student2 | student1 | 1649766601  | null       |
      | Test 03  | student2 | student1 | 1649766602  | 1649766602 |
      | Test 04  | student2 | student1 | 1649766603  | 1649766602 |
      | Test 05  | student2 | student1 | 1649766604  | null       |
      | Test 06  | student2 | student1 | 1649766605  | null       |
      | Test 07  | student2 | student1 | 1649766606  | 1649766602 |
      | Test 08  | student2 | student1 | 1649766607  | 1649766602 |
      | Test 09  | student2 | student1 | 1649766608  | null       |
      | Test 10  | student2 | student1 | 1649766609  | 1649766602 |
      | Test 11  | student2 | student1 | 1649766610  | 1649766602 |
      | Test 12  | student2 | student1 | 1649766611  | 1649766602 |
      | Test 13  | student2 | student1 | 1649766612  | 1649766602 |
      | Test 14  | student2 | student1 | 1649766613  | 1649766602 |
      | Test 15  | student2 | student1 | 1649766614  | 1649766602 |
      | Test 16  | student2 | student1 | 1649766615  | 1649766602 |
      | Test 17  | student2 | student1 | 1649766616  | 1649766602 |
      | Test 18  | student2 | student1 | 1649766617  | 1649766602 |
      | Test 19  | student2 | student1 | 1649766618  | 1649766602 |
      | Test 20  | student2 | student1 | 1649766619  | 1649766602 |
      | Test 21  | student2 | student1 | 1649766620  | null       |
      | Test 22  | student2 | student1 | 1649766621  | 1649766602 |
      | Test 23  | student2 | student1 | 1649766622  | 1649766602 |
      | Test 24  | student2 | student1 | 1649766623  | 1649766602 |
      | Test 25  | student2 | student1 | 1649766624  | 1649766602 |
      | Test 26  | student2 | student1 | 1649766625  | null       |
      | Test 27  | student2 | student1 | 1649766626  | 1649766602 |
      | Test 28  | student2 | student1 | 1649766627  | 1649766602 |
      | Test 29  | student2 | student1 | 1649766628  | 1649766602 |
      | Test 30  | student2 | student1 | 1649766629  | null       |

  Scenario: Mobile navigation
    Given I entered the app as "student1"
    Then I should find "8" within "Notifications" "ion-tab-button" in the app
    When I press "Notifications" in the app
    Then I should find "Test 30" in the app
    But I should not find "Test 10" in the app
    When I load more items in the app
    Then I should find "Test 10" in the app
    And I should find "Test 01" in the app

    # Receive a push notification
    When I click a push notification in the app for:
      | username | message   | title   |
      | student1 | Test push | Push 01 |
    Then I should find "Push 01" in the app
    And I should find "Test push" in the app

    # Open notification detail
    When I go back in the app
    And I press "Test 30" in the app
    Then I should find "Test 30 description" in the app

    # Go back and open other notification
    When I go back in the app
    Then I should find "Test 10" in the app
    And I should find "7" within "Notifications" "ion-tab-button" in the app
    When I press "Test 10" in the app
    Then I should find "Test 10 description" in the app

    # Swipe to next notification
    When I swipe to the right in the app
    Then I should find "Test 11 description" in the app
    But I should not find "Test 10 description" in the app

    # Swipe to previous notification
    When I swipe to the left in the app
    Then I should find "Test 10 description" in the app
    But I should not find "Test 09 description" in the app


    # Check event logs
    And the following events should not have been logged for "student1" in the app:
      | name                             | object        | objectname |
      | \core\event\notification_viewed	 | notifications | Test 10    |
      | \core\event\notification_viewed	 | notifications | Test 11    |
    But the following events should have been logged for "student1" in the app:
      | name                             | object        | objectname |
      | \core\event\notification_viewed	 | notifications | Test 30    |

  Scenario: Tablet navigation
    Given I entered the app as "student1"
    And I change viewport size to "1200x640" in the app
    And I press "Notifications" in the app
    Then I should find "Test 30" in the app
    But I should not find "Test 10" in the app

    # Load more notifications
    When I load more items in the app
    Then I should find "Test 10" in the app
    And I should find "Test 01" in the app
    And I should find "Test 30 description" inside the split-view content in the app
    And "Test 30" near "Test 29" should be selected in the app

    # Open loaded items after load more notifications
    When I press "Test 10" in the app
    Then I should find "Test 10 description" inside the split-view content in the app
    And "Test 10" near "Test 11" should be selected in the app

    # Mark as read notification
    When I press "Test 01" in the app
    Then I should not find "Unread notification: Test 01" in the app
    But I should find "Test 01" in the app
    And I should find "Unread notification: Test 26" in the app
    And I should find "6" within "Notifications" "ion-tab-button" in the app

    # Mark all notifications as read
    When I press "Mark all as read" in the app
    Then I should not find "Unread notification" in the app
    And I should not find "6" within "Notifications" "ion-tab-button" in the app

    # Pull to refresh
    When I pull to refresh in the app
    Then I should not find "Unread notification" in the app
