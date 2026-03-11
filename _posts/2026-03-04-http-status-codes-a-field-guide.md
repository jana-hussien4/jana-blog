 ---                                                                              
  layout: post                                                                   
  title: "HTTP Status Codes: A Field Guide to What's Actually Wrong"               
  date: 2026-03-04
  categories: http errors web
  ---

  Early on, I'd see a `502` in a log and just think "bad, something is bad." A
  `409` would come up and I'd have to stop and look it up every single time. After
  a while of working through real issues in a real production codebase, these codes
   stopped being mysterious numbers and started meaning something.

  Here's what I've learned, organized the way they're actually organized in the
  HTTP spec.

  ---

  ## The Classification System

  HTTP status codes are three-digit numbers grouped by their first digit:

  | Range | Class | What it means |
  |-------|-------|---------------|
  | `1xx` | Informational | Request received, keep going |
  | `2xx` | Success | Everything worked |
  | `3xx` | Redirection | Go somewhere else |
  | `4xx` | Client error | The request was the problem |
  | `5xx` | Server error | The server was the problem |

  The distinction between `4xx` and `5xx` matters immediately when you're
  debugging. A `4xx` means the server understood the request and refused or
  couldn't process it because of what you sent. A `5xx` means the server got a
  valid request and still failed on its own. That difference tells you where to
  look.

  ---

  ## The 1xx Family: Informational

  You almost never see these directly, but they exist and matter at the protocol
  level.

  ### 100 Continue

  The client sent the start of a large request and is asking: "should I keep
  sending?" The server replies 100 to say yes. This avoids wasting bandwidth
  sending a huge body to a server that's going to reject it anyway (e.g. due to
  auth failure). Mostly handled automatically by HTTP clients.

  ### 101 Switching Protocols

  The server is agreeing to switch to a different protocol, most commonly from HTTP
   to **WebSockets**. When you open a WebSocket connection, the initial HTTP
  handshake returns a 101. After that point, the connection stops being HTTP
  entirely.

  ---

  ## The 2xx Family: Success

  ### 200 OK

  The standard success response. The request worked and the response body contains
  the result. Most GET requests return this.

  ### 201 Created

  The request succeeded *and* a new resource was created as a result. You'll see
  this on successful POST requests that create records. A well-behaved API also
  includes a `Location` header pointing to the new resource.

  ### 204 No Content

  Success, but there's nothing to return. Common on DELETE requests or updates
  where the client doesn't need a response body. The key thing: 204 means empty
  body *by design*, not an error.

  ### 206 Partial Content

  The server is returning only part of the resource, because the client asked for a
   specific range (via the `Range` header). Used for resumable downloads, video
  streaming, and large file transfers where you want chunks rather than the whole
  thing at once.

  ---

  ## The 3xx Family: Redirection

  ### 301 Moved Permanently

  The resource has a new URL, forever. Browsers and clients should update their
  bookmarks/cache. Search engines transfer SEO ranking to the new URL. Use this
  when you're permanently renaming or restructuring URLs.

  ### 302 Found

  Temporary redirect. The resource is somewhere else *right now*, but use the
  original URL in the future. Browsers follow the redirect but don't cache it.
  Often misused when 301 is what's actually intended.

  ### 304 Not Modified

  The client sent a conditional GET (with an `If-None-Match` or `If-Modified-Since`
   header), and the resource hasn't changed since the client last fetched it. The
  server sends 304 with no body and the client uses its cached copy. This is how
  HTTP caching avoids re-downloading unchanged content.

  ### 307 Temporary Redirect / 308 Permanent Redirect

  Like 302 and 301, but with a guarantee: the HTTP *method* must not change on the
  redirect. With a 302, some clients would incorrectly switch a POST to a GET when
  following the redirect. 307/308 prevent that. If you're redirecting a form
  submission or an API call, use 307/308 over 302/301.

  ---

  ## The 4xx Family: Client Errors

  ### 400 Bad Request

  The server couldn't understand the request. Usually means the request body is
  malformed: invalid JSON, missing a required field, wrong data type. When you see
  this from an API you're calling, check what you sent, not what the server did.

  ### 401 Unauthorized

  Despite the name, this is really about *authentication*. You haven't proven who
  you are yet. The server is saying: "I don't know who you are, so I can't let you
  in." Send credentials and try again.

  ### 403 Forbidden

  This is *authorization*. The server knows exactly who you are, and you don't have
   permission. Logging in won't help here. You need different access.

  The 401/403 distinction trips people up constantly. Think of it this way: 401 is
  a locked door with a keypad. 403 is a locked door where your keycard has already
  been scanned and rejected.

  ### 404 Not Found

  The most famous one. The resource doesn't exist at that URL. It never existed, it
   was deleted, or you have a typo in the path. In a large codebase, a 404 on an
  internal API call often means a route is missing or has changed.

  ### 405 Method Not Allowed

  The URL exists, but the HTTP method you used isn't supported on it. You sent a
  `DELETE` to an endpoint that only accepts `GET` and `POST`. The response should
  include an `Allow` header listing the valid methods.

  ### 408 Request Timeout

  The server waited for the client to send a complete request and gave up. Usually
  means a slow or interrupted upload, or a client that opened a connection and then
   stalled.

  ### 410 Gone

  Like 404, but the server is explicitly saying this resource *used to* exist and
  has been permanently deleted. A 404 is ambiguous; maybe it never existed, maybe
  it moved. A 410 is definitive. Search engines remove 410'd URLs from their
  indexes faster than 404s.

  ### 413 Content Too Large

  The request body is bigger than the server is willing to accept. Upload limits,
  file size restrictions, and body size caps are enforced here.

  ### 415 Unsupported Media Type

  The server understands the request but won't process it because the
  `Content-Type` header isn't one it accepts. You sent XML to an endpoint that only
   accepts JSON, for example. Fix: check the `Accept` header the server advertises
  and match your `Content-Type` to it.

  ### 409 Conflict

  This one took me a while to internalize. A 409 means the request is valid and you
   have permission, but it conflicts with the current state of the resource.
  Classic examples:

  - Trying to create a record that already exists (unique constraint)
  - Trying to update a resource that was modified between your read and your write
  (optimistic locking conflict)
  - Submitting a state transition that isn't allowed from the current state

  A 409 is useful because it's telling you something specific about *timing* or
  *state*, not about your credentials or your request format.

  ### 422 Unprocessable Entity

  Similar to 400, but more specific: the server understood the request and the
  syntax was fine, but the *content* failed validation. You'll see this a lot in
  Rails APIs; it usually means a model validation failed. The difference from 400
  is subtle but meaningful: 400 is "I can't parse this", 422 is "I parsed it, but
  the data is wrong."

  ### 429 Too Many Requests

  Rate limiting. You've sent too many requests in a given time window. Almost every
   production API has this. The response usually includes a `Retry-After` header
  telling you when to try again.

  ### 451 Unavailable For Legal Reasons

  The resource has been blocked for legal reasons: a court order, a DMCA takedown,
  government-mandated censorship. The number is a reference to Ray Bradbury's
  *Fahrenheit 451*. It's rare but worth knowing; it's distinct from a 403 in that
  the server *wants* to tell you why it can't help.

  ---

  ## The 5xx Family: Server Errors

  ### 500 Internal Server Error

  The generic "something went wrong on our end." The server encountered an
  unexpected condition and doesn't have a more specific code for it. In Rails, an
  unhandled exception usually surfaces as a 500. This is where you go find the logs
   and look at the actual stack trace; the status code itself doesn't tell you
  much.

  ### 501 Not Implemented

  The server received the request but doesn't support the functionality needed to
  fulfill it. Different from 405 (which means "this endpoint doesn't support that
  method"); 501 means the server doesn't implement that feature at all. Often
  returned for HTTP methods the server doesn't recognize.

  ### 502 Bad Gateway

  This one is about the *infrastructure layer*, not your application code. A 502
  means a server (often a load balancer, reverse proxy, or API gateway) received an
   invalid response from an *upstream* server it was forwarding to.

  In practice: your app probably crashed, restarted, or took too long to respond,
  and the proxy in front of it gave up and returned 502 to the client. If you're
  seeing 502s, check whether your application processes are healthy, not just
  whether the proxy is up.

  ### 503 Service Unavailable

  The server is up but can't handle requests right now, usually because it's
  overloaded or down for maintenance. Unlike a 502, the server itself is
  responding; it's just saying "not right now." Often temporary. The response can
  include a `Retry-After` header.

  ### 504 Gateway Timeout

  Like a 502, but the upstream server didn't return an *invalid* response. It just
  didn't respond *in time*. The proxy timed out waiting. This usually points to a
  slow database query, a downstream service that's hanging, or a job that's taking
  too long.

  ### 507 Insufficient Storage

  The server can't store what you're trying to send. It's out of disk space or has
  hit a storage quota. You'll mostly see this in WebDAV (file management over HTTP)
   contexts, but it can appear in upload-heavy systems too.

  ---

  ## A Pattern I've Noticed

  When I'm debugging an issue, the status code is the first signal but never the
  whole story. The useful loop is:

  1. **Status code** tells you the *class* of problem (client vs. server, auth vs.
  state conflict)
  2. **Response body** gives you the specific error message
  3. **Logs** give you the stack trace or the context
  4. **Traces** show you where in the request lifecycle things fell apart

  A 500 in the logs with no stack trace is almost useless. A 409 with a clear
  message like `"order already submitted"` tells you exactly what happened. The
  status code is a starting point, not an answer.

  ---

  *Working through these in real code, rather than reading about them in a vacuum,
  is what made them stick. More posts coming as I keep working through issues.*
