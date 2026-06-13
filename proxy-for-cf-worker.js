export default {
  async fetch(request, env, ctx) {
    const workerUrl = new URL(request.url);
    const targetUrlString = workerUrl.pathname.substring(1) + workerUrl.search;
    if (!targetUrlString.startsWith('http://') && !targetUrlString.startsWith('https://')) {
      return new Response('URL is invalid!', { status: 400 });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
          "Access-Control-Max-Age": "86400",
        }
      });
    }
    try {
      const targetUrl = new URL(targetUrlString);
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.delete('Host');
      proxyHeaders.delete('Referer'); 
      proxyHeaders.delete('CF-Connecting-IP');
      proxyHeaders.delete('X-Forwarded-For');
      const fetchInit = {
        method: request.method,
        headers: proxyHeaders,
        redirect: 'manual'
      };
      if (!['GET', 'HEAD'].includes(request.method) && request.body) {
        fetchInit.body = request.body;
      }
      const response = await fetch(targetUrl, fetchInit);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
  }
};