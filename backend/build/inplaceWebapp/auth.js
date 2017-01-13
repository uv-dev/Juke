angular.module('gitauth', ['ngStorage', 'ngCookies'])

    .constant('cid', 'c3f57e168d4f86bf076d')
    .constant('csecret', '9ce1e42651fb2563cbd58ca9c55fd0fc61969e62')

    .config(function ($locationProvider, $httpProvider) {
	$locationProvider.html5Mode(true);

	/* disable preflight (CORS) - localhost only */
	$httpProvider.defaults.headers.common = {};
	$httpProvider.defaults.headers.post = {};
	$httpProvider.defaults.headers.put = {};
	$httpProvider.defaults.headers.patch = {};
    })

    .controller('init', function ($scope, cid, $window, $sessionStorage) {
	state = Math.random().toString(36).substring(2);

	$sessionStorage.state = state;
	$window.location.href = "https://github.com/login/oauth/authorize?"
	    + "client_id=" + cid
	    + "&state=" + state
	    + "&scope=repo";
    })

    .controller('auth', function($scope, $http, cid, csecret, $window, $location, $sessionStorage, $cookies) {
	params = $location.search();

	if (params.state != $sessionStorage.state) {
	    $scope.state_err = true;
	    return;
	}

	$http({
	    method: 'POST',
	    url: 'https://github.com/login/oauth/access_token',
	    headers: {
		'Accept': 'application/json'
	    },
	    params: {
		'client_id': cid,
		'client_secret': csecret,
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

	    $window.location.href = '/';
	}, function (res) {
	    $scope.error = true;
	});
    })
;
