export default {
  async fetch(request, env, ctx) {
    // URL із запиту до воркеру
    const workerUrl = new URL(request.url);
    
    // search, щоб не загубити GET-параметри цільової адреси
    const targetUrlString = workerUrl.pathname.substring(1) + workerUrl.search;

    // базова валідація
    if (!targetUrlString.startsWith('http://') && !targetUrlString.startsWith('https://')) {
      return new Response('URL is invalid!', { status: 400 });
    }

    // обробка Preflight CORS-запитів (OPTIONS)
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
      // копіювання заголовків від клієнта
      const proxyHeaders = new Headers(request.headers);
      
      // видалення заголовків, що можуть видати проксі чи пошкодити запит до серверу
      proxyHeaders.delete('Host');
      proxyHeaders.delete('Referer'); // приховує джерело
      
      // приховуємо реальну IP
      proxyHeaders.delete('CF-Connecting-IP');
      proxyHeaders.delete('X-Forwarded-For');

      // формируємо новий запит
      const fetchInit = {
        method: request.method,
        headers: proxyHeaders,
        redirect: 'manual'
      };

      // тіло запиту (body) можно передавати тільки для методів, які його підтримують
      if (!['GET', 'HEAD'].includes(request.method) && request.body) {
        fetchInit.body = request.body;
      }

      // відправка запиту до цільового серверу
      const response = await fetch(targetUrl, fetchInit);

      // копіювання відповіді серверу для клієнта
      const responseHeaders = new Headers(response.headers);
      
      // додавання CORS-заголовків до відповіді (для браузеру)
      responseHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(`Ошибка проксирования: ${error.message}`, { status: 500 });
    }
  }
};