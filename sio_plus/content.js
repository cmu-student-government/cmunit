/*

This is a SIO_plus extension source code
-----
Its primary function is to extend CMU Student Information Online interface with
useful information. As of 2017, the only information it provides is number of
actual hours spent in a class, which should be helpful to make right decisions
during registration.

Technical side - GWT
-----
SIO is written using Google Web Toolkit (GWT). This is an outdated web app
framework designed by Google in early 2000s. The concept behind this framework
can be described as an opposite of SPA. While single page applications handle
work mostly on the client side, using backend only for REST API calls, GWT
concept was to make everything server side. It offers a set of reusable
components, which are rendered on server. All interactions are transformed into
RPC calls, which trigger server side rendering and DOM node replacement in
callback. This makes client-side integration with GWT quite challenging.

As a direct consequence from GWT architecture, you cannot intercept a callback
or bind to an event. Instead, we have to monitor all DOM changes and then look
into new nodes tot understand what kind of event just happened.

Technical side - compatibility
-----
Browser: assume at least Firefox 52 or Chrome 62

Bookmarklet: originally this script was designed as a bookmarklet. This is why
we have this namespace isolation and weird code structure. This is not important
anymore so if you feel to refactor it, go ahead.

Since now it is distributed as a browser extension, it is loaded before the page
and thus does not have access to page namespace, like this weird $ not-jQuery
object. Everything has to be in plain vanilla javascript.

 */

var data, // fce data
  course_total = 0,  // sum of total course workload
  observer;  // listener of DOM change events

const DEBUG=1, INFO=1, WARNING=3, ERROR=4, CRITICAL=5;
var log_level = DEBUG;

function log(message, level) {
  level = level || DEBUG;
  if (level >= log_level) console.log(message);
}


function updateCourseTotal(){
  if (course_total === 0) return;
  course_total = Math.round(course_total * 100) / 100;
  var node = document.getElementsByClassName("schedule-units-label")[0];
  log(node);
  if (!node) return;
  node.insertBefore(new Text(" (actually " + course_total + ")"), node.lastChild);
  course_total = 0;
}

function onDOMChange (mutations) {
  // label to match: "15-780 :: 12.0 units"
  var id_re = /(\d\d)-(\d\d\d)\s*::\s*(\d+)/;

  mutations.forEach(function(mutation) {
    // Some GWT event fired, and as a result of RPC call some nodes are
    // attached or removed. here we look at the content of these nodes and
    // try to understand what happened

    mutation.addedNodes.forEach(function(node) { // added nodes
      if (node.lastChild && node.lastChild.classList) {
        log(node);
        node.lastChild.classList.forEach(function(cls) {
          switch (cls) {
            case "gwt-course": // course in the right column
              var units_node = node.querySelectorAll(".course-units")[0];
              var match = units_node && id_re.exec(units_node.innerHTML);
              if (match) {
                var hours = data[match[1] + match[2]];
                hours = hours && hours["hrs"];
                if (hours)
                  units_node.innerHTML += " (avg spent " + hours + ")";
                course_total += (hours || parseInt(match[3]));
              }
              break;

            case "gwt-appointment": // course in the calendar view, rendered last
              updateCourseTotal();
              break;
          }
        });
      }
    });
  });
}

function onHashChange(event) {
  course_total = 0;
}

// initialize data
var xhr = new XMLHttpRequest();
xhr.open("GET", "https://cmu-student-government.github.io/fce-data/fce.json", true);
xhr.onreadystatechange = function() {
  if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
    data = JSON.parse(xhr.responseText);

    window.addEventListener('hashchange', onHashChange);

    log("FCE data loaded");
  }
};
xhr.send();

document.addEventListener('DOMContentLoaded', function(event){
  var target = document.body;
  observer = new MutationObserver(onDOMChange);
  observer.observe(target, {childList: true, subtree: true});
  log("Mutations observer installed");
});
