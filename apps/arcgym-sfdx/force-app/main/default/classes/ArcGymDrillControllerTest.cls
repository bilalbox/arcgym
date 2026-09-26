@isTest
private class ArcGymDrillControllerTest {

    @isTest
    static void testGetTodayDrillWithRecords() {
        ArcGym_Drill__c drill = new ArcGym_Drill__c(
            Title__c = 'Unit Test Drill',
            Format__c = 'Rapid_Fire',
            Curriculum_Domain__c = 'Core_Platform_Execution',
            Difficulty_Tier__c = 'Associate_Domain_Architect',
            Status__c = 'Approved',
            Scheduled_Date__c = Date.today(),
            Pillars__c = 'Trust;Reliability',
            Version__c = 1,
            Definition_JSON__c = '{"steps":[]}'
        );
        insert drill;

        Test.startTest();
        ArcGymDrillController.DrillDTO dto = ArcGymDrillController.getTodayDrill();
        Test.stopTest();

        System.assertNotEquals(null, dto, 'DTO should not be null');
        System.assertEquals('Unit Test Drill', dto.title, 'Title should match');
        System.assertEquals('Rapid_Fire', dto.format, 'Format should match');
    }

    @isTest
    static void testGetTodayDrillFallback() {
        Test.startTest();
        ArcGymDrillController.DrillDTO dto = ArcGymDrillController.getTodayDrill();
        Test.stopTest();

        System.assertNotEquals(null, dto, 'Fallback DTO should not be null');
        System.assertEquals('AGD-00101', dto.id, 'Fallback ID should be default');
    }

    @isTest
    static void testRecordAttemptAndStreak() {
        Test.startTest();
        ArcGymDrillController.AttemptResultDTO result = ArcGymDrillController.recordAttempt(
            'AGD-00101', 95, 0.92, '{"answers":[]}', 5
        );
        Integer streak = ArcGymDrillController.getUserStreak();
        Test.stopTest();

        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(true, result.success, 'Result should be successful');
        System.assertEquals(5, result.currentStreak, 'Streak should match');
        System.assertEquals(5, streak, 'User streak query should match');
    }
}
