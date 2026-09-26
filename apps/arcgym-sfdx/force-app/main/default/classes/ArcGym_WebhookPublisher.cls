public with sharing class ArcGym_WebhookPublisher {
    public static final String DEFAULT_SECRET = 'arcgym_hmac_secret_2026_super_secure';
    public static final String DEFAULT_ENDPOINT = 'https://arcgym.pages.dev/api/webhooks/publish-drill';

    public class PublishRequest {
        @InvocableVariable(required=true label='Drill Record ID')
        public Id drillId;
    }

    public class PublishResult {
        @InvocableVariable(label='Status')
        public String status;
        
        @InvocableVariable(label='Enqueued Job ID')
        public Id jobId;
    }

    @InvocableMethod(label='Publish Drill to ArcGym Edge' description='Signs and publishes approved drill payload to Cloudflare Pages edge webhook via Queueable Apex')
    public static List<PublishResult> publishDrills(List<PublishRequest> requests) {
        List<PublishResult> results = new List<PublishResult>();
        Set<Id> idsToPublish = new Set<Id>();

        for (PublishRequest req : requests) {
            if (req.drillId != null) {
                idsToPublish.add(req.drillId);
            }
        }

        if (!idsToPublish.isEmpty()) {
            Id jobId = System.enqueueJob(new WebhookCalloutJob(idsToPublish));
            for (PublishRequest req : requests) {
                PublishResult res = new PublishResult();
                res.status = 'ENQUEUED';
                res.jobId = jobId;
                results.add(res);
            }
        }

        return results;
    }

    public class WebhookCalloutJob implements Queueable, Database.AllowsCallouts {
        private Set<Id> drillIds;

        public WebhookCalloutJob(Set<Id> drillIds) {
            this.drillIds = drillIds;
        }

        public void execute(QueueableContext context) {
            List<ArcGym_Drill__c> drills = [
                SELECT Id, Name, Title__c, Format__c, Curriculum_Domain__c, 
                       Difficulty_Tier__c, Status__c, Scheduled_Date__c, 
                       Pillars__c, Version__c, Definition_JSON__c
                FROM ArcGym_Drill__c
                WHERE Id IN :drillIds
            ];

            for (ArcGym_Drill__c drill : drills) {
                publishSingleDrill(drill);
            }
        }
    }

    public static HttpResponse publishSingleDrill(ArcGym_Drill__c drill) {
        Map<String, Object> payloadMap = new Map<String, Object>();
        payloadMap.put('id', drill.Name);
        payloadMap.put('recordId', drill.Id);
        payloadMap.put('title', drill.Title__c);
        payloadMap.put('format', drill.Format__c);
        payloadMap.put('domain', drill.Curriculum_Domain__c);
        payloadMap.put('difficulty', drill.Difficulty_Tier__c);
        payloadMap.put('scheduledDate', drill.Scheduled_Date__c != null ? String.valueOf(drill.Scheduled_Date__c) : String.valueOf(Date.today()));
        payloadMap.put('pillars', drill.Pillars__c != null ? drill.Pillars__c.split(';') : new List<String>());
        payloadMap.put('version', drill.Version__c);

        if (String.isNotBlank(drill.Definition_JSON__c)) {
            try {
                payloadMap.put('definition', JSON.deserializeUntyped(drill.Definition_JSON__c));
            } catch (Exception e) {
                payloadMap.put('definitionRaw', drill.Definition_JSON__c);
            }
        }

        String jsonBody = JSON.serialize(payloadMap);
        String signature = computeHmacSha256(jsonBody, DEFAULT_SECRET);

        HttpRequest req = new HttpRequest();
        req.setEndpoint(DEFAULT_ENDPOINT);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('X-ArcGym-Signature', signature);
        req.setBody(jsonBody);

        Http http = new Http();
        HttpResponse res;
        try {
            res = http.send(req);
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'ArcGym Webhook Publish Failed: ' + ex.getMessage());
        }
        return res;
    }

    public static String computeHmacSha256(String message, String secret) {
        Blob hmac = Crypto.generateMac('HmacSHA256', Blob.valueOf(message), Blob.valueOf(secret));
        return EncodingUtil.convertToHex(hmac);
    }
}
