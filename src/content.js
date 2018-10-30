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
var log_level = ERROR;

function log(message, level) {
  level = level || DEBUG;
  if (level >= log_level) console.log(message);
}

function onDOMChange (mutations) {

  mutations.forEach(function(mutation) {
    // Some GWT event fired, and as a result of RPC call some nodes are
    // attached or removed. here we look at the content of these nodes and
    // try to understand what happened

    mutation.addedNodes.forEach(function(node) { // added nodes
      if (node.nodeType !== 1) return;
      // log(node);

      // plan source schedule - right sidebar course info panel
      node.querySelectorAll("div.txt").forEach(function (units_node) {

        // sometimes nodes are added twice
        if (units_node.hasAttribute("data-fce-hours")) return;
        log("Course info window (right pane) detected");
        units_node.setAttribute("data-fce-hours", "0");

        // label to match: "15-780 :: 12.0 units"
        var id_re = /(\d{5})\s*::\s*(\d+)/,
          match = units_node && id_re.exec(units_node.innerHTML);

        if (match) {
          var course_id = match[1],
            hours = data[course_id] && data[course_id]["hrs"];
          if (hours) {
              // hours = parseFloat(hours);
              units_node.innerHTML += " (FCE avg: " + hours + ")";
          }
          else {
              hours = parseInt(match[2]);
          }
          course_total += (hours);
          units_node.setAttribute("data-fce-hours", hours);
        }
      });

      // plan course schedule - detailed course description popup
      if (node.classList.contains("gwt-DialogBox")) {
        log("Course description popup detected");
        var title_node = node.querySelector(".Caption"),
          tbl_node = node.querySelector(".course-description-sections-tbl"),
          units_node = tbl_node && tbl_node.querySelector("tr:last-child td:last-child div:last-child");
        if (!title_node || !tbl_node || !units_node) return;

        if (units_node.hasAttribute("data-fce-hours")) return;
        units_node.setAttribute("data-fce-hours", "0");

          var id_re = /(\d\d)-(\d\d\d)/,
              match = id_re.exec(title_node.innerText);
          if (!match) return;
          var course_id = match[1] + match[2],
            hours = data[course_id] && data[course_id]["hrs"];

          if (hours) {
            units_node.innerHTML += " (FCE: " + hours + ")";
            units_node.setAttribute("data-fce-hours", hours);
          }

      }
    });

    mutation.removedNodes.forEach(function(node) { // added nodes
      if (node.nodeType !== 1) return;

      // plan course schedule - course removed
      node.querySelectorAll("div.txt").forEach(function (units_node) {
        if (!units_node.hasAttribute("data-fce-hours")) return;

        course_total -= parseFloat(units_node.getAttribute("data-fce-hours"));
      });
    });

    // update total (top right corner of the calendar)
    course_total = Math.round(course_total * 100) / 100;
    var course_total_node = document.getElementById("course-total-fce");
    if (!course_total_node) {
      var node = document.querySelector(".schedule-units-label");
      if (node) {
        course_total_node = document.createElement("span");
        course_total_node.setAttribute("id", "course-total-fce");
        node.insertBefore(course_total_node, node.lastChild);
      }
    }
    if (course_total_node) {
        var label = course_total > 0 ? " (FCE: " + course_total + ")" : "";
        if (label != course_total_node.innerText)
          course_total_node.innerText = label;
    }

  });
}

function onHashChange(event) {
  course_total = 0;
}

// initialize data
var xhr = new XMLHttpRequest();
xhr.open("GET", "https://cmu-student-government.github.io/cmunit/fce.json", true);
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
