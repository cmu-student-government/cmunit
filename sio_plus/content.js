/*
SIO has something like jQuery, but not really. The only available functions are
DOM selectors. Everything else, including JSON load, should be in vanilla JS.

 */


var sio_plus = sio_plus || {
  data_url: "https://cmu-student-government.github.io/fce-data/fce.json",
  data: null,
  course_total: 0,  // sum of total course workload
  log_level: null,
  observer: null,  // listener to DOM event changes

  log: function(message, level) {
    const DEBUG=1, INFO=1, WARNING=3, ERROR=4, CRITICAL=5;
    level = level || DEBUG;
    if (level >= sio_plus.loglevel) console.log(message);
  },

  init: function(loglevel){
    sio_plus.loglevel = loglevel || 3;
    if (sio_plus.data) return;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", sio_plus.data_url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        sio_plus.data = JSON.parse(xhr.responseText);

        window.addEventListener('hashchange', sio_plus.onHashChange);

        sio_plus.log("FCE data loaded");
      }
    };
    xhr.send();
  },

  updateCourseTotal: function(){
    if (sio_plus.course_total === 0) return;
    sio_plus.course_total = Math.round(sio_plus.course_total * 100) / 100;
    var node = document.getElementsByClassName("schedule-units-label")[0];
    sio_plus.log(node);
    if (!node) return;
    // inject planned total
    node.insertBefore(new Text(" (actually " + sio_plus.course_total + ")"), node.lastChild);
    sio_plus.course_total = 0;
  },

  onDOMChange: function(mutations) {
    // label to match: "15-780 :: 12.0 units"
    var id_re = /(\d\d)-(\d\d\d)\s*::\s*(\d+)/;

    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.lastChild && node.lastChild.classList) {
          sio_plus.log(node);
          node.lastChild.classList.forEach(function(cls) {
            switch (cls) {
              case "gwt-course": // course in the right column
                var units_node = node.querySelectorAll(".course-units")[0];
                var match = units_node && id_re.exec(units_node.innerHTML);
                if (match) {
                  var hours = sio_plus.data[match[1] + match[2]];
                  hours = hours && hours["hrs"];
                  if (hours)
                    // inject avg hrs spent to planned list
                    units_node.innerHTML += " (avg spent " + hours + ")";
                  sio_plus.course_total += (hours || parseInt(match[3]));
                }
                break;

              case "gwt-appointment": // course in the calendar view, rendered last
                sio_plus.updateCourseTotal();
                break;
            }
          });
        }
      });
    });
  },

  onHashChange: function(event) {
    if (!sio_plus.observer) { // defer load
      var target = document.getElementsByClassName('body-content')[0];
      sio_plus.log(target);

      sio_plus.observer = new MutationObserver(sio_plus.onDOMChange);
      sio_plus.observer.observe(target, {childList: true, subtree: true});
      sio_plus.log("Mutations observer installed");
    }
  }
};

sio_plus.init();