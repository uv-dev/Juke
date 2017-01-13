angular.module('gitauth', ['ngStorage', 'ngCookies'])

    .constant('cid', 'c3f57e168d4f86bf076d')

    .config(function ($locationProvider, $httpProvider) {
	$locationProvider.html5Mode(true);

	/* disable preflight (CORS) - localhost only */
	$httpProvider.defaults.headers.common = {};
	$httpProvider.defaults.headers.post = {};
	$httpProvider.defaults.headers.put = {};
	$httpProvider.defaults.headers.patch = {};
    })

    .controller('init', function ($scope, cid, $window, $location, $sessionStorage, $cookies) {
	token = $cookies.getObject('Juke_Access_Token');
	if (token === undefined || !token.scope.split(',').includes('repo')) {
	    state = Math.random().toString(36).substring(2);

	    $sessionStorage.state = state;
	    $window.location.href = "https://github.com/login/oauth/authorize?"
		+ "client_id=" + cid
		+ "&state=" + state
		+ "&scope=repo";
	} else {
	    $location.path('/repos.html');
	}
    })

    .controller('auth', function($scope, $http, cid, $location, $sessionStorage, $cookies) {
	params = $location.search();

	if (params.state != $sessionStorage.state) {
	    $scope.state_err = true;
	    return;
	}

	$scope.req = function () {
	    $http({
		method: 'POST',
		url: 'https://github.com/login/oauth/access_token',
		headers: {
		    'Accept': 'application/json'
		},
		params: {
		    'client_id': 'c3f57e168d4f86bf076d',
		    'client_secret': '9ce1e42651fb2563cbd58ca9c55fd0fc61969e62',
		    'code': params.code,
		    'state': params.state
		},
		state: $sessionStorage.state
	    }).then(function (res) {
		if ('error' in res.data) {
		    $scope.git_err = true;
		    $scope.err_desc = res.data.error_description;
		} else {
		    $cookies.putObject('Juke_Access_Token', res.data);
		}

		$location.path('/repos.html');
	    }, function (res) {
		$scope.error = true;
	    });
	};
	$scope.req();
    })
;
