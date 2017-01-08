angular.module('juke', ['ngCookies', 'ngRoute', 'ngMaterial', 'md.data.table'])

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
	objs.elaborate_event = function (git_event) {
	    /* COPIED FROM GitHub API v3 /issues/events/

	      closed
	      The issue was closed by the actor. When the commit_id is present, it identifies the commit that closed the issue using "closes / fixes #NN" syntax.
	      reopened
	      The issue was reopened by the actor.
	      subscribed
	      The actor subscribed to receive notifications for an issue.
	      merged
	      The issue was merged by the actor. The `commit_id` attribute is the SHA1 of the HEAD commit that was merged.
	      referenced
	      The issue was referenced from a commit message. The `commit_id` attribute is the commit SHA1 of where that happened.
	      mentioned
	      The actor was @mentioned in an issue body.
	      assigned
	      The issue was assigned to the actor.
	      unassigned
	      The actor was unassigned from the issue.
	      labeled
	      A label was added to the issue.
	      unlabeled
	      A label was removed from the issue.
	      milestoned
	      The issue was added to a milestone.
	      demilestoned
	      The issue was removed from a milestone.
	      renamed
	      The issue title was changed.
	      locked
	      The issue was locked by the actor.
	      unlocked
	      The issue was unlocked by the actor.
	      head_ref_deleted
	      The pull request's branch was deleted.
	      head_ref_restored
	      The pull request's branch was restored.
	      review_dismissed
	      The actor dismissed a review from the pull request.
	      review_requested
	      The actor requested review from the subject on this pull request.
	      review_request_removed
	      The actor removed the review request for the subject on this pull request.
	    */

	    return 'yeah, this event happened: ' + git_event.event;
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
		e.juke_link = '#!/' + e.full_name;
		e.juke_updated = moment(e.updated_at).fromNow();
		e.juke_updated_at = moment(e.updated_at).calendar();
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
		e.juke_updated = moment(e.updated_at).fromNow();
		e.juke_updated_at = moment(e.updated_at).calendar();
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
	
	/* fetch a issue */
	$scope.path = '/' + $scope.owner + '/' + $scope.repo + '/issues/' + $scope.n;
	juke_service.git_api('/repos' + $scope.path, function (res) {
	    var e = res.data;
	    e.juke_created = moment(e.created_at).fromNow();
	    e.juke_created_at = moment(e.created_at).calendar();
	    e.juke_status = juke_service.status(e);
	    e.juke_event_type = 'comment';
	    $scope.issue = e;

	    $scope.all_events = [$scope.issue];
	    /* fetch events */
	    juke_service.git_api($scope.issue.events_url, function (res) {
		for (var i = 0; i < res.data.length; i++) {
		    var e = res.data[i];
		    e.juke_event_type = 'event';
		    e.juke_created = moment(e.created_at).fromNow();
		    e.juke_created_at = moment(e.created_at).calendar();
		}

		$scope.all_events.push(...res.data);
	    });
	    
	    /* fetch comments */
	    juke_service.git_api($scope.issue.comments_url, function (res) {
		for (var i = 0; i < res.data.length; i++) {
		    var e = res.data[i];
		    e.juke_event_type = 'comment';
		    e.juke_edited = (e.created_at !== e.updated_at);
		    e.juke_created = moment(e.created_at).fromNow();
		    e.juke_created_at = moment(e.created_at).calendar();
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
		scope.event_desc = juke_service.elaborate_event(scope.data);
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
