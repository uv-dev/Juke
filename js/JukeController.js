angular.module('Juke', ['ngMaterial', 'satellizer'])
  .config(function($authProvider) {
    $authProvider.github({
      clientId: '22596a083b38d18315e9'
    });
  })
  .controller('MainController', function($scope, $auth, $http) {
    $scope.title = 'GiHub Juke';
    $scope.githubLogin = function() {
      $auth.authenticate('github');
    };
  });
