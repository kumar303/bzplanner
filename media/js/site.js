(function(exports) {
"use strict";

$(function() {
    exports.$content = $('section.content .inner-content');
    $('#refresh-query').click(function(e) {
        e.preventDefault();
        var $self = $(this),
            $form = $self.parent('form');
        exports.renderAllBugs($form.find('[name=q-product]').val(),
                              $form.find('[name=q-milestones]').val().split(' '));
    });
    $('#refresh-query').trigger('click');
});


exports.renderAllBugs = function(product, milestones) {
    $.ajax({url: exports.getUrl(product, milestones),
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
        bugsPerRelease = 15;  // TODO(Kumar) calculate as velocity
    }
    var release,
        counter = 0,
        releaseDate;
    if (Date.today().getDayName() == 'Thursday') {
        releaseDate = Date.today();
    } else {
        releaseDate = Date.today().last().thursday();
    }

    release = function(date) {
        var $release = $($('#release-template').html());
        $release.find('h3.date').text('ETA: ' + date);
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


exports.getUrl = function(product, milestones) {
    var url = 'https://api-dev.bugzilla.mozilla.org/1.0/bug?priority=P1&priority=P2&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED&value0-0-0=UNCONFIRMED';
    url += '&target_milestone=' + milestones.join('&target_milestone=');
    url += '&product=' + product;
    return url;
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
