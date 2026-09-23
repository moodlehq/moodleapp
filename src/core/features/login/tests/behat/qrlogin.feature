@app_parallel_run_login @core_login @app @core @javascript @lms_from4.3
Feature: Test qr login in app
    It only tests if the button is shown

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | david     | student  |

  Scenario: QR Login disabled with default app settings (undefined)
    # The same should happen with qrcodetype 1
    Given the following config values are set as admin:
      | qrcodetype | 0 | tool_mobile |

    # Sites screen SHOWN
    When I launch the app
    Then I should be able to press "Scan QR code" in the app

    # Credentials screen NOT SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should not be able to press "Scan QR code" in the app

    # Reconnect screen NOT SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should not be able to press "Scan QR code" in the app

  Scenario: QR Login disabled with displayqronsitescreen = true
    # The same should happen with qrcodetype 1
    Given the following config values are set as admin:
      | qrcodetype | 0 | tool_mobile |
    And the app has the following config:
      | displayqronsitescreen | true |

    # Sites screen SHOWN
    When I launch the app
    Then I should be able to press "Scan QR code" in the app

    # Credentials screen NOT SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should not be able to press "Scan QR code" in the app

    # Reconnect screen NOT SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should not be able to press "Scan QR code" in the app

  Scenario: QR Login disabled with displayqronsitescreen = false
    # The same should happen with qrcodetype 1
    Given the following config values are set as admin:
      | qrcodetype | 0 | tool_mobile |
    And the app has the following config:
      | displayqronsitescreen | false |

    # Sites screen NOT SHOWN
    When I launch the app
    Then I should not be able to press "Scan QR code" in the app

    # Credentials screen NOT SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should not be able to press "Scan QR code" in the app

    # Reconnect screen NOT SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should not be able to press "Scan QR code" in the app

  Scenario: QR Login set to login with default app settings (undefined)
    Given the following config values are set as admin:
      | qrcodetype | 2 | tool_mobile |

    # Sites screen SHOWN
    When I launch the app
    Then I should be able to press "Scan QR code" in the app

    # Credentials screen NOT SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should not be able to press "Scan QR code" in the app

    # Reconnect screen SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should be able to press "Scan QR code" in the app

  Scenario: QR Login set to login with displayqroncredentialscreen = true
    Given the following config values are set as admin:
      | qrcodetype | 2 | tool_mobile |
    And the app has the following config:
      | displayqronsitescreen       | false |
      | displayqroncredentialscreen | true  |

    # Sites screen NOT SHOWN
    When I launch the app
    Then I should not be able to press "Scan QR code" in the app

    # Credentials screen SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should be able to press "Scan QR code" in the app

    # Reconnect screen SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should be able to press "Scan QR code" in the app

  Scenario: QR Login set to login with displayqroncredentialscreen = false
    Given the following config values are set as admin:
      | qrcodetype | 2 | tool_mobile |
    And the app has the following config:
      | displayqroncredentialscreen | false |

    # Sites screen SHOWN
    When I launch the app
    Then I should be able to press "Scan QR code" in the app

    # Credentials screen NOT SHOWN
    When I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Acceptance test site" in the app
    And I should not be able to press "Scan QR code" in the app

    # Reconnect screen NOT SHOWN
    When I set the following fields to these values in the app:
      | Username | student1 |
      | Password | student1 |
    And I press "Log in" near "Lost password?" in the app
    And I press the user menu button in the app
    And I press "Log out" in the app
    And I wait the app to restart
    And I press "david student" in the app
    Then I should not be able to press "Scan QR code" in the app
