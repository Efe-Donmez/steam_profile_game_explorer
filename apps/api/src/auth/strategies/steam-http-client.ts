import { HttpOpts, HttpRes, IAxiosLikeHttpClient } from 'passport-steam-openid';

// passport-steam-openid@1.1.11 ships a `FetchHttpClient` whose body parser
// checks `Content-Type == 'text/json'` to decide whether to JSON-parse a
// response — but Steam's Web API actually sends `application/json`, so that
// check never matches. GetPlayerSummaries' body is returned as a raw string
// instead of parsed JSON, `data?.response?.players` is then undefined on a
// string, and the strategy throws "Malformed response from steam." on every
// login. This is a corrected drop-in replacement, injected via the
// strategy's `httpClient` option.
export class SteamFetchHttpClient implements IAxiosLikeHttpClient {
  async get<TResponse>(urlString: string, opts?: HttpOpts): Promise<HttpRes<TResponse>> {
    const [url, headers, redirect] = this.prepareRequest(urlString, opts);
    const response = await fetch(url, { method: 'GET', headers, redirect });
    return this.getBody<TResponse>(response);
  }

  async post<TResponse>(urlString: string, data?: unknown, opts?: HttpOpts): Promise<HttpRes<TResponse>> {
    const [url, headers, redirect] = this.prepareRequest(urlString, opts);
    // eslint-disable-next-line no-console
    console.log('[steam-debug] POST', url.toString(), 'body=', data);
    const response = await fetch(url, { method: 'POST', headers, redirect, body: data as BodyInit });
    const body = await this.getBody<TResponse>(response);
    // eslint-disable-next-line no-console
    console.log('[steam-debug] response status=', body.status, 'data=', body.data);
    return body;
  }

  private prepareRequest(urlString: string, opts?: HttpOpts): [URL, Headers, RequestRedirect] {
    if (opts?.maxRedirects && opts.maxRedirects !== 0) {
      throw new Error(`Fetch client cannot handle maxRedirect=${opts.maxRedirects} setting.`);
    }
    const url = new URL(urlString);
    if (opts?.params) {
      for (const name of Object.keys(opts.params)) {
        url.searchParams.append(name, opts.params[name]);
      }
    }
    const headers = new Headers(opts?.headers as HeadersInit);
    return [url, headers, opts?.maxRedirects === 0 ? 'error' : 'follow'];
  }

  private async getBody<TResponse>(res: Response): Promise<HttpRes<TResponse>> {
    const contentType = res.headers.get('Content-Type') ?? '';
    if (contentType.includes('json')) {
      return { data: (await res.json()) as TResponse, status: res.status };
    }
    return { data: (await res.text()) as unknown as TResponse, status: res.status };
  }
}
