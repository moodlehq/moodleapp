@app_parallel_run_login @core_login @app @core @javascript @test
Feature: Test login failures in app
	I need login errors to be displayed when the site configuration prevents access

Scenario: Display an error when access is restricted
    Given the following config values are set as admin:
        | enablemobilewebservice | 0 |
        | enablewebservices      | 1 |
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Site not enabled for mobile app access" in the app
    And I should find "This site isn't configured to allow mobile app access." in the app

    When I press "Cancel" in the app
    And the following config values are set as admin:
        | enablemobilewebservice  | 1 |
        | enablewebservices       | 0 |
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Site not enabled for mobile app access" in the app
    And I should find "This site isn't configured to allow mobile app access." in the app

    When I press "Cancel" in the app
    And the following config values are set as admin:
        | enablemobilewebservice   | 1 |
        | enablewebservices        | 1 |
        | maintenance_enabled      | 1 |
        | maintenance_message      | Access is temporarily sealed while our digital smiths complete the ritual. We will return online shortly |
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then I should find "Can't connect to site" in the app
    And I should find "The site is undergoing maintenance and is currently not available" in the app
    And I should find "Access is temporarily sealed while our digital smiths complete the ritual. We will return online shortly" in the app
