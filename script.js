document.getElementById("upload").addEventListener("click", function() {
  const accountId = document.getElementById("accountId").value;
  const passcode = document.getElementById("passcode").value;
  const file = document.getElementById("file").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const csv = e.target.result;
      const events = parseCsv(csv);
      const eventGroups = divideIntoGroups(events, 1000);
      uploadEvents(accountId, passcode, eventGroups);
    };
    reader.readAsText(file);
  }
});
function uploadEvents(accountId, passcode, eventGroups) {
  eventGroups.forEach(function(events, index) {
    setTimeout(function() {
      const url = `https://api.clevertap.com/upload`;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-CleverTap-Account-Id", accountId);
      xhr.setRequestHeader("X-CleverTap-Passcode", passcode);
      xhr.setRequestHeader("Access-Control-Allow-Origin","*");
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.status === "success") {
            document.getElementById("result").innerHTML = "Events uploaded successfully";
          } else {
            document.getElementById("result").innerHTML = "Error: " + response.message;
          }
        }
      };

      const transposedEvents = events.map(event => {
  if (event) {
    const evtData = {};
    for (let i = 3; i < event.length; i++) {
      if (event[i] && event[i][0] && event[i][1]) {
        evtData[event[i][0]] = event[i][1];
      }
    }
    return {
      identity: event[0][1],
      type: "event",
      evtName: event[1][1],
      evtData: evtData,
    };
  }
});

      xhr.send(JSON.stringify({ d: transposedEvents }));
    }, index * 1000);
  });
}
// Function to divide events into groups of 1000
function divideIntoGroups(events, size) {
  const groups = [];
  for (let i = 0; i < events.length; i += size) {
    groups.push(events.slice(i, i + size));
  }
  return groups;
}

// Make parallel API requests for each event group
const requests = eventGroups.map(function(group) {
  return new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.clevertap.com/upload");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "Basic " + btoa(accountId + ":" + passcode));
    xhr.onload = function() {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = function() {
      reject(xhr.statusText);
    };
    xhr.send(JSON.stringify({ events: group }));
  });
});

// Wait for all API requests to complete
Promise.all(requests)
  .then(function(responses) {
    let success = 0;
    let failure = 0;
    let errorLogs = [];
    responses.forEach(function(response) {
      success += response.success;
      failure += response.failure;
      errorLogs = errorLogs.concat(response.error_logs);
    });

    // Display the result on the web page
    const result = document.getElementById("result");
    if (failure === 0) {
      result.innerHTML = "Events uploaded successfully. Total events: " + success;
    } else {
      result.innerHTML = "Events uploaded with errors. Total events: " + success + ", Errors: " + failure;
      result.innerHTML += "<br><br>Error Logs:<br>" + errorLogs.join("<br>");
    }
  })
  .catch(function(error) {
    const result = document.getElementById("result");
    result.innerHTML = "An error occurred: " + error;
  });
// Function to parse the CSV file
function parseCsv(csv) {
  const lines = csv.split("\n");
  const headers = lines[0].split(",");
  const events = [];

  for (let i = 1; i < lines.length; i++) {
    const event = lines[i].split(",");
    const eventProperties = [];

    for (let j = 0; j < headers.length; j++) {
      eventProperties.push([headers[j], event[j]]);
    }

    events.push(eventProperties);
  }

  return events;
}
