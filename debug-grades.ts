// Debug script to trace why student grades don't show all courses

import { CoreGrades } from './src/core/features/grades/services/grades';
import { CoreGradesHelper } from './src/core/features/grades/services/grades-helper';
import { CoreCourses } from './src/core/features/courses/services/courses';
import { CoreSites } from './src/services/sites';

export async function debugGradesIssue() {
    console.log('=== DEBUG: Student Grades Issue ===');
    
    const site = CoreSites.getCurrentSite();
    if (!site) {
        console.error('No site found');
        return;
    }
    
    const userId = site.getUserId();
    console.log('Current user ID:', userId);
    
    try {
        // 1. Get all user courses
        console.log('\n1. Getting all user courses...');
        const allCourses = await CoreCourses.getUserCourses(false, site.getId());
        console.log(`Found ${allCourses.length} total courses:`, allCourses.map(c => ({
            id: c.id,
            fullname: c.fullname,
            visible: c.visible,
            showgrades: c.showgrades
        })));
        
        // 2. Get course grades from grades service
        console.log('\n2. Getting course grades...');
        const courseGrades = await CoreGrades.getCoursesGrades(site.getId());
        console.log(`Found ${courseGrades.length} course grades:`, courseGrades);
        
        // 3. Get grades with course data
        console.log('\n3. Getting grades with course data...');
        const gradesWithCourseData = await CoreGradesHelper.getGradesCourseData(courseGrades);
        console.log(`Found ${gradesWithCourseData.length} grades with course data:`, gradesWithCourseData.map(g => ({
            courseid: g.courseid,
            fullname: g.courseFullName,
            grade: g.grade
        })));
        
        // 4. Compare courses
        console.log('\n4. Comparing courses...');
        const courseIdsWithGrades = new Set(courseGrades.map(g => g.courseid));
        const missingCourses = allCourses.filter(c => !courseIdsWithGrades.has(c.id));
        
        if (missingCourses.length > 0) {
            console.log(`\nMissing ${missingCourses.length} courses in grades:`, missingCourses.map(c => ({
                id: c.id,
                fullname: c.fullname,
                showgrades: c.showgrades
            })));
            
            // Check why these courses might be missing
            console.log('\n5. Checking missing courses...');
            for (const course of missingCourses) {
                console.log(`\nCourse: ${course.fullname} (ID: ${course.id})`);
                console.log(`- Show grades: ${course.showgrades}`);
                console.log(`- Visible: ${course.visible}`);
                
                // Check if grades are enabled for the course
                const gradesEnabled = await CoreGrades.isPluginEnabledForCourse(course.id, site.getId());
                console.log(`- Grades enabled: ${gradesEnabled}`);
                
                // Try to get grades table for this course
                try {
                    const gradeTable = await CoreGrades.getCourseGradesTable(course.id, userId, site.getId());
                    console.log(`- Grade table found with ${gradeTable.tabledata?.length || 0} items`);
                } catch (error) {
                    console.log(`- Error getting grade table: ${error.message}`);
                }
            }
        } else {
            console.log('All courses have grades!');
        }
        
    } catch (error) {
        console.error('Error during debug:', error);
    }
}

// This function can be called from the console or added to a component for testing