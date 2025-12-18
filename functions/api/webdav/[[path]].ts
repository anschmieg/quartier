import { PagesFunction } from "@cloudflare/workers-types";

export const onRequest: PagesFunction = async (context) => {
  const request = context.request;

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, PROPFIND, MKCOL, COPY, MOVE, LOCK, UNLOCK, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Depth, Destination, Range, X-Target-Base-Url, Overwrite",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const targetBaseUrl = request.headers.get("X-Target-Base-Url");
  if (!targetBaseUrl) {
    return new Response("Missing X-Target-Base-Url header", { status: 400 });
  }

  // Calculate target URL
  // context.params.path is an array of path segments after /api/webdav/
  // e.g. /api/webdav/foo/bar -> path=['foo', 'bar']
  // But wait, the webdav library might treat /api/webdav as root.
  // URL: https://quartier.app/api/webdav/file.txt
  // Path relative to worker: /file.txt (from [[path]]) ??
  
  // Let's rely on request.url and strip the origin + key prefix.
  const url = new URL(request.url);
  // Pathname is /api/webdav/some/file
  // We want to append /some/file to targetBaseUrl
  
  // Regex to strip /api/webdav prefix
  // Assuming the route file is functions/api/webdav/[[path]].ts, it handles /api/webdav/*
  const relativePath = url.pathname.replace(/^\/api\/webdav/, "");
  
  // targetBaseUrl might have trailing slash. relativePath might have leading slash.
  // Normalize.
  const base = targetBaseUrl.endsWith('/') ? targetBaseUrl.slice(0, -1) : targetBaseUrl;
  const path = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  
  const finalUrl = base + path;

  // Forward request
  try {
    const newHeaders = new Headers(request.headers);
    // Remove headers that might confuse the target or are forbidden
    newHeaders.delete("Host");
    newHeaders.delete("Referer");
    newHeaders.delete("Origin");
    
    // Ensure we keep Authorization
    
    const proxyRequest = new Request(finalUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow",
    });

    const response = await fetch(proxyRequest);

    // Reconstruct response to allow CORS
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Expose-Headers", "*"); // Expose all
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response(`Proxy Error: ${e}`, { status: 502 });
  }
};
