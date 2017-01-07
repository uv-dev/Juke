angular.module('gitinit', ['ngStorage', 'ngCookies'])

    .constant('cid', 'c3f57e168d4f86bf076d')

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
;
