angular.module('juke', ['ngCookies', 'ngRoute', 'ngMaterial'])

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
		e.juke_updated_at = moment(e.updated_at).fromNow();
		console.log($scope.repos[i]);
	    }
	});
    })

    .controller('issues', function ($scope, $routeParams, juke_service) {
	$scope.token = juke_service.get_token();
	$scope.owner = $routeParams.owner;
	$scope.repo = $routeParams.repo;
	/* fetch issues in a repo */
	$scope.repopath = '/' + $scope.owner + '/' + $scope.repo;
	juke_service.git_api('/repos' + $scope.repopath + '/issues', function (res) {
	    $scope.issues = res.data;
	    for (var i = 0; i< $scope.issues.length; i++) {
		$scope.issues[i].juke_link = '#!' + $scope.repopath + '/' + $scope.issues[i].number;
	    }
	}, { 'state': 'all' });
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
