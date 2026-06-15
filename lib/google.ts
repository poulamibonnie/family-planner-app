const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export interface MappedEvent {
  googleEventId: string;
  title: string;
  date: string;
  time: string;
  description: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  status: string;
  start: { date?: string; dateTime?: string };
}

export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<MappedEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Calendar fetch failed: ${await res.text()}`);
  const data = await res.json();
  return (data.items as GoogleEvent[])
    .filter(e => e.status !== 'cancelled' && (e.start.date || e.start.dateTime))
    .map(e => {
      const isAllDay = !!e.start.date;
      const rawDate = isAllDay ? e.start.date! : e.start.dateTime!;
      const date = rawDate.split('T')[0];
      const time = isAllDay ? '' : (rawDate.split('T')[1]?.slice(0, 5) ?? '');
      return {
        googleEventId: e.id,
        title: e.summary ?? '(No title)',
        date,
        time,
        description: e.description ?? '',
      };
    });
}

export async function fetchPrimaryCalendarId(accessToken: string): Promise<string> {
  const res = await fetch(`${CALENDAR_API}/users/me/calendarList/primary`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return 'primary';
  const data = await res.json();
  return (data.id as string) ?? 'primary';
}
