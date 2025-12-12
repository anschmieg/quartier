import { onRequestGet as __api_github_content_ts_onRequestGet } from "/Users/adrian/Projects/quartier/functions/api/github/content.ts"
import { onRequestGet as __api_github_repos_ts_onRequestGet } from "/Users/adrian/Projects/quartier/functions/api/github/repos.ts"
import { onRequestGet as __api_oauth_callback_ts_onRequestGet } from "/Users/adrian/Projects/quartier/functions/api/oauth/callback.ts"
import { onRequestGet as __api_oauth_login_ts_onRequestGet } from "/Users/adrian/Projects/quartier/functions/api/oauth/login.ts"
import { onRequestPost as __api_oauth_logout_ts_onRequestPost } from "/Users/adrian/Projects/quartier/functions/api/oauth/logout.ts"
import { onRequestGet as __api_webhook_ts_onRequestGet } from "/Users/adrian/Projects/quartier/functions/api/webhook.ts"
import { onRequestPost as __api_webhook_ts_onRequestPost } from "/Users/adrian/Projects/quartier/functions/api/webhook.ts"
import { onRequest as __api_ws_ts_onRequest } from "/Users/adrian/Projects/quartier/functions/api/ws.ts"

export const routes = [
    {
      routePath: "/api/github/content",
      mountPath: "/api/github",
      method: "GET",
      middlewares: [],
      modules: [__api_github_content_ts_onRequestGet],
    },
  {
      routePath: "/api/github/repos",
      mountPath: "/api/github",
      method: "GET",
      middlewares: [],
      modules: [__api_github_repos_ts_onRequestGet],
    },
  {
      routePath: "/api/oauth/callback",
      mountPath: "/api/oauth",
      method: "GET",
      middlewares: [],
      modules: [__api_oauth_callback_ts_onRequestGet],
    },
  {
      routePath: "/api/oauth/login",
      mountPath: "/api/oauth",
      method: "GET",
      middlewares: [],
      modules: [__api_oauth_login_ts_onRequestGet],
    },
  {
      routePath: "/api/oauth/logout",
      mountPath: "/api/oauth",
      method: "POST",
      middlewares: [],
      modules: [__api_oauth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/webhook",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_webhook_ts_onRequestGet],
    },
  {
      routePath: "/api/webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_webhook_ts_onRequestPost],
    },
  {
      routePath: "/api/ws",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ws_ts_onRequest],
    },
  ]