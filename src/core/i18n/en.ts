/**
 * English Dictionary (Default)
 */
export const en = {
  // Brand
  tagline: 'Plan • Explore • Capture • Remember',

  // Navigation Tabs
  tabs: {
    home: 'Home',
    trips: 'Trips',
    create: 'New Trip',
    inventory: 'Inventory',
    settings: 'Settings',
    tripsHeader: 'All Trips & Roadmaps',
    inventoryHeader: 'Personal Inventory',
    settingsHeader: 'Settings & System',
  },

  // Home Screen
  home: {
    totalTrips: 'Total Trips',
    activeTrips: 'Active / Ready',
    completedTrips: 'Completed',
    ongoingTripHeading: 'Trip in Progress',
    upcomingTripHeading: 'Upcoming Trip',
    statusOngoing: 'On the Road',
    statusReady: 'Ready to Go',
    statusPreparing: 'Preparation',
    statusDraft: 'Draft Plan',
    openRoadmapBtn: 'Open Roadmap & Checklist →',
    startPlanningTitle: 'Start Planning a Trip',
    startPlanningDesc: 'Choose an instant template below to auto-generate your roadmap stops and packing checklist.',
    albumTitle: 'Travel Memories Album',
    photosBadge: '{count} Photos',
    onePhotoBadge: '1 Photo',
    emptyAlbumTitle: 'No Photos in Album Yet',
    emptyAlbumDesc: 'Capture photos or choose from gallery during trips to showcase your travel memories here.',
  },

  // Settings Screen
  settings: {
    title: 'Settings & System',
    profileName: 'Tripory Explorer',
    profileRole: 'Local Account • Offline-First Privacy',
    localBadge: 'Local',
    profileDesc: 'Data stored locally on device with zero cloud tracking.',
    
    // Gmail Backup Section
    gmailSection: 'Gmail Backup Destination',
    gmailAccountLabel: 'Gmail Account',
    gmailConnected: 'Connected',
    gmailNotSet: 'Not Configured',
    gmailPlaceholder: 'traveler@gmail.com',
    saveEmail: 'Save',
    editEmail: 'Edit',
    lastBackup: 'Last backup: {time}',
    neverBackedUp: 'Never backed up yet',
    btnBackupNow: 'Backup Data to Gmail',
    btnRestoreData: 'Restore / Download Data',
    backupSuccessTitle: 'Backup Prepared',
    backupSuccessMsg: 'Local database extracted and dispatched to {email}.',
    restoreModalTitle: 'Restore Trip Data',
    restoreModalSubtitle: 'Choose your backup source:',
    restoreFromEmail: 'From Email (Gmail)',
    restoreFromEmailDesc: 'Select tripory-backup.json downloaded from Gmail',
    restoreFromLocal: 'From Local Storage',
    restoreFromLocalDesc: 'Select backup file from device documents',
    restoreSuccessTitle: 'Restore Successful',
    restoreSuccessMsg: 'Restored {trips} trips, {destinations} stops, and {items} items.',
    restoreFailTitle: 'Restore Failed',
    restoreFailMsg: 'Selected file is not a valid Tripory backup.',
    cancel: 'Cancel',

    // Language Section
    languageSection: 'Language & Region',
    languageLabel: 'Application Language',
    languageEn: 'English (Default)',
    languageId: 'Bahasa Indonesia',
    
    // Appearance & Accessibility
    appearanceSection: 'Appearance & Accessibility',
    darkMode: 'Dark Mode',
    darkModeDesc: 'Comfortable nocturnal theme for low light',
    haptics: 'Haptic Feedback',
    hapticsDesc: 'Tactile vibration on checklist taps',
    contrast: 'High Contrast',
    contrastDesc: 'Enhanced text legibility outdoors',
    
    // Device Info
    deviceSection: 'Device & System Information',
    os: 'Operating System',
    database: 'Local Database',
    databaseVal: 'SQLite v2 + Drizzle',
    mediaStorage: 'Photos & Media Storage',
    operationMode: 'Operation Mode',
    offlineOnly: '100% Offline (No Cloud)',
    
    // Data & Privacy
    dataSection: 'Local Data & Privacy',
    securityBackup: 'Security & Backup Info',
    securityBackupDesc: 'Stored safely in local tripory.db file',
    exportSummary: 'Export Trip Summary',
    exportSummaryDesc: 'Save a readable archive of your past journeys',
    
    // About
    aboutSection: 'About Tripory',
    aboutSubtitle: 'Version {version} (EAS Local-First MVP)',
    aboutText: 'Tripory is a local-first mobile travel companion for Android and iOS. Built to assist moving travelers through every stage from preparation to lasting memories.',
    
    // Dialogs
    backupAlertTitle: 'Local Offline Backup',
    backupAlertDesc: 'All your trip records, roadmap destinations, and captured memory photos are stored directly in your device SQLite database (tripory.db). No external servers are involved.',
    exportAlertTitle: 'Export Trip Summary',
    exportAlertDesc: 'Your trip archives are ready to be saved to your device document directory.',
    ok: 'OK',
    understood: 'Understood',
  },

  // Trip Detail & Workspace
  trip: {
    details: 'Trip Details',
    back: 'Back',
    tabDestinations: 'Destinations',
    tabPacking: 'Pack',
    tabMoments: 'Moments',
    roadmapProgress: 'Journey Roadmap',
    stagePrefix: 'Stage {current} of {total}',
    activeStagePrefix: 'Active Stage: {stage}',
    
    // Co-Pilot Guide
    copilotHeading: 'NEXT STEP GUIDE',
    copilotPack: 'Pack {count} remaining items before departing',
    copilotReady: 'All items packed! Ready to begin journey?',
    copilotOngoing: 'Trip is active. Enjoy the trail & capture moments',
    copilotCompleted: 'Trip completed and archived',
    openChecklistBtn: 'Open Checklist',
    markAllPackedBtn: '✓ Mark All Packed',
    startTripBtn: '🚀 Start Journey (Explore Now)',
    addMomentPhotoBtn: '📸 Add Photo Moment',
    finishTripBtn: '📦 Finish & Return Check',
    
    // Moments
    memoriesHeading: 'Travel Memories',
    memoriesSubtitle: 'Photos & stories saved offline on this device.',
    addMemoryTitle: 'Capture Photo & Memory Note',
    cameraBtn: 'Take Photo',
    cameraDesc: 'Direct camera',
    galleryBtn: 'Pick Gallery',
    galleryDesc: 'From library',
    captionLabel: 'Story / Memory Note',
    captionPlaceholder: 'e.g. Scenic mountain view at sunrise...',
    locationTagLabel: 'Location Tag',
    locationTagPlaceholder: 'Place / city name...',
    gpsBtn: 'GPS',
    saveMomentBtn: '💾 Save Offline Memory',
    galleryTitle: 'Memories Gallery ({count})',
    noMemoriesYet: 'No memories saved yet',
    noMemoriesDesc: 'Use the camera or gallery buttons above to start capturing your journey memories offline.',
    deleteMomentConfirmTitle: 'Delete Moment',
    deleteMomentConfirmDesc: 'Are you sure you want to delete this memory photo?',
    cancel: 'Cancel',
    delete: 'Delete',
    
    // Packing
    readinessTitle: 'Luggage Readiness',
    readinessSubtitle: '{packed} of {total} Items Packed',
    unpackedNotice: '{count} essential items need packing',
    allPackedNotice: 'All items are ready in your luggage!',
    packingProgress: 'Packing Progress',
    blockersTitle: 'Critical Blockers ({count} essential items)',
    quickBundlesTitle: 'Add Quick Packing Bundles (1-Tap):',
    filterAll: 'All ({count})',
    filterUnpacked: 'Need Packing ({count})',
    filterPacked: 'Packed ({count})',
    manualAddTitle: 'Add Item Manually',
    manualAddPlaceholder: 'Type item name...',
    addChecklistBtn: '+ Add to Checklist',
    
    // Destinations
    destProgressTitle: 'Destinations Visited',
    destProgressSubtitle: '{visited} of {total} Stops Completed',
    visitedPercent: '{percent}% Achieved',
    markVisitedBtn: 'Mark Visited',
    visitedBtn: 'Visited ✓',
    activeStopBadge: 'Active Stop',
    dayPrefix: 'DAY {day}',
    addDestinationBtn: '+ Add Custom Stop',
  },

  // Lifecycle Stages
  stages: {
    plan: 'Plan',
    pack: 'Pack',
    explore: 'Explore',
    return: 'Return Check',
    completed: 'Done',
  },
};

type DeepString<T> = {
  [K in keyof T]: T[K] extends object ? DeepString<T[K]> : string;
};

export type TranslationDictionary = DeepString<typeof en>;

