# Automatic Instagram follower count

The homepage stats, the homepage Instagram card and `/llms.txt` show Adarshh's Instagram followers, following and posts. With two settings in the hosting environment, the site reads these from Instagram's official API **every five days** and shows the new numbers on its own. Without them, it shows the numbers typed into `src/data/media.js` (`instagramProfile.counts` and the "Instagram followers" stat).

Instagram does not let websites read follower counts by scraping the profile page. The official API needs a one-time setup with the account owner's login.

## What you need

- @numerologybyaadarshh must be a Professional account (Creator or Business). It already shows a category, so it is.
- A Facebook Page linked to that Instagram account.
- A free Meta developer account at [developers.facebook.com](https://developers.facebook.com).

## One-time setup (about 20 minutes)

1. **Link Instagram to a Facebook Page.** On the Facebook Page, go to *Settings → Linked accounts → Instagram* and connect @numerologybyaadarshh.
2. **Create a Meta app.** At developers.facebook.com, choose *My Apps → Create app → Other → Business*. Add the **Instagram** product and choose *API setup with Facebook login*.
3. **Get a user token.** Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) and select the app. Add the permissions `instagram_basic`, `pages_show_list` and `pages_read_engagement`, then choose *Generate Access Token* and log in as the Page admin.
4. **Make it long-lived.** In the Explorer, run the following, using the app ID and secret from *App settings → Basic*:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_FROM_STEP_3`
5. **Get the Page token, which does not expire.** Run `GET /me/accounts` with the long-lived token. Copy the Page's `access_token` and `id`.
6. **Get the Instagram account ID.** Run `GET /PAGE_ID?fields=instagram_business_account` with the Page token. Copy `instagram_business_account.id`.
7. **Check it.** Paste the Page token into the [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/). *Expires* should say **Never**.
8. **Add both to Vercel** (*Project → Settings → Environment Variables*), then redeploy:
   - `INSTAGRAM_ACCESS_TOKEN` = the Page token
   - `INSTAGRAM_USER_ID` = the Instagram account ID

To test before redeploying, open `https://graph.facebook.com/INSTAGRAM_USER_ID?fields=followers_count,follows_count,media_count&access_token=PAGE_TOKEN`. It should return his current numbers.

## How it behaves

- Instagram is asked at most once every five days (`INSTAGRAM_REFRESH_SECONDS` in `src/lib/instagram.js`; use `60 * 60 * 24 * 7` for weekly). Pages stay fast and well within Instagram's limits.
- Counts are rounded down so they never overstate: 25,468 followers shows as "25,400+" in the stats and "25.4K" on the Instagram card.
- If the token stops working (for example, the Facebook password changes, the app is removed or the Page is unlinked), the site quietly falls back to the numbers in `src/data/media.js`. Repeat steps 3–8 to reconnect.
- The token is read only on the server and never reaches visitors' browsers. Keep it out of the code and out of messages.

An Instagram Login token (`graph.instagram.com`, without `INSTAGRAM_USER_ID`) also works, but it expires after 60 days and must be refreshed by hand, so the Facebook Page token above is recommended.
