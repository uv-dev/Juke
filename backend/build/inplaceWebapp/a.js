angular.module('gitauth', [])
    .controller('auth', ['$scope', '$http', function($scope, $http) {
	$scope.client_id = 'c3f57e168d4f86bf076d';
	
	$scope.req = function () {
	    var state = Math.random().toString(36);
	    console.log(state);
	    
	    $http({
		method: 'POST',
		url: 'https://github.com/login/oauth/access_token',
		data: { 'client_id': 'c3f57e168d4f86bf076d', },
		state: state
	    }).then(function (res) {
		// $http({
		//     method: 'POST',
		//     url: 'https://github.com/login/oauth/access_token',
		//     data {
		// 	'client_id': 'c3f57e168d4f86bf076d',
		// 	'client_secret': '9ce1e42651fb2563cbd58ca9c55fd0fc61969e62'
		//     }
		// });
		console.log('good');
		console.log(res);
	    }, function (res) {
		console.log('fail');
		console.log(res);
	    });
	};
}]);
