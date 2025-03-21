# SACRAL TRACK ver2

THANK YOU

## News Module Setup

### Setting Up Appwrite Collections for News Likes

The news module requires a dedicated Appwrite collection for storing news likes. Follow these steps to set it up:

1. Log into your Appwrite Console
2. Navigate to Databases and select your project database
3. Create a new collection called `news_like` with the following attributes:

| Attribute Name | Type | Required | Array | Default |
|---------------|------|----------|-------|---------|
| post_id | String | Yes | No | - |
| user_id | String | Yes | No | - |
| news_id | String | Yes | No | - |
| created_at | DateTime | No | No | Current Date |

4. Set up the following indexes:
   - Composite index on `user_id` and `news_id` (unique) - для избежания дублирования лайков
   - Index on `news_id` for quick querying of likes per news item
   - Index on `user_id` for retrieving all liked news by a user

5. Set up the following permissions:
   - Read: Role: any
   - Create: Role: users
   - Update: Role: users (document.user_id == user.id)
   - Delete: Role: users (document.user_id == user.id)

6. Update your `.env` file with:
```
NEXT_PUBLIC_COLLECTION_ID_NEWS_LIKE="your_news_like_collection_id"
```

This dedicated collection optimizes performance by separating news likes from other types of likes in the system.
