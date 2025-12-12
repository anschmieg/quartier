// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/api/*"
  ],
  exclude: []
};

// ../../.bun/install/global/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "/Users/adrian/Projects/quartier/.wrangler/tmp/pages-Es0RSR/functionsWorker-0.9391267277353269.mjs";
import { isRoutingRuleMatch } from "/Users/adrian/.bun/install/global/node_modules/wrangler/templates/pages-dev-util.ts";
export * from "/Users/adrian/Projects/quartier/.wrangler/tmp/pages-Es0RSR/functionsWorker-0.9391267277353269.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=eq00yntg5gt.js.map
