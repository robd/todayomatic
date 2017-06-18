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
      authorizeButton.onclick = handleAuthClick;
      signoutButton.onclick = handleSignoutClick;
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

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

function createElement(tagName, elementContent, attrs) {
  var span = document.createElement(tagName);
  for (var attr in attrs) {
    if (attrs.hasOwnProperty(attr)) {
      span.setAttribute(attr, attrs[attr]);
    }
  }
  span.innerHTML = elementContent;
  return span;
}

function appendElement(tagName, elementContent, attrs) {
  var element = createElement(tagName, elementContent || '', attrs);
  document.getElementById('calendars-table').appendChild(element);
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

function addEventTd(calendarRow, eventStart, eventEnd, calendar, event) {
  calendarRow.appendChild(
    createElement('div', formatTime(eventStart) + '-' + formatTime(eventEnd) + ': ' + event.summary, {
      style: 'width:' + percent(eventStart, eventEnd) + '%;  background-color: ' + calendar.backgroundColor,
      class: 'event',
    })
  );
}

function addTimeTd(calendarRow, start, end) {
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

function addAvailableTd(calendarRow, start, end, calendar) {
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

function addHeaderTd(calendarRow, text) {
  calendarRow.appendChild(createElement('div', text, { style: 'width:20%; display: inline-block;' }));
}

function createCalendarRow() {
  return appendElement('div', '', { style: 'width:100%;', class: 'calendar-row' });
}

function listCalendars() {
  var startHour = 9;
  var endHour = 17;

  gapi.client.calendar.calendarList.list().then(function(response) {
    var calendars = response.result.items;

    var dayStart = new Date();
    dayStart.setHours(startHour, 0, 0, 0);

    var dayEnd = new Date();
    dayEnd.setDate(dayEnd.getDate());
    dayEnd.setHours(endHour, 0, 0, 0);

    var headerRow = createCalendarRow();

    addHeaderTd(headerRow, '');

    for (var i = startHour; i < endHour; i++) {
      var headerTdStart = new Date();
      headerTdStart.setDate(dayStart.getDate());
      headerTdStart.setHours(i, 0, 0, 0);

      var headerTdEnd = new Date();
      headerTdEnd.setDate(dayStart.getDate());
      headerTdEnd.setHours(i + 1, 0, 0, 0);

      addTimeTd(headerRow, headerTdStart, headerTdEnd);
    }

    var roomCalendars = calendars.filter(function(calendar) {
      return calendar.summary.match(calendarNameRegex);
    });
    roomCalendars.forEach(function(calendar) {
      var calendarRow = createCalendarRow();
      addHeaderTd(calendarRow, calendar.summary);
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
          var lastEventEnd = new Date(dayStart.getTime());
          var events = response.result.items;

          events.forEach(function(event) {
            var eventStart = new Date(event.start.dateTime);
            if (lastEventEnd < eventStart) {
              addAvailableTd(calendarRow, lastEventEnd, eventStart, calendar);
            }
            var eventEnd = new Date(event.end.dateTime);
            if (lastEventEnd <= eventStart) {
              // Handle overlapping events
              addEventTd(calendarRow, eventStart, eventEnd, calendar, event);
              lastEventEnd.setTime(eventEnd.getTime());
            }
          });

          if (lastEventEnd < dayEnd) {
            addAvailableTd(calendarRow, lastEventEnd, dayEnd, calendar);
          }
        });
    });
  });
}
