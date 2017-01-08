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
		/* fetch comments */
		$http({
		    method: 'GET',
		    url: baseurl + url,
		    headers: {
			'Authorization': 'token ' + objs.get_token()
		    },
		    params: params
		}).then(on_success, function (res) {
		    console.log('fail');
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
		e.juke_rel_time = true;
		e.juke_updated = moment(e.updated_at).fromNow();
		e.juke_updated_at = moment(e.updated_at).calendar();
	    }
	});
    })

    .controller('issues', function ($scope, $routeParams, juke_service, $timeout, $q) {
	$scope.codes = juke_service.status_codes;
	$scope.token = juke_service.get_token();
	$scope.owner = $routeParams.owner;
	$scope.repo = $routeParams.repo;
	$scope.orderby = 'title';
	$scope.showing = [];

	$scope.filters = [];
	$scope.weedfunc = (a, e) => a & e;
	$scope.$watchCollection('filters', function (n, o) {
	    $scope.weeder = n.reduce((a, b) => a + b, 0);
	});

	$scope.filter_text = function () {
	    if (0 in $scope.filters)
		return 'All';
	    else if ($scope.filters.length > 1)
		return $scope.filters.length + ' filters';
	    else
	};
	
	$scope.toggle_all = function (e) {
	    if ($scope.filters.length) {
		$scope.filters.length = 0;
		e.stopPropagation();
	    } else {
		$scope.filters = Object.keys($scope.codes).map((k) => $scope.codes[k]);
	    }
	};
	
	/* fetch issues in a repo */
	$scope.repopath = '/' + $scope.owner + '/' + $scope.repo;
	juke_service.git_api('/repos' + $scope.repopath + '/issues', function (res) {
	    $scope.all_issues = res.data;
	    for (var i = 0; i< $scope.all_issues.length; i++) {
		var e = $scope.all_issues[i];
		e.juke_rel_time = true;
		e.juke_updated = moment(e.updated_at).fromNow();
		e.juke_updated_at = moment(e.updated_at).calendar();
		e.juke_link = '#!' + $scope.repopath + '/' + e.number;
		e.juke_status = juke_service.status(e);
		/* & 1 is done to include them when filtered with ALL */
		e.juke_status_code = $scope.codes[e.juke_status];
		console.log(e);
	    }
	    $scope.showing = $scope.all_issues;
	}, { 'state': 'all' });

	var deferd = null;
	var search = function (n) {
	    $scope.typing -= 1;
	    if ($scope.typing)
		return;

	    if (!n.length) {
		$scope.showing = $scope.all_issues;
		deferd.resolve();
		return;
	    }

	    var searched = [];
	    var rex = new RegExp(n, 'i');
	    for (var i = 0; i < $scope.all_issues.length; i++) {
		var e = $scope.all_issues[i];
		if (rex.test(e.title))
		    searched.push(e);
	    }
	    $scope.showing = searched;
	    deferd.resolve();
	};

	$scope.typing = 0;
	$scope.$watch('keyword', function (n, o) {
	    if (n === undefined || !$scope.all_issues.length)
		return;

	    if (!$scope.typing) {
		deferd = $q.defer();
		$scope.attendez = deferd.promise;
	    }

	    $scope.typing += 1;
	    $timeout(function () {
		search(n);
	    }, 1000);
	});
    })

    .controller('issue', function ($scope, $routeParams, juke_service) {
	$scope.token = juke_service.get_token();
	$scope.owner = $routeParams.owner;
	$scope.repo = $routeParams.repo;
	$scope.n = $routeParams.n;

	$scope.assignees = [];
	$scope.events = [];
	$scope.comments  = [];
	
	/* fetch a issue */
	$scope.path = '/' + $scope.owner + '/' + $scope.repo + '/issues/' + $scope.n;
	juke_service.git_api('/repos' + $scope.path, function (res) {
	    $scope.issue = res.data;
	    $scope.assignees = res.data.assignees;
	});
	/* fetch events */
	juke_service.git_api('/repos' + $scope.path + '/events', function (res) {
	    $scope.events = res.data;
	});
	/* fetch comments */
	juke_service.git_api('/repos' + $scope.path + '/comments', function (res) {
	    $scope.comments = res.data;
	});
    })
;
