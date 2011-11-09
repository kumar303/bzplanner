(function(exports) {
"use strict";

$(function() {
    exports.$content = $('section.content .inner-content');
    exports.renderAllBugs();
});


exports.renderAllBugs = function() {
    // var queryResult = {'bugs': [
    //
    //         {'id': 1, 'summary': 'Prototype of in-app payments to discover JavaScript API',
    //          'target_milestone': '6.3.0', 'priority': 'P1'},
    //         {'id': 101, 'summary': 'Stress test PJAX; adjust as necessary',
    //          'target_milestone': '6.3.0', 'priority': 'P1'},
    //         {'id': 102, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.3.0', 'priority': 'P1'},
    //
    //         {'id': 2, 'summary': 'Stress test PJAX; adjust as necessary',
    //          'target_milestone': '6.3.0', 'priority': 'P2'},
    //         {'id': 201, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.3.0', 'priority': 'P2'},
    //         {'id': 202, 'summary': 'Stress test PJAX; adjust as necessary',
    //          'target_milestone': '6.3.0', 'priority': 'P2'},
    //         {'id': 203, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.3.0', 'priority': 'P2'},
    //
    //         {'id': 3, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.3.0', 'priority': 'P3'},
    //         {'id': 301, 'summary': 'Prototype of in-app payments to discover JavaScript API',
    //          'target_milestone': '6.3.0', 'priority': 'P3'},
    //         {'id': 302, 'summary': 'Stress test PJAX; adjust as necessary',
    //          'target_milestone': '6.3.0', 'priority': 'P3'},
    //         {'id': 303, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.3.0', 'priority': 'P3'},
    //
    //         {'id': 4, 'summary': 'Do something with another thing all the time make it work',
    //          'target_milestone': '6.3.0', 'priority': 'P4'},
    //         {'id': 5, 'summary': 'The systematic dysfunctioner clever thing needed',
    //          'target_milestone': '6.3.0', 'priority': 'P4'},
    //
    //         {'id': 601, 'summary': 'Prototype of in-app payments to discover JavaScript API',
    //          'target_milestone': '6.2.0', 'priority': 'P1'},
    //         {'id': 602, 'summary': 'Stress test PJAX; adjust as necessary',
    //          'target_milestone': '6.2.0', 'priority': 'P1'},
    //         {'id': 603, 'summary': 'Nonconforming apps cause tracebacks instead of graceful errors ',
    //          'target_milestone': '6.2.0', 'priority': 'P1'},
    //
    //          ]};
    $.ajax({url: 'https://api-dev.bugzilla.mozilla.org/1.0/bug?bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED&value0-0-0=UNCONFIRMED&target_milestone=Q1%202012&target_milestone=Q4%202011&target_milestone=6.3.5&target_milestone=6.3.4&target_milestone=6.3.3&target_milestone=6.3.2&target_milestone=6.3.1&target_milestone=6.3.0&product=addons.mozilla.org',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                $.each(data, function(key, item) {
                    if (key == 'bugs') {
                        $.each(item, function(i, bug) {
                            exports.renderBug(bug);
                        });
                    }
                });
                exports.calculateReleases();
            }});
};


exports.calculateReleases = function(bugsPerRelease) {
    if (!bugsPerRelease) {
        bugsPerRelease = 25;  // TODO(Kumar) calculate as velocity
    }
    var release,
        today = Date.today().last().thursday(),
        counter = 0,
        releaseDate = today;

    release = function(date) {
        var $release = $($('#release-template').html());
        $release.find('h3.date').text(date);
        return $release;
    };

    $('.inner-content .bucket').each(function(i, elem) {
        var $bucket = $(elem),
            $newRelease,
            $overflowBucket;

        $('.bug', $bucket).each(function(i, elem) {
            var $bug = $(elem);
            counter++;
            if (counter == bugsPerRelease) {
                releaseDate = releaseDate.add(1).week();
                $newRelease = release(releaseDate.toString());
                $newRelease.insertAfter($bug);
                counter = 0;
            }
        });
    });
};


exports.clearReleases = function() {
    $('.inner-content .release').remove();
    $('.inner-content .milestone').each(function(i, elem) {
        var $milestone = $(elem),
            $lastBucket;
        $('.bucket', $milestone).each(function(i, elem) {
            var $bucket = $(elem);
            if ($lastBucket && $bucket.attr('class') == $lastBucket.attr('class')) {
                $('.bug', $bucket).each(function(i, elem) {
                    $('.bug-bucket', $lastBucket).append(elem);
                })
                $bucket.remove();
            }
            $lastBucket = $bucket;
        });
    });
};


exports.renderBug = function(bug) {
    var $milestone = exports.renderMilestone(bug.target_milestone),
        id = 'bug-' + bug.id,
        $bug,
        $bucket,
        priority = (bug.priority && bug.priority != '--') ? bug.priority: 'P5',
        priorityClass = priority.toLowerCase(),
        summary = bug.summary,
        $priorityAfter,
        $priorityBefore;
    if ($('#' + id).length) {
        return $('#' + id);
    }
    $bug = $($('#bug-template').html()).attr('id', id);
    if (summary.length > 30) {
        // I'm dumb and I can't get text-overflow: ellipsis to work
        summary = summary.slice(0, 30) + '...';
    }
    $bug.find('p a').text(summary).attr('title', bug.summary).attr('href', 'https://bugzilla.mozilla.org/show_bug.cgi?id=' + bug.id);
    if ($('.' + priorityClass, $milestone).length) {
        $bucket = $('.' + priorityClass + ':last-child', $milestone);
    } else {
        $bucket = $($('#bucket-template').html());
        $bucket.addClass(priorityClass);
        $bucket.find('h4.priority').text(priority);
        // Sort priorities so P1 comes before P2, etc
        $('.bucket', $milestone).each(function(i, elem) {
            if ($(elem).find('h4.priority').text() > priority) {
                $priorityBefore = $(elem);
            } else {
                $priorityAfter = $(elem);
            }
        });
        if ($priorityBefore) {
            $bucket.insertBefore($priorityBefore);
        } else if ($priorityAfter) {
            $bucket.insertAfter($priorityAfter);
        } else {
            $milestone.append($bucket);
        }
        $priorityBefore = null;
        $priorityAfter = null;
    }
    $('.bug-bucket', $bucket).append($bug);
    return $bug;
}


exports.renderMilestone = function(version) {
    var id = 'milestone-version' + version.replace(/[^a-z0-9A-Z]/g, ''),
        $milestone,
        $before,
        $after;
    if ($('#' + id).length) {
        return $('#' + id);
    }
    $milestone = $($('#milestone-template').html()).attr('id', id).attr('data-version', version);
    $milestone.find('h3.milestone-name').text(version == '---' ? '[no milestone]': version);
    if ($('.content .milestone').length == 0) {
        exports.$content.append($milestone);
    } else {
        $('.content .milestone').each(function(i, elem) {
            var $elem = $(elem),
                otherVer = $elem.attr('data-version');
            if (version == '' || version == '---') {
                $after = $elem;  // always last
            } else if (version < otherVer) {
                $before = $elem;
            } else if (version > otherVer) {
                $after = $elem;
            }
        });
        if ($after) {
            $milestone.insertAfter($after);
        } else if ($before) {
            $milestone.insertBefore($before);
        }
    }
    return $milestone;
};


}(typeof exports === 'undefined' ? (this.site = {}) : exports));
