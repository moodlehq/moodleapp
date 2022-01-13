@mod @mod_survey @app @app_upto3.9.4 @javascript
Feature: Test basic usage of survey activity in app
  In order to participate in surveys while using the mobile app
  As a student
  I need basic survey functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name             | intro       | course | idnumber | groupmode |
      | survey   | Test survey name | Test survey | C1     | survey   | 0         |

  @app @3.8.0
  Scenario: Answer a survey & View results (ATTLS)
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey name" in the app
    And I press "Choose" near "1. In evaluating what someone says, I focus on the quality of their argument, not on the person who's presenting it." in the app
    And I press "Strongly agree" in the app
    And I press "Choose" near "2. I like playing devil's advocate - arguing the opposite of what someone is saying." in the app
    And I press "Strongly disagree" in the app
    And I press "Choose" near "3. I like to understand where other people are 'coming from', what experiences have led them to feel the way they do." in the app
    And I press "Somewhat agree" in the app
    And I press "Choose" near "4. The most important part of my education has been learning to understand people who are very different to me." in the app
    And I press "Somewhat disagree" in the app
    And I press "Choose" near "5. I feel that the best way for me to achieve my own identity is to interact with a variety of other people." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "6. I enjoy hearing the opinions of people who come from backgrounds different to mine - it helps me to understand how the same things can be seen in such different ways." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "7. I find that I can strengthen my own position through arguing with someone who disagrees with me." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "8. I am always interested in knowing why people say and believe the things they do." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "9. I often find myself arguing with the authors of books that I read, trying to logically figure out why they're wrong." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "10. It's important for me to remain as objective as possible when I analyze something." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "11. I try to think with people instead of against them." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "12. I have certain criteria I use in evaluating arguments." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "13. I'm more likely to try to understand someone else's opinion than to try to evaluate it." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "14. I try to point out weaknesses in other people's thinking to help them clarify their arguments." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "15. I tend to put myself in other people's shoes when discussing controversial issues, to see why they think the way they do." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "16. One could call my way of analysing things 'putting them on trial' because I am careful to consider all the evidence." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "17. I value the use of logic and reason over the incorporation of my own concerns when solving problems." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "18. I can obtain insight into opinions that differ from mine through empathy." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "19. When I encounter people whose opinions seem alien to me, I make a deliberate effort to 'extend' myself into that person, to try to see how they could have those opinions." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Choose" near "20. I spend time figuring out what's 'wrong' with things. For example, I'll look for something in a literary interpretation that isn't argued well enough." in the app
    And I press "Somewhat agree" near "Neither agree nor disagree" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    And I press "open" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  @app @3.8.0
  Scenario: Answer a survey & View results (Critical incidents)
    Given the following "activities" exist:
      | activity | name                           | intro        | template |course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1    | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey critical incidents" in the app
    And I set the field with xpath "//textarea[@aria-label='At what moment in class were you most engaged as a learner?']" to "1st answer"
    And I set the field with xpath "//textarea[@aria-label='At what moment in class were you most distanced as a learner?']" to "2nd answer"
    And I set the field with xpath "//textarea[@aria-label='What action from anyone in the forums did you find most affirming or helpful?']" to "3rd answer"
    And I set the field with xpath "//textarea[@aria-label='What action from anyone in the forums did you find most puzzling or confusing?']" to "4th answer"
    And I set the field with xpath "//textarea[@aria-label='What event surprised you most?']" to "5th answer"
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "Results"

    When I press "Results" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "Test survey critical incidents"
    And I should see "1st answer"
    And I should see "2nd answer"
    And I should see "3rd answer"
    And I should see "4th answer"
    And I should see "5th answer"

  @app @3.8.0
  Scenario: Answer a survey & View results (Colles actual)
    Given the following "activities" exist:
      | activity | name                        | intro        | template |course | idnumber | groupmode |
      | survey   | Test survey Colles (actual) | Test survey1 | 1        | C1    | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey Colles (actual)" in the app
    And I press "Choose" near "1. my learning focuses on issues that interest me." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "2. what I learn is important for my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "3. I learn how to improve my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "4. what I learn connects well with my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "5. I think critically about how I learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "6. I think critically about my own ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "7. I think critically about other students' ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "8. I think critically about ideas in the readings." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "9. I explain my ideas to other students." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "10. I ask other students to explain their ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "11. other students ask me to explain my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "12. other students respond to my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "13. the tutor stimulates my thinking." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "14. the tutor encourages me to participate." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "15. the tutor models good discourse." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "16. the tutor models critical self-reflection." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "17. other students encourage my participation." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "18. other students praise my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "19. other students value my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "20. other students empathise with my struggle to learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "21. I make good sense of other students' messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "22. other students make good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "23. I make good sense of the tutor's messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "24. the tutor makes good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "25. How long did this survey take you to complete?" in the app
    And I press "under 1 min" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  @app @3.8.0
  Scenario: Answer a survey & View results (Colles preferred)
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey Colles (preferred) | Test survey1 | 2        | C1     | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey Colles (preferred)" in the app
    And I press "Choose" near "1. my learning focuses on issues that interest me." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "2. what I learn is important for my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "3. I learn how to improve my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "4. what I learn connects well with my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "5. I think critically about how I learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "6. I think critically about my own ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "7. I think critically about other students' ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "8. I think critically about ideas in the readings." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "9. I explain my ideas to other students." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "10. I ask other students to explain their ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "11. other students ask me to explain my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "12. other students respond to my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "13. the tutor stimulates my thinking." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "14. the tutor encourages me to participate." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "15. the tutor models good discourse." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "16. the tutor models critical self-reflection." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "17. other students encourage my participation." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "18. other students praise my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "19. other students value my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "20. other students empathise with my struggle to learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "21. I make good sense of other students' messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "22. other students make good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "23. I make good sense of the tutor's messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "24. the tutor makes good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "25. How long did this survey take you to complete?" in the app
    And I press "under 1 min" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  @app @3.8.0
  Scenario: Answer a survey & View results (Colles preferred amd actual)
    Given the following "activities" exist:
      | activity | name                                      | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey Colles (preferred and actual) | Test survey1 | 3        | C1     | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey Colles (preferred and actual)" in the app
    And I press "Choose" near "1. I prefer that my learning focuses on issues that interest me." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "2. I found that my learning focuses on issues that interest me." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "3. I prefer that what I learn is important for my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "4. I found that what I learn is important for my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "5. I prefer that I learn how to improve my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "6. I found that I learn how to improve my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "7. I prefer that what I learn connects well with my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "8. I found that what I learn connects well with my professional practice." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "9. I prefer that I think critically about how I learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "10. I found that I think critically about how I learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "11. I prefer that I think critically about my own ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "12. I found that I think critically about my own ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "13. I prefer that I think critically about other students' ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "14. I found that I think critically about other students' ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "15. I prefer that I think critically about ideas in the readings." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "16. I found that I think critically about ideas in the readings." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "17. I prefer that I explain my ideas to other students." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "18. I found that I explain my ideas to other students." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "19. I prefer that I ask other students to explain their ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "20. I found that I ask other students to explain their ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "21. I prefer that other students ask me to explain my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "22. I found that other students ask me to explain my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "23. I prefer that other students respond to my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "24. I found that other students respond to my ideas." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "25. I prefer that the tutor stimulates my thinking." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "26. I found that the tutor stimulates my thinking." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "27. I prefer that the tutor encourages me to participate." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "28. I found that the tutor encourages me to participate." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "29. I prefer that the tutor models good discourse." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "30. I found that the tutor models good discourse." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "31. I prefer that the tutor models critical self-reflection." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "32. I found that the tutor models critical self-reflection." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "33. I prefer that other students encourage my participation." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "34. I found that other students encourage my participation." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "35. I prefer that other students praise my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "36. I found that other students praise my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "37. I prefer that other students value my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "38. I found that other students value my contribution." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "39. I prefer that other students empathise with my struggle to learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "40. I found that other students empathise with my struggle to learn." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "41. I prefer that I make good sense of other students' messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "42. I found that I make good sense of other students' messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "43. I prefer that other students make good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "44. I found that other students make good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "45. I prefer that I make good sense of the tutor's messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "46. I found that I make good sense of the tutor's messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "47. I prefer that the tutor makes good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "48. I found that the tutor makes good sense of my messages." in the app
    And I press "Sometimes" near "Often" in the app
    And I press "Choose" near "49. How long did this survey take you to complete?" in the app
    And I press "1-2 min" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  @app @3.8.0
  Scenario: Answer survey offline & Sync survey
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1     | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Test survey critical incidents" in the app
    And I switch offline mode to "true"
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "This Survey has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "Test survey critical incidents" in the app
    And I press "Display options" in the app
    And I press "Refresh" in the app
    Then I should see "Results"
    And I should see "You have completed this survey."
    But I should not see "This Survey has offline data to be synchronised."

  @app @3.8.0
  Scenario: Prefetch & Auto-sync survey
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1     | survey1  | 0         |
    When I enter the course "Course 1" as "student1" in the app
    And I press "Display options" in the app
    And I press "Manage course storage" in the app
    And I press "cloud download" near "Test survey critical incidents" in the app
    And I press the back button in the app
    And I switch offline mode to "true"
    And I press "Test survey name" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."

    When I press "OK" in the app
    And I press the back button in the app
    And I press "Test survey critical incidents" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "This Survey has offline data to be synchronised."

    When I switch offline mode to "false"
    And I run cron tasks in the app
    Then I should not see "This Survey has offline data to be synchronised."
    And I should see "You have completed this survey."
