angular.module('juke', ['ngCookies', 'ngRoute', 'ngMaterial', 'md.data.table', 'yaru22.md', 'ngSanitize'])

    .constant('baseurl', 'https://api.github.com')

    .service('juke_service', function($cookies, $window, $http, baseurl) {
	var objs = this;
	objs.get_token = function () {
	    if (!$cookies.getObject('Juke_Access_Token'))
		$window.location.href = '/auth.html';
	    
	    return $cookies.getObject('Juke_Access_Token').access_token;
	};
	objs.git_api = function (url, on_success, params = {}) {
	    var req_url = (url.startsWith(baseurl) ? url : baseurl + url);
	    /* fetch comments */
	    $http({
		method: 'GET',
		url: req_url,
		headers: {
		    'Authorization': 'token ' + objs.get_token()
		},
		params: params
	    }).then(on_success, function (res) {
		console.log('fail'); /* TODO */
		console.log(res);
	    });
	};
	/* bitwise AND will be done for filtering for issue status */
	objs.status_codes = { 'Open': 1, 'Closed': 2 };
	objs.status = function (issue) {
	    if (issue.state === 'open')
		return 'Open';
	    else if (issue.state === 'closed')
		return 'Closed';
	    else
		return 'N/A';
	};
	objs.bold = function (str) {
	    return '<b>' + str + '</b>';
	};
	objs.elaborate_event = function (ev) {
	    /* from GitHub API v3 /issues/events/ page */
	    switch (ev.event) {
	    case 'closed':
		return 'closed this issue';
	    case 'reopened':
		return 'reopened this issue';
	    case 'merged':
		return 'merged this issue in ' + objs.bold(ev.commit_id);
	    case 'referenced':
		return 'referenced this issue in ' + objs.bold(ev.commit_id);
	    case 'assigned':
		return 'was assigned to this issue';
	    case 'unassigned':
		return 'was removed from their assignment';
	    case 'labeled':
		return 'added the ' + objs.bold(ev.label.name) + ' label';
	    case 'unlabeled':
		return 'removed the ' + objs.bold(ev.label.name) + ' label';
	    case 'milestoned':
		return 'added this issue to the ' + objs.bold(ev.milestone.title) + ' milestone';
	    case 'demilestoned':
		return 'removed this issue from the ' + objs.bold(ev.milestone.title) + ' milestone';
	    case 'renamed':
		return 'changed the title from ' + objs.bold(ev.rename.from) + ' to ' + objs.bold(ev.rename.to);
	    case 'locked':
		return 'locked and limited conversation to collaborators';
	    case 'unlocked':
		return 'unlocked this conversation';
	    case 'juke_remilestoned':
		return 'modified the milestone from ' + objs.bold(ev.milestone.from) + ' to ' + objs.bold(ev.milestone.title);
	    case 'juke_self_assigned':
		return 'self-assigned this issue';
	    case 'juke_self_unassigned':
		return 'removed their assignement';
	    default:
		return null;
	    };
	};
	objs.process_events = function (events) {
	    // TODO self-(un)assigned
	    var result = [];
	    for (var i = 0; i < events.length; i++) {
		var e = events[i];
		if (e.event === 'milestoned' && i + 1 < events.length && e.actor.id === events[i+1].actor.id && events[i+1].event === 'demilestoned') {
		    e.event = 'juke_remilestoned';
		    e.milestone.from = events[i+1].milestone.title;
		    i++;
		} else if (e.event === 'assigned' && e.assignee.id === e.assigner.id) {
		    e.event = 'juke_self_assigned';
		} else if (e.event === 'unassigned' && e.assignee.id === e.assigner.id) {
		    e.event = 'juke_self_unassigned';
		}

		e.juke_msg = objs.elaborate_event(e);
		if (e.juke_msg !== null) {
		    result.push(e);
		}
	    }
	    return result;
	};

	return objs;
    })

    .config(function ($routeProvider) {
	$routeProvider
	    .when('/', {
		templateUrl: 'repolist.html',
	    	controller: 'repos'
	    })
	    .when('/:owner/:repo', {
		templateUrl: 'issuelist.html',
		controller: 'issues'
	    })
	    .when('/:owner/:repo/:n', {
		templateUrl: 'issue.html',
		controller: 'issue'
	    })
	    .otherwise({
		redirectTo: '/'
	    })
	;
    })

    .controller('repos', function ($scope, juke_service) {
	/* fetch repos of a user */
	$scope.token = juke_service.get_token();
	juke_service.git_api('/user/repos', function (res) {
	    $scope.repos = res.data;
	    for (var i = 0; i < $scope.repos.length; i++) {
		var e = $scope.repos[i];
		var m = moment(e.updated_at);
		e.juke_link = '#!/' + e.full_name;
		e.juke_updated = m.fromNow();
		e.juke_updated_at = m.calendar();
	    }
	});
    })

    .directive ('mdBlurOnClose', function () {
	return {
	    restrict: 'A',
	    link: function (scope, elem, attrs) {
		elem.on('focus', function (event) {
		    elem.blur();
		});
	    }
	};
    })

    .controller('issues', function ($scope, $routeParams, juke_service, $timeout, $q) {	
	$scope.token = juke_service.get_token();
	$scope.owner = $routeParams.owner;
	$scope.repo = $routeParams.repo;
	$scope.orderby = 'title';
	$scope.showing = [];

	$scope.codes = juke_service.status_codes;
	$scope.filtercnt = Object.keys($scope.codes).length;

	$scope.all_filters = true;
	$scope.filters = Object.keys($scope.codes);
	$scope.weedfunc = function (item) {
	    return item.juke_status_code & $scope.weeder;
	};
	$scope.$watchCollection('filters', function (n, o) {
	    $scope.weeder = n.reduce((a, b) => a + (b ? $scope.codes[b] : 0), 0);
	    if (n.length < o.length && $scope.all_filters)
		$scope.all_filters = false;
	    else if (n.length === $scope.filtercnt && !$scope.all_filters)
		$scope.all_filters = true;
	});
	$scope.filter_text = function () {
	    if ($scope.all_filters)
		return 'Showing all status';
	    else if ($scope.filters.length > 1)
		return $scope.filters.length + ' filters applied';
	    else if ($scope.filters.length == 1)
		return 'Showing ' + $scope.filters[0];
	    else
		return 'Filter by Status';
	};
	$scope.toggle_all = function (e) {
	    $scope.all_filters = !$scope.all_filters;
	    if ($scope.all_filters)
		$scope.filters = Object.keys($scope.codes);
	    else
		$scope.filters = [];
	    e.stopPropagation();
	};

	/* fetch issues in a repo */
	$scope.repopath = '/' + $scope.owner + '/' + $scope.repo;
	juke_service.git_api('/repos' + $scope.repopath + '/issues', function (res) {
	    $scope.all_issues = res.data;
	    for (var i = 0; i< $scope.all_issues.length; i++) {
		var e = $scope.all_issues[i];
		var m = moment(e.updated_at);
		e.juke_updated = m.fromNow();
		e.juke_updated_at = m.calendar();
		e.juke_link = '#!' + $scope.repopath + '/' + e.number;
		e.juke_status = juke_service.status(e);
		e.juke_status_code = $scope.codes[e.juke_status];
	    }
	    $scope.showing = $scope.all_issues;
	}, { 'state': 'all' });

    })

    .controller('issue', function ($scope, $routeParams, juke_service) {
	$scope.token = juke_service.get_token();
	$scope.owner = $routeParams.owner;
	$scope.repo = $routeParams.repo;
	$scope.n = $routeParams.n;

	$scope.statuses = Object.keys(juke_service.status_codes);
	
	/* fetch an issue */
	$scope.path = '/' + $scope.owner + '/' + $scope.repo + '/issues/' + $scope.n;
	juke_service.git_api('/repos' + $scope.path, function (res) {
	    var e = res.data;
	    var m = moment(e.created_at);
	    e.juke_status = juke_service.status(e);
	    e.juke_event_type = 'comment';
	    e.juke_created = m.fromNow();
	    e.juke_created_at = m.calendar();
	    $scope.issue = e;

	    $scope.all_events = [$scope.issue];
	    /* fetch events */
	    juke_service.git_api($scope.issue.events_url, function (res) {
		var evs = juke_service.process_events(res.data);
		for (var i = 0; i < evs.length; i++) {
		    var e = evs[i];
		    var m = moment(e.created_at);
		    e.juke_event_type = 'event';
		    e.juke_created = m.fromNow();
		    e.juke_created_at = m.calendar();
		}
		$scope.all_events.push(...evs);
	    });
	    
	    /* fetch comments */
	    juke_service.git_api($scope.issue.comments_url, function (res) {
		for (var i = 0; i < res.data.length; i++) {
		    var e = res.data[i];
		    var m = moment(e.created_at);
		    e.juke_event_type = 'comment';
		    e.juke_edited = (e.created_at !== e.updated_at);
		    e.juke_created = m.fromNow();
		    e.juke_created_at = m.calendar();
		}
		$scope.all_events.push(...res.data);
	    });
	});
    })

    .directive('mdJukeEvent', function (juke_service) {
	return {
	    restrict: 'EA',
	    scope: { data: '=' },
	    link: function (scope, elem, attrs) {
		
	    },
	    templateUrl: 'juke_event.html'
	};
    })

    .directive('mdJukeComment', function () {
	return {
	    restrict: 'EA',
	    scope: { data: '=' },
	    link: function (scope, elem, attrs) {
		
	    },
	    templateUrl: 'juke_comment.html'
	};
    })

    .directive('showOnHover', function ($compile) {
	return {
	    restrict: 'E',
	    scope: { onHover: '@', onLeave: '@' },
	    link: function (scope, elem, attrs) {
		scope.hovering = false;
		elem.on('mouseenter', function () {
		    scope.hovering = true;
		    scope.$apply();
		});
		elem.on('mouseleave', function () {
		    scope.hovering = false;
		    scope.$apply();
		});
	    },
	    template: '<span>{{ hovering ? onHover : onLeave }}</span>'
	};
    })
;
