public with sharing class ArcGymDrillController {

    public class DrillDTO {
        @AuraEnabled public String id;
        @AuraEnabled public String title;
        @AuraEnabled public String format;
        @AuraEnabled public String domain;
        @AuraEnabled public String difficulty;
        @AuraEnabled public List<String> pillars;
        @AuraEnabled public String definitionJson;
    }

    public class AttemptResultDTO {
        @AuraEnabled public Boolean success;
        @AuraEnabled public Id attemptId;
        @AuraEnabled public Integer currentStreak;
    }

    @AuraEnabled(cacheable=true)
    public static DrillDTO getTodayDrill() {
        Date today = Date.today();
        List<ArcGym_Drill__c> scheduled = [
            SELECT Id, Name, Title__c, Format__c, Curriculum_Domain__c, 
                   Difficulty_Tier__c, Pillars__c, Definition_JSON__c
            FROM ArcGym_Drill__c
            WHERE Status__c = 'Approved' AND Scheduled_Date__c = :today
            LIMIT 1
        ];

        ArcGym_Drill__c drillRecord;
        if (!scheduled.isEmpty()) {
            drillRecord = scheduled[0];
        } else {
            List<ArcGym_Drill__c> anyApproved = [
                SELECT Id, Name, Title__c, Format__c, Curriculum_Domain__c, 
                       Difficulty_Tier__c, Pillars__c, Definition_JSON__c
                FROM ArcGym_Drill__c
                WHERE Status__c = 'Approved'
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            if (!anyApproved.isEmpty()) {
                drillRecord = anyApproved[0];
            }
        }

        DrillDTO dto = new DrillDTO();
        if (drillRecord != null) {
            dto.id = drillRecord.Name;
            dto.title = drillRecord.Title__c;
            dto.format = drillRecord.Format__c;
            dto.domain = drillRecord.Curriculum_Domain__c;
            dto.difficulty = drillRecord.Difficulty_Tier__c;
            dto.pillars = drillRecord.Pillars__c != null ? drillRecord.Pillars__c.split(';') : new List<String>();
            dto.definitionJson = drillRecord.Definition_JSON__c;
        } else {
            // Default fallback if no drills exist in org
            dto.id = 'AGD-00101';
            dto.title = 'Core Platform & Agentic Architecture Trade-Offs';
            dto.format = 'Rapid_Fire';
            dto.domain = 'Core Platform & Agentforce';
            dto.difficulty = 'Associate_Domain_Architect';
            dto.pillars = new List<String>{ 'Reliability', 'Trust', 'Operational_Excellence' };
            dto.definitionJson = '{"steps":[]}';
        }

        return dto;
    }

    @AuraEnabled
    public static AttemptResultDTO recordAttempt(
        String drillId, 
        Decimal score, 
        Decimal brierScore, 
        String responsesJson, 
        Integer streakCount
    ) {
        ArcGym_Attempt__c attempt = new ArcGym_Attempt__c(
            User__c = UserInfo.getUserId(),
            Drill_ID__c = String.isNotBlank(drillId) ? drillId : 'AGD-DEFAULT',
            Completed_At__c = System.now(),
            Score__c = score != null ? score : 0,
            Asymmetric_Brier_Score__c = brierScore != null ? brierScore : 0,
            Responses_JSON__c = responsesJson,
            Streak_Count_At_Attempt__c = streakCount != null ? streakCount : 1
        );

        insert attempt;

        AttemptResultDTO result = new AttemptResultDTO();
        result.success = true;
        result.attemptId = attempt.Id;
        result.currentStreak = (Integer)attempt.Streak_Count_At_Attempt__c;
        return result;
    }

    @AuraEnabled(cacheable=true)
    public static Integer getUserStreak() {
        Id currentUserId = UserInfo.getUserId();
        List<ArcGym_Attempt__c> recentAttempts = [
            SELECT Completed_At__c, Streak_Count_At_Attempt__c
            FROM ArcGym_Attempt__c
            WHERE User__c = :currentUserId
            ORDER BY Completed_At__c DESC
            LIMIT 1
        ];

        if (!recentAttempts.isEmpty()) {
            ArcGym_Attempt__c latest = recentAttempts[0];
            Date latestDate = latest.Completed_At__c.date();
            Date today = Date.today();
            if (latestDate == today || latestDate == today.addDays(-1)) {
                return latest.Streak_Count_At_Attempt__c != null ? (Integer)latest.Streak_Count_At_Attempt__c : 1;
            }
        }
        return 1;
    }
}
