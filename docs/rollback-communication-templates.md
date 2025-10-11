# Rollback Communication Templates

This document provides communication templates for different types of rollback incidents. These templates are designed to ensure clear, consistent communication with stakeholders during rollback events.

## Table of Contents

1. [General Guidelines](#general-guidelines)
2. [Internal Communication Templates](#internal-communication-templates)
3. [External Communication Templates](#external-communication-templates)
4. [Status Update Templates](#status-update-templates)
5. [Post-Incident Communication](#post-incident-communication)

## General Guidelines

### Communication Principles

1. **Be Timely**: Communicate as soon as an incident is identified
2. **Be Clear**: Use simple, direct language
3. **Be Accurate**: Provide only verified information
4. **Be Consistent**: Use consistent messaging across channels
5. **Be Empathetic**: Acknowledge user impact

### Communication Channels

- **Slack**: Internal team communication
- **Email**: Formal notifications to stakeholders
- **Status Page**: External user communication
- **In-App**: Direct user notifications
- **SMS**: Critical user notifications

### Communication Frequency

- **Initial**: Immediately after incident detection
- **Updates**: Every 15-30 minutes during active incident
- **Resolution**: Immediately after rollback completion
- **Post-Mortem**: Within 24 hours of resolution

## Internal Communication Templates

### Template 1: Initial Incident Alert

**Channel**: Slack (#incidents, #engineering)

**Subject**: 🚨 INCIDENT ALERT: AI Search Feature - PRODUCTION

**Body**:

@here @engineering @product @support

**INCIDENT ALERT**: We've detected an issue with the AI Search feature in production.

**Issue Details**:
- **Service**: AI Search Feature
- **Environment**: Production
- **Severity**: [SEVERITY LEVEL]
- **First Detected**: [TIMESTAMP]
- **Reporter**: [NAME]

**Symptoms**:
- [SYMPTOM 1]
- [SYMPTOM 2]
- [SYMPTOM 3]

**Current Impact**:
- [DESCRIPTION OF USER IMPACT]
- [AFFECTED USER COUNT/PERCENTAGE]
- [AFFECTED REGIONS]

**Initial Actions**:
- [ACTION 1]
- [ACTION 2]

**Investigation Lead**: [NAME]
**Communication Lead**: [NAME]

**Next Update**: [TIME] or as soon as we have new information

Please join the incident channel: #incident-ai-search- [DATE]

### Template 2: Rollback Decision Notification

**Channel**: Slack (#incidents, #engineering, #product)

**Subject**: 🔄 ROLLBACK DECISION: AI Search Feature - PRODUCTION

**Body**:

@here @engineering @product @support

**ROLLBACK DECISION**: We have decided to rollback the AI Search feature in production.

**Reason for Rollback**:
- [PRIMARY REASON]
- [SECONDARY REASON]

**Rollback Plan**:
- **Type**: [FULL/PARTIAL]
- **Scope**: [COMPONENTS TO ROLLBACK]
- **Estimated Duration**: [TIME]
- **Start Time**: [TIME]

**Rollback Team**:
- **Rollback Lead**: [NAME]
- **Database Lead**: [NAME]
- **Application Lead**: [NAME]
- **Feature Flag Lead**: [NAME]

**Expected Impact**:
- AI Search functionality will be unavailable
- All other features will remain operational
- No data loss is expected

**Rollback Steps**:
1. [STEP 1]
2. [STEP 2]
3. [STEP 3]

**Monitoring**:
- We'll be monitoring the rollback process closely
- Alerts are configured for any issues

**Next Update**: [TIME] or when rollback is complete

### Template 3: Rollback Progress Update

**Channel**: Slack (#incidents, #engineering, #product, #support)

**Subject**: 📊 ROLLBACK UPDATE: AI Search Feature - PRODUCTION (Update [NUMBER])

**Body**:

@here @engineering @product @support

**ROLLBACK UPDATE**: Progress on the AI Search feature rollback.

**Current Status**:
- **Overall**: [STATUS]
- **Started**: [TIME]
- **Estimated Completion**: [TIME]

**Component Status**:
- ✅ Application Code: [STATUS]
- ✅ Database: [STATUS]
- ✅ Feature Flags: [STATUS]
- ✅ External Services: [STATUS]

**Completed Steps**:
- [COMPLETED STEP 1]
- [COMPLETED STEP 2]

**Current Step**:
- [CURRENT STEP]
- [PROGRESS DETAILS]

**Issues Encountered**:
- [ANY ISSUES AND RESOLUTIONS]

**Remaining Steps**:
- [REMAINING STEP 1]
- [REMAINING STEP 2]

**Next Update**: [TIME] or when significant progress is made

### Template 4: Rollback Completion Notification

**Channel**: Slack (#incidents, #engineering, #product, #support)

**Subject**: ✅ ROLLBACK COMPLETE: AI Search Feature - PRODUCTION

**Body**:

@here @engineering @product @support

**ROLLBACK COMPLETE**: The AI Search feature rollback has been completed successfully.

**Rollback Summary**:
- **Rollback ID**: [ROLLBACK_ID]
- **Started**: [START_TIME]
- **Completed**: [END_TIME]
- **Total Duration**: [DURATION]
- **Type**: [FULL/PARTIAL]

**Component Status**:
- ✅ Application Code: Rolled back to [VERSION]
- ✅ Database: Schema/data reverted
- ✅ Feature Flags: All disabled
- ✅ External Services: All disconnected

**Verification Results**:
- ✅ Application health: PASSED
- ✅ Database connectivity: PASSED
- ✅ Feature flags: DISABLED
- ✅ External services: DISCONNECTED

**Current System State**:
- AI Search functionality is disabled
- All other features are operational
- No data loss occurred
- System is stable

**User Impact**:
- Users can no longer access AI Search features
- All other functionality remains available
- No data was lost

**Next Steps**:
1. Monitor system stability for [TIME]
2. Begin root cause investigation
3. Plan for feature re-deployment
4. Schedule post-mortem meeting

**Post-Mortem**: Scheduled for [DATE/TIME]

**Logs and Reports**: Available at [LOCATION]

## External Communication Templates

### Template 1: Status Page Incident Notification

**Title**: Investigation into AI Search Feature Issues

**Body**:

We're currently investigating issues with our AI Search feature that may be affecting some users.

**Issue Details**:
- **Started**: [TIME]
- **Impact**: Users may experience errors or degraded performance when using AI Search
- **Status**: Under investigation

**What We're Doing**:
- Our engineering team is investigating the issue
- We're working to restore full functionality as quickly as possible

**User Impact**:
- AI Search features may be unavailable or slow
- All other platform features remain operational
- Your data is safe

**Next Update**: [TIME] or as soon as we have new information

We apologize for any inconvenience and appreciate your patience.

### Template 2: Status Page Rollback Notification

**Title**: AI Search Feature Temporarily Disabled

**Body**:

We've temporarily disabled the AI Search feature while we investigate technical issues.

**Action Taken**:
- **Time**: [TIME]
- **Action**: AI Search feature temporarily disabled
- **Reason**: To ensure system stability and user experience

**Current Status**:
- AI Search features are temporarily unavailable
- All other platform features remain fully operational
- Your data is safe

**What This Means for You**:
- You won't be able to use AI Search features temporarily
- All other features continue to work normally
- No data has been lost

**Next Steps**:
- We're working to resolve the underlying issues
- We'll restore AI Search functionality as soon as it's safe to do so
- We'll provide updates on our progress

**Estimated Resolution**: [TIMEFRAME]

We apologize for any inconvenience and appreciate your understanding.

### Template 3: Status Page Resolution Notification

**Title**: AI Search Feature Issues Resolved

**Body**:

The technical issues with our AI Search feature have been resolved.

**Resolution Details**:
- **Resolved**: [TIME]
- **Action**: Issues investigated and resolved
- **Status**: System is stable

**Current Status**:
- The technical issues have been resolved
- AI Search feature remains temporarily disabled while we complete final verification
- All other platform features are fully operational

**What This Means for You**:
- Platform stability has been restored
- AI Search features will remain temporarily disabled as a precaution
- All other features continue to work normally
- Your data is safe

**Next Steps**:
- We're continuing to monitor system performance
- We'll re-enable AI Search features once we're confident they're stable
- We'll provide advance notice before re-enabling these features

**Thank You**:
We apologize for the inconvenience and appreciate your patience during this incident.

## Status Update Templates

### Template 1: 15-Minute Update (No New Information)

**Subject**: 📊 STATUS UPDATE: AI Search Feature Incident (Update [NUMBER])

**Body**:

**STATUS UPDATE**: No new information to report on the AI Search feature incident.

**Current Status**:
- **State**: [CURRENT STATE]
- **Started**: [TIME]
- **Duration**: [DURATION]

**What We're Doing**:
- Continuing to investigate the issue
- Working to restore full functionality

**Next Update**: [TIME] or when we have new information

Thank you for your patience.

### Template 2: 15-Minute Update (With New Information)

**Subject**: 📊 STATUS UPDATE: AI Search Feature Incident (Update [NUMBER])

**Body**:

**STATUS UPDATE**: We have an update on the AI Search feature incident.

**New Information**:
- [NEW INFORMATION]
- [IMPACT OF NEW INFORMATION]

**Current Status**:
- **State**: [UPDATED STATE]
- **Started**: [TIME]
- **Duration**: [DURATION]

**What We're Doing**:
- [UPDATED ACTIONS]
- [NEXT STEPS]

**User Impact**:
- [UPDATED IMPACT DESCRIPTION]

**Next Update**: [TIME] or when we have significant progress

Thank you for your patience.

## Post-Incident Communication

### Template 1: Internal Post-Mortem Invitation

**Subject**: 📋 POST-MORTEM MEETING: AI Search Feature Incident

**Body**:

@incident-response-team @engineering @product @support

You're invited to the post-mortem meeting for the AI Search feature incident.

**Incident Details**:
- **Incident ID**: [INCIDENT_ID]
- **Date**: [DATE]
- **Duration**: [DURATION]
- **Severity**: [SEVERITY]

**Meeting Details**:
- **Date**: [DATE]
- **Time**: [TIME]
- **Location**: [LOCATION/VIDEO CALL]
- **Duration**: 60 minutes

**Agenda**:
1. Timeline of events
2. Root cause analysis
3. Impact assessment
4. Response evaluation
5. Lessons learned
6. Action items

**Preparation**:
- Please review the incident logs and reports: [LINK]
- Come prepared to discuss:
  - What went well
  - What could be improved
  - Action items for your team

**RSVP**: Please RSVP by [DATE/TIME]

### Template 2: External Post-Incident Summary

**Title**: Summary of AI Search Feature Incident

**Body**:

We'd like to provide a summary of the recent incident affecting our AI Search feature.

**Incident Timeline**:
- **Started**: [TIME]
- **Identified**: [TIME]
- **Resolved**: [TIME]
- **Duration**: [DURATION]

**What Happened**:
- [DESCRIPTION OF WHAT HAPPENED]
- [DESCRIPTION OF IMPACT]

**What We Did**:
- [DESCRIPTION OF ACTIONS TAKEN]
- [DESCRIPTION OF ROLLBACK IF APPLICABLE]

**Current Status**:
- The incident has been resolved
- System stability has been restored
- AI Search features remain temporarily disabled as a precaution

**User Impact**:
- [DESCRIPTION OF USER IMPACT]
- [DATA STATUS - CONFIRM NO DATA LOSS]

**What We've Learned**:
- [KEY LESSONS LEARNED]
- [IMPROVEMENTS BEING MADE]

**Next Steps**:
- We're implementing improvements to prevent similar incidents
- We'll provide advance notice before re-enabling AI Search features
- We're enhancing our monitoring and alerting

**We're Sorry**:
We apologize for the inconvenience this incident caused. We're committed to improving our service and appreciate your patience and understanding.

If you have any questions or concerns, please contact our support team.

### Template 3: Feature Re-enablement Announcement

**Title**: AI Search Feature Re-enabled

**Body**:

We're pleased to announce that the AI Search feature has been re-enabled.

**Resolution Details**:
- **Re-enabled**: [TIME]
- **Testing**: [DURATION/DESCRIPTION]
- **Status**: Fully operational

**What's Available**:
- All AI Search features are now available
- Performance has been optimized
- Additional safeguards have been implemented

**What We've Improved**:
- [IMPROVEMENT 1]
- [IMPROVEMENT 2]
- [IMPROVEMENT 3]

**Thank You**:
Thank you for your patience during the recent incident. We've implemented additional safeguards and monitoring to prevent similar issues in the future.

If you experience any issues with the AI Search feature, please contact our support team.

## SMS Templates (for Critical Incidents)

### Template 1: Initial Critical Alert

**Body**: [PLATFORM]: Critical issue with AI Search feature detected. Our team is investigating. Status: platform.com/status

### Template 2: Rollback Notification

**Body**: [PLATFORM]: AI Search feature temporarily disabled due to technical issues. All other features operational. Status: platform.com/status

### Template 3: Resolution Notification

**Body**: [PLATFORM]: AI Search feature issues resolved. Feature remains temporarily disabled as precaution. Status: platform.com/status

## Email Distribution Lists

### Internal Notifications
- engineering@company.com
- product@company.com
- support@company.com
- management@company.com

### External Notifications
- all-users@company.com
- premium-users@company.com
- enterprise-users@company.com

## Communication Best Practices

### Do's
- Communicate early and often
- Be transparent about issues
- Provide clear next steps
- Acknowledge user impact
- Set expectations for updates

### Don'ts
- Speculate about causes
- Make promises you can't keep
- Use technical jargon
- Downplay user impact
- Delay communication

### Tone Guidelines
- Be empathetic and professional
- Take ownership of issues
- Be confident but not arrogant
- Keep messages concise and clear
- Use consistent branding