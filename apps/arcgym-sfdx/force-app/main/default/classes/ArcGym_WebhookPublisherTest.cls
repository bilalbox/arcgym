@isTest
private class ArcGym_WebhookPublisherTest {
    private class MockHttpSuccess implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            System.assertNotEquals(null, req.getHeader('X-ArcGym-Signature'), 'Signature header must be present');
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"success":true,"drillId":"AGD-00001"}');
            res.setStatusCode(200);
            return res;
        }
    }

    @isTest
    static void testPublishApprovedDrill() {
        ArcGym_Drill__c drill = new ArcGym_Drill__c(
            Title__c = 'Integration Patterns: CDC vs Platform Events',
            Format__c = 'Rapid_Fire',
            Curriculum_Domain__c = 'Enterprise_Integration',
            Difficulty_Tier__c = 'Associate_Domain_Architect',
            Status__c = 'Approved',
            Scheduled_Date__c = Date.today(),
            Pillars__c = 'Trust;Reliability',
            Version__c = 1,
            Definition_JSON__c = '{"steps":[{"prompt":"Sample prompt","options":[]}]}'
        );
        insert drill;

        Test.setMock(HttpCalloutMock.class, new MockHttpSuccess());

        Test.startTest();
        ArcGym_WebhookPublisher.PublishRequest req = new ArcGym_WebhookPublisher.PublishRequest();
        req.drillId = drill.Id;
        List<ArcGym_WebhookPublisher.PublishResult> results = ArcGym_WebhookPublisher.publishDrills(
            new List<ArcGym_WebhookPublisher.PublishRequest>{ req }
        );
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Should return 1 result');
        System.assertEquals('ENQUEUED', results[0].status, 'Status should be ENQUEUED');
    }

    @isTest
    static void testHmacCalculation() {
        String testPayload = '{"title":"Test Drill"}';
        String testSecret = 'secret123';
        String sig = ArcGym_WebhookPublisher.computeHmacSha256(testPayload, testSecret);
        System.assertNotEquals(null, sig, 'HMAC signature should not be null');
        System.assertEquals(64, sig.length(), 'HMAC SHA256 hex signature should be 64 characters');
    }
}
