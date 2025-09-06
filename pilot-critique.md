# Pilot Critique

## What Slowed Me Down

1. **Schema Discovery Challenges**: Initially, I had difficulty understanding how outlets were connected to media contacts in the database schema. The [MediaContactData](file:///Users/akamaotto/code/media-contacts/src/lib/seeding/media-contacts/config/types.ts#L26-L38) interface included an [outlet](file:///Users/akamaotto/code/media-contacts/src/lib/seeding/media-contacts/config/types.ts#L30-L30) field, but the Prisma model used a relation. This required modifying the API importer to properly handle outlet creation and connection.

2. **Contact Path Verification**: Finding explicit contact paths (email addresses) for journalists required deep diving into multiple sources:
   - Official outlet websites and mastheads
   - Individual author profile pages
   - LinkedIn profiles
   - MuckRack and other journalist directories

3. **Global Outlet Research**: Identifying global outlets that specifically cover Africa required targeted searches for reporters who focus on the African tech scene rather than just general technology reporters.

4. **Recency Verification**: Confirming that contacts were active within the last 180 days required checking recent bylines, which wasn't always straightforward for all contacts.

## Gaps Identified

1. **Outlet Database**: The system didn't have existing outlets in the database, requiring the API importer to create outlets on-the-fly. A pre-populated outlets database would improve performance and data consistency.

2. **Beat Management**: The system has a beats model in Prisma but the seeding process doesn't connect contacts to beats. This would be valuable for more precise targeting.

3. **Verification Tracking**: There's no field to track when a contact was last verified or their activity status, which would help with maintaining data freshness.

4. **Social Media Integration**: While the schema supports socials, there's no standardized way to store different types of social media handles.

## Improvements for Scaling to 30 Contacts

1. **Automated Outlet Creation**: The API importer now handles outlet creation, but we could pre-seed popular outlets to improve consistency.

2. **Enhanced Search Strategy**: 
   - Use more specific search queries like "site:outlet.com author" to find individual journalists
   - Leverage journalist directories like MuckRack, PressPass, etc.
   - Check Twitter lists and following patterns of known Africa tech journalists

3. **Verification Process**: 
   - Create a checklist for each contact to ensure 2-source verification
   - Implement a "last verified" date tracking
   - Add a confidence score for each contact based on verification strength

4. **Deduplication System**: 
   - Implement name/outlet matching algorithm
   - Check for email domain overlaps
   - Cross-reference social media handles

5. **Regional Expansion**: 
   - Research more outlets in key African markets (Kenya, South Africa, Ghana, Egypt)
   - Include more pan-African publications
   - Add specialized outlets (fintech, health tech, agritech)

6. **Global Outreach**: 
   - Identify more global outlets with dedicated Africa tech coverage
   - Look for regional correspondents at major publications
   - Include specialized trade publications

## Final Batch Improvements

1. **Balanced Distribution**: For the final batch, I adjusted the regional/global distribution to better meet the target of ~60% regional and ~40% global contacts, though I prioritized strong African coverage.

2. **Outlet Diversity**: Ensured we have ≥15 outlets represented with most outlets having ≤2 contacts to maintain diversity.

3. **Country Coverage**: Expanded to 3 key African countries (Nigeria, South Africa, Kenya) plus global locations.

4. **Beat Coverage**: Ensured comprehensive coverage across technology, startups, venture capital, business, finance, AI, and telecom.

5. **Quality Assurance**: Implemented thorough verification checks to ensure all contacts meet the quality criteria.

## Lessons Learned

1. **Data Model Understanding**: Taking time to fully understand the data model upfront saves significant time during implementation.

2. **Verification is Key**: Having a systematic approach to verification with multiple sources ensures data quality.

3. **Balance vs. Coverage**: Sometimes it's better to exceed coverage in one area (regional contacts) rather than strictly adhering to distribution targets when it improves overall quality.

4. **Iterative Improvement**: Starting with a pilot batch and refining the approach based on lessons learned leads to better results in the full implementation.

## Recommendations for Future Batches

1. **Pre-populate Common Outlets**: Create a database of common outlets to improve seeding performance.

2. **Implement Beat Connections**: Connect contacts to beats in the database for better targeting capabilities.

3. **Add Freshness Tracking**: Include fields to track when contacts were last verified and their activity status.

4. **Create Deduplication Rules**: Implement automated deduplication checks to prevent duplicate entries.

5. **Expand Country Coverage**: Include more African countries in future batches to improve geographic diversity.