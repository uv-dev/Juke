angular.module('juke', ['ngCookies', 'ngRoute'])

    .constant('baseurl', 'https://api.github.com')
    .constant('cid', 'c3f57e168d4f86bf076d')

    .config(function ($routeProvider) {
	$routeProvider
	    .when('/repo/:reponame', {
		templateUrl: 'repo.html',
		controller: 'repo'
	    })
	    .when('/repos.html', {
		templateUrl: 'repolist.html',
		controller: 'repos'
	    });
    })

    .controller('repos', function ($scope, baseurl, cid, $cookies, $http) {
	token = $cookies.getObject('Juke_Access_Token').access_token;

	$http({
	    method: 'GET',
	    url: baseurl + '/user/repos',
	    headers: {
		'Authorization': 'token ' + token
	    }
	}).then(function (res) {
	    $scope.repos = res.data;
	    $scope.repos.forEach(function (element) {
		element.juke_link = '/repo/' + element.name;
	    });
	}, function (res) {
	    console.log('fail');
	    console.log(res);
	});
    })
;
