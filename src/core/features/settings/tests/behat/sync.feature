@app @javascript @core_settings
Feature: It synchronise sites properly

  Background:
    Given the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | david     | student  |
      | student2 | pau       | student2 |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
      | student2 | C1 | student |
    And the following "activities" exist:
      | activity | name        | intro | course | idnumber | option                       | allowmultiple | allowupdate | showresults |
      | choice   | Sync choice | Intro | C1     | choice1  | Option 1, Option 2, Option 3 | 0             | 0           | 1           |

  Scenario: Sync the current site
    # Add something offline
    Given I entered the choice activity "Sync choice" on course "Course 1" as "student1" in the app
    When I switch network connection to offline
    And I select "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    Then I should find "This Choice has offline data to be synchronised." in the app

    # Cannot sync in offline
    When I press the back button in the app
    And I press the back button in the app
    And I press the user menu button in the app
    And I press "Preferences" in the app
    Then I should find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app

    When I switch network connection to wifi
    Then I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app

    # Check synced
    When I press "Synchronise now" "button" in the app
    And I wait loading to finish in the app
    And I switch network connection to offline
    And I press the back button in the app
    And I entered the course "Course 1" in the app
    And I press "Sync choice" in the app
    Then I should not find "This Choice has offline data to be synchronised." in the app

    # Check limited sync.
    When I switch network connection to cellular
    And I press the back button in the app
    And I press the back button in the app
    And I press the user menu button in the app
    And I press "Preferences" in the app

    # Cannot sync in cellular
    Then I should find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app

  Scenario: Sync sites messages with different network connections
    Given I entered the app as "student1"

    # Wifi + data saver on.
    When I press the more menu button in the app
    And I press "App settings" in the app
    And I press "Synchronisation" in the app
    Then I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should find "Accounts" in the app

    # Limited + data saver on.
    When I switch network connection to cellular
    Then I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should not find "Accounts" in the app

    # Offline + data saver on.
    When I switch network connection to offline
    Then I should find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should not find "Accounts" in the app

    # Wifi + data saver off.
    When I press "Data saver: Synchronise only when on Wi-Fi" in the app
    And I switch network connection to wifi
    Then I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should find "Accounts" in the app

    # Limited + data saver off.
    When I switch network connection to cellular
    Then I should not find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should find "Accounts" in the app

    # Offline + data saver off.
    When I switch network connection to offline
    Then I should find "Your device is offline. Connect to the internet to synchronise sites." in the app
    And I should not find "Connect to a Wi-Fi network or turn off Data saver to synchronise sites." in the app
    And I should not find "Accounts" in the app

  Scenario: Sync logged in and logged out sites
    Given I entered the app as "student1"
    And I log out in the app
    And I entered the choice activity "Sync choice" on course "Course 1" as "student2" in the app

    # Add something offline
    When I switch network connection to offline
    And I select "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    Then I should find "This Choice has offline data to be synchronised." in the app

    When I press the back button in the app
    And I press the back button in the app
    And I press the more menu button in the app
    And I press "App settings" in the app
    And I press "Synchronisation" in the app
    And I switch network connection to wifi
    Then I should find "Accounts" in the app

    # Check synced
    When I press "Synchronise now" "button" in the app
    And I wait loading to finish in the app
    And I switch network connection to offline
    And I press the back button in the app
    And I entered the course "Course 1" in the app
    And I press "Sync choice" in the app
    Then I should not find "This Choice has offline data to be synchronised." in the app

    # Test log in to sync
    When I press the back button in the app
    And I press the back button in the app
    And I press the more menu button in the app
    And I press "App settings" in the app
    And I press "Synchronisation" in the app
    And I switch network connection to wifi
    Then I should find "Accounts" in the app
    And I should find "Log in to synchronise" in the app

    When I press "Log in" in the app
    Then I should find "Reconnect" in the app

    When I set the field "Password" to "student1" in the app
    And I press "Log in" in the app
    And I press the more menu button in the app
    And I press "App settings" in the app
    And I press "Synchronisation" in the app
    Then I should not find "Log in to synchronise" in the app
