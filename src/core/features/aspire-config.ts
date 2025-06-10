// Aspire School Configuration
// Controls which features are visible in the app

export const ASPIRE_CONFIG = {
    // Features to hide completely
    hiddenFeatures: [
        'AddonBlog',           // Blog not needed for K-12
        'AddonBadges',         // Unless used for house points
        'AddonCompetency',     // Too complex for K-12
        'CoreTag',             // Tags not needed
        'CoreSearch',          // Global search too complex
        'AddonNotes',          // Notes feature
        'CoreRating',          // Ratings
        'CoreComments',        // Comments on activities
    ],

    // Custom navigation order (by handler name)
    navigationOrder: [
        'CoreHome',            // Dashboard
        'CoreCourses',         // My Classes
        'AddonCalendar',       // School Calendar  
        'AddonMessages',       // School Updates
        'AddonNotifications',  // Notices
    ],

    // Features to rename or modify
    featureOverrides: {
        'AddonMessages': {
            icon: 'fas-bullhorn',  // Megaphone icon for announcements
            priority: 750,
        },
        'CoreCourses': {
            icon: 'fas-chalkboard', // Chalkboard icon for classes
        }
    },

    // Dashboard blocks to show/hide
    dashboardBlocks: {
        show: [
            'myoverview',      // My classes overview
            'timeline',        // Upcoming activities
            'calendar_month',  // Monthly calendar
            'recentlyaccessed', // Recently accessed
        ],
        hide: [
            'badges',          // Unless using house points
            'blog_menu',       // Blog menu
            'blog_tags',       // Blog tags
            'online_users',    // Online users (privacy)
            'mentees',         // Mentees block
            'glossary_random', // Random glossary
            'tags',            // Tags
        ]
    },

    // Age group settings
    ageGroups: {
        primary: {
            minAge: 5,
            maxAge: 11,
            theme: 'colorful',
            simplifiedUI: true,
        },
        secondary: {
            minAge: 11,
            maxAge: 18,
            theme: 'professional',
            simplifiedUI: false,
        }
    },

    // School-specific settings
    school: {
        name: 'Aspire School',
        logo: 'assets/img/aspire-logo.png',
        primaryColor: '#4A9B8E',
        accentColor: '#D4AF37',
        supportEmail: 'support@aspireschool.org',
        timezone: 'Africa/Cairo',
    }
};

// Helper function to check if a feature should be hidden
export function isFeatureHidden(featureName: string): boolean {
    return ASPIRE_CONFIG.hiddenFeatures.includes(featureName);
}

// Helper function to get feature overrides
export function getFeatureOverride(featureName: string): any {
    return ASPIRE_CONFIG.featureOverrides[featureName] || {};
}