angular.module('gitauth', ['ngRoute', 'ngStorage'])

    .constant('cid', 'c3f57e168d4f86bf076d')

    .config(function ($locationProvider) {
	$locationProvider.html5Mode(true);
    })

    .controller('init', function ($scope, cid, $sessionStorage) {
	state = Math.random().toString(36).substring(2);

	$sessionStorage.state = state;
	
	$scope.client_id = cid;
	$scope.state =  state;
    })

    .controller('auth', function($scope, $http, cid, $location, $sessionStorage) {
	params = $location.search();

	if (params.state != $sessionStorage.state) {
	    $scope.state_err = true;
	    return;
	}

	// TODO Cross Site Header
	$scope.req = function () {
	    $http({
		method: 'POST',
		url: 'https://github.com/login/oauth/access_token',
		data: {
		    'client_id': 'c3f57e168d4f86bf076d',
		    'client_secret': '9ce1e42651fb2563cbd58ca9c55fd0fc61969e62',
		    'code': params.code,
		    'state': params.state
		},
		state: $sessionStorage.state
	    }).then(function (res) {
		console.log('good');
		console.log(res);
	    }, function (res) {
		console.log('fail');
		console.log(res);
	    });
	};
	$scope.req();
    })
;
