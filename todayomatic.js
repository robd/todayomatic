// Client ID and API key from the Developer Console
var CLIENT_ID = '977649952604-6cenud12m2lsioe24c5to9kqf26reba6.apps.googleusercontent.com';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');

function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

var input = document.getElementById('calendar-name-input');
input.value = getUrlParameter(input.name);

var calendarNameRegex = new RegExp(input.value, 'i');
/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client
    .init({
      discoveryDocs: DISCOVERY_DOCS,
      clientId: CLIENT_ID,
      scope: SCOPES,
    })
    .then(function() {
      // Listen for sign-in state changes.
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

      // Handle the initial sign-in state.
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      authorizeButton.onclick = function() {
        gapi.auth2.getAuthInstance().signIn();
      };
      signoutButton.onclick = function() {
        gapi.auth2.getAuthInstance().signOut();
      };
    });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    listCalendars();
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  }
}

function createElement(tagName, elementContent, attrs) {
  var element = document.createElement(tagName);
  for (var attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      element.setAttribute(attr, attrs[attr]);
    }
  }
  element.innerHTML = elementContent;
  return element;
}

function formatTime(eventStart) {
  return eventStart.getHours() + ':' + twoDigits(eventStart.getMinutes());
}

function twoDigits(n) {
  return n < 10 ? '0' + n : n;
}

function percent(start, end) {
  var mins = (end - start) / (1000 * 60);
  return mins / 6;
}

function addEventDiv(calendarRow, eventStart, eventEnd, calendar, event) {
  const organizer = event.organizer ? event.organizer.name || event.organizer.email : 'Unknown';
  const attendees = (event.attendees || [])
    .filter(function(attendee) {
      return !attendee.self;
    })
    .map(function(attendee) {
      return attendee.displayName || attendee.email;
    });
  const summary = event.summary || 'Unknown';

  calendarRow.appendChild(
    createElement('div', formatTime(eventStart) + '-' + formatTime(eventEnd) + ': ' + summary, {
      style: 'width:' + percent(eventStart, eventEnd) + '%;  background-color: ' + calendar.backgroundColor,
      class: 'event',
      title: summary + '\n\nOrganiser: ' + organizer + '\nAttending: ' + attendees.join(', '),
    })
  );
}

function addTimeDiv(calendarRow, start, end) {
  calendarRow.appendChild(
    createElement('div', formatTime(start), { style: 'width:' + percent(start, end) + '%;', class: 'available' })
  );
}

function gcalDate(date) {
  return (
    '' +
    date.getFullYear() +
    twoDigits(date.getMonth() + 1) +
    twoDigits(date.getDate()) +
    'T' +
    twoDigits(date.getHours()) +
    twoDigits(date.getMinutes()) +
    twoDigits(date.getSeconds())
  );
}

function addAvailableDiv(calendarRow, start, end, calendar) {
  var a = createElement('a', (end - start) / (1000 * 60) + ' mins');
  a.href =
    'https://calendar.google.com/calendar/render?action=TEMPLATE&dates=' +
    gcalDate(start) +
    '/' +
    gcalDate(end) +
    '&sf=true&output=xml#eventpage_6';
  var div = createElement('div', '', { style: 'width:' + percent(start, end) + '%;', class: 'available' });
  div.appendChild(a);
  calendarRow.appendChild(div);
}

function addHeaderDiv(calendarRow, text) {
  calendarRow.appendChild(createElement('div', text, { class: 'header-row' }));
}

function createCalendarRowDiv() {
  return createElement('div', '', { style: 'width:100%;', class: 'calendar-row' });
}

// https://stackoverflow.com/questions/14446511/what-is-the-most-efficient-method-to-groupby-on-a-javascript-array-of-objects#comment64856953_34890276
function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    const v = key instanceof Function ? key(x) : x[key];
    const el = rv.find(r => r && r.key === v);
    if (el) {
      el.values.push(x);
    } else {
      rv.push({ key: v, values: [x] });
    }
    return rv;
  }, []);
}

function listCalendars() {
  const allCalendarsDiv = document.getElementById('all-calendars');
  const startHour = 9;
  const endHour = 17;

  const dayStart = new Date();
  dayStart.setHours(startHour, 0, 0, 0);

  const dayEnd = new Date();
  dayEnd.setDate(dayStart.getDate());
  dayEnd.setHours(endHour, 0, 0, 0);

  const headerRow = createCalendarRowDiv();

  addHeaderDiv(headerRow, '');

  for (var i = startHour; i < endHour; i++) {
    const headerTdStart = new Date(dayStart.getTime());
    headerTdStart.setHours(i, 0, 0, 0);

    const headerTdEnd = new Date(dayStart.getTime());
    headerTdEnd.setHours(i + 1, 0, 0, 0);

    addTimeDiv(headerRow, headerTdStart, headerTdEnd);
  }

  allCalendarsDiv.appendChild(headerRow);

  gapi.client.calendar.calendarList.list().then(function(response) {
    const matchingCalendars = response.result.items.filter(function(calendar) {
      return calendar.summary.match(calendarNameRegex);
    });

    groupBy(matchingCalendars, function(calendar) {
      return calendar.id.split('@').pop(); // Suffix
    }).forEach(function(groupedCals) {
      groupedCals.values
        .sort(function(cal1, cal2) {
          return cal1.summary.localeCompare(cal2.summary);
        })
        .forEach(function(calendar) {
          allCalendarsDiv.appendChild(showCalendarRow(calendar, dayStart, dayEnd));
        });
    });
  });
}

function showCalendarRow(calendar, dayStart, dayEnd) {
  const calendarRow = createCalendarRowDiv();
  addHeaderDiv(calendarRow, calendar.summary);
  gapi.client.calendar.events
    .list({
      calendarId: calendar.id,
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 30,
      orderBy: 'startTime',
    })
    .then(function(response) {
      const lastEventEnd = new Date(dayStart.getTime());
      response.result.items.forEach(function(event) {
        const eventStart = new Date(event.start.dateTime);
        if (lastEventEnd < eventStart) {
          addAvailableDiv(calendarRow, lastEventEnd, eventStart, calendar);
        }
        const eventEnd = new Date(event.end.dateTime);
        if (lastEventEnd <= eventStart) {
          // Handle overlapping events
          addEventDiv(calendarRow, eventStart, eventEnd, calendar, event);
          lastEventEnd.setTime(eventEnd.getTime());
        }
      });

      if (lastEventEnd < dayEnd) {
        addAvailableDiv(calendarRow, lastEventEnd, dayEnd, calendar);
      }
    });
  return calendarRow;
}
